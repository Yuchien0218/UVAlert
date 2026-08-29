import { describe, expect, it, vi } from "vitest";
import type { AuthPort } from "@sunshield/platform";
import { makeActiveSessionRecord } from "@sunshield/test-fixtures";
import {
  createSupabaseCloudSyncAdapter,
  DisabledCloudSyncAdapter,
  SupabaseCloudSyncAdapter
} from "./SupabaseCloudSyncAdapter";

const now = "2026-08-17T09:00:00.000Z";

function makeAuth(options: { signedIn?: boolean } = {}): AuthPort {
  const signedIn = options.signedIn ?? true;
  return {
    async getState() {
      return signedIn
        ? {
            kind: "signed_in" as const,
            userId: "user-1",
            accessTokenExpiresAt: null
          }
        : { kind: "signed_out" as const };
    },
    async getAccessToken() {
      return signedIn ? "test-access-token" : null;
    },
    async signInWithGoogle() {},
    async signOut() {}
  };
}

function manifest() {
  return {
    schemaVersion: "sync-v1" as const,
    records: [],
    tombstones: [],
    fetchedAt: now
  };
}

function stubCloudSyncEnvironment(options: {
  baseUrl: string;
  supabaseUrl: string;
  publishableKey: string;
}) {
  vi.stubEnv("VITE_API_BASE_URL", options.baseUrl);
  vi.stubEnv("VITE_SUPABASE_URL", options.supabaseUrl);
  vi.stubEnv("VITE_SUPABASE_PUBLISHABLE_KEY", options.publishableKey);
}

describe("SupabaseCloudSyncAdapter", () => {
  it("cloud-sync base URL 是空字串時停用同步", () => {
    stubCloudSyncEnvironment({
      baseUrl: "",
      supabaseUrl: "",
      publishableKey: ""
    });

    const adapter = createSupabaseCloudSyncAdapter({
      auth: makeAuth(),
      baseUrl: ""
    });

    expect(adapter).toBeInstanceOf(DisabledCloudSyncAdapter);
  });

  it("cloud-sync base URL 只有空白字元且 Supabase 已設定時仍停用同步", () => {
    stubCloudSyncEnvironment({
      baseUrl: "",
      supabaseUrl: "https://project.supabase.co",
      publishableKey: "publishable-key"
    });

    const adapter = createSupabaseCloudSyncAdapter({
      auth: makeAuth(),
      baseUrl: "   "
    });

    expect(adapter).toBeInstanceOf(DisabledCloudSyncAdapter);
  });

  it.each([
    {
      baseUrl: "   ",
      supabaseUrl: "",
      publishableKey: "",
      expected: DisabledCloudSyncAdapter
    },
    {
      baseUrl: " /v1 ",
      supabaseUrl: "",
      publishableKey: "",
      expected: SupabaseCloudSyncAdapter
    },
    {
      baseUrl: "",
      supabaseUrl: " https://project.supabase.co ",
      publishableKey: " publishable-key ",
      expected: SupabaseCloudSyncAdapter
    },
    {
      baseUrl: "",
      supabaseUrl: "   ",
      publishableKey: "publishable-key",
      expected: DisabledCloudSyncAdapter
    }
  ])(
    "依環境矩陣選擇正確的 cloud-sync adapter",
    ({ baseUrl, supabaseUrl, publishableKey, expected }) => {
      stubCloudSyncEnvironment({
        baseUrl,
        supabaseUrl,
        publishableKey
      });

      const adapter = createSupabaseCloudSyncAdapter({
        auth: makeAuth()
      });

      expect(adapter).toBeInstanceOf(expected);
    }
  );

  it("明確傳入空白 base URL 時停用同步且不送出 request", async () => {
    stubCloudSyncEnvironment({
      baseUrl: "https://api.example/v1",
      supabaseUrl: "https://project.supabase.co",
      publishableKey: "publishable-key"
    });
    const fetch = vi.fn();
    const adapter = createSupabaseCloudSyncAdapter({
      auth: makeAuth(),
      fetch,
      baseUrl: "   "
    });

    await expect(adapter.getManifest()).rejects.toMatchObject({
      status: 503,
      code: "SERVER_ERROR",
      message: "雲端同步尚未設定"
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("省略 base URL 且環境值只有空白時，request 仍使用既有 /v1 fallback", async () => {
    stubCloudSyncEnvironment({
      baseUrl: "   ",
      supabaseUrl: " https://project.supabase.co ",
      publishableKey: " publishable-key "
    });
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(manifest()), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
    );
    const adapter = createSupabaseCloudSyncAdapter({
      auth: makeAuth(),
      fetch
    });

    await expect(adapter.getManifest()).resolves.toEqual(manifest());
    expect(fetch).toHaveBeenCalledWith(
      "/v1/sync/manifest",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-access-token"
        })
      })
    );
  });

  it("帶 bearer token 呼叫 manifest，並驗證 response contract", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(JSON.stringify(manifest()), {
          status: 200,
          headers: { "Content-Type": "application/json" }
        })
    );
    const adapter = new SupabaseCloudSyncAdapter({
      auth: makeAuth(),
      fetch,
      baseUrl: "/v1"
    });

    await expect(adapter.getManifest()).resolves.toEqual(manifest());
    expect(fetch).toHaveBeenCalledWith(
      "/v1/sync/manifest",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-access-token"
        })
      })
    );
  });

  it("未登入時回 AUTH_REQUIRED，且不送出 request", async () => {
    const fetch = vi.fn();
    const adapter = new SupabaseCloudSyncAdapter({
      auth: makeAuth({ signedIn: false }),
      fetch,
      baseUrl: "/v1"
    });

    await expect(adapter.getManifest()).rejects.toMatchObject({
      status: 401,
      code: "AUTH_REQUIRED"
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it("保留 409 conflict code，且不把 server stack 暴露成錯誤訊息", async () => {
    const fetch = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error: { code: "SYNC_CONFLICT", message: "版本衝突" },
            stack: "private stack"
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        )
    );
    const adapter = new SupabaseCloudSyncAdapter({
      auth: makeAuth(),
      fetch,
      baseUrl: "/v1"
    });

    await expect(
      adapter.read({
        schemaVersion: "sync-v1",
        recordKeys: [
          {
            recordKind: "active_session",
            recordId: makeActiveSessionRecord().recordId
          }
        ]
      })
    ).rejects.toMatchObject({
      status: 409,
      code: "SYNC_CONFLICT",
      message: "版本衝突"
    });
  });
});
