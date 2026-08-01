import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
  InvalidationMessage,
  CrossContextNotifier
} from "@sunshield/persistence-web";
import {
  LocalSessionRepository,
  LocalRegionPreferenceRepository,
  LocalSetupDraftRepository,
  LocalWeatherForecastRepository,
  SunshieldDatabase
} from "@sunshield/persistence-web";
import {
  BODY_ZONE_SCHEMA_VERSION,
  REGION_PREFERENCE_SCHEMA_VERSION,
  SETUP_DRAFT_SCHEMA_VERSION,
  type RegionSelection,
  type SetupDraftV1,
  type ZoneProjection
} from "@sunshield/contracts";
import {
  makeClock,
  makeEndSessionCommand,
  makeFiveDayUvForecast,
  makeStartSessionCommand
} from "./index";

let databaseCounter = 0;
let database: SunshieldDatabase;
let repository: LocalSessionRepository;
let notifier: RecordingNotifier;

class RecordingNotifier implements CrossContextNotifier {
  readonly messages: InvalidationMessage[] = [];

  publish(message: InvalidationMessage): void {
    this.messages.push(message);
  }

  subscribe(_listener: (message: InvalidationMessage) => void): () => void {
    return () => undefined;
  }
}

beforeEach(async () => {
  databaseCounter += 1;
  database = new SunshieldDatabase(
    `sunshield-test-${databaseCounter}`
  );
  notifier = new RecordingNotifier();
  repository = new LocalSessionRepository({
    database,
    notifier,
    sourceContextId: "test-context"
  });
  await repository.open();
});

afterEach(async () => {
  database.close();
  await database.delete();
});

