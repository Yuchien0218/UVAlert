import { afterEach, describe, expect, it, vi } from "vitest";
import type { AuthPort } from "@sunshield/platform";
import { createWebAppServices } from "./createWebAppServices";

const auth: AuthPort = {
  async getState() {
    return {
      kind: "signed_in",
      userId: "user-1",
      accessTokenExpiresAt: null
    };
  },
  async getAccessToken() {
    return "test-access-token";
  },
  async signInWithGoogle() {},
  async signOut() {}
};

vi.mock("../adapters/SupabaseAuthAdapter", () => ({
  createSupabaseAuthAdapter: () => auth
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("createWebAppServices", () => {
  it("以設定的 API base 將已登入同步組合至原生 sync-manifest Function", async () => {
    vi.stubEnv(
      "VITE_API_BASE_URL",
      "https://ykfdnltaqpdytmrszbbk.supabase.co/functions/v1"
    );
    vi.stubEnv("VITE_SUPABASE_URL", "https://ykfdnltaqpdytmrszbbk.supabase.co");
    vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", "publishable-key");
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            schemaVersion: "sync-v1",
            records: [],
            tombstones: [],
            fetchedAt: "2026-09-06T00:00:00.000Z"
          }),
          { status: 200 }
        )
    );
    vi.stubGlobal("document", {
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    });
    vi.stubGlobal("addEventListener", vi.fn());
    vi.stubGlobal("removeEventListener", vi.fn());
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal("fetch", fetch);
    const services = createWebAppServices({
      databaseName: `web-services-${Date.now()}-${Math.random()}`,
      createId: () => "test-id"
    });

    try {
      await services.cloudSync.getManifest();

      expect(fetch).toHaveBeenCalledWith(
        "https://ykfdnltaqpdytmrszbbk.supabase.co/functions/v1/sync-manifest",
        expect.anything()
      );
    } finally {
      services.dispose();
    }
  });
});
