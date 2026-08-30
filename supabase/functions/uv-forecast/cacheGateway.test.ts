import { describe, expect, it, vi } from "vitest";
import {
  createForecastCacheGateway,
  resolveSupabaseSecretKey
} from "./cacheGateway";

describe("Supabase forecast cache gateway", () => {
  it("優先讀取新式 SUPABASE_SECRET_KEYS 的 default key", () => {
    expect(
      resolveSupabaseSecretKey({
        SUPABASE_SECRET_KEYS: JSON.stringify({ default: "sb_secret_new" }),
        SUPABASE_SERVICE_ROLE_KEY: "legacy-jwt"
      })
    ).toBe("sb_secret_new");
  });

  it("新式 secret key 只放在 apikey，不建立 Bearer Authorization", async () => {
    const fetch = vi.fn(
      async () =>
        new Response("[]", {
          status: 200,
          headers: { "content-type": "application/json" }
        })
    );
    const gateway = createForecastCacheGateway({
      supabaseUrl: "https://project.supabase.co",
      secretKey: "sb_secret_new",
      fetch
    });

    await gateway.readCache("65000010");

    const [, init] = fetch.mock.calls[0] ?? [];
    const headers = new Headers(init?.headers);
    expect(headers.get("apikey")).toBe("sb_secret_new");
    expect(headers.has("authorization")).toBe(false);
  });
});