describe("IndexedDB atomic command transactions", () => {
  it("同一 transaction 寫入事件、projection、lock、sequence 與 receipt", async () => {
    const command = makeStartSessionCommand();
    const result = await repository.startSession(command, makeClock());

    expect(result.ok).toBe(true);
    expect(await database.ProtectionSessions.count()).toBe(1);
    expect(await database.ProtectionZoneStates.count()).toBe(1);
    expect(await database.SessionStartedEvents.count()).toBe(1);
    expect(await database.ZoneMethodEvents.count()).toBe(1);
    expect(await database.ZoneTrackingEvents.count()).toBe(1);
    expect(await database.ApplicationConfirmationGroups.count()).toBe(1);
    expect(await database.ApplicationEvents.count()).toBe(1);
    expect(await database.ActiveSessionLocks.count()).toBe(1);
    expect(await database.ClientSequences.count()).toBe(1);
    expect(await database.CommandReceipts.count()).toBe(1);
    expect(await database.ZoneIdentityLocks.count()).toBe(1);
  });

  it("相同 idempotency key 重送時回傳原結果且不重複寫入", async () => {
    const command = makeStartSessionCommand();
    const first = await repository.startSession(command, makeClock());
    const second = await repository.startSession(command, makeClock());

    expect(second).toEqual(first);
    expect(await database.SessionStartedEvents.count()).toBe(1);
    expect(await database.ApplicationEvents.count()).toBe(1);
    expect(await database.CommandReceipts.count()).toBe(1);
    expect(notifier.messages).toHaveLength(1);
  });

  it("同一 owner 的第二個 active Session 被拒絕且沒有部分寫入", async () => {
    await repository.startSession(
      makeStartSessionCommand({ idPrefix: "first" }),
      makeClock()
    );
    const conflicting = await repository.startSession(
      makeStartSessionCommand({
        idPrefix: "second",
        sessionId: "second-session"
      }),
      makeClock()
    );

    expect(conflicting).toMatchObject({
      ok: false,
      code: "ACTIVE_SESSION_CONFLICT"
    });
    expect(await database.ProtectionSessions.count()).toBe(1);
    expect(await database.SessionStartedEvents.count()).toBe(1);
    expect(await database.ApplicationEvents.count()).toBe(1);
  });

  it("schema validation 失敗時不開啟 mutation transaction", async () => {
    const command = makeStartSessionCommand();
    command.payload.zones[0]!.methodComponents = [];
    const result = await repository.startSession(command, makeClock());

    expect(result).toMatchObject({
      ok: false,
      code: "VALIDATION_ERROR"
    });
    expect(await database.ProtectionSessions.count()).toBe(0);
    expect(await database.ActiveSessionLocks.count()).toBe(0);
    expect(await database.CommandReceipts.count()).toBe(0);
  });

  it("transaction 中途遇到唯一鍵錯誤時全部 rollback", async () => {
    const command = makeStartSessionCommand({
      idPrefix: "rollback"
    });
    await database.ZoneIdentityLocks.add({
      sessionId: command.sessionId,
      bodyZoneCode: "face_forehead",
      zoneInstanceId: "preexisting-corrupt-lock"
    });
    const result = await repository.startSession(command, makeClock());

    expect(result).toMatchObject({
      ok: false,
      code: "PERSISTENCE_ERROR"
    });
    expect(await database.ProtectionSessions.count()).toBe(0);
    expect(await database.SessionStartedEvents.count()).toBe(0);
    expect(await database.ZoneMethodEvents.count()).toBe(0);
    expect(await database.ZoneTrackingEvents.count()).toBe(0);
    expect(await database.ActiveSessionLocks.count()).toBe(0);
    expect(await database.CommandReceipts.count()).toBe(0);
    expect(await database.ZoneIdentityLocks.count()).toBe(1);
  });

  it("revision 不相符時 End Session 完全不寫入", async () => {
    const start = makeStartSessionCommand();
    await repository.startSession(start, makeClock());
    const result = await repository.endSession(
      makeEndSessionCommand({
        sessionId: start.sessionId,
        expectedRevision: 99
      }),
      makeClock()
    );

    expect(result).toMatchObject({
      ok: false,
      code: "REVISION_CONFLICT",
      currentRevision: 1
    });
    expect(await database.SessionEndedEvents.count()).toBe(0);
    expect(await database.ActiveSessionLocks.count()).toBe(1);
    expect((await database.ProtectionSessions.get(start.sessionId))!.revision)
      .toBe(1);
  });

  it("client sequence 必須嚴格遞增", async () => {
    const start = makeStartSessionCommand();
    await repository.startSession(start, makeClock());
    const result = await repository.endSession(
      makeEndSessionCommand({
        sessionId: start.sessionId,
        clientSequence: start.clientSequence
      }),
      makeClock()
    );

    expect(result).toMatchObject({
      ok: false,
      code: "CLIENT_SEQUENCE_CONFLICT"
    });
    expect(await database.SessionEndedEvents.count()).toBe(0);
  });

  it("不同 owner 不得結束不屬於自己的 Session", async () => {
    const start = makeStartSessionCommand();
    await repository.startSession(start, makeClock());
    const end = makeEndSessionCommand({ sessionId: start.sessionId });
    end.owner.localVisitorId = "another-visitor";
    const result = await repository.endSession(end, makeClock());

    expect(result).toMatchObject({
      ok: false,
      code: "NOT_FOUND"
    });
    expect(await database.SessionEndedEvents.count()).toBe(0);
    expect(await database.ActiveSessionLocks.count()).toBe(1);
    expect((await database.ProtectionSessions.get(start.sessionId))!.revision)
      .toBe(1);
  });

  it("End Session 原子更新 revision、projection、receipt 並移除 active lock", async () => {
    const start = makeStartSessionCommand();
    await repository.startSession(start, makeClock());
    const end = makeEndSessionCommand({ sessionId: start.sessionId });
    const result = await repository.endSession(end, makeClock());

    expect(result).toMatchObject({
      ok: true,
      revision: 2
    });
    if (!result.ok) throw new Error("Expected successful end command");
    expect(result.data.overallStatus).toBe("ended");
    expect(result.data.primaryAction.actionKind).toBe("view_ended_state");
    expect(await database.SessionEndedEvents.count()).toBe(1);
    expect(await database.SessionEndedEvents.toCollection().first())
      .toMatchObject({
        endedReason: "user_ended"
      });
    expect(await database.ActiveSessionLocks.count()).toBe(0);
    expect(await database.CommandReceipts.count()).toBe(2);
    const stored = await database.ProtectionSessions.get(start.sessionId);
    expect(stored).toMatchObject({
      revision: 2,
      overallStatus: "ended",
      endedReason: "user_ended"
    });
  });

  it("End Session 重送由 receipt 回放，不會建立第二筆 ending event", async () => {
    const start = makeStartSessionCommand();
    await repository.startSession(start, makeClock());
    const end = makeEndSessionCommand({ sessionId: start.sessionId });
    const first = await repository.endSession(end, makeClock());
    const second = await repository.endSession(end, makeClock());

    expect(second).toEqual(first);
    expect(await database.SessionEndedEvents.count()).toBe(1);
    expect(await database.CommandReceipts.count()).toBe(2);
  });

  it("commit 後的 invalidation 不含產品、部位或精確事件 payload", async () => {
    const start = makeStartSessionCommand();
    await repository.startSession(start, makeClock());

    expect(notifier.messages).toEqual([
      {
        kind: "data-committed",
        sourceContextId: "test-context",
        sessionId: start.sessionId,
        revision: 1
      }
    ]);
    expect(Object.keys(notifier.messages[0]!).sort()).toEqual([
      "kind",
      "revision",
      "sessionId",
      "sourceContextId"
    ]);
  });

  it("並行建立兩個 Session 時最多只有一個成功", async () => {
    const [first, second] = await Promise.all([
      repository.startSession(
        makeStartSessionCommand({ idPrefix: "concurrent-a" }),
        makeClock()
      ),
      repository.startSession(
        makeStartSessionCommand({ idPrefix: "concurrent-b" }),
        makeClock()
      )
    ]);

    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
    expect(await database.ProtectionSessions.count()).toBe(1);
    expect(await database.ActiveSessionLocks.count()).toBe(1);
  });

  it("讀取目前 Session 時使用已提交的 primaryAction projection", async () => {
    const start = makeStartSessionCommand();
    const result = await repository.startSession(start, makeClock());
    const current = await repository.getCurrentSession(
      start.owner.localVisitorId
    );

    expect(result.ok).toBe(true);
    expect(current).not.toBeNull();
    if (!result.ok || current === null) {
      throw new Error("Expected current session");
    }
    expect(current.primaryAction).toEqual(result.data.primaryAction);
    expect(current.revision).toBe(1);
  });

  it("讀取舊版 zone projection 時從事件還原倒數起點", async () => {
    const start = makeStartSessionCommand();
    await repository.startSession(start, makeClock());
    const storedZone =
      (await database.ProtectionZoneStates.toArray())[0];
    if (storedZone === undefined) {
      throw new Error("Expected a stored zone projection");
    }
    const legacyZone = {
      ...storedZone
    } as Partial<ZoneProjection>;
    delete legacyZone.zoneTimerStartedAt;
    await database.ProtectionZoneStates.put(
      legacyZone as ZoneProjection
    );

    const current = await repository.getCurrentSession(
      start.owner.localVisitorId
    );

    expect(current?.zones[0]?.zoneTimerStartedAt).toBe(
      "2026-07-29T10:00:00.000Z"
    );
  });

  it("全為衣物覆蓋時不建立 Application group 或 event", async () => {
    const command = makeStartSessionCommand({
      zones: [
        {
          zoneInstanceId: "clothing-zone-arms",
          trackingEventId: "clothing-tracking-arms",
          methodEventId: "clothing-method-arms",
          bodyZoneCode: "arms",
          customLabel: null,
          skinExposureStatus: "clothing_covered",
          methodCertainty: "confirmed",
          methodComponents: ["clothing"]
        }
      ],
      applicationGroup: null
    });

    const result = await repository.startSession(command, makeClock());

    expect(result.ok).toBe(true);
    expect(await database.ProtectionSessions.count()).toBe(1);
    expect(await database.ApplicationConfirmationGroups.count()).toBe(0);
    expect(await database.ApplicationEvents.count()).toBe(0);
  });
});

