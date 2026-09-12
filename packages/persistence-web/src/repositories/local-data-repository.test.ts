import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { makeProductSnapshot } from "../../../test-fixtures/src/index";
import { SunshieldDatabase } from "../db/database";
import { LocalDataRepository } from "./local-data-repository";
import { LocalProductCatalogRepository } from "./local-product-catalog-repository";

const databases: SunshieldDatabase[] = [];

afterEach(async () => {
  await Promise.all(databases.map((database) => database.delete()));
  databases.length = 0;
});

function makeRepository() {
  const database = new SunshieldDatabase(`data-${crypto.randomUUID()}`);
  databases.push(database);
  let counter = 0;
  const repository = new LocalDataRepository({
    database,
    createId: () => `generated-${++counter}`
  });
  return { database, repository };
}

describe("LocalDataRepository 匯出", () => {
  it("不匯出裝置識別碼與訪客識別碼", async () => {
    const { database, repository } = makeRepository();
    await database.AppMetadata.bulkPut([
      { key: "localVisitorId", value: "visitor-secret" },
      { key: "deviceLocalId", value: "device-secret" },
      { key: "uvRegionPreferenceV1", value: '{"mode":"manual"}' }
    ]);

    const payload = await repository.exportData("2026-08-08T00:00:00.000Z");
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain("visitor-secret");
    expect(serialized).not.toContain("device-secret");
    // 地區偏好是使用者選的鄉鎮，屬於該保留的偏好。
    expect(serialized).toContain("uvRegionPreferenceV1");
  });

  it("不匯出 Session 上的 ownerKey", async () => {
    const { database, repository } = makeRepository();
    await database.ProtectionSessions.put({
      id: "session-1",
      ownerKey: "guest:visitor-secret",
      overallStatus: "tracking",
      startedAt: "2026-08-01T00:00:00.000Z",
      endedAt: null,
      revision: 1
    } as never);

    const payload = await repository.exportData("2026-08-08T00:00:00.000Z");
    const serialized = JSON.stringify(payload);

    expect(serialized).toContain("session-1");
    expect(serialized).not.toContain("ownerKey");
    expect(serialized).not.toContain("visitor-secret");
  });

  it("不匯出事件信封上的 commandId 與 idempotencyKey", async () => {
    const { database, repository } = makeRepository();
    await database.ContextEvents.put({
      id: "event-1",
      sessionId: "session-1",
      commandId: "command-secret",
      idempotencyKey: "idem-secret",
      contextType: "hand_wash"
    } as never);

    const serialized = JSON.stringify(
      await repository.exportData("2026-08-08T00:00:00.000Z")
    );

    expect(serialized).toContain("event-1");
    expect(serialized).not.toContain("idempotencyKey");
    expect(serialized).not.toContain("command-secret");
  });

  it("帶上格式版本與不支援匯入的說明", async () => {
    const { repository } = makeRepository();
    const payload = (await repository.exportData(
      "2026-08-08T00:00:00.000Z"
    )) as { formatVersion: string; notice: string; exportedAt: string };

    expect(payload.formatVersion).toBe("1.0.0");
    expect(payload.exportedAt).toBe("2026-08-08T00:00:00.000Z");
    expect(payload.notice).toContain("不支援匯入");
  });
});

