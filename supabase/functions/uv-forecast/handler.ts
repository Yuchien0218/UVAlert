import {
  CWA_DATASET,
  CwaMappingError,
  CwaUpstreamError,
  mapCwaForecast,
  parseCachedForecast,
  parseRegionCode,
  type CwaFetchResult,
  type UvForecastPayload
} from "../_shared/cwa.ts";
import { errorResponse, jsonResponse, toResponse } from "../_shared/http.ts";

export type ForecastCacheRow = {
  region_code: string;
  schema_version: string;
  source_dataset: string;
  payload: unknown;
  fetched_at: string;
  usable_until: string;
  etag: string | null;
};

export type ForecastHandlerDependencies = {
  readCache(regionCode: string): Promise<ForecastCacheRow | null>;
  writeCache(row: ForecastCacheRow & { updated_at: string }): Promise<void>;
  fetchUpstream(options: {
    apiKey: string;
    etag: string | null;
  }): Promise<CwaFetchResult>;
  readSecret(name: "CWA_API_KEY"): string | undefined;
  now(): Date;
};

export function createForecastHandler(
  dependencies: ForecastHandlerDependencies
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204 });
    }
    if (request.method !== "GET") {
      return toResponse(
        errorResponse({
          status: 405,
          code: "VALIDATION_ERROR",
          message: "只接受 GET"
        })
      );
    }

    let regionCode: string;
    try {
      regionCode = parseRegionCode(
        new URL(request.url).searchParams.get("regionCode")
      );
    } catch (error) {
      return toResponse(
        errorResponse({
          status: 422,
          code: "VALIDATION_ERROR",
          message:
            error instanceof CwaMappingError
              ? error.message
              : "行政區代碼不正確"
        })
      );
    }

    const apiKey = dependencies.readSecret("CWA_API_KEY");
    if (apiKey === undefined) {
      return toResponse(
        errorResponse({
          status: 500,
          code: "SERVER_ERROR",
          message: "UV 預報服務尚未完成設定"
        })
      );
    }

    let cached: ForecastCacheRow | null;
    try {
      cached = await dependencies.readCache(regionCode);
    } catch {
      return toResponse(
        errorResponse({
          status: 500,
          code: "SERVER_ERROR",
          message: "目前無法讀取 UV 預報快取"
        })
      );
    }

    const now = dependencies.now();
    if (cached !== null && Date.parse(cached.usable_until) > now.getTime()) {
      try {
        return jsonResponse(parseCachedForecast(cached.payload));
      } catch {
        // Ignore malformed cache and replace it with validated upstream data.
      }
    }

    let upstream: CwaFetchResult;
    try {
      upstream = await dependencies.fetchUpstream({
        apiKey,
        etag: cached?.etag ?? null
      });
    } catch (error) {
      return toResponse(
        errorResponse({
          status: error instanceof CwaUpstreamError ? 503 : 502,
          code: "UPSTREAM_UNAVAILABLE",
          message:
            error instanceof CwaUpstreamError
              ? "目前無法取得中央氣象署 UV 預報"
              : "中央氣象署 UV 預報格式暫時無法使用"
        })
      );
    }

    let forecast: UvForecastPayload;
    if (upstream.status === 304 && cached !== null) {
      try {
        forecast = {
          ...parseCachedForecast(cached.payload),
          fetchedAt: now.toISOString(),
          usableUntil: new Date(
            now.getTime() + 6 * 60 * 60 * 1000
          ).toISOString()
        };
      } catch {
        return toResponse(
          errorResponse({
            status: 503,
            code: "UPSTREAM_UNAVAILABLE",
            message: "目前沒有可使用的 UV 預報"
          })
        );
      }
    } else {
      try {
        forecast = mapCwaForecast(upstream.payload, {
          regionCode,
          fetchedAt: now.toISOString(),
          now: now.toISOString()
        });
      } catch (error) {
        const isClientDataError =
          error instanceof CwaMappingError &&
          ["REGION_NOT_FOUND", "UV_DATA_MISSING"].includes(error.reason);
        return toResponse(
          errorResponse({
            status: isClientDataError ? 422 : 503,
            code: isClientDataError
              ? "VALIDATION_ERROR"
              : "UPSTREAM_UNAVAILABLE",
            message: isClientDataError
              ? "目前沒有所選行政區的 UV 預報"
              : "中央氣象署 UV 預報格式暫時無法使用"
          })
        );
      }
    }

    try {
      await dependencies.writeCache({
        region_code: regionCode,
        schema_version: forecast.schemaVersion,
        source_dataset: CWA_DATASET,
        payload: forecast,
        fetched_at: forecast.fetchedAt,
        usable_until: forecast.usableUntil,
        etag: upstream.etag,
        updated_at: now.toISOString()
      });
    } catch {
      // A validated live forecast remains usable when server cache write fails.
    }

    return jsonResponse(forecast);
  };
}
