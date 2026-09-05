import { describe, expect, it } from "vitest";
import type {
  ApplicationEventV1,
  ContextEventV1,
  MethodComponent,
  ProductLabelSnapshotV1,
  SessionEventStreamV1,
  ZoneMethodEventV1
} from "@sunshield/contracts";
import { EVENT_SCHEMA_VERSION } from "@sunshield/contracts";
import {
  DomainInvariantError,
  planStartSession,
  reduceSession,
  validateCorrectionGraph
} from "@sunshield/domain";
import {
  makeClock,
  makeProductSnapshot,
  makeStartSessionCommand
} from "./index";

function makeStream(
  options: {
    idPrefix?: string;
    appliedAt?: string;
    effectiveStartedAt?: string;
    snapshot?: ProductLabelSnapshotV1;
    zones?: ReturnType<typeof makeStartSessionCommand>["payload"]["zones"];
    applicationGroup?: ReturnType<
      typeof makeStartSessionCommand
    >["payload"]["applicationGroup"];
  } = {}
): SessionEventStreamV1 {
  const command = makeStartSessionCommand({
    ...(options.idPrefix === undefined ? {} : { idPrefix: options.idPrefix }),
    ...(options.appliedAt === undefined
      ? {}
      : { appliedAt: options.appliedAt }),
    ...(options.effectiveStartedAt === undefined
      ? {}
      : { effectiveStartedAt: options.effectiveStartedAt }),
    ...(options.snapshot === undefined ? {} : { snapshot: options.snapshot }),
    ...(options.zones === undefined ? {} : { zones: options.zones }),
    ...(options.applicationGroup === undefined
      ? {}
      : { applicationGroup: options.applicationGroup })
  });
  return planStartSession(command, makeClock()).stream;
}

function eventBase(
  stream: SessionEventStreamV1,
  id: string,
  effectiveOccurredAt: string,
  sequence: number
) {
  return {
    schemaVersion: EVENT_SCHEMA_VERSION,
    id,
    sessionId: stream.sessionStarted.sessionId,
    commandId: `command-${sequence}`,
    idempotencyKey: `idempotency-${sequence}-${id}`,
    effectiveOccurredAt,
    clientCreatedAt: effectiveOccurredAt,
    clientSequence: sequence,
    localAppliedSequence: sequence
  } as const;
}

function addApplication(
  stream: SessionEventStreamV1,
  options: {
    id: string;
    zoneInstanceIds: string[];
    appliedAt: string;
    sequence: number;
    snapshot?: ProductLabelSnapshotV1;
    sourceProductId?: string | null;
    fingerprint?: string;
  }
): ApplicationEventV1 {
  const groupId = `${options.id}-group`;
  stream.applicationConfirmationGroups.push({
    ...eventBase(stream, groupId, options.appliedAt, options.sequence),
    eventType: "application_confirmation_group",
    appliedAt: options.appliedAt,
    confirmedZoneInstanceIds: options.zoneInstanceIds,
    correctionAction: "create",
    correctionOfGroupId: null
  });
  const application: ApplicationEventV1 = {
    ...eventBase(stream, options.id, options.appliedAt, options.sequence),
    eventType: "application_recorded",
    applicationConfirmationId: groupId,
    zoneInstanceIds: options.zoneInstanceIds,
    appliedAt: options.appliedAt,
    sourceProductId:
      options.sourceProductId === undefined
        ? "product-a"
        : options.sourceProductId,
    productSnapshotFingerprint: options.fingerprint ?? "snapshot-a",
    productLabelSnapshot: options.snapshot ?? makeProductSnapshot()
  };
  stream.applicationEvents.push(application);
  return application;
}

function addMethod(
  stream: SessionEventStreamV1,
  options: {
    id: string;
    zoneInstanceId: string;
    at: string;
    sequence: number;
    exposure: ZoneMethodEventV1["skinExposureStatus"];
    components: MethodComponent[];
    certainty?: ZoneMethodEventV1["methodCertainty"];
  }
): void {
  const previous = [...stream.zoneMethodEvents]
    .reverse()
    .find((event) => event.zoneInstanceId === options.zoneInstanceId)!;
  stream.zoneMethodEvents.push({
    ...eventBase(stream, options.id, options.at, options.sequence),
    eventType: "zone_method",
    zoneInstanceId: options.zoneInstanceId,
    bodyZoneCode: previous.bodyZoneCode,
    customLabel: previous.customLabel,
    skinExposureStatus: options.exposure,
    methodCertainty: options.certainty ?? "confirmed",
    methodComponents: options.components,
    correctionAction: "create",
    correctionOfEventId: null
  });
}

function addTracking(
  stream: SessionEventStreamV1,
  options: {
    id: string;
    zoneInstanceId: string;
    at: string;
    sequence: number;
    status: "active" | "ended";
  }
): void {
  stream.zoneTrackingEvents.push({
    ...eventBase(stream, options.id, options.at, options.sequence),
    eventType: "zone_tracking",
    zoneInstanceId: options.zoneInstanceId,
    trackingStatus: options.status,
    correctionAction: "create",
    correctionOfEventId: null
  });
}

function addContext(stream: SessionEventStreamV1, event: ContextEventV1): void {
  stream.contextEvents.push(event);
}

function causeEvent(
  stream: SessionEventStreamV1,
  options: {
    id: string;
    type: "heavy_sweat" | "towel" | "friction" | "hand_wash";
    at: string;
    sequence: number;
    zones: string[];
  }
): ContextEventV1 {
  return {
    ...eventBase(stream, options.id, options.at, options.sequence),
    eventType: "context_event",
    contextType: options.type,
    zoneInstanceIds: options.zones,
    correctionAction: "create",
    correctionOfEventId: null
  };
}

