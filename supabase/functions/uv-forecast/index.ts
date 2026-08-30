import { createClient } from "npm:@supabase/supabase-js@2";
import { fetchCwaDataset } from "../_shared/cwa.ts";
import { withCors } from "../_shared/http.ts";
import {
  createForecastHandler,
  type ForecastCacheRow,
  type ForecastHandlerDependencies
} from "./handler.ts";

function createProductionDependencies(): ForecastHandlerDependencies {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const client =
    supabaseUrl === undefined || serviceRoleKey === undefined
      ? null
      : createClient(supabaseUrl, serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false }
        });

  return {
    async readCache(regionCode) {
      if (client === null) throw new Error("SERVER_CONFIGURATION_MISSING");
      const result = await client
        .from("uv_forecast_cache")
        .select(
          "region_code,schema_version,source_dataset,payload,fetched_at,usable_until,etag"
        )
        .eq("region_code", regionCode)
        .maybeSingle();
      if (result.error !== null) throw result.error;
      return result.data as ForecastCacheRow | null;
    },
    async writeCache(row) {
      if (client === null) throw new Error("SERVER_CONFIGURATION_MISSING");
      const result = await client.from("uv_forecast_cache").upsert(row);
      if (result.error !== null) throw result.error;
    },
    fetchUpstream({ apiKey, etag }) {
      return fetchCwaDataset({
        fetch: (input, init) => fetch(input, init),
        apiKey,
        etag
      });
    },
    readSecret(name) {
      return Deno.env.get(name);
    },
    now() {
      return new Date();
    }
  };
}

const handleForecast = createForecastHandler(createProductionDependencies());

Deno.serve(async (request) => withCors(await handleForecast(request), request));
