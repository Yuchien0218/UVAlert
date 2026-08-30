import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  LocalSessionRepository,
  LocalProductSettingsRepository,
  LocalSetupDraftRepository,
  SunshieldDatabase,
  type CrossContextNotifier,
  type InvalidationMessage
} from "@sunshield/persistence-web";
import { makeProductSnapshot } from "@sunshield/test-fixtures";
import { createAppBootController } from "../../app/createAppBootController";
import {
  createSetupController,
  type SetupController
} from "./createSetupController";

let databaseCounter = 0;
let database: SunshieldDatabase;
let controller: SetupController;
let productSettings: LocalProductSettingsRepository;
let sequence: number;

class SilentNotifier implements CrossContextNotifier {
  publish(_message: InvalidationMessage): void {}

  subscribe(_listener: (message: InvalidationMessage) => void): () => void {
    return () => undefined;
  }
}

beforeEach(async () => {
  databaseCounter += 1;
  database = new SunshieldDatabase(
    `sunshield-setup-controller-${databaseCounter}`
  );
  const notifier = new SilentNotifier();
  const sessionRepository = new LocalSessionRepository({
    database,
    notifier,
    sourceContextId: "setup-test"
  });
  await sessionRepository.open();

  const identity = {
    getOrCreateLocalVisitorId: async () => "visitor-setup",
    getOrCreateDeviceLocalId: async () => "device-setup"
  };
  const boot = createAppBootController({
    contextId: "setup-test",
    repository: sessionRepository,
    identity,
    connectivity: {
      getCurrentStatus: () => "online",
      subscribe: () => () => undefined
    },
    lifecycle: {
      subscribeForeground: () => () => undefined
    },
    crossContext: notifier
  });
  await boot.ensureBooted();

  sequence = 0;
  productSettings = new LocalProductSettingsRepository(database);
  controller = createSetupController({
    draftRepository: new LocalSetupDraftRepository(database),
    productSettings,
    sessionRepository,
    identity,
    boot,
    createId: () => `setup-id-${++sequence}`,
    now: () => new Date("2026-07-29T11:00:00.000Z"),
    getConnectivity: () => "online"
  });
  await controller.ensureLoaded();
});

afterEach(async () => {
  controller.dispose();
  database.close();
  await database.delete();
});