function addWaterStart(
  stream: SessionEventStreamV1,
  options: {
    id?: string;
    at: string;
    sequence: number;
    zones: string[];
    confidence?: "confirmed" | "unknown";
  }
): void {
  const confidence = options.confidence ?? "confirmed";
  addContext(stream, {
    ...eventBase(
      stream,
      options.id ?? "water-start",
      options.at,
      options.sequence
    ),
    eventType: "context_event",
    contextType: "water_start",
    activityIntervalId: "water-interval-1",
    zoneInstanceIds: options.zones,
    startConfidence: confidence,
    activityStartedAt: confidence === "confirmed" ? options.at : null,
    correctionAction: "create",
    correctionOfEventId: null
  });
}

function projection(
  stream: SessionEventStreamV1,
  now = "2026-07-29T11:00:00.000Z"
) {
  return reduceSession({ stream, revision: 1, clock: makeClock(now) });
}

function firstZone(
  stream: SessionEventStreamV1,
  now = "2026-07-29T11:00:00.000Z"
) {
  return projection(stream, now).zones[0]!;
}

describe("P0 reminder reducer fixed vectors", () => {
  it.each([
    {
      name: "TV-001 一般 120 分鐘",
      snapshot: makeProductSnapshot(),
      due: "2026-07-29T12:00:00.000Z"
    },
    {
      name: "TV-002 明確較短 90 分鐘",
      snapshot: makeProductSnapshot({
        reapplicationIntervalStatus: "explicit_minutes",
        reapplicationIntervalMinutes: 90
      }),
      due: "2026-07-29T11:30:00.000Z"
    },
    {
      name: "TV-004 180 分鐘不得延長",
      snapshot: makeProductSnapshot({
        reapplicationIntervalStatus: "explicit_minutes",
        reapplicationIntervalMinutes: 180
      }),
      due: "2026-07-29T12:00:00.000Z"
    }
  ])("$name", ({ snapshot, due }) => {
    const zone = firstZone(makeStream({ snapshot }));
    expect(zone.generalDueAt).toBe(due);
    expect(zone.zoneTimerStartedAt).toBe("2026-07-29T10:00:00.000Z");
  });

  /*
   * 「快到補擦時間」的門檻是 **20 分鐘**（2026-09-04 使用者裁決，原本 30）。
   *
   * 兩條測試夾住邊界的兩側：剛好 20 分鐘要進 soon、21 分鐘還不能。只守
   * 其中一邊的話，把窗口改成 24 小時或 0 都還會有一條是綠的。
   *
   * 塗抹 10:00 ＋ 間隔 90 分鐘 → 到期 11:30。
   */
  it("TV-003 剩餘 20 分鐘為 reapply_soon", () => {
    const snapshot = makeProductSnapshot({
      reapplicationIntervalStatus: "explicit_minutes",
      reapplicationIntervalMinutes: 90
    });
    expect(
      firstZone(makeStream({ snapshot }), "2026-07-29T11:10:00.000Z")
        .timingStatus
    ).toBe("reapply_soon");
  });

  it("距到期超過 20 分鐘時仍為 tracking", () => {
    const snapshot = makeProductSnapshot({
      reapplicationIntervalStatus: "explicit_minutes",
      reapplicationIntervalMinutes: 90
    });
    expect(
      firstZone(makeStream({ snapshot }), "2026-07-29T11:09:00.000Z")
        .timingStatus
    ).toBe("tracking");
  });

  /*
   * 2026-08-30 規則改動：區分「不知道」與「知道有問題」。
   *
   * 改動前 identity_unconfirmed 與 no_sunscreen_claim 也不建立期限，等於
   * 「沒填防曬乳資訊就完全沒有倒數」。但產品標示只會讓間隔變短
   * （Math.min(120, 標示分鐘)），沒有標示時的保守值本來就是 120——擋住
   * 倒數並沒有比較保守，只是什麼都不給。現行 UX 基準文件
   * （2026-08-15 sitemap 第 116 行）本來也是訂「可使用 120 分鐘保守預設」。
   *
   * 過期／異常／不適維持封鎖：那是使用者主動回報「這瓶有狀況」，這時給
   * 倒數等於忽略他的回報。
   */
  it.each([
    {
      name: "身分未知",
      snapshot: makeProductSnapshot({
        identityStatus: "identity_unconfirmed"
      }),
      reason: "PRODUCT_IDENTITY_UNKNOWN"
    },
    {
      name: "無防曬宣稱",
      snapshot: makeProductSnapshot({ sunscreenClaimStatus: "no_claim" }),
      reason: "PRODUCT_NO_SUNSCREEN_CLAIM"
    }
  ])("$name 仍以 120 分鐘保守預設建立期限", ({ snapshot, reason }) => {
    const zone = firstZone(makeStream({ snapshot }));
    expect(zone.currentApplicationId).not.toBeNull();
    expect(zone.generalDueAt).toBe("2026-07-29T12:00:00.000Z");
    /*
     * timingStatus 必須跟著一起是「有在計時」。
     *
     * 第一版只斷言 generalDueAt，結果漏掉 reducer 裡第二道 eligibility
     * 閘門（invalidTopical）——期限算得出來，畫面卻顯示「需要補充資料」。
     * 是瀏覽器實測才發現的，測試沒抓到。
     */
    expect(zone.timingStatus).toBe("tracking");
    /*
     * 主要動作也不能是 untimed_action_card。
     *
     * reducer 裡一共有三處用 eligibility 決定「有沒有倒數」：generalDueAt、
     * timingStatus（invalidTopical）、derivePrimaryAction。三處必須一致，
     * 否則會出現「提醒進行中但沒有倒數數字」——首頁的
     * buildHomeReminderClockPresentation 看到 untimed_action_card 就整個
     * 不渲染倒數。這是實測才發現的，前兩版測試都沒抓到。
     */
    expect(
      projection(makeStream({ snapshot })).primaryAction.presentationType
    ).not.toBe("untimed_action_card");
    /* 原因仍然回報——它從「封鎖原因」變成「說明性原因」，不是消失。 */
    expect(zone.reasonCodes).toContain(reason);
    /* 耐水倒數維持需要 eligible：沒有抗水標示不是保守預設能補的。 */
    expect(zone.activeWaterDeadline).toBeNull();
  });

  it.each([
    {
      name: "TV-007 產品過期",
      snapshot: makeProductSnapshot({ expiryStatus: "expired" }),
      reason: "PRODUCT_EXPIRED"
    },
    {
      name: "使用者回報異常",
      snapshot: makeProductSnapshot({ conditionStatus: "abnormal_reported" }),
      reason: "PRODUCT_ABNORMAL_REPORTED"
    },
    {
      name: "使用者回報不適",
      snapshot: makeProductSnapshot({ conditionStatus: "discomfort_reported" }),
      reason: "PRODUCT_DISCOMFORT_REPORTED"
    }
  ])("$name 不建立期限", ({ snapshot, reason }) => {
    const zone = firstZone(makeStream({ snapshot }));
    expect(zone.currentApplicationId).not.toBeNull();
    expect(zone.generalDueAt).toBeNull();
    expect(zone.timingStatus).toBe("untimed_action");
    expect(zone.reasonCodes).toContain(reason);
  });

  it("TV-006 最新不合格 Application 不回退", () => {
    const stream = makeStream({ appliedAt: "2026-07-29T09:00:00.000Z" });
    const newer = addApplication(stream, {
      id: "application-b",
      zoneInstanceIds: [stream.sessionStarted.zoneInstanceIds[0]!],
      appliedAt: "2026-07-29T10:00:00.000Z",
      sequence: 2,
      sourceProductId: "product-b",
      fingerprint: "snapshot-b",
      snapshot: makeProductSnapshot({
        identityStatus: "identity_unconfirmed"
      })
    });
    const zone = firstZone(stream);
    expect(zone.currentApplicationId).toBe(newer.id);
    /*
     * 2026-08-30：斷言從「沒有期限」改成「期限來自較新的那筆」。
     *
     * 這條規則要守的是**不得回退到舊的合格 Application**，不是「不合格就
     * 沒有期限」。舊的 09:00 合格 application 會給 11:00，新的 10:00
     * identity_unconfirmed 給 12:00——拿到 12:00 正好證明沒有回退。
     * 規則本身沒有變鬆，反而變得可以直接驗證。
     */
    expect(zone.generalDueAt).toBe("2026-07-29T12:00:00.000Z");
  });

  it("TV-008 效期未知仍可由其他欄位判為 eligible", () => {
    const zone = firstZone(
      makeStream({
        snapshot: makeProductSnapshot({ expiryStatus: "unknown" })
      })
    );
    expect(zone.currentApplicationEligibility).toBe("eligible");
    expect(zone.generalDueAt).toBe("2026-07-29T12:00:00.000Z");
  });

  it("TV-009 clothing-only 沒有產品期限", () => {
    const stream = makeStream({
      zones: [
        {
          zoneInstanceId: "arms",
          trackingEventId: "tracking-arms",
          methodEventId: "method-arms",
          bodyZoneCode: "arms",
          customLabel: null,
          skinExposureStatus: "clothing_covered",
          methodCertainty: "confirmed",
          methodComponents: ["clothing"]
        }
      ],
      applicationGroup: null
    });
    const zone = firstZone(stream);
    expect(zone.generalDueAt).toBeNull();
    expect(zone.activeWaterDeadline).toBeNull();
    expect(zone.timingStatus).toBe("not_applicable");
    expect(zone.recordStatus).toBe("physical_method_reported");
  });

  it("TV-010 重新外露沿用原 appliedAt", () => {
    const stream = makeStream({
      appliedAt: "2026-07-29T09:30:00.000Z",
      effectiveStartedAt: "2026-07-29T09:40:00.000Z"
    });
    const zoneId = stream.sessionStarted.zoneInstanceIds[0]!;
    addMethod(stream, {
      id: "covered",
      zoneInstanceId: zoneId,
      at: "2026-07-29T09:45:00.000Z",
      sequence: 2,
      exposure: "clothing_covered",
      components: ["clothing", "sunscreen"]
    });
    addMethod(stream, {
      id: "exposed-again",
      zoneInstanceId: zoneId,
      at: "2026-07-29T10:30:00.000Z",
      sequence: 3,
      exposure: "exposed",
      components: ["sunscreen"]
    });
    expect(firstZone(stream).generalDueAt).toBe("2026-07-29T11:30:00.000Z");
  });

  it("TV-011 sunscreen 移除後重加不復活舊 Application", () => {
    const stream = makeStream({ appliedAt: "2026-07-29T09:00:00.000Z" });
    const zoneId = stream.sessionStarted.zoneInstanceIds[0]!;
    addMethod(stream, {
      id: "sunscreen-removed",
      zoneInstanceId: zoneId,
      at: "2026-07-29T10:00:00.000Z",
      sequence: 2,
      exposure: "clothing_covered",
      components: ["clothing"]
    });
    addMethod(stream, {
      id: "sunscreen-restored",
      zoneInstanceId: zoneId,
      at: "2026-07-29T11:00:00.000Z",
      sequence: 3,
      exposure: "exposed",
      components: ["sunscreen"]
    });
    const zone = firstZone(stream);
    expect(zone.currentApplicationId).toBeNull();
    expect(zone.generalDueAt).toBeNull();
  });

  it("TV-012 同 command 回填時間可早於 Session 建立", () => {
    const stream = makeStream({
      appliedAt: "2026-07-29T09:30:00.000Z"
    });
    expect(firstZone(stream).generalDueAt).toBe("2026-07-29T11:30:00.000Z");
  });

  it("TV-013 明確等待建立 LABEL_WAIT", () => {
    const stream = makeStream({
      appliedAt: "2026-07-29T10:55:00.000Z",
      snapshot: makeProductSnapshot({
        preExposureWaitStatus: "explicit_minutes",
        preExposureWaitMinutes: 15
      })
    });
    const zone = firstZone(stream);
    expect(zone.activeLabelReadyAt).toBe("2026-07-29T11:10:00.000Z");
    expect(zone.timingStatus).toBe("label_wait");
    expect(zone.zoneNextActionAt).toBe("2026-07-29T11:10:00.000Z");
  });

  it("TV-014 已到期優先於 LABEL_WAIT", () => {
    const stream = makeStream({
      appliedAt: "2026-07-29T10:55:00.000Z",
      snapshot: makeProductSnapshot({
        reapplicationIntervalStatus: "explicit_minutes",
        reapplicationIntervalMinutes: 5,
        preExposureWaitStatus: "explicit_minutes",
        preExposureWaitMinutes: 15
      })
    });
    expect(firstZone(stream).timingStatus).toBe("reapply_due");
  });

  it.each([
    {
      name: "TV-015 耐水 40 分鐘",
      snapshot: makeProductSnapshot({
        waterResistanceStatus: "40",
        waterResistanceMinutes: 40
      }),
      waterDue: "2026-07-29T10:40:00.000Z",
      zoneDue: "2026-07-29T10:40:00.000Z"
    },
    {
      name: "TV-016 耐水 80 分鐘",
      snapshot: makeProductSnapshot({
        waterResistanceStatus: "80",
        waterResistanceMinutes: 80
      }),
      waterDue: "2026-07-29T11:20:00.000Z",
      zoneDue: "2026-07-29T11:20:00.000Z"
    }
  ])("$name", ({ snapshot, waterDue, zoneDue }) => {
    const stream = makeStream({
      appliedAt: "2026-07-29T09:30:00.000Z",
      snapshot
    });
    addWaterStart(stream, {
      at: "2026-07-29T10:00:00.000Z",
      sequence: 2,
      zones: stream.sessionStarted.zoneInstanceIds
    });
    const zone = firstZone(stream, "2026-07-29T10:20:00.000Z");
    expect(zone.activeWaterDeadline).toBe(waterDue);
    expect(zone.zoneDueAt).toBe(zoneDue);
    expect(zone.zoneTimerStartedAt).toBe("2026-07-29T10:00:00.000Z");
  });

  it("TV-017 塗抹晚於入水時不建立水上期限", () => {
    const stream = makeStream({
      appliedAt: "2026-07-29T10:10:00.000Z",
      snapshot: makeProductSnapshot({
        waterResistanceStatus: "40",
        waterResistanceMinutes: 40
      })
    });
    addWaterStart(stream, {
      at: "2026-07-29T10:00:00.000Z",
      sequence: 2,
      zones: stream.sessionStarted.zoneInstanceIds
    });
    expect(
      firstZone(stream, "2026-07-29T10:20:00.000Z").activeWaterDeadline
    ).toBeNull();
  });

  it("TV-018 入水起點未知產生無時間行動", () => {
    const stream = makeStream();
    addWaterStart(stream, {
      at: "2026-07-29T10:00:00.000Z",
      sequence: 2,
      zones: stream.sessionStarted.zoneInstanceIds,
      confidence: "unknown"
    });
    const result = projection(stream);
    const zone = result.zones[0]!;
    expect(zone.activeWaterDeadline).toBeNull();
    expect(zone.reasonCodes).toContain("WATER_START_UNKNOWN");
    expect(result.primaryAction.presentationType).toBe("untimed_action_card");
  });

  it("TV-019 耐水未知不移除一般期限", () => {
    const stream = makeStream();
    addWaterStart(stream, {
      at: "2026-07-29T10:10:00.000Z",
      sequence: 2,
      zones: stream.sessionStarted.zoneInstanceIds
    });
    const zone = firstZone(stream);
    expect(zone.activeWaterDeadline).toBeNull();
    expect(zone.generalDueAt).toBe("2026-07-29T12:00:00.000Z");
    expect(zone.reasonCodes).toContain("WATER_RESISTANCE_UNKNOWN");
  });

  it("TV-020 水中補擦不重設目前水上期限", () => {
    const snapshot = makeProductSnapshot({
      waterResistanceStatus: "40",
      waterResistanceMinutes: 40
    });
    const stream = makeStream({
      appliedAt: "2026-07-29T09:30:00.000Z",
      snapshot
    });
    const zoneId = stream.sessionStarted.zoneInstanceIds[0]!;
    addWaterStart(stream, {
      at: "2026-07-29T10:00:00.000Z",
      sequence: 2,
      zones: [zoneId]
    });
    addApplication(stream, {
      id: "water-reapplication",
      zoneInstanceIds: [zoneId],
      appliedAt: "2026-07-29T10:20:00.000Z",
      sequence: 3,
      snapshot
    });
    const zone = firstZone(stream, "2026-07-29T10:30:00.000Z");
    expect(zone.activeWaterDeadline).toBe("2026-07-29T10:40:00.000Z");
    expect(zone.generalDueAt).toBe("2026-07-29T12:20:00.000Z");
    expect(zone.zoneDueAt).toBe("2026-07-29T10:40:00.000Z");
  });

  it("TV-021 water_end 建立立即原因", () => {
    const stream = makeStream({
      appliedAt: "2026-07-29T09:30:00.000Z",
      snapshot: makeProductSnapshot({
        waterResistanceStatus: "40",
        waterResistanceMinutes: 40
      })
    });
    const zones = stream.sessionStarted.zoneInstanceIds;
    addWaterStart(stream, {
      at: "2026-07-29T10:00:00.000Z",
      sequence: 2,
      zones
    });
    addContext(stream, {
      ...eventBase(stream, "water-end", "2026-07-29T10:25:00.000Z", 3),
      eventType: "context_event",
      contextType: "water_end",
      activityIntervalId: "water-interval-1",
      zoneInstanceIds: zones,
      endedAt: "2026-07-29T10:25:00.000Z",
      correctionAction: "create",
      correctionOfEventId: null
    });
    const zone = firstZone(stream, "2026-07-29T10:30:00.000Z");
    expect(zone.eventTriggeredDeadline).toBe("2026-07-29T10:25:00.000Z");
    expect(zone.timingStatus).toBe("reapply_due");
  });

  it.each([
    ["2026-07-29T09:59:00.000Z", true],
    ["2026-07-29T10:00:00.000Z", true],
    ["2026-07-29T10:01:00.000Z", false]
  ])(
    "TV-022 cause=10:00、Application=%s 的 unresolved=%s",
    (appliedAt, unresolved) => {
      const stream = makeStream({ appliedAt });
      addContext(
        stream,
        causeEvent(stream, {
          id: "hand-wash",
          type: "hand_wash",
          at: "2026-07-29T10:00:00.000Z",
          sequence: 2,
          zones: stream.sessionStarted.zoneInstanceIds
        })
      );
      expect(firstZone(stream).eventTriggeredDeadline !== null).toBe(
        unresolved
      );
    }
  );

  it("TV-023 hand_wash 只影響事件指定的 hand_backs", () => {
    const zones = [
      {
        zoneInstanceId: "face",
        trackingEventId: "tracking-face",
        methodEventId: "method-face",
        bodyZoneCode: "face_forehead" as const,
        customLabel: null,
        skinExposureStatus: "exposed" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["sunscreen"] as const
      },
      {
        zoneInstanceId: "hands",
        trackingEventId: "tracking-hands",
        methodEventId: "method-hands",
        bodyZoneCode: "hand_backs" as const,
        customLabel: null,
        skinExposureStatus: "exposed" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["sunscreen"] as const
      }
    ].map((zone) => ({
      ...zone,
      methodComponents: [...zone.methodComponents]
    }));
    const stream = makeStream({ zones });
    addContext(
      stream,
      causeEvent(stream, {
        id: "wash-hands-only",
        type: "hand_wash",
        at: "2026-07-29T10:30:00.000Z",
        sequence: 2,
        zones: ["hands"]
      })
    );
    const result = projection(stream);
    expect(
      result.zones.find((zone) => zone.zoneInstanceId === "face")!.zoneDueAt
    ).toBe("2026-07-29T12:00:00.000Z");
    expect(
      result.zones.find((zone) => zone.zoneInstanceId === "hands")!.zoneDueAt
    ).toBe("2026-07-29T10:30:00.000Z");
  });

  /*
   * 2026-09-02 使用者裁決：一切正常時的主行動是「記錄補擦」，不是「記錄
   * 狀況」。改動前首頁只有一顆按鈕、secondaryActions 是空的，所以還沒到期
   * 就沒有辦法記錄補擦——而提早補擦是常見的。
   *
   * 記錄狀況沒有消失，改由首頁的提問卡承接（HomePage.test.ts 守著）。
   */
  it("tracking 的主行動是記錄補擦", () => {
    const stream = makeStream({ appliedAt: "2026-07-29T10:50:00.000Z" });
    const result = projection(stream, "2026-07-29T11:00:00.000Z");

    expect(result.zones[0]!.timingStatus).toBe("tracking");
    expect(result.primaryAction.actionKind).toBe("record_reapplication");
  });

  /*
   * 反向：遮蔽等「補擦不適用」的狀態仍然是記錄狀況。只守上面那條的話，
   * 把整個 actionKind 一律改成 record_reapplication 也會過——那會讓沒有
   * 防曬乳可補的部位也叫人去補擦。
   */
  it("補擦不適用時仍然是記錄狀況", () => {
    const stream = makeStream({ appliedAt: "2026-07-29T10:50:00.000Z" });
    const zoneId = stream.sessionStarted.zoneInstanceIds[0]!;
    addMethod(stream, {
      id: "cover",
      zoneInstanceId: zoneId,
      at: "2026-07-29T10:55:00.000Z",
      sequence: 9,
      components: ["clothing"],
      exposure: "clothing_covered"
    });
    const result = projection(stream, "2026-07-29T11:00:00.000Z");
    const zone = result.zones.find((z) => z.zoneInstanceId === zoneId)!;

    expect(zone.timingStatus).toBe("not_applicable");
    // **要斷言的是 actionKind，不是 timingStatus。** 第一版只比對後者，
    // 破壞驗證時發現「把全部 actionKind 一律改成補擦」照樣是綠的。
    expect(result.primaryAction.actionKind).toBe("report_context_event");
  });

  /*
   * **補擦要清得掉原因**（2026-09-02，實機驗證階段一時發現）。
   *
   * 判準原本是「最後一次 `eligible` 的塗抹」，但 `identity_unconfirmed`
   * （標示沒確認）自 2026-08-30 起會用 120 分鐘保守預設開始倒數，卻不算
   * `eligible`。而一筆合格塗抹都沒有時，過濾會讓所有損耗事件無條件成立——
   * 結果是標示未確認的使用者只要記錄過流汗，該部位就永遠到期。
   *
   * 那是預設路徑（沒填包裝標示就會落在這裡）。
   */
  describe("補擦清掉損耗原因", () => {
    function sweatThenReapply(
      snapshot: ReturnType<typeof makeProductSnapshot>
    ) {
      const stream = makeStream({
        appliedAt: "2026-07-29T09:00:00.000Z",
        snapshot
      });
      const zones = stream.sessionStarted.zoneInstanceIds;
      addContext(
        stream,
        causeEvent(stream, {
          id: "sweat",
          type: "heavy_sweat",
          at: "2026-07-29T10:30:00.000Z",
          sequence: 2,
          zones
        })
      );
      addApplication(stream, {
        id: "reapply",
        zoneInstanceIds: [...zones],
        appliedAt: "2026-07-29T10:31:00.000Z",
        sequence: 3,
        snapshot
      });
      return firstZone(stream, "2026-07-29T10:32:00.000Z");
    }

    /* 修復前這條是紅的：期限停在流汗那一刻，補擦清不掉。 */
    it("標示未確認也能清掉", () => {
      const zone = sweatThenReapply(
        makeProductSnapshot({
          identityStatus: "identity_unconfirmed",
          ruleEligibilityAtApplication: "identity_unconfirmed"
        })
      );

      expect(zone.eventTriggeredDeadline).toBeNull();
      expect(zone.timingStatus).not.toBe("reapply_due");
    });

    /* 合格標示本來就清得掉，順便釘住沒有回歸。 */
    it("合格標示照樣清得掉", () => {
      const zone = sweatThenReapply(makeProductSnapshot());

      expect(zone.eventTriggeredDeadline).toBeNull();
    });

    /*
     * **反向：安全封鎖不得被清掉。**
     *
     * 過期／回報異常／回報不適是 S-11／S-13 明訂無法直接恢復的狀態，拿一瓶
     * 過期的防曬乳再擦一次不該讓警示消失。
     *
     * 只守上面兩條的話，把判準放寬成「任何塗抹都算」也會過——那會讓這三種
     * 安全狀態被一次補擦洗掉。
     */
    for (const [label, overrides] of [
      [
        "已過期",
        { expiryStatus: "expired", ruleEligibilityAtApplication: "expired" }
      ],
      [
        "回報異常",
        {
          conditionStatus: "abnormal_reported",
          ruleEligibilityAtApplication: "abnormal_reported"
        }
      ],
      [
        "回報不適",
        {
          conditionStatus: "discomfort_reported",
          ruleEligibilityAtApplication: "discomfort_reported"
        }
      ]
    ] as const) {
      it(`${label}的塗抹不得清掉原因`, () => {
        const zone = sweatThenReapply(makeProductSnapshot(overrides as never));

        expect(zone.eventTriggeredDeadline).toBe("2026-07-29T10:30:00.000Z");
      });
    }
  });

  it("TV-024 多個原因取最早未解除時間", () => {
    const stream = makeStream({ appliedAt: "2026-07-29T09:00:00.000Z" });
    const zones = stream.sessionStarted.zoneInstanceIds;
    for (const [id, type, at, sequence] of [
      ["towel", "towel", "2026-07-29T10:20:00.000Z", 2],
      ["friction", "friction", "2026-07-29T10:10:00.000Z", 3],
      ["sweat", "heavy_sweat", "2026-07-29T10:30:00.000Z", 4]
    ] as const) {
      addContext(stream, causeEvent(stream, { id, type, at, sequence, zones }));
    }
    expect(firstZone(stream).eventTriggeredDeadline).toBe(
      "2026-07-29T10:10:00.000Z"
    );
  });

  it("TV-025 衣物只暫停原因，再外露後恢復", () => {
    const stream = makeStream({ appliedAt: "2026-07-29T09:00:00.000Z" });
    const zoneId = stream.sessionStarted.zoneInstanceIds[0]!;
    addContext(
      stream,
      causeEvent(stream, {
        id: "wash-before-cover",
        type: "hand_wash",
        at: "2026-07-29T10:00:00.000Z",
        sequence: 2,
        zones: [zoneId]
      })
    );
    addMethod(stream, {
      id: "cover",
      zoneInstanceId: zoneId,
      at: "2026-07-29T10:01:00.000Z",
      sequence: 3,
      exposure: "clothing_covered",
      components: ["clothing", "sunscreen"]
    });
    expect(firstZone(stream).eventTriggeredDeadline).toBeNull();
    addMethod(stream, {
      id: "expose",
      zoneInstanceId: zoneId,
      at: "2026-07-29T10:30:00.000Z",
      sequence: 4,
      exposure: "exposed",
      components: ["sunscreen"]
    });
    expect(firstZone(stream).eventTriggeredDeadline).toBe(
      "2026-07-29T10:00:00.000Z"
    );
  });

  it("TV-026 停止後重新追蹤不復活舊 Application 或清除原因", () => {
    const stream = makeStream({ appliedAt: "2026-07-29T09:00:00.000Z" });
    const zoneId = stream.sessionStarted.zoneInstanceIds[0]!;
    addContext(
      stream,
      causeEvent(stream, {
        id: "towel-before-stop",
        type: "towel",
        at: "2026-07-29T10:00:00.000Z",
        sequence: 2,
        zones: [zoneId]
      })
    );
    addTracking(stream, {
      id: "tracking-ended",
      zoneInstanceId: zoneId,
      at: "2026-07-29T10:01:00.000Z",
      sequence: 3,
      status: "ended"
    });
    addTracking(stream, {
      id: "tracking-restarted",
      zoneInstanceId: zoneId,
      at: "2026-07-29T10:30:00.000Z",
      sequence: 4,
      status: "active"
    });

    const zone = firstZone(stream);
    expect(zone.currentApplicationId).toBeNull();
    expect(zone.generalDueAt).toBeNull();
    expect(zone.activeCauseRefs).toContain("towel-before-stop");
    expect(zone.eventTriggeredDeadline).toBe("2026-07-29T10:00:00.000Z");
  });

  it("TV-027／028 同一產品安全封鎖使期限失效且重擦不解除", () => {
    const stream = makeStream();
    const zoneId = stream.sessionStarted.zoneInstanceIds[0]!;
    stream.productSafetyEvents.push({
      ...eventBase(stream, "abnormal-a", "2026-07-29T10:30:00.000Z", 2),
      eventType: "product_safety",
      safetyKind: "abnormal_reported",
      sourceProductId: "fixture-product-a",
      productSnapshotFingerprint: null,
      zoneInstanceIds: [zoneId],
      correctionAction: "create",
      correctionOfEventId: null
    });
    addApplication(stream, {
      id: "same-product-again",
      zoneInstanceIds: [zoneId],
      appliedAt: "2026-07-29T10:40:00.000Z",
      sequence: 3,
      sourceProductId: "fixture-product-a",
      fingerprint: "new-snapshot-a"
    });
    const zone = firstZone(stream);
    expect(zone.activeProductSafetyBlock).toBe(true);
    expect(zone.generalDueAt).toBeNull();
    expect(zone.reasonCodes).toContain("PRODUCT_ABNORMAL_REPORTED");
  });

  it("TV-029 改用產品 B 可建立期限，但 A safety event 保留", () => {
    const stream = makeStream();
    const zoneId = stream.sessionStarted.zoneInstanceIds[0]!;
    stream.productSafetyEvents.push({
      ...eventBase(stream, "abnormal-a", "2026-07-29T10:30:00.000Z", 2),
      eventType: "product_safety",
      safetyKind: "abnormal_reported",
      sourceProductId: "fixture-product-a",
      productSnapshotFingerprint: null,
      zoneInstanceIds: [zoneId],
      correctionAction: "create",
      correctionOfEventId: null
    });
    addApplication(stream, {
      id: "product-b-application",
      zoneInstanceIds: [zoneId],
      appliedAt: "2026-07-29T10:40:00.000Z",
      sequence: 3,
      sourceProductId: "product-b",
      fingerprint: "snapshot-b"
    });
    const zone = firstZone(stream);
    expect(zone.activeProductSafetyBlock).toBe(false);
    expect(zone.generalDueAt).toBe("2026-07-29T12:40:00.000Z");
    expect(stream.productSafetyEvents).toHaveLength(1);
  });

  it("TV-030～032 context／UVI／weather 不參與 reducer deadline", () => {
    const stream = makeStream();
    addContext(stream, {
      ...eventBase(stream, "indoor", "2026-07-29T10:30:00.000Z", 2),
      eventType: "context_event",
      contextType: "context_changed",
      context: "indoor_away",
      shade: "full",
      correctionAction: "create",
      correctionOfEventId: null
    });
    expect(firstZone(stream).zoneDueAt).toBe("2026-07-29T12:00:00.000Z");
  });

  it("TV-033 sessionNextDueAt 忽略 null 並取最早", () => {
    const zones = [
      {
        zoneInstanceId: "face",
        trackingEventId: "tf",
        methodEventId: "mf",
        bodyZoneCode: "face_forehead" as const,
        customLabel: null,
        skinExposureStatus: "exposed" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["sunscreen" as const]
      },
      {
        zoneInstanceId: "hands",
        trackingEventId: "th",
        methodEventId: "mh",
        bodyZoneCode: "hand_backs" as const,
        customLabel: null,
        skinExposureStatus: "clothing_covered" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["clothing" as const]
      },
      {
        zoneInstanceId: "neck",
        trackingEventId: "tn",
        methodEventId: "mn",
        bodyZoneCode: "neck_front" as const,
        customLabel: null,
        skinExposureStatus: "exposed" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["sunscreen" as const]
      }
    ];
    const group = {
      groupId: "partition-group",
      appliedAt: "2026-07-29T10:00:00.000Z",
      applications: [
        {
          eventId: "face-app",
          zoneInstanceIds: ["face"],
          sourceProductId: "product-a",
          productSnapshotFingerprint: "snapshot-face",
          productLabelSnapshot: makeProductSnapshot()
        },
        {
          eventId: "neck-app",
          zoneInstanceIds: ["neck"],
          sourceProductId: "product-a",
          productSnapshotFingerprint: "snapshot-neck",
          productLabelSnapshot: makeProductSnapshot({
            reapplicationIntervalStatus: "explicit_minutes",
            reapplicationIntervalMinutes: 90
          })
        }
      ]
    };
    const result = projection(makeStream({ zones, applicationGroup: group }));
    expect(result.sessionNextDueAt).toBe("2026-07-29T11:30:00.000Z");
  });

  it("TV-034 無時間狀態優先於其他部位的數字期限", () => {
    const zones = [
      {
        zoneInstanceId: "face",
        trackingEventId: "tf",
        methodEventId: "mf",
        bodyZoneCode: "face_forehead" as const,
        customLabel: null,
        skinExposureStatus: "exposed" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["sunscreen" as const]
      },
      {
        zoneInstanceId: "ear",
        trackingEventId: "te",
        methodEventId: "me",
        bodyZoneCode: "ears" as const,
        customLabel: null,
        skinExposureStatus: "exposed" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["sunscreen" as const]
      }
    ];
    const group = {
      groupId: "two-products",
      appliedAt: "2026-07-29T10:00:00.000Z",
      applications: [
        {
          eventId: "face-app",
          zoneInstanceIds: ["face"],
          sourceProductId: "a",
          productSnapshotFingerprint: "a",
          productLabelSnapshot: makeProductSnapshot({
            reapplicationIntervalStatus: "explicit_minutes",
            reapplicationIntervalMinutes: 90
          })
        },
        {
          eventId: "ear-app",
          zoneInstanceIds: ["ear"],
          sourceProductId: null,
          productSnapshotFingerprint: "unknown",
          /*
           * 2026-08-30：這裡原本用 identity_unconfirmed 當「無時間狀態」
           * 的例子。規則改動後它會得到 120 分鐘保守倒數，不再是無時間，
           * 這個情境就測不到原本要測的東西了。
           *
           * 改用 expired——它仍然是無時間狀態。**測的規則沒有變**：一個
           * 部位處於無時間狀態時，主要動作要選它，而不是另一個部位的數字
           * 期限。
           */
          productLabelSnapshot: makeProductSnapshot({
            expiryStatus: "expired"
          })
        }
      ]
    };
    const result = projection(makeStream({ zones, applicationGroup: group }));
    expect(result.sessionNextDueAt).toBe("2026-07-29T11:30:00.000Z");
    expect(result.primaryAction.affectedZoneInstanceIds).toEqual(["ear"]);
    expect(result.primaryAction.presentationType).toBe("untimed_action_card");
  });

  it("TV-035 同呈現層級的不同動作合併為 multi_action", () => {
    const zones = [
      {
        zoneInstanceId: "ear",
        trackingEventId: "te",
        methodEventId: "me",
        bodyZoneCode: "ears" as const,
        customLabel: null,
        skinExposureStatus: "clothing_covered" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["clothing" as const]
      },
      {
        zoneInstanceId: "hands",
        trackingEventId: "th",
        methodEventId: "mh",
        bodyZoneCode: "hand_backs" as const,
        customLabel: null,
        skinExposureStatus: "clothing_covered" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["clothing" as const]
      }
    ];
    const stream = makeStream({ zones, applicationGroup: null });
    const earMethod = stream.zoneMethodEvents.find(
      (event) => event.zoneInstanceId === "ear"
    )!;
    earMethod.skinExposureStatus = "unknown";
    earMethod.methodCertainty = "unknown";
    earMethod.methodComponents = [];
    const handMethod = stream.zoneMethodEvents.find(
      (event) => event.zoneInstanceId === "hands"
    )!;
    handMethod.skinExposureStatus = "exposed";
    handMethod.methodCertainty = "unrecorded";
    handMethod.methodComponents = [];
    const action = projection(stream).primaryAction;
    expect(action.variant).toBe("multi_action");
    expect(action.actionKind).toBe("review_required_zones");
  });

  it("TV-036 CLOCK_UNTRUSTED 覆蓋 zone due", () => {
    const stream = makeStream({
      appliedAt: "2026-07-29T09:00:00.000Z"
    });
    const result = reduceSession({
      stream,
      revision: 1,
      clock: makeClock("2026-07-29T11:00:00.000Z", {
        status: "clock_untrusted"
      })
    });
    expect(result.zones[0]!.timingStatus).toBe("reapply_due");
    expect(result.primaryAction.actionKind).toBe("recalibrate_clock");
  });

  it("TV-037 局部補擦只更新被選部位", () => {
    const zones = [
      {
        zoneInstanceId: "face",
        trackingEventId: "tf",
        methodEventId: "mf",
        bodyZoneCode: "face_forehead" as const,
        customLabel: null,
        skinExposureStatus: "exposed" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["sunscreen" as const]
      },
      {
        zoneInstanceId: "hands",
        trackingEventId: "th",
        methodEventId: "mh",
        bodyZoneCode: "hand_backs" as const,
        customLabel: null,
        skinExposureStatus: "exposed" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["sunscreen" as const]
      }
    ];
    const snapshot = makeProductSnapshot({
      reapplicationIntervalStatus: "explicit_minutes",
      reapplicationIntervalMinutes: 60
    });
    const stream = makeStream({ zones, snapshot });
    addApplication(stream, {
      id: "hands-reapplication",
      zoneInstanceIds: ["hands"],
      appliedAt: "2026-07-29T11:05:00.000Z",
      sequence: 2,
      snapshot
    });
    const result = projection(stream, "2026-07-29T11:05:00.000Z");
    expect(
      result.zones.find((zone) => zone.zoneInstanceId === "face")!.timingStatus
    ).toBe("reapply_due");
    expect(
      result.zones.find((zone) => zone.zoneInstanceId === "hands")!.generalDueAt
    ).toBe("2026-07-29T12:05:00.000Z");
    expect(result.primaryAction.affectedZoneInstanceIds).toEqual(["face"]);
  });

  it("TV-038 非互斥 Application group 整組拒絕", () => {
    const zones = [
      {
        zoneInstanceId: "face",
        trackingEventId: "tf",
        methodEventId: "mf",
        bodyZoneCode: "face_forehead" as const,
        customLabel: null,
        skinExposureStatus: "exposed" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["sunscreen" as const]
      },
      {
        zoneInstanceId: "hands",
        trackingEventId: "th",
        methodEventId: "mh",
        bodyZoneCode: "hand_backs" as const,
        customLabel: null,
        skinExposureStatus: "exposed" as const,
        methodCertainty: "confirmed" as const,
        methodComponents: ["sunscreen" as const]
      }
    ];
    const stream = makeStream({ zones });
    const group = stream.applicationConfirmationGroups[0]!;
    stream.applicationEvents.push({
      ...stream.applicationEvents[0]!,
      id: "overlap",
      zoneInstanceIds: ["hands"],
      applicationConfirmationId: group.id
    });
    expect(() => projection(stream)).toThrow(DomainInvariantError);
  });

  it("TV-039 correction target 只能有唯一 successor", () => {
    const stream = makeStream();
    const original = stream.zoneMethodEvents[0]!;
    const replacement = {
      ...original,
      id: "replacement-1",
      correctionAction: "replace" as const,
      correctionOfEventId: original.id
    };
    const competing = {
      ...original,
      id: "replacement-2",
      correctionAction: "replace" as const,
      correctionOfEventId: original.id
    };
    expect(() =>
      validateCorrectionGraph(
        [original, replacement, competing],
        () => "zone_method"
      )
    ).toThrowError(/successor/);
  });

  it("correction graph 明確拒絕 cycle", () => {
    const stream = makeStream();
    const template = stream.zoneMethodEvents[0]!;
    const first = {
      ...template,
      id: "cycle-a",
      correctionAction: "replace" as const,
      correctionOfEventId: "cycle-b"
    };
    const second = {
      ...template,
      id: "cycle-b",
      correctionAction: "replace" as const,
      correctionOfEventId: "cycle-a"
    };
    expect(() =>
      validateCorrectionGraph([first, second], () => "zone_method")
    ).toThrowError(/cycle/);
  });

  it("TV-040 Session 結束後事件不會重開 Session", () => {
    const stream = makeStream();
    stream.sessionEndedEvents.push({
      ...eventBase(stream, "session-ended", "2026-07-29T11:00:00.000Z", 2),
      eventType: "session_ended",
      endedAt: "2026-07-29T11:00:00.000Z",
      endedReason: "user_ended"
    });
    addContext(
      stream,
      causeEvent(stream, {
        id: "later-cause",
        type: "friction",
        at: "2026-07-29T11:01:00.000Z",
        sequence: 3,
        zones: stream.sessionStarted.zoneInstanceIds
      })
    );
    const result = projection(stream, "2026-07-29T11:02:00.000Z");
    expect(result.overallStatus).toBe("ended");
    expect(result.primaryAction.actionKind).toBe("view_ended_state");
  });
});
