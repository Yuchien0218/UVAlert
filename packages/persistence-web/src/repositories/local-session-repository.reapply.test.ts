import "fake-indexeddb/auto";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  ReapplyCommandV1Schema,
  fingerprintProductLabelSnapshot
} from "@sunshield/contracts";
import {
  makeProductSnapshot,
  makeStartSessionCommand
} from "../../../test-fixtures/src/index";
import { SunshieldDatabase } from "../db/database";
import { LocalProductCatalogRepository } from "./local-product-catalog-repository";
import { LocalSessionRepository } from "./local-session-repository";

const databases: SunshieldDatabase[] = [];
const clock = {
  status: "trusted",
  trustedNow: "2026-08-01T10:30:00.000Z",
  connectivity: "online"
} as const;

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

describe("LocalSessionRepository.reapply", () => {
  it("原子提交 confirmation group、events、projection、revision、sequence 與 receipt，重送冪等", async () => {
    const database = new SunshieldDatabase(`reapply-${crypto.randomUUID()}`);
    databases.push(database);
    const repository = new LocalSessionRepository({
      database,
      sourceContextId: "test"
    });
    const catalog = new LocalProductCatalogRepository(database);
    const start = makeStartSessionCommand({ idPrefix: "atomic" });
    expect((await repository.startSession(start, clock)).ok).toBe(true);
    const snapshot = makeProductSnapshot({
      capturedAt: "2026-08-01T10:00:00.000Z"
    });
    const product = await catalog.saveProduct({
      productId: "product-new",
      displayName: "戶外防曬",
      gearCategory: "sunscreen",
      snapshot,
      now: clock.trustedNow
    });
    const command = ReapplyCommandV1Schema.parse({
      commandVersion: "1.0.0",
      commandType: "record_reapplication",
      commandId: "reapply-command",
      idempotencyKey: "reapply-idem",
      owner: { type: "guest", localVisitorId: "visitor-1" },
      deviceLocalId: "device-1",
      sessionId: start.sessionId,
      clientSequence: 2,
      clientCreatedAt: clock.trustedNow,
      expectedRevision: 1,
      payload: {
        applicationConfirmationId: "reapply-group",
        appliedAt: "2026-08-01T10:25:00.000Z",
        applications: [
          {
            eventId: "reapply-event",
            zoneInstanceIds: ["atomic-zone-face"],
            sourceProductId: product.productId,
            productSnapshotFingerprint: product.snapshotFingerprint,
            productLabelSnapshot: product.currentSnapshot
          }
        ]
      }
    });

    const first = await repository.reapply(command, clock);
    const second = await repository.reapply(command, clock);

    expect(first.ok).toBe(true);
    expect(second).toEqual(first);
    expect(
      await database.ApplicationConfirmationGroups.get("reapply-group")
    ).toBeDefined();
    expect(await database.ApplicationEvents.get("reapply-event")).toBeDefined();
    expect(
      (await database.ProtectionSessions.get(start.sessionId))?.revision
    ).toBe(2);
    expect(
      (await database.ClientSequences.get(["device-1", start.sessionId]))
        ?.lastSequence
    ).toBe(2);
    expect(await database.CommandReceipts.get("reapply-idem")).toBeDefined();
  });

  it("拒絕 stale product snapshot 且不留下部分資料", async () => {
    const database = new SunshieldDatabase(
      `reapply-stale-${crypto.randomUUID()}`
    );
    databases.push(database);
    const repository = new LocalSessionRepository({
      database,
      sourceContextId: "test"
    });
    const catalog = new LocalProductCatalogRepository(database);
    const start = makeStartSessionCommand({ idPrefix: "stale" });
    await repository.startSession(start, clock);
    const product = await catalog.saveProduct({
      productId: "product-new",
      displayName: "戶外防曬",
      gearCategory: "sunscreen",
      snapshot: makeProductSnapshot(),
      now: clock.trustedNow
    });
    const command = ReapplyCommandV1Schema.parse({
      commandVersion: "1.0.0",
      commandType: "record_reapplication",
      commandId: "stale-command",
      idempotencyKey: "stale-idem",
      owner: { type: "guest", localVisitorId: "visitor-1" },
      deviceLocalId: "device-1",
      sessionId: start.sessionId,
      clientSequence: 2,
      clientCreatedAt: clock.trustedNow,
      expectedRevision: 1,
      payload: {
        applicationConfirmationId: "stale-group",
        appliedAt: "2026-08-01T10:25:00.000Z",
        applications: [
          {
            eventId: "stale-event",
            zoneInstanceIds: ["stale-zone-face"],
            sourceProductId: product.productId,
            productSnapshotFingerprint: "stale-fingerprint",
            productLabelSnapshot: product.currentSnapshot
          }
        ]
      }
    });

    const result = await repository.reapply(command, clock);

    expect(result).toMatchObject({ ok: false, code: "PRODUCT_CONFLICT" });
    expect(
      await database.ApplicationConfirmationGroups.get("stale-group")
    ).toBeUndefined();
    expect(
      (await database.ProtectionSessions.get(start.sessionId))?.revision
    ).toBe(1);
  });

  it("transaction 中途失敗時回滾 group、event 與 revision", async () => {
    const database = new SunshieldDatabase(
      `reapply-rollback-${crypto.randomUUID()}`
    );
    databases.push(database);
    const repository = new LocalSessionRepository({
      database,
      sourceContextId: "test"
    });
    const start = makeStartSessionCommand({ idPrefix: "rollback" });
    await repository.startSession(start, clock);
    const snapshot = makeProductSnapshot();
    const command = ReapplyCommandV1Schema.parse({
      commandVersion: "1.0.0",
      commandType: "record_reapplication",
      commandId: "rollback-command",
      idempotencyKey: "rollback-idem",
      owner: { type: "guest", localVisitorId: "visitor-1" },
      deviceLocalId: "device-1",
      sessionId: start.sessionId,
      clientSequence: 2,
      clientCreatedAt: clock.trustedNow,
      expectedRevision: 1,
      payload: {
        applicationConfirmationId: "rollback-group",
        appliedAt: "2026-08-01T10:25:00.000Z",
        applications: [
          {
            eventId: "rollback-event",
            zoneInstanceIds: ["rollback-zone-face"],
            sourceProductId: null,
            productSnapshotFingerprint:
              fingerprintProductLabelSnapshot(snapshot),
            productLabelSnapshot: snapshot
          }
        ]
      }
    });
    vi.spyOn(database.ProtectionZoneStates, "bulkPut").mockRejectedValueOnce(
      new Error("injected failure")
    );

    expect(await repository.reapply(command, clock)).toMatchObject({
      ok: false,
      code: "PERSISTENCE_ERROR"
    });
    expect(
      await database.ApplicationConfirmationGroups.get("rollback-group")
    ).toBeUndefined();
    expect(
      await database.ApplicationEvents.get("rollback-event")
    ).toBeUndefined();
    expect(
      (await database.ProtectionSessions.get(start.sessionId))?.revision
    ).toBe(1);
    expect(await database.CommandReceipts.get("rollback-idem")).toBeUndefined();
  });
});
