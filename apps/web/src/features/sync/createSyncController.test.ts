import { describe, expect, it, vi } from "vitest";
import {
  makeActiveSessionRecord,
  makeTombstone
} from "@sunshield/test-fixtures";
import type {
  CloudSyncPort,
  LocalSyncPort,
  LocalSyncSnapshot
} from "@sunshield/platform";
import type {
  SyncCommitResultV1,
  SyncCommitRequestV1,
  SyncManifestV1,
  SyncRecordEnvelopeV1,
  SyncReadRequestV1,
  SyncReadResponseV1,
  SyncTombstoneV1
} from "@sunshield/contracts";
import { createSyncController } from "./createSyncController";

const now = "2026-08-17T09:00:00.000Z";

function makeSnapshot(
  records: SyncRecordEnvelopeV1[] = [makeActiveSessionRecord()],
  tombstones: SyncTombstoneV1[] = []
): LocalSyncSnapshot {
  return { collectedAt: now, records, tombstones, metadata: [] };
}

function summaryOf(record: ReturnType<typeof makeActiveSessionRecord>) {
  return {
    schemaVersion: "sync-v1" as const,
    recordKind: record.recordKind,
    recordId: record.recordId,
    revision: record.revision,
    payloadFingerprint: record.payloadFingerprint,
    updatedAt: record.updatedAt
  };
}

function makeManifest(
  records: ReturnType<typeof summaryOf>[] = [],
  tombstones = []
): SyncManifestV1 {
  return {
    schemaVersion: "sync-v1",
    records,
    tombstones,
    fetchedAt: now
  };
}

function makeLocal(snapshot: LocalSyncSnapshot) {
  return {
    collectSyncSnapshot: vi.fn(async () => snapshot),
    getActiveSession: vi.fn(async () => snapshot.records[0] ?? null),
    applySelectedRecords: vi.fn(async () => undefined),
    applyTombstones: vi.fn(async () => undefined)
  } satisfies LocalSyncPort;
}

function makeCloud(options: {
  manifest: SyncManifestV1;
  read?: SyncReadResponseV1;
  commit?: SyncCommitResultV1;
  commitError?: unknown;
}) {
  return {
    getManifest: vi.fn(async () => options.manifest),
    read: vi.fn(async (_request: SyncReadRequestV1): Promise<SyncReadResponseV1> => options.read ?? {
      schemaVersion: "sync-v1",
      records: [],
      tombstones: []
    }),
    commit: vi.fn(async (_request: SyncCommitRequestV1): Promise<SyncCommitResultV1> => {
      if (options.commitError !== undefined) throw options.commitError;
      return options.commit ?? {
        schemaVersion: "sync-v1",
        committedRecords: [],
        committedTombstones: [],
        committedAt: now
      };
    }),
    delete: vi.fn(async () => ({
      schemaVersion: "sync-v1" as const,
      committedTombstones: [],
      committedAt: now
    })),
    deleteAccount: vi.fn(async () => undefined)
  } satisfies CloudSyncPort;
}

