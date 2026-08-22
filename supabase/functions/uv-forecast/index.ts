import { createClient } from "npm:@supabase/supabase-js@2";
import {
  CWA_DATASET,
  CwaMappingError,
  CwaUpstreamError,
  fetchCwaDataset,
  mapCwaForecast,
  parseCachedForecast,
  parseRegionCode,
  type UvForecastPayload
} from "../_shared/cwa.ts";
import {
  corsHeaders,
  errorResponse,
  jsonResponse,
  toResponse,
  withCors
} from "../_shared/http.ts";

type ForecastCacheRow = {
  region_code: string;
  schema_version: string;
  source_dataset: string;
  payload: unknown;
  fetched_at: string;
  usable_until: string;
  etag: string | null;
};

export async function handleForecast(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== "GET") {
    return toResponse(errorResponse({
      status: 405,
      code: "VALIDATION_ERROR",
      message: "只接受 GET"
    }));
  }

  let regionCode: string;
  try {
    regionCode = parseRegionCode(new URL(request.url).searchParams.get("regionCode"));
  } catch (error) {
    return toResponse(errorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      message: error instanceof CwaMappingError ? error.message : "行政區代碼不正確"
    }));
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const apiKey = Deno.env.get("CWA_API_KEY");
  if (supabaseUrl === undefined || serviceRoleKey === undefined || apiKey === undefined) {
    return toResponse(errorResponse({
      status: 500,
      code: "SERVER_ERROR",
      message: "UV 預報服務尚未完成設定"
    }));
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const cacheResult = await client
    .from("uv_forecast_cache")
    .select("region_code,schema_version,source_dataset,payload,fetched_at,usable_until,etag")
    .eq("region_code", regionCode)
    .maybeSingle();
  if (cacheResult.error !== null) {
    return toResponse(errorResponse({
      status: 500,
      code: "SERVER_ERROR",
      message: "目前無法讀取 UV 預報快取"
    }));
  }

  const cached = cacheResult.data as ForecastCacheRow | null;
  const now = new Date();
  if (cached !== null && Date.parse(cached.usable_until) > now.getTime()) {
    try {
      return jsonResponse(parseCachedForecast(cached.payload));
    } catch {
      // A malformed cache must never become a fake UVI.  It is ignored and
      // replaced by a fresh validated upstream response below.
    }
  }

  let upstream;
  try {
    upstream = await fetchCwaDataset({
      fetch: (input, init) => fetch(input, init),
      apiKey,
      etag: cached?.etag ?? null
    });
  } catch (error) {
    if (error instanceof CwaUpstreamError) {
      return toResponse(errorResponse({
        status: 503,
        code: "UPSTREAM_UNAVAILABLE",
        message: "目前無法取得中央氣象署 UV 預報"
      }));
    }
    return toResponse(errorResponse({
      status: 502,
      code: "UPSTREAM_UNAVAILABLE",
      message: "中央氣象署 UV 預報格式暫時無法使用"
    }));
  }

  let forecast: UvForecastPayload;
  if (upstream.status === 304 && cached !== null) {
    try {
      const previous = parseCachedForecast(cached.payload);
      forecast = {
        ...previous,
        fetchedAt: now.toISOString(),
        usableUntil: new Date(now.getTime() + 6 * 60 * 60 * 1000).toISOString()
      };
    } catch {
      return toResponse(errorResponse({
        status: 503,
        code: "UPSTREAM_UNAVAILABLE",
        message: "目前沒有可使用的 UV 預報"
      }));
    }
  } else {
    try {
      forecast = mapCwaForecast(upstream.payload, {
        regionCode,
        fetchedAt: now.toISOString(),
        now: now.toISOString()
      });
    } catch (error) {
      const isClientDataError = error instanceof CwaMappingError &&
        ["REGION_NOT_FOUND", "UV_DATA_MISSING"].includes(error.reason);
      return toResponse(errorResponse({
        status: isClientDataError ? 422 : 503,
        code: isClientDataError ? "VALIDATION_ERROR" : "UPSTREAM_UNAVAILABLE",
        message: isClientDataError
          ? "目前沒有所選行政區的 UV 預報"
          : "中央氣象署 UV 預報格式暫時無法使用"
      }));
    }
  }

  const upsertResult = await client.from("uv_forecast_cache").upsert({
    region_code: regionCode,
    schema_version: forecast.schemaVersion,
    source_dataset: CWA_DATASET,
    payload: forecast,
    fetched_at: forecast.fetchedAt,
    usable_until: forecast.usableUntil,
    etag: upstream.etag,
    updated_at: now.toISOString()
  });
  if (upsertResult.error !== null) {
    // The validated upstream result can still be returned even if cache write
    // is unavailable; cache failure must not turn a valid forecast into UVI 0.
    return jsonResponse(forecast);
  }
  return jsonResponse(forecast);
}

Deno.serve(async (request) => withCors(await handleForecast(request), request));
