import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  PRODUCT_CATALOG_RECORD_VERSION,
  ProductCatalogRecordV1Schema,
  type SyncRecordEnvelopeV1
} from "@sunshield/contracts";
import {
  makeProductSnapshot,
  makeStartSessionCommand
} from "../../../test-fixtures/src/index";
import { SunshieldDatabase } from "../db/database";
import { LocalProductCatalogRepository } from "./local-product-catalog-repository";
import { LocalSessionRepository } from "./local-session-repository";
import { LocalSyncRepository } from "./local-sync-repository";

const databases: SunshieldDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

function makeDatabase(name: string): SunshieldDatabase {
  const database = new SunshieldDatabase(`${name}-${crypto.randomUUID()}`);
  databases.push(database);
  return database;
}

function makeProduct(productId = "product-sync") {
  return ProductCatalogRecordV1Schema.parse({
    schemaVersion: PRODUCT_CATALOG_RECORD_VERSION,
    productId,
    displayName: "日常防曬",
    gearCategory: "sunscreen",
    currentSnapshot: makeProductSnapshot(),
    snapshotFingerprint: "snapshot-sync",
    purchaseMonth: null,
    expiryDate: null,
    note: "只在本機測試使用",
    archivedAt: null,
    createdAt: "2026-08-17T08:00:00.000Z",
    updatedAt: "2026-08-17T08:00:00.000Z",
    status: "active"
  });
}

