import { describe, expect, it } from "vitest";
import { makeActiveSessionRecord } from "../../../packages/test-fixtures/src";
import {
  readManifestForUser,
  readSelectedRecords,
  type SyncRecordRow,
  type SyncTombstoneRow
} from "../_shared/sync";

const fetchedAt = "2026-08-17T09:00:00.000Z";

describe("sync manifest boundary", () => {
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
