import { fetchCwaDataset } from "../_shared/cwa.ts";
import { withCors } from "../_shared/http.ts";
import {
  createForecastCacheGateway,
  resolveSupabaseSecretKey
} from "./cacheGateway.ts";
import {
  createForecastHandler,
  type ForecastHandlerDependencies
} from "./handler.ts";

function createProductionDependencies(): ForecastHandlerDependencies {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const secretKey = resolveSupabaseSecretKey({
    SUPABASE_SECRET_KEYS: Deno.env.get("SUPABASE_SECRET_KEYS"),
    SUPABASE_SECRET_KEY: Deno.env.get("SUPABASE_SECRET_KEY"),
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  });
  const cache =
    supabaseUrl === undefined || secretKey === undefined
      ? null
      : createForecastCacheGateway({
          supabaseUrl,
          secretKey,
          fetch: (input, init) => fetch(input, init)
        });

  return {
    async readCache(regionCode) {
      if (cache === null) throw new Error("SERVER_CONFIGURATION_MISSING");
      return cache.readCache(regionCode);
    },
    async writeCache(row) {
      if (cache === null) throw new Error("SERVER_CONFIGURATION_MISSING");
      await cache.writeCache(row);
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
