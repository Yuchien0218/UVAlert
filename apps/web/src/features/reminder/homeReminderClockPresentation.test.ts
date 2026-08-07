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
      title: "建議進行全面補擦",
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
      title: "即將需要優先補擦：額頭"
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
      affectedZoneInstanceIds: zones.map(
        (zone) => zone.zoneInstanceId
      )
    },
    derivedFromEventRefs: ["application-1"]
  };
}