describe("createSyncController", () => {
  it("本機有資料、雲端空白時先預覽，再由確認才上傳", async () => {
    const record = makeActiveSessionRecord();
    const local = makeLocal(makeSnapshot([record]));
    const cloud = makeCloud({
      manifest: makeManifest(),
      commit: {
        schemaVersion: "sync-v1",
        committedRecords: [summaryOf(record)],
        committedTombstones: [],
        committedAt: now
      }
    });
    const controller = createSyncController({
      local,
      cloud,
      createId: () => "sync-idempotency",
      now: () => now
    });

    const preview = await controller.preparePreview();
    expect(preview?.items[0]).toMatchObject({
      status: "local_only",
      defaultAction: "upload"
    });
    expect(cloud.commit).not.toHaveBeenCalled();

    await expect(controller.confirm()).resolves.toBe(true);
    expect(cloud.commit).toHaveBeenCalledWith(
      expect.objectContaining({ idempotencyKey: "sync-idempotency" })
    );
    expect(local.applySelectedRecords).toHaveBeenCalledTimes(1);
  });

  it("雲端有資料、本機空白時下載並套用遠端 record", async () => {
    const record = makeActiveSessionRecord();
    const local = makeLocal(makeSnapshot([], []));
    const cloud = makeCloud({
      manifest: makeManifest([summaryOf(record)]),
      read: {
        schemaVersion: "sync-v1",
        records: [record],
        tombstones: []
      }
    });
    const controller = createSyncController({ local, cloud });

    expect((await controller.preparePreview())?.items[0]).toMatchObject({
      status: "remote_only",
      defaultAction: "download"
    });
    await expect(controller.confirm()).resolves.toBe(true);
    expect(cloud.read).toHaveBeenCalledWith({
      schemaVersion: "sync-v1",
      recordKeys: [{ recordKind: record.recordKind, recordId: record.recordId }]
    });
    expect(local.applySelectedRecords).toHaveBeenCalledWith([record]);
  });

  it("相同 fingerprint 視為 unchanged，不會重寫本機或雲端", async () => {
    const record = makeActiveSessionRecord();
    const local = makeLocal(makeSnapshot([record]));
    const cloud = makeCloud({ manifest: makeManifest([summaryOf(record)]) });
    const controller = createSyncController({ local, cloud });

    expect((await controller.preparePreview())?.items[0]?.status).toBe(
      "unchanged"
    );
    await expect(controller.confirm()).resolves.toBe(true);
    expect(cloud.read).not.toHaveBeenCalled();
    expect(cloud.commit).not.toHaveBeenCalled();
    expect(local.applySelectedRecords).not.toHaveBeenCalled();
  });

  it("revision conflict 若未選擇版本會停在預覽；雲端錯誤不套用本機", async () => {
    const localRecord = makeActiveSessionRecord();
    const remoteRecord = {
      ...localRecord,
      revision: 4,
      payloadFingerprint: "remote-different-fingerprint"
    };
    const local = makeLocal(makeSnapshot([localRecord]));
    const cloud = makeCloud({
      manifest: makeManifest([summaryOf(remoteRecord)]),
      commitError: {
        status: 409,
        code: "SYNC_CONFLICT",
        message: "版本衝突"
      }
    });
    const controller = createSyncController({ local, cloud });

    expect((await controller.preparePreview())?.items[0]?.status).toBe(
      "conflict"
    );
    await expect(controller.confirm()).resolves.toBe(false);
    expect(local.applySelectedRecords).not.toHaveBeenCalled();
    expect(controller.state.value.error?.code).toBe("VALIDATION_ERROR");

    await expect(
      controller.confirm({
        actions: {
          "active_session:sync-fixture-session": "upload"
        }
      })
    ).resolves.toBe(false);
    expect(local.applySelectedRecords).not.toHaveBeenCalled();
    expect(controller.state.value.error?.code).toBe("SYNC_CONFLICT");
  });

  it("取消預覽不呼叫本機套用", async () => {
    const record = makeActiveSessionRecord();
    const local = makeLocal(makeSnapshot([record]));
    const cloud = makeCloud({ manifest: makeManifest() });
    const controller = createSyncController({ local, cloud });

    await controller.preparePreview();
    controller.cancelPreview();
    await expect(controller.confirm()).resolves.toBe(false);
    expect(local.applySelectedRecords).not.toHaveBeenCalled();
    expect(local.applyTombstones).not.toHaveBeenCalled();
  });

  it("本機 tombstone 可作為上傳刪除的選項", async () => {
    const tombstone = makeTombstone();
    const local = makeLocal(makeSnapshot([], [tombstone]));
    const cloud = makeCloud({
      manifest: makeManifest(),
      commit: {
        schemaVersion: "sync-v1",
        committedRecords: [],
        committedTombstones: [tombstone],
        committedAt: now
      }
    });
    const controller = createSyncController({ local, cloud });

    expect((await controller.preparePreview())?.items[0]).toMatchObject({
      status: "local_deleted",
      defaultAction: "upload"
    });
    await expect(controller.confirm()).resolves.toBe(true);
    expect(cloud.commit).toHaveBeenCalledWith(
      expect.objectContaining({ tombstones: [expect.objectContaining({ tombstone })] })
    );
    expect(local.applyTombstones).toHaveBeenCalledWith([tombstone]);
  });
});
