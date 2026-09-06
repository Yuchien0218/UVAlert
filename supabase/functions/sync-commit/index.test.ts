import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeActiveSessionRecord } from "../../../packages/test-fixtures/src";
import {
  buildConflict,
  parseSyncCommitRequest,
  parseSyncDeleteRequest,
  SyncValidationError,
  validateSyncRecord
} from "../_shared/sync";

const approvedOrigin = "https://uv-alert-web.vercel.app";

const runtime = vi.hoisted(() => {
  const requirePermanentUser = vi.fn(async () => ({
    ok: false as const,
    response: new Response(
      JSON.stringify({ error: { code: "AUTH_REQUIRED" } }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    )
  }));

  return { requirePermanentUser };
});

vi.mock("../_shared/auth.ts", () => ({
  requirePermanentUser: runtime.requirePermanentUser
}));

let handleCommit: typeof import("./index.ts").handleCommit;

function makeRequest(method: string): Request {
  return new Request("https://api.test/sync-commit", {
    method,
    headers: { Origin: approvedOrigin }
  });
}

beforeEach(async () => {
  vi.resetModules();
  runtime.requirePermanentUser.mockClear();
  vi.stubGlobal("Deno", {
    env: {
      get: (key: string) =>
        key === "ALLOWED_ORIGINS" ? approvedOrigin : undefined
    },
    serve: vi.fn()
  });
  ({ handleCommit } = await import("./index.ts"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sync commit boundary", () => {
  it("approved origin 的 OPTIONS 回 204，且不要求 JWT", async () => {
    const response = await handleCommit(makeRequest("OPTIONS"));

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      approvedOrigin
    );
    expect(runtime.requirePermanentUser).not.toHaveBeenCalled();
  });

  it("拒絕非 POST method，且不進入驗證", async () => {
    const response = await handleCommit(makeRequest("GET"));

    expect(response.status).toBe(405);
    expect(runtime.requirePermanentUser).not.toHaveBeenCalled();
  });

  it("未登入的 POST 仍交給 requirePermanentUser 回 401", async () => {
    const response = await handleCommit(makeRequest("POST"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "AUTH_REQUIRED" }
    });
    expect(runtime.requirePermanentUser).toHaveBeenCalledOnce();
  });

  it("接受版本化 record 與 expectedRevision", () => {
    const record = makeActiveSessionRecord();
    const request = parseSyncCommitRequest({
      schemaVersion: "sync-v1",
      idempotencyKey: "commit-1",
      records: [{ record, expectedRevision: null }],
      tombstones: []
    });
    expect(request.records[0]?.record.recordKind).toBe("active_session");
  });

  it("record kind 與 payload 不一致、ownerKey 或重複 key 都會拒絕", () => {
    const record = makeActiveSessionRecord();
    expect(() =>
      validateSyncRecord({
        ...record,
        recordKind: "product_catalog",
        payload: record.payload
      })
    ).toThrow(SyncValidationError);
    expect(() =>
      validateSyncRecord({
        ...record,
        payload: {
          ...record.payload,
          session: { ...record.payload.session, ownerKey: "guest:private" }
        }
      })
    ).toThrow(SyncValidationError);
    expect(() =>
      parseSyncCommitRequest({
        schemaVersion: "sync-v1",
        idempotencyKey: "commit-duplicate",
        records: [
          { record, expectedRevision: null },
          { record, expectedRevision: null }
        ],
        tombstones: []
      })
    ).toThrow(SyncValidationError);
  });

  it("delete request 需要正確 revision，conflict payload 不包含完整遠端 payload", () => {
    const request = parseSyncDeleteRequest({
      schemaVersion: "sync-v1",
      idempotencyKey: "delete-1",
      records: [
        {
          key: { recordKind: "product_catalog", recordId: "product-1" },
          expectedRevision: 4
        }
      ]
    });
    const conflict = buildConflict({
      recordKey: request.records[0]!.key,
      localRevision: 5,
      remoteRevision: 6,
      remoteSummary: {
        recordKind: "product_catalog",
        recordId: "product-1",
        schemaVersion: "sync-v1",
        revision: 6,
        payloadFingerprint: "remote-fingerprint",
        updatedAt: "2026-08-17T09:00:00.000Z"
      },
      detectedAt: "2026-08-17T09:00:00.000Z"
    });
    expect(conflict).not.toHaveProperty("payload");
    expect(() =>
      parseSyncDeleteRequest({
        schemaVersion: "sync-v1",
        idempotencyKey: "delete-invalid",
        records: [
          {
            key: { recordKind: "product_catalog", recordId: "product-1" },
            expectedRevision: 0
          }
        ]
      })
    ).toThrow(SyncValidationError);
  });
});