describe("SetupDraft to StartSession transaction", () => {
  it("選擇情境後進入產品與時間，但等待使用者確認快速提醒部位", async () => {
    await controller.saveContext("outdoor_general");

    expect(controller.draft.value).toMatchObject({
      currentStep: "timing",
      suggestedPresetId: "commute_tracked",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
      presetDecision: null,
      zones: []
    });
    expect(controller.recommendedResumeStep()).toBe("timing");
  });

  it("全衣物路徑略過 S-05，原子建立沒有 Application 的 Session", async () => {
    await controller.saveContext("indoor_window");
    await controller.saveProtection({
      setupEntryMode: "self_select",
      suggestedPresetId: null,
      suggestedPresetVersion: null,
      presetDecision: "not_shown",
      zones: [
        {
          draftZoneKey: "arms",
          bodyZoneCode: "arms",
          customLabel: null,
          skinExposureStatus: "clothing_covered",
          methodComponents: ["clothing"]
        }
      ]
    });

    expect(controller.recommendedResumeStep()).toBe("review");
    const result = await controller.submit();

    expect(result.ok).toBe(true);
    expect(await database.ProtectionSessions.count()).toBe(1);
    expect(await database.ApplicationConfirmationGroups.count()).toBe(0);
    expect(await database.ApplicationEvents.count()).toBe(0);
    expect(await database.SetupDrafts.count()).toBe(0);
  });

  it("有防曬產品時保存 snapshot、提交 Application，成功後刪除草稿", async () => {
    await controller.saveContext("outdoor_general");
    await controller.saveProtection({
      setupEntryMode: "quick_preset",
      suggestedPresetId: "commute_tracked",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
      presetDecision: "accepted",
      zones: [
        {
          draftZoneKey: "face_forehead",
          bodyZoneCode: "face_forehead",
          customLabel: null,
          skinExposureStatus: "exposed",
          methodComponents: ["sunscreen"]
        }
      ]
    });
    await controller.saveTiming({
      productLabelSnapshot: makeProductSnapshot(),
      appliedAt: "2026-07-29T10:45:00.000Z",
      waterStart: null
    });

    const storedDraft = await database.SetupDrafts.get("guest:visitor-setup");
    expect(storedDraft?.applications).toHaveLength(1);
    expect(storedDraft?.pendingTiming?.appliedAt).toBe(
      "2026-07-29T10:45:00.000Z"
    );

    const result = await controller.submit();

    expect(result.ok).toBe(true);
    expect(await database.ApplicationConfirmationGroups.count()).toBe(1);
    expect(await database.ApplicationEvents.count()).toBe(1);
    expect(await database.SetupDrafts.count()).toBe(0);
    const session = await database.ProtectionSessions.toCollection().first();
    expect(session).toMatchObject({
      setupEntryMode: "quick_preset",
      presetDecision: "accepted",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1"
    });
  });

  it("Setup 只輸入時間時使用產品頁保存的目前產品 snapshot", async () => {
    const snapshot = makeProductSnapshot({
      reapplicationIntervalStatus: "explicit_minutes",
      reapplicationIntervalMinutes: 90
    });
    await productSettings.saveCurrentProductSnapshot(snapshot);
    await controller.saveContext("outdoor_general");
    await controller.saveProtection({
      setupEntryMode: "quick_preset",
      suggestedPresetId: "commute_tracked",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
      presetDecision: "accepted",
      zones: [
        {
          draftZoneKey: "face_forehead",
          bodyZoneCode: "face_forehead",
          customLabel: null,
          skinExposureStatus: "exposed",
          methodComponents: ["sunscreen"]
        }
      ]
    });

    expect(
      await controller.saveTiming({
        appliedAt: "2026-07-29T10:45:00.000Z",
        waterStart: null
      })
    ).toBe(true);
    expect(
      controller.draft.value?.applications[0]?.productLabelSnapshot
    ).toEqual(snapshot);
  });

  it("產品頁尚未設定時建立的 snapshot 不得宣稱任何標示內容", async () => {
    await controller.saveContext("outdoor_general");
    await controller.saveProtection({
      setupEntryMode: "quick_preset",
      suggestedPresetId: "commute_tracked",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
      presetDecision: "accepted",
      zones: [
        {
          draftZoneKey: "face_forehead",
          bodyZoneCode: "face_forehead",
          customLabel: null,
          skinExposureStatus: "exposed",
          methodComponents: ["sunscreen"]
        }
      ]
    });

    /*
     * 2026-08-30：這條測試的斷言從「不建立 application」改成「建立的
     * snapshot 不宣稱任何標示內容」。
     *
     * 原本的顧慮——不得憑空捏造使用者沒給的標示資料——完全保留，而且現在
     * 守得比以前精確：以前只檢查「沒有 application」，現在逐欄檢查那份
     * snapshot 確實每一項都是「不知道」。
     *
     * 改動的是另一半：以前沒有 application 就沒有 appliedAt 錨點，倒數
     * 算不出起點，等於「不填防曬乳就完全沒有倒數」。現在會建立一份全部
     * 未知的 snapshot，reducer 認得 identity_unconfirmed 是「不知道」而
     * 不是「有問題」，給 120 分鐘保守預設。
     */
    expect(
      await controller.saveTiming({
        appliedAt: "2026-07-29T10:45:00.000Z",
        waterStart: null
      })
    ).toBe(true);
    expect(controller.fieldErrors.value.product).toBeUndefined();

    const snapshot =
      controller.draft.value?.applications[0]?.productLabelSnapshot;
    expect(snapshot).toBeDefined();
    expect(snapshot?.identityStatus).toBe("identity_unconfirmed");
    expect(snapshot?.ruleEligibilityAtApplication).toBe("identity_unconfirmed");
    /* 一項標示內容都不能被當成「已知」。 */
    expect(snapshot?.sunscreenClaimStatus).toBe("unknown");
    expect(snapshot?.expiryStatus).toBe("unknown");
    expect(snapshot?.reapplicationIntervalMinutes).toBeNull();
    expect(snapshot?.preExposureWaitMinutes).toBeNull();
    expect(snapshot?.waterResistanceMinutes).toBeNull();
    expect(snapshot?.spf).toBeNull();
    expect(snapshot?.paGrade).toBeNull();
  });

  it("步驟 2 答「有防曬標示」時就地建立可產生倒數的標示", async () => {
    await controller.saveContext("outdoor_general");
    await controller.saveProtection({
      setupEntryMode: "quick_preset",
      suggestedPresetId: "commute_tracked",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
      presetDecision: "accepted",
      zones: [
        {
          draftZoneKey: "face_forehead",
          bodyZoneCode: "face_forehead",
          customLabel: null,
          skinExposureStatus: "exposed",
          methodComponents: ["sunscreen"]
        }
      ]
    });

    expect(
      await controller.saveTiming({
        appliedAt: "2026-07-29T10:45:00.000Z",
        waterStart: null,
        sunscreenClaim: "yes"
      })
    ).toBe(true);

    const created =
      controller.draft.value?.applications[0]?.productLabelSnapshot;
    expect(created?.sunscreenClaimStatus).toBe("confirmed");
    expect(created?.ruleEligibilityAtApplication).toBe("eligible");
    // 其餘三題沒問，必須誠實記為未知，不能假設包裝沒有這些標示。
    expect(created?.reapplicationIntervalStatus).toBe("unknown");
    expect(created?.preExposureWaitStatus).toBe("unknown");
    expect(created?.waterResistanceStatus).toBe("unknown");
  });

  it("步驟 2 答「不確定」時建立不合格標示而非阻擋流程", async () => {
    await controller.saveContext("outdoor_general");
    await controller.saveProtection({
      setupEntryMode: "quick_preset",
      suggestedPresetId: "commute_tracked",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
      presetDecision: "accepted",
      zones: [
        {
          draftZoneKey: "face_forehead",
          bodyZoneCode: "face_forehead",
          customLabel: null,
          skinExposureStatus: "exposed",
          methodComponents: ["sunscreen"]
        }
      ]
    });

    expect(
      await controller.saveTiming({
        appliedAt: "2026-07-29T10:45:00.000Z",
        waterStart: null,
        sunscreenClaim: "unknown"
      })
    ).toBe(true);

    expect(
      controller.draft.value?.applications[0]?.productLabelSnapshot
        ?.ruleEligibilityAtApplication
    ).not.toBe("eligible");
  });

  it("重新開啟有產品草稿時，要求重新確認未持久化的塗抹時間", async () => {
    await controller.saveContext("outdoor_exercise");
    await controller.saveProtection({
      setupEntryMode: "self_select",
      suggestedPresetId: null,
      suggestedPresetVersion: null,
      presetDecision: "not_shown",
      zones: [
        {
          draftZoneKey: "arms",
          bodyZoneCode: "arms",
          customLabel: null,
          skinExposureStatus: "exposed",
          methodComponents: ["sunscreen"]
        }
      ]
    });
    await controller.saveTiming({
      productLabelSnapshot: makeProductSnapshot(),
      appliedAt: "2026-07-29T10:30:00.000Z",
      waterStart: null
    });

    const notifier = new SilentNotifier();
    const secondSessionRepository = new LocalSessionRepository({
      database,
      notifier,
      sourceContextId: "setup-test-second"
    });
    const identity = {
      getOrCreateLocalVisitorId: async () => "visitor-setup",
      getOrCreateDeviceLocalId: async () => "device-setup"
    };
    const secondBoot = createAppBootController({
      contextId: "setup-test-second",
      repository: secondSessionRepository,
      identity,
      connectivity: {
        getCurrentStatus: () => "online",
        subscribe: () => () => undefined
      },
      lifecycle: {
        subscribeForeground: () => () => undefined
      },
      crossContext: notifier
    });
    const secondController = createSetupController({
      draftRepository: new LocalSetupDraftRepository(database),
      sessionRepository: secondSessionRepository,
      identity,
      boot: secondBoot,
      createId: () => `second-id-${++sequence}`,
      now: () => new Date("2026-07-29T11:05:00.000Z"),
      getConnectivity: () => "online"
    });

    await secondController.ensureLoaded();

    expect(secondController.recoveryPending.value).toBe(true);
    expect(secondController.applicationTime.value).toBe(
      "2026-07-29T10:30:00.000Z"
    );
    expect(secondController.recommendedResumeStep()).toBe("timing");
    secondController.dispose();
  });

  it("準備下水不會提前建立 water_start 事件", async () => {
    await controller.saveContext("water_preparing");
    await controller.saveProtection({
      setupEntryMode: "quick_preset",
      suggestedPresetId: "beach_tracked",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
      presetDecision: "accepted",
      zones: [
        {
          draftZoneKey: "face_forehead",
          bodyZoneCode: "face_forehead",
          customLabel: null,
          skinExposureStatus: "exposed",
          methodComponents: ["sunscreen"]
        }
      ]
    });
    await controller.saveTiming({
      productLabelSnapshot: makeProductSnapshot({
        waterResistanceStatus: "40",
        waterResistanceMinutes: 40
      }),
      appliedAt: "2026-07-29T10:45:00.000Z",
      waterStart: null
    });

    const result = await controller.submit();

    expect(result.ok).toBe(true);
    expect(await database.ContextEvents.count()).toBe(0);
  });

  it("已在水中會在同一 transaction 建立保守的 water_start 事件", async () => {
    await controller.saveContext("water_active");
    await controller.saveProtection({
      setupEntryMode: "quick_preset",
      suggestedPresetId: "beach_tracked",
      suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
      presetDecision: "accepted",
      zones: [
        {
          draftZoneKey: "face_forehead",
          bodyZoneCode: "face_forehead",
          customLabel: null,
          skinExposureStatus: "exposed",
          methodComponents: ["sunscreen"]
        }
      ]
    });
    await controller.saveTiming({
      productLabelSnapshot: makeProductSnapshot({
        waterResistanceStatus: "80",
        waterResistanceMinutes: 80
      }),
      appliedAt: "2026-07-29T10:45:00.000Z",
      waterStart: {
        confidence: "unknown",
        activityStartedAt: null
      }
    });

    const result = await controller.submit();

    expect(result.ok).toBe(true);
    expect(await database.ContextEvents.count()).toBe(1);
    expect(await database.ContextEvents.toCollection().first()).toMatchObject({
      contextType: "water_start",
      startConfidence: "unknown",
      activityStartedAt: null
    });
  });

  it("自動套用推薦方案並立即寫入 SetupDraft", async () => {
    await controller.saveContext("outdoor_general");

    expect(await controller.ensureRecommendedProtection()).toBe(true);
    expect(controller.draft.value?.zones.length).toBeGreaterThan(0);
    expect(controller.draft.value?.presetDecision).toBe("accepted");

    const storedDraft = await database.SetupDrafts.get("guest:visitor-setup");
    expect(storedDraft?.zones.length).toBeGreaterThan(0);
    expect(storedDraft?.presetDecision).toBe("accepted");
  });

  it("尚未設定產品時仍能保存實際塗抹時間", async () => {
    await controller.saveContext("outdoor_general");
    await controller.ensureRecommendedProtection();

    expect(
      await controller.savePendingTiming({
        appliedAt: "2026-07-29T10:50:00.000Z",
        waterStart: null
      })
    ).toBe(true);

    const storedDraft = await database.SetupDrafts.get("guest:visitor-setup");
    expect(storedDraft?.pendingTiming).toEqual({
      appliedAt: "2026-07-29T10:50:00.000Z",
      waterStart: null
    });
    expect(storedDraft?.applications).toHaveLength(0);
  });
});
