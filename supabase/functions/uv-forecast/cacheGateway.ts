import type { ForecastCacheRow } from "./handler.ts";

type SupabaseEnvironment = {
  SUPABASE_SECRET_KEYS?: string;
  SUPABASE_SECRET_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export function resolveSupabaseSecretKey(
  environment: SupabaseEnvironment
): string | undefined {
  const secretKeys = environment.SUPABASE_SECRET_KEYS;
  if (secretKeys !== undefined) {
    try {
      const parsed = JSON.parse(secretKeys) as Record<string, unknown>;
      if (typeof parsed.default === "string" && parsed.default.length > 0) {
        return parsed.default;
      }
    } catch {
      // Fall back to single-key and legacy environments below.
    }
  }

  return (
    environment.SUPABASE_SECRET_KEY ?? environment.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function createForecastCacheGateway(options: {
  supabaseUrl: string;
  secretKey: string;
  fetch: typeof fetch;
}) {
  const endpoint = new URL("/rest/v1/uv_forecast_cache", options.supabaseUrl);

  return {
    async readCache(regionCode: string): Promise<ForecastCacheRow | null> {
      const url = new URL(endpoint);
      url.searchParams.set(
        "select",
        "region_code,schema_version,source_dataset,payload,fetched_at,usable_until,etag"
      );
      url.searchParams.set("region_code", `eq.${regionCode}`);
      url.searchParams.set("limit", "1");

      const response = await options.fetch(url, {
        headers: { apikey: options.secretKey }
      });
      if (!response.ok) {
        const error = (await response.json().catch(() => null)) as {
          code?: unknown;
        } | null;
        const errorCode =
          typeof error?.code === "string" ? `_${error.code}` : "";
        throw new Error(`CACHE_READ_FAILED_${response.status}${errorCode}`);
      }

      const rows = (await response.json()) as ForecastCacheRow[];
      return rows[0] ?? null;
    },

    async writeCache(
      row: ForecastCacheRow & { updated_at: string }
    ): Promise<void> {
      const url = new URL(endpoint);
      url.searchParams.set("on_conflict", "region_code");
      const response = await options.fetch(url, {
        method: "POST",
        headers: {
          apikey: options.secretKey,
          "content-type": "application/json",
          prefer: "resolution=merge-duplicates,return=minimal"
        },
        body: JSON.stringify(row)
      });
      if (!response.ok) {
        throw new Error(`CACHE_WRITE_FAILED_${response.status}`);
      }
    }
  };
}
