import { describe, expect, it } from "vitest";
import { makeActiveSessionRecord } from "../../../packages/test-fixtures/src";
import {
  buildConflict,
  parseSyncCommitRequest,
  parseSyncDeleteRequest,
  SyncValidationError,
  validateSyncRecord
} from "../_shared/sync";

describe("sync commit boundary", () => {
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
