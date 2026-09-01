import type {
  PrimaryAction,
  SessionProjection,
  ZoneProjection
} from "@sunshield/contracts";
import { describe, expect, it } from "vitest";
import { buildHomeReminderClockPresentation } from "./homeReminderClockPresentation";

const baseZone: ZoneProjection = {
  sessionId: "session-1",
  zoneInstanceId: "zone-forehead",
  bodyZoneCode: "face_forehead",
  customLabel: null,
  trackingStatus: "active",
  skinExposureStatus: "exposed",
  methodCertainty: "confirmed",
  methodComponents: ["sunscreen"],
  currentActivationSequence: 1,
  currentApplicationId: "application-1",
  currentApplicationEligibility: "eligible",
  activeProductSafetyBlock: false,
  recordStatus: "sunscreen_recorded",
  timingStatus: "tracking",
  activeLabelReadyAt: null,
  generalDueAt: "2026-07-29T11:30:00.000Z",
  activeWaterDeadline: null,
  eventTriggeredDeadline: null,
  zoneDueAt: "2026-07-29T11:30:00.000Z",
  zoneTimerStartedAt: "2026-07-29T10:00:00.000Z",
  zoneNextActionAt: "2026-07-29T11:30:00.000Z",
  activeCauseRefs: [],
  activeRuleIds: ["RR-P0-GENERAL-001"],
  reasonCodes: [],
  derivedFromEventRefs: ["application-1"]
};

const baseAction: PrimaryAction = {
  presentationType: "timed_ring",
  variant: null,
  actionKind: "report_context_event",
  affectedZoneInstanceIds: ["zone-forehead"],
  actionAt: "2026-07-29T11:30:00.000Z",
  reasonCodes: [],
  derivedFromEventRefs: ["application-1"]
};

describe("buildHomeReminderClockPresentation", () => {
  it("部位時間不同時強調最快到期的優先部位", () => {
    const priorityZone: ZoneProjection = {
      ...baseZone,
      zoneInstanceId: "zone-nose-cheeks",
      bodyZoneCode: "face_nose_cheeks"
    };
    const laterZone: ZoneProjection = {
      ...baseZone,
      zoneInstanceId: "zone-ears",
      bodyZoneCode: "ears",
      generalDueAt: "2026-07-29T12:00:00.000Z",
      zoneDueAt: "2026-07-29T12:00:00.000Z",
      zoneNextActionAt: "2026-07-29T12:00:00.000Z"
    };
    const result = buildHomeReminderClockPresentation(
      makeSession([laterZone, priorityZone]),
      new Date("2026-07-29T11:00:00.000Z")
    );

    expect(result).not.toBeNull();
    expect(result?.scope).toBe("priority");
    expect(result?.title).toBe("接下來需要補擦：鼻部與雙頰");
    expect(result?.timeLabel).toMatch(/^預計 \d{2}:\d{2}$/);
    expect(result?.remainingMinutes).toBe(30);
    expect(result?.progress).toBeCloseTo(1 / 3);
    expect(result?.progressPercent).toBe(33);
  });

  it("全部有效計時部位同時到期時提示全面補擦", () => {
    const ears: ZoneProjection = {
      ...baseZone,
      zoneInstanceId: "zone-ears",
      bodyZoneCode: "ears"
    };
    const result = buildHomeReminderClockPresentation(
      makeSession([baseZone, ears]),
      new Date("2026-07-29T11:00:00.000Z")
    );

    expect(result?.scope).toBe("all");
    expect(result?.title).toBe("接下來需要全面補擦");
    expect(result?.timeLabel).toMatch(/^預計 \d{2}:\d{2}$/);
  });

  it("只有一個計時部位時仍明確指出優先部位", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([baseZone]),
      new Date("2026-07-29T11:00:00.000Z")
    );

    expect(result).toMatchObject({
      scope: "priority",
      title: "接下來需要補擦：額頭"
    });
  });

  it("時間已到時將進度歸零並保留優先部位", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([
        {
          ...baseZone,
          timingStatus: "reapply_due"
        }
      ]),
      new Date("2026-07-29T11:31:00.000Z")
    );

    expect(result).toMatchObject({
      tone: "due",
      scope: "priority",
      title: "建議優先補擦：額頭",
      remainingMinutes: 0,
      progress: 0,
      progressPercent: 0
    });
  });

  it("所有部位同時到期時提示現在進行全面補擦", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([
        {
          ...baseZone,
          timingStatus: "reapply_due"
        },
        {
          ...baseZone,
          zoneInstanceId: "zone-ears",
          bodyZoneCode: "ears",
          timingStatus: "reapply_due"
        }
      ]),
      new Date("2026-07-29T11:31:00.000Z")
    );

    expect(result).toMatchObject({
      tone: "due",
      scope: "all",
      title: "建議全面補擦",
      remainingMinutes: 0
    });
  });

  it("存在未計時的 active 部位時不誤稱全面補擦", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([
        baseZone,
        {
          ...baseZone,
          zoneInstanceId: "zone-covered",
          bodyZoneCode: "arms",
          skinExposureStatus: "clothing_covered",
          methodComponents: ["clothing"],
          timingStatus: "not_applicable",
          generalDueAt: null,
          zoneDueAt: null,
          zoneNextActionAt: null
        }
      ]),
      new Date("2026-07-29T11:00:00.000Z")
    );

    expect(result).toMatchObject({
      scope: "priority",
      title: "接下來需要補擦：額頭"
    });
  });

  it("即將到期時用預告語氣，不下達立即補擦的指示", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([
        {
          ...baseZone,
          timingStatus: "reapply_soon"
        }
      ]),
      new Date("2026-07-29T11:20:00.000Z")
    );

    expect(result).toMatchObject({
      tone: "soon",
      scope: "priority",
      title: "快到補擦時間：額頭"
    });
  });

  it("尚未到期時標題不使用祈使語氣，避免與提醒頁互相矛盾", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([baseZone]),
      new Date("2026-07-29T11:00:00.000Z")
    );

    expect(result?.tone).toBe("tracking");
    expect(result?.title).not.toContain("建議");
    expect(result?.ariaLabel).not.toContain("建議");
  });

  it("主要狀態需要先確認時不自行捏造倒數", () => {
    const session = makeSession([baseZone]);
    session.primaryAction = {
      ...baseAction,
      presentationType: "untimed_action_card",
      actionKind: "complete_protection_record",
      actionAt: null,
      reasonCodes: ["METHOD_UNRECORDED"]
    };

    expect(
      buildHomeReminderClockPresentation(
        session,
        new Date("2026-07-29T11:00:00.000Z")
      )
    ).toBeNull();
  });
});