describe("LocalDataRepository 摘要與清除", () => {
  it("摘要涵蓋規格要求的六項", async () => {
    const { database, repository } = makeRepository();
    await new LocalProductCatalogRepository(database).saveProduct({
      productId: "product-1",
      displayName: "日常防曬",
      gearCategory: "sunscreen",
      snapshot: makeProductSnapshot(),
      now: "2026-08-01T00:00:00.000Z"
    });
    await database.ActiveSessionLocks.put({
      ownerKey: "guest:visitor",
      sessionId: "session-1"
    } as never);
    await database.WeatherSnapshots.put({
      id: "snapshot-1",
      regionId: "region-1",
      sourceKind: "api",
      fetchedAt: "2026-08-07T10:00:00.000Z",
      usableUntil: "2026-08-08T10:00:00.000Z"
    });

    const summary = await repository.getSummary();

    expect(summary).toMatchObject({
      productCount: 1,
      hasActiveSession: true,
      endedSessionCount: 0,
      hasSetupDraft: false,
      lastWeatherSnapshotAt: "2026-08-07T10:00:00.000Z",
      lastClockCalibrationAt: null
    });
  });

  it("清除產品與歷史時保留進行中的提醒", async () => {
    const { database, repository } = makeRepository();
    await database.ActiveSessionLocks.put({
      ownerKey: "guest:visitor",
      sessionId: "session-active"
    } as never);
    await database.ProtectionSessions.bulkPut([
      { id: "session-active", ownerKey: "guest:visitor", revision: 1 },
      { id: "session-old", ownerKey: "guest:visitor", revision: 4 }
    ] as never);
    await database.ContextEvents.bulkPut([
      { id: "event-active", sessionId: "session-active" },
      { id: "event-old", sessionId: "session-old" }
    ] as never);
    await new LocalProductCatalogRepository(database).saveProduct({
      productId: "product-1",
      displayName: "日常防曬",
      gearCategory: "sunscreen",
      snapshot: makeProductSnapshot(),
      now: "2026-08-01T00:00:00.000Z"
    });

    await repository.clearProductsAndHistory();

    expect(await database.SunscreenProducts.count()).toBe(0);
    expect(
      await database.ProtectionSessions.get("session-active")
    ).toBeDefined();
    expect(
      await database.ProtectionSessions.get("session-old")
    ).toBeUndefined();
    expect(await database.ContextEvents.get("event-active")).toBeDefined();
    expect(await database.ContextEvents.get("event-old")).toBeUndefined();
  });

  it("清除全部後重新建立乾淨的必要 metadata", async () => {
    const { database, repository } = makeRepository();
    await database.AppMetadata.bulkPut([
      { key: "localVisitorId", value: "old-visitor" },
      { key: "deviceLocalId", value: "old-device" }
    ]);
    await new LocalProductCatalogRepository(database).saveProduct({
      productId: "product-1",
      displayName: "日常防曬",
      gearCategory: "sunscreen",
      snapshot: makeProductSnapshot(),
      now: "2026-08-01T00:00:00.000Z"
    });

    await repository.clearAll();

    expect(await database.SunscreenProducts.count()).toBe(0);
    const visitor = await database.AppMetadata.get("localVisitorId");
    const device = await database.AppMetadata.get("deviceLocalId");
    expect(visitor?.value).toBe("generated-1");
    expect(device?.value).toBe("generated-2");
    // 舊的識別碼不得殘留。
    expect(visitor?.value).not.toBe("old-visitor");
  });

  it("清除全部時保留尚待完成的背景推播撤銷憑證", async () => {
    const { database, repository } = makeRepository();
    await database.PushDeliveryState.put({
      id: "current-device",
      credentials: { deviceId: "device-a", deviceSecret: "secret-a" },
      intentRevision: 1,
      pendingIntent: {
        kind: "revoke",
        operationId: "11111111-1111-4111-8111-111111111111",
        remoteRevoked: false,
        credentialSnapshot: {
          deviceId: "device-a",
          deviceSecret: "secret-a"
        },
        revision: 1
      }
    });

    await repository.clearAll();

    await expect(
      database.PushDeliveryState.get("current-device")
    ).resolves.toEqual({
      id: "current-device",
      credentials: { deviceId: "device-a", deviceSecret: "secret-a" },
      intentRevision: 1,
      pendingIntent: {
        kind: "revoke",
        operationId: "11111111-1111-4111-8111-111111111111",
        remoteRevoked: false,
        credentialSnapshot: {
          deviceId: "device-a",
          deviceSecret: "secret-a"
        },
        revision: 1
      }
    });
  });
});