describe("SetupDraft local persistence", () => {
  it("保存完整草稿，但會移除不屬於 schema 的未確認時間", async () => {
    const draftRepository = new LocalSetupDraftRepository(database);
    const draft = {
      ...makeSetupDraft(),
      appliedAt: "2026-07-29T10:00:00.000Z",
      activityStartedAt: "2026-07-29T10:30:00.000Z"
    };

    await draftRepository.saveDraft(draft);

    const stored = await database.SetupDrafts.get(draft.id);
    expect(stored).toBeDefined();
    expect(stored).not.toHaveProperty("appliedAt");
    expect(stored).not.toHaveProperty("activityStartedAt");
    expect(await draftRepository.getActiveDraft(
      draft.ownerKey,
      "2026-07-29T11:00:00.000Z"
    )).not.toBeNull();
  });

  it("超過 24 小時的草稿視為失效並從 IndexedDB 移除", async () => {
    const draftRepository = new LocalSetupDraftRepository(database);
    const draft = makeSetupDraft();
    await draftRepository.saveDraft(draft);

    const result = await draftRepository.getActiveDraft(
      draft.ownerKey,
      "2026-07-30T10:00:00.001Z"
    );

    expect(result).toBeNull();
    expect(await database.SetupDrafts.count()).toBe(0);
  });

  it("取消草稿會精確刪除目前 owner 的記錄", async () => {
    const draftRepository = new LocalSetupDraftRepository(database);
    const draft = makeSetupDraft();
    await draftRepository.saveDraft(draft);

    await draftRepository.deleteDraft(draft.id);

    expect(await database.SetupDrafts.count()).toBe(0);
  });
});