describe("LocalSyncRepository", () => {
  it("snapshot excludes ended sessions, UV cache, drafts and device identity", async () => {
    const database = makeDatabase("sync-privacy");
    await database.SunscreenProducts.put(makeProduct());
    await database.ProtectionSessions.put({
      id: "ended-session",
      ownerKey: "guest:visitor-1",
      rulesetVersion: "p0-working-v1",
      setupEntryMode: "quick_preset",
      presetDecision: "accepted",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
      startedAt: "2026-08-16T08:00:00.000Z",
      endedAt: "2026-08-16T12:00:00.000Z",
      endedReason: "user_ended",
      overallStatus: "ended",
      sessionNextDueAt: null,
      primaryAction: {
        presentationType: "untimed_action_card",
        variant: "neutral_physical",
        actionKind: "view_ended_state",
        affectedZoneInstanceIds: [],
        actionAt: null,
        reasonCodes: ["SESSION_ENDED"],
        derivedFromEventRefs: ["ended-event"]
      },
      derivedFromEventRefs: ["ended-event"],
      revision: 2,
      updatedAt: "2026-08-16T12:00:00.000Z"
    });
    await database.SetupDrafts.put({
      id: "draft-1",
      localDraftFlowId: "flow-1",
      schemaVersion: "1.0.0",
      ownerKey: "guest:visitor-1",
      currentStep: "context",
      bodyZoneSchemaVersion: "BODY_ZONE_V3",
      setupEntryMode: "self_select",
      suggestedPresetId: null,
      suggestedPresetVersion: null,
      presetDecision: null,
      initialContext: null,
      initialShade: null,
      updatedAt: "2026-08-17T08:00:00.000Z",
      expiresAt: "2026-08-18T08:00:00.000Z",
      zones: [],
      applications: [],
      pendingTiming: null,
      createdAt: "2026-08-17T08:00:00.000Z"
    });
    await database.WeatherSnapshots.put({
      id: "weather-1",
      regionId: "63000010",
      sourceKind: "forecast",
      fetchedAt: "2026-08-17T08:00:00.000Z",
      usableUntil: "2026-08-18T08:00:00.000Z"
    });
    await database.AppMetadata.bulkPut([
      { key: "localVisitorId", value: "visitor-1" },
      { key: "deviceLocalId", value: "device-1" },
      { key: "exactLatitude", value: "25.03" }
    ]);

    const repository = new LocalSyncRepository({
      database,
      localVisitorId: "visitor-1",
      now: () => "2026-08-17T09:00:00.000Z"
    });
    const snapshot = await repository.collectSyncSnapshot();

    expect(snapshot.records.map(({ recordKind }) => recordKind)).toEqual([
      "product_catalog",
      "user_preferences"
    ]);
    expect(snapshot.records.map(({ recordId }) => recordId)).not.toContain(
      "ended-session"
    );
    expect(JSON.stringify(snapshot)).not.toContain("deviceLocalId");
    expect(JSON.stringify(snapshot)).not.toContain("exactLatitude");
    expect(JSON.stringify(snapshot)).not.toContain("weather-1");
    expect(JSON.stringify(snapshot)).not.toContain("draft-1");
  });

  it("只收集進行中的 session，且不把 ownerKey 上傳", async () => {
    const database = makeDatabase("sync-active");
    const sessionRepository = new LocalSessionRepository({
      database,
      sourceContextId: "sync-test"
    });
    const started = await sessionRepository.startSession(
      makeStartSessionCommand({ idPrefix: "sync-active" }),
      {
        status: "trusted",
        connectivity: "online",
        trustedNow: "2026-08-17T09:00:00.000Z"
      }
    );
    expect(started.ok).toBe(true);

    const repository = new LocalSyncRepository({
      database,
      localVisitorId: "visitor-1",
      now: () => "2026-08-17T09:00:00.000Z"
    });
    const active = (await repository.collectSyncSnapshot()).records.find(
      (record) => record.recordKind === "active_session"
    );

    expect(active?.recordId).toBe("sync-active-session");
    expect(active?.payload).toMatchObject({
      session: { id: "sync-active-session" }
    });
    expect(active?.payload).not.toHaveProperty("session.ownerKey");
  });

  it("套用 active session 時在本機補回 ownerKey 與 projection", async () => {
    const database = makeDatabase("sync-active-apply");
    const sessionRepository = new LocalSessionRepository({
      database,
      sourceContextId: "sync-test"
    });
    await sessionRepository.startSession(
      makeStartSessionCommand({ idPrefix: "sync-apply" }),
      {
        status: "trusted",
        connectivity: "online",
        trustedNow: "2026-08-17T09:00:00.000Z"
      }
    );
    const localSync = new LocalSyncRepository({
      database,
      localVisitorId: "visitor-1",
      now: () => "2026-08-17T09:00:00.000Z"
    });
    const active = (await localSync.collectSyncSnapshot()).records.find(
      (record) => record.recordKind === "active_session"
    );
    expect(active).toBeDefined();

    await localSync.applySelectedRecords([active!]);

    expect(
      await database.ProtectionSessions.get("sync-apply-session")
    ).toMatchObject({
      id: "sync-apply-session",
      ownerKey: "guest:visitor-1"
    });
    expect(
      await database.ActiveSessionLocks.get("guest:visitor-1")
    ).toMatchObject({ sessionId: "sync-apply-session" });
    expect(
      await database.ProtectionZoneStates.where("sessionId")
        .equals("sync-apply-session")
        .count()
    ).toBeGreaterThan(0);
  });

  it("套用遠端 record 時整批驗證，失敗不會留下部分本機資料", async () => {
    const database = makeDatabase("sync-atomic");
    const repository = new LocalSyncRepository({
      database,
      localVisitorId: "visitor-1",
      now: () => "2026-08-17T09:00:00.000Z"
    });
    const validRecord = (await repository.collectSyncSnapshot()).records.find(
      (record) => record.recordKind === "user_preferences"
    );
    expect(validRecord).toBeDefined();

    const invalidRecord = {
      ...validRecord,
      recordKind: "region_preference",
      payload: { schemaVersion: "not-a-region" }
    } as unknown as SyncRecordEnvelopeV1;

    await expect(
      repository.applySelectedRecords([validRecord!, invalidRecord])
    ).rejects.toThrow();
    expect(await database.AppMetadata.get("userPreferencesV1")).toBeUndefined();
  });

  it("本機刪除已同步產品後會產生 tombstone，套用 tombstone 也會刪除產品", async () => {
    const database = makeDatabase("sync-tombstone");
    const catalog = new LocalProductCatalogRepository(database);
    await catalog.saveProduct({
      productId: "product-delete",
      displayName: "要刪除的防曬",
      gearCategory: "sunscreen",
      snapshot: makeProductSnapshot(),
      now: "2026-08-17T08:00:00.000Z"
    });
    const repository = new LocalSyncRepository({
      database,
      localVisitorId: "visitor-1",
      now: () => "2026-08-17T09:00:00.000Z"
    });
    await repository.collectSyncSnapshot();
    await catalog.deleteProduct("product-delete");
    const snapshot = await repository.collectSyncSnapshot();
    const tombstone = snapshot.tombstones.find(
      (item) => item.recordId === "product-delete"
    );
    expect(tombstone).toMatchObject({
      recordKind: "product_catalog",
      revision: 2
    });

    await repository.applyTombstones([tombstone!]);
    expect(
      await database.SunscreenProducts.get("product-delete")
    ).toBeUndefined();
    expect(
      await database.SyncMetadata.get(["product_catalog", "product-delete"])
    ).toMatchObject({ tombstone: true, cloudRevision: 2 });
  });
});