describe("LocalDataRepository 匯入還原", () => {
  it("完整匯入備份資料，正確賦予 ownerKey 並還原裝備與事件", async () => {
    const { database, repository } = makeRepository();
    // 預設本機有一些舊資料
    await database.AppMetadata.bulkPut([
      { key: "localVisitorId", value: "current-visitor-123" },
      { key: "deviceLocalId", value: "current-device-456" }
    ]);
    await new LocalProductCatalogRepository(database).saveProduct({
      productId: "old-product",
      displayName: "舊防曬",
      gearCategory: "sunscreen",
      snapshot: makeProductSnapshot(),
      now: "2026-08-01T00:00:00.000Z"
    });

    const validBackupPayload = {
      formatVersion: "1.0.0",
      application: "防曬晴報員",
      exportedAt: "2026-08-08T12:00:00.000Z",
      products: [
        {
          schemaVersion: "1.1.0",
          productId: "backup-product-1",
          displayName: "備份防曬乳",
          gearCategory: "sunscreen",
          currentSnapshot: makeProductSnapshot(),
          status: "active",
          statusChangedAt: "2026-08-08T00:00:00.000Z",
          createdAt: "2026-08-08T00:00:00.000Z",
          updatedAt: "2026-08-08T00:00:00.000Z"
        }
      ],
      sessions: [
        {
          id: "session-restored",
          overallStatus: "ended",
          startedAt: "2026-08-08T01:00:00.000Z",
          endedAt: "2026-08-08T03:00:00.000Z",
          revision: 1
        }
      ],
      zoneStates: [
        {
          sessionId: "session-restored",
          zoneInstanceId: "zone-1",
          bodyZoneCode: "face",
          timingStatus: "untimed",
          zoneDueAt: null
        }
      ],
      events: {
        sessionStarted: [
          {
            id: "evt-started-1",
            sessionId: "session-restored",
            effectiveOccurredAt: "2026-08-08T01:00:00.000Z"
          }
        ],
        zoneTracking: [],
        zoneMethod: [],
        applicationConfirmationGroups: [],
        applications: [],
        productSafety: [],
        context: [],
        sessionEnded: [
          {
            id: "evt-ended-1",
            sessionId: "session-restored",
            effectiveOccurredAt: "2026-08-08T03:00:00.000Z"
          }
        ]
      },
      preferences: {
        reminderPresentation: [
          { soundEnabled: true, vibrationEnabled: false }
        ],
        metadata: [
          { key: "uvRegionPreferenceV1", value: '{"mode":"manual"}' }
        ]
      }
    };

    const result = await repository.importData(validBackupPayload);

    expect(result).toEqual({ productCount: 1, sessionCount: 1 });

    // 舊資料應被清除，新資料被還原
    const products = await database.SunscreenProducts.toArray();
    expect(products).toHaveLength(1);
    expect(products[0]?.productId).toBe("backup-product-1");

    // Session 應被附加上本機 visitor 的 ownerKey
    const session = await database.ProtectionSessions.get("session-restored");
    expect(session?.ownerKey).toBe("guest:current-visitor-123");

    // 事件應成功還原
    const startedEvents = await database.SessionStartedEvents.toArray();
    expect(startedEvents).toHaveLength(1);
    expect(startedEvents[0]?.id).toBe("evt-started-1");

    // 偏好應附加上當前的 deviceLocalId
    const pref = await database.LocalReminderPresentationPreferences.get(
      "current-device-456"
    );
    expect(pref?.soundEnabled).toBe(true);

    // 本機訪客識別碼與偏好 metadata 應被妥善保留
    const meta = await database.AppMetadata.get("uvRegionPreferenceV1");
    expect(meta?.value).toBe('{"mode":"manual"}');
  });

  it("若格式不合則拋出 INVALID_BACKUP_PAYLOAD 且不更動現有資料", async () => {
    const { database, repository } = makeRepository();
    await new LocalProductCatalogRepository(database).saveProduct({
      productId: "product-remain",
      displayName: "維持原狀",
      gearCategory: "sunscreen",
      snapshot: makeProductSnapshot(),
      now: "2026-08-01T00:00:00.000Z"
    });

    const invalidPayload = {
      formatVersion: "9.9.9", // 版本不支援
      application: "其他惡意應用"
    };

    await expect(repository.importData(invalidPayload)).rejects.toThrow(
      "INVALID_BACKUP_PAYLOAD"
    );

    // 現有裝備維持原狀
    const products = await database.SunscreenProducts.toArray();
    expect(products).toHaveLength(1);
    expect(products[0]?.productId).toBe("product-remain");
  });

  it("匯入包含進行中 session 時，自動補上 ActiveSessionLocks", async () => {
    const { database, repository } = makeRepository();
    const backupWithActive = {
      formatVersion: "1.0.0",
      application: "防曬晴報員",
      exportedAt: "2026-08-08T12:00:00.000Z",
      products: [],
      sessions: [
        {
          id: "active-session-1",
          overallStatus: "tracking",
          startedAt: "2026-08-08T01:00:00.000Z",
          endedAt: null,
          revision: 1
        }
      ],
      zoneStates: [],
      events: {
        sessionStarted: [],
        zoneTracking: [],
        zoneMethod: [],
        applicationConfirmationGroups: [],
        applications: [],
        productSafety: [],
        context: [],
        sessionEnded: []
      },
      preferences: {
        reminderPresentation: [],
        metadata: []
      }
    };

    await repository.importData(backupWithActive);

    const locks = await database.ActiveSessionLocks.toArray();
    expect(locks).toHaveLength(1);
    expect(locks[0]?.sessionId).toBe("active-session-1");
  });
});