describe("Region and five-day UV local persistence", () => {
  it("保存及讀取目前選定地區", async () => {
    const regionRepository =
      new LocalRegionPreferenceRepository(database);
    const preference = {
      schemaVersion: REGION_PREFERENCE_SCHEMA_VERSION,
      mode: "selected" as const,
      selection: makeRegionSelection()
    };

    await regionRepository.savePreference(preference);

    expect(await regionRepository.getPreference()).toEqual(preference);
  });

  it("明確保存略過地區，而不是把它當成尚未決定", async () => {
    const regionRepository =
      new LocalRegionPreferenceRepository(database);
    const preference = {
      schemaVersion: REGION_PREFERENCE_SCHEMA_VERSION,
      mode: "skipped" as const,
      skippedAt: "2026-08-01T00:00:00.000Z"
    };

    await regionRepository.savePreference(preference);

    expect(await regionRepository.getPreference()).toEqual(preference);
  });

  it("將舊版兩欄地區選擇遷移成完整偏好", async () => {
    await database.AppMetadata.put({
      key: "uvRegionSelection",
      value: JSON.stringify({
        regionCode: "63000010",
        displayName: "臺北市松山區"
      })
    });
    const regionRepository = new LocalRegionPreferenceRepository(
      database,
      {
        legacyRegionLookup: {
          resolve(regionCode) {
            return regionCode === "63000010"
              ? makeRegionSelection()
              : null;
          }
        }
      }
    );

    expect(await regionRepository.getPreference()).toEqual({
      schemaVersion: REGION_PREFERENCE_SCHEMA_VERSION,
      mode: "selected",
      selection: {
        ...makeRegionSelection(),
        selectionMethod: "manual"
      }
    });
    expect(
      await database.AppMetadata.get("uvRegionSelection")
    ).toBeUndefined();
    expect(
      await database.AppMetadata.get("uvRegionPreferenceV1")
    ).toBeDefined();
  });

  it("無法安全配對的舊地區資料不會被猜測或刪除", async () => {
    await database.AppMetadata.put({
      key: "uvRegionSelection",
      value: JSON.stringify({
        regionCode: "UNKNOWN",
        displayName: "舊地區"
      })
    });
    const regionRepository = new LocalRegionPreferenceRepository(
      database,
      {
        legacyRegionLookup: { resolve: () => null }
      }
    );

    expect(await regionRepository.getPreference()).toBeNull();
    expect(
      await database.AppMetadata.get("uvRegionSelection")
    ).toBeDefined();
  });

  it("保存並依地區讀取已驗證的最新五日 UV 快照", async () => {
    const forecastRepository =
      new LocalWeatherForecastRepository(database);
    const forecast = makeFiveDayUvForecast();

    await forecastRepository.saveForecast(forecast);

    expect(
      await forecastRepository.getLatestForecast(
        forecast.region.regionCode
      )
    ).toEqual(forecast);
    expect(
      await forecastRepository.getLatestForecast("OTHER-REGION")
    ).toBeNull();
  });
});

function makeRegionSelection(): RegionSelection {
  return {
    regionCode: "63000010",
    displayName: "臺北市松山區",
    countyCode: "63000",
    countyName: "臺北市",
    townName: "松山區",
    boundaryDataVersion: "2025-03-18",
    selectionMethod: "device_location"
  };
}

function makeSetupDraft(): SetupDraftV1 {
  return {
    schemaVersion: SETUP_DRAFT_SCHEMA_VERSION,
    id: "guest:visitor-1",
    localDraftFlowId: "draft-flow-1",
    ownerKey: "guest:visitor-1",
    currentStep: "protection",
    bodyZoneSchemaVersion: BODY_ZONE_SCHEMA_VERSION,
    setupEntryMode: "quick_preset",
    suggestedPresetId: "commute_tracked",
    suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
    presetDecision: "accepted",
    initialContext: "outdoor_general",
    initialShade: "unknown",
    zones: [],
    applications: [],
    pendingTiming: null,
    createdAt: "2026-07-29T10:00:00.000Z",
    updatedAt: "2026-07-29T10:00:00.000Z",
    expiresAt: "2026-07-30T10:00:00.000Z"
  };
}
