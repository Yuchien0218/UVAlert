import { describe, expect, it, vi } from "vitest";
import type { AuthPort } from "@sunshield/platform";
import { makeActiveSessionRecord } from "@sunshield/test-fixtures";
import { SupabaseCloudSyncAdapter } from "./SupabaseCloudSyncAdapter";

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

describe("SupabaseCloudSyncAdapter", () => {
  it("帶 bearer token 呼叫 manifest，並驗證 response contract", async () => {
    const fetch = vi.fn(async () =>
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
    const fetch = vi.fn(async () =>
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

    await expect(adapter.read({
      schemaVersion: "sync-v1",
      recordKeys: [
        {
          recordKind: "active_session",
          recordId: makeActiveSessionRecord().recordId
        }
      ]
    })).rejects.toMatchObject({
      status: 409,
      code: "SYNC_CONFLICT",
      message: "版本衝突"
    });
  });
});