function makeSession(zones: ZoneProjection[]): SessionProjection {
  return {
    sessionId: "session-1",
    rulesetVersion: "p0-v1",
    revision: 1,
    overallStatus: "tracking",
    sessionNextDueAt: zones[0]?.zoneDueAt ?? null,
    zones,
    primaryAction: {
      ...baseAction,
      affectedZoneInstanceIds: zones.map((zone) => zone.zoneInstanceId)
    },
    derivedFromEventRefs: ["application-1"]
  };
}

/*
 * 2026-08-31：水上活動進行中的旗標（使用者裁決：波浪只用在這裡）。
 *
 * 判定用投影上既有的 `activeWaterDeadline`——**有任何一個追蹤中的部位帶著
 * 還沒過期的耐水期限**，就代表這段時間是照耐水規則在算，不是一般補擦間隔。
 *
 * 四件事分開守，因為它們可以互相掩護：只守「有水時為 true」→ 條件可以
 * 寫成永遠 true；只守「沒水時為 false」→ 可以永遠 false；只守「過期的
 * 不算」→ 時間比較可以整個拿掉；只守「非 active 的不算」→ 收合中的部位
 * 會讓首頁誤報「你在水裡」。
 */
describe("水上活動進行中的判定", () => {
  const now = new Date("2026-08-31T10:00:00.000Z");

  function zoneWithWater(
    deadline: string | null,
    trackingStatus: ZoneProjection["trackingStatus"] = "active"
  ): ZoneProjection {
    return {
      ...baseZone,
      trackingStatus,
      activeWaterDeadline: deadline,
      zoneDueAt: "2026-08-31T11:00:00.000Z"
    };
  }

  it("有還沒過期的耐水期限時為 true", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([zoneWithWater("2026-08-31T10:30:00.000Z")]),
      now
    );

    expect(result?.inWater).toBe(true);
  });

  it("沒有耐水期限時為 false", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([zoneWithWater(null)]),
      now
    );

    expect(result?.inWater).toBe(false);
  });

  /*
   * 已經過期的耐水期限代表「那段水上活動結束了」，不是「還在水裡」。
   * 少了時間比較的話，記錄過一次下水之後首頁就會永遠顯示水上活動進行中。
   */
  it("耐水期限已過期時為 false", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([zoneWithWater("2026-08-31T09:30:00.000Z")]),
      now
    );

    expect(result?.inWater).toBe(false);
  });

  /*
   * 非 active 的部位不算——已結束的部位可能還留著舊的耐水期限，
   * 拿它當依據會讓首頁誤報。
   */
  it("非追蹤中的部位不算", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([
        zoneWithWater("2026-08-31T10:30:00.000Z", "ended"),
        { ...baseZone, zoneDueAt: "2026-08-31T11:00:00.000Z" }
      ]),
      now
    );

    expect(result?.inWater).toBe(false);
  });
});

/*
 * 標示沒說耐水多久的情況——**這一條是畫面實測才補上的**。
 *
 * 第一版只判斷 activeWaterDeadline，於是拿一件沒填包裝標示的防曬乳記錄
 * 「游泳／下水」時，事件流看得到入水、首頁卻完全沒反應。而那正是最需要
 * 提示的情況：連系統都不知道還能撐多久。
 *
 * 單元測試當時是全綠的，因為測試資料是自己捏的（見 CLAUDE.md「有些問題
 * 只有畫出來看才找得到」）。
 */
describe("耐水標示不明時也算在水裡", () => {
  const now = new Date("2026-08-31T10:00:00.000Z");

  it("WATER_RESISTANCE_UNKNOWN 也算", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([
        {
          ...baseZone,
          activeWaterDeadline: null,
          reasonCodes: ["WATER_RESISTANCE_UNKNOWN"],
          zoneDueAt: "2026-08-31T11:00:00.000Z"
        }
      ]),
      now
    );

    expect(result?.inWater).toBe(true);
  });

  /* 其他 reason code 不該把它一起帶起來。 */
  it("其他 reason code 不算", () => {
    const result = buildHomeReminderClockPresentation(
      makeSession([
        {
          ...baseZone,
          activeWaterDeadline: null,
          reasonCodes: ["PRODUCT_IDENTITY_UNKNOWN"],
          zoneDueAt: "2026-08-31T11:00:00.000Z"
        }
      ]),
      now
    );

    expect(result?.inWater).toBe(false);
  });
});
