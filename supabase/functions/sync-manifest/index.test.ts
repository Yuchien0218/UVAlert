import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeActiveSessionRecord } from "../../../packages/test-fixtures/src";
import {
  readManifestForUser,
  readSelectedRecords,
  type SyncRecordRow,
  type SyncTombstoneRow
} from "../_shared/sync";

const fetchedAt = "2026-08-17T09:00:00.000Z";
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

let handleManifest: typeof import("./index.ts").handleManifest;

function makeRequest(method: string): Request {
  return new Request("https://api.test/sync-manifest", {
    method,
    headers: { Origin: approvedOrigin }
  });
}

function hasExplicitJwtVerification(
  config: string,
  functionName: string
): boolean {
  const header = `[functions.${functionName}]`;
  const sectionStart = config.indexOf(header);
  if (sectionStart === -1) return false;

  const nextSection = config.indexOf("\n[", sectionStart + header.length);
  const section = config.slice(
    sectionStart,
    nextSection === -1 ? undefined : nextSection
  );
  return /^verify_jwt\s*=\s*true\s*$/m.test(section);
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
  ({ handleManifest } = await import("./index.ts"));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sync manifest boundary", () => {
  it("approved origin 的 OPTIONS 回 204，且不要求 JWT", async () => {
    const response = await handleManifest(makeRequest("OPTIONS"));

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      approvedOrigin
    );
    expect(runtime.requirePermanentUser).not.toHaveBeenCalled();
  });

  it("拒絕非 GET method，且不進入驗證", async () => {
    const response = await handleManifest(makeRequest("POST"));

    expect(response.status).toBe(405);
    expect(runtime.requirePermanentUser).not.toHaveBeenCalled();
  });

  it("未登入的 GET 仍交給 requirePermanentUser 回 401", async () => {
    const response = await handleManifest(makeRequest("GET"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      error: { code: "AUTH_REQUIRED" }
    });
    expect(runtime.requirePermanentUser).toHaveBeenCalledOnce();
  });

  it("四支 sync Function 都明確保留平台 JWT 驗證", () => {
    const config = readFileSync(
      new URL("../../config.toml", import.meta.url),
      "utf8"
    );

    for (const functionName of [
      "sync-manifest",
      "sync-commit",
      "sync-read",
      "sync-delete"
    ]) {
      expect(hasExplicitJwtVerification(config, functionName)).toBe(true);
    }
  });

  it("verify_jwt guard 不得跨越下一個 TOML section", () => {
    const config = [
      "[functions.sync-manifest]",
      "verify_jwt = false",
      "",
      "[functions.sync-commit]",
      "verify_jwt = true"
    ].join("\n");

    expect(hasExplicitJwtVerification(config, "sync-manifest")).toBe(false);
    expect(hasExplicitJwtVerification(config, "sync-commit")).toBe(true);
  });

  it("manifest 只回傳摘要，不包含 payload，且不同 user 的 row 不會被組進來", () => {
    const record = makeActiveSessionRecord();
    const rows: SyncRecordRow[] = [
      {
        record_kind: record.recordKind,
        record_id: record.recordId,
        schema_version: "sync-v1",
        revision: record.revision,
        payload_fingerprint: record.payloadFingerprint,
        payload: record.payload,
        updated_at: record.updatedAt
      }
    ];
    const manifest = readManifestForUser(rows, [], fetchedAt);

    expect(manifest.records).toEqual([
      expect.objectContaining({
        recordKind: record.recordKind,
        recordId: record.recordId,
        revision: 3
      })
    ]);
    expect(JSON.stringify(manifest)).not.toContain("eventStream");
    expect(manifest.records[0]).not.toHaveProperty("payload");
  });

  it("selected read 只回傳被要求的 key，並通過完整 record validation", () => {
    const first = makeActiveSessionRecord();
    const second = makeActiveSessionRecord({
      recordId: "second-session",
      payload: {
        ...first.payload,
        session: { ...first.payload.session, id: "second-session" },
        eventStream: {
          ...first.payload.eventStream,
          sessionStarted: {
            ...first.payload.eventStream.sessionStarted,
            sessionId: "second-session"
          }
        }
      }
    });
    const rows: SyncRecordRow[] = [first, second].map((record) => ({
      record_kind: record.recordKind,
      record_id: record.recordId,
      schema_version: "sync-v1",
      revision: record.revision,
      payload_fingerprint: record.payloadFingerprint,
      payload: record.payload,
      updated_at: record.updatedAt
    }));

    const response = readSelectedRecords(
      rows,
      [],
      [{ recordKind: first.recordKind, recordId: first.recordId }]
    );
    expect(response.records).toHaveLength(1);
    expect(response.records[0]?.recordId).toBe(first.recordId);
  });

  it("tombstone manifest 會保留 revision 與刪除時間", () => {
    const rows: SyncTombstoneRow[] = [
      {
        record_kind: "product_catalog",
        record_id: "product-1",
        schema_version: "sync-v1",
        revision: "4",
        deleted_at: fetchedAt
      }
    ];
    const manifest = readManifestForUser([], rows, fetchedAt);
    expect(manifest.tombstones).toEqual([
      expect.objectContaining({
        recordKind: "product_catalog",
        recordId: "product-1",
        revision: 4,
        deletedAt: fetchedAt
      })
    ]);
  });

  it("會把 Postgres timestamptz 正規化成 contract 要求的 Z 時間", () => {
    const record = makeActiveSessionRecord();
    const manifest = readManifestForUser(
      [
        {
          record_kind: record.recordKind,
          record_id: record.recordId,
          schema_version: "sync-v1",
          revision: record.revision,
          payload_fingerprint: record.payloadFingerprint,
          payload: record.payload,
          updated_at: "2026-08-17 09:00:00+00"
        }
      ],
      [],
      "2026-08-17 09:00:00+00"
    );

    expect(manifest.records[0]?.updatedAt).toBe("2026-08-17T09:00:00.000Z");
    expect(manifest.fetchedAt).toBe("2026-08-17T09:00:00.000Z");
  });

  it("不會把未支援 schema 的資料列當成合法摘要", () => {
    const record = makeActiveSessionRecord();
    expect(() =>
      readManifestForUser(
        [
          {
            record_kind: record.recordKind,
            record_id: record.recordId,
            schema_version: "legacy-v0",
            revision: record.revision,
            payload_fingerprint: record.payloadFingerprint,
            payload: record.payload,
            updated_at: record.updatedAt
          }
        ],
        [],
        fetchedAt
      )
    ).toThrow();
  });
});
