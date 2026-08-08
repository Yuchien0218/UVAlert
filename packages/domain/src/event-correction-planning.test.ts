import { describe, expect, it } from "vitest";
import {
  makeProductSnapshot,
  makeStartSessionCommand
} from "../../test-fixtures/src/index";
import {
  planApplicationGroupCorrection,
  planContextEvent,
  planContextEventCorrection,
  planReapplication,
  planStartSession
} from "./planning";

const clock = {
  status: "trusted",
  trustedNow: "2026-08-01T10:30:00.000Z",
  connectivity: "online"
} as const;

function makeSession() {
  return planStartSession(
    makeStartSessionCommand({
      idPrefix: "corr",
      zones: [
        {
          zoneInstanceId: "zone-a",
          trackingEventId: "track-a",
          methodEventId: "method-a",
          bodyZoneCode: "hand_backs",
          customLabel: null,
          skinExposureStatus: "exposed",
          methodCertainty: "confirmed",
          methodComponents: ["sunscreen"]
        },
        {
          zoneInstanceId: "zone-b",
          trackingEventId: "track-b",
          methodEventId: "method-b",
          bodyZoneCode: "arms",
          customLabel: null,
          skinExposureStatus: "exposed",
          methodCertainty: "confirmed",
          methodComponents: ["sunscreen"]
        }
      ]
    }),
    clock
  );
}

function reportCommand(
  detail: Record<string, unknown>,
  o: { sessionId: string; eventId?: string; occurredAt?: string }
) {
  return {
    commandVersion: "1.0.0",
    commandType: "report_context_event",
    commandId: "command-2",
    idempotencyKey: "idem-2",
    owner: { type: "guest", localVisitorId: "visitor" },
    deviceLocalId: "device",
    sessionId: o.sessionId,
    clientSequence: 2,
    clientCreatedAt: "2026-08-01T10:30:00.000Z",
    expectedRevision: 1,
    payload: {
      eventId: o.eventId ?? "event-2",
      effectiveOccurredAt: o.occurredAt ?? "2026-08-01T10:10:00.000Z",
      detail
    }
  } as never;
}

function correctCommand(
  detail: Record<string, unknown>,
  o: {
    sessionId: string;
    targetEventId: string;
    action?: "replace" | "void";
    correctionEventId?: string;
    occurredAt?: string;
    clientSequence?: number;
    expectedRevision?: number;
  }
) {
  return {
    commandVersion: "1.0.0",
    commandType: "correct_context_event",
    commandId: `command-${o.clientSequence ?? 3}`,
    idempotencyKey: `idem-${o.clientSequence ?? 3}`,
    owner: { type: "guest", localVisitorId: "visitor" },
    deviceLocalId: "device",
    sessionId: o.sessionId,
    clientSequence: o.clientSequence ?? 3,
    clientCreatedAt: "2026-08-01T10:30:00.000Z",
    expectedRevision: o.expectedRevision ?? 2,
    payload: {
      correctionEventId: o.correctionEventId ?? "event-3",
      targetEventId: o.targetEventId,
      action: o.action ?? "replace",
      effectiveOccurredAt: o.occurredAt ?? "2026-08-01T10:05:00.000Z",
      detail
    }
  } as never;
}

describe("planContextEventCorrection", () => {
  it("replace 產生 correction 後繼事件並推進 revision", () => {
    const initial = makeSession();
    const reported = planContextEvent(
      reportCommand(
        { contextType: "hand_wash", zoneInstanceIds: ["zone-a"] },
        { sessionId: initial.session.id }
      ),
      initial.stream,
      initial.session,
      clock
    );

    const corrected = planContextEventCorrection(
      correctCommand(
        { contextType: "hand_wash", zoneInstanceIds: ["zone-a", "zone-b"] },
        { sessionId: initial.session.id, targetEventId: "event-2" }
      ),
      reported.stream,
      reported.session,
      clock
    );

    expect(corrected.event).toMatchObject({
      id: "event-3",
      correctionAction: "replace",
      correctionOfEventId: "event-2"
    });
    // 原事件仍留在稽核鏈上，不是被改寫。
    expect(corrected.stream.contextEvents).toHaveLength(2);
    expect(corrected.projection.revision).toBe(3);
  });

  it("同一筆事件不得建立第二個 successor", () => {
    const initial = makeSession();
    const reported = planContextEvent(
      reportCommand(
        { contextType: "towel", zoneInstanceIds: ["zone-a"] },
        { sessionId: initial.session.id }
      ),
      initial.stream,
      initial.session,
      clock
    );
    const first = planContextEventCorrection(
      correctCommand(
        { contextType: "towel", zoneInstanceIds: ["zone-b"] },
        { sessionId: initial.session.id, targetEventId: "event-2" }
      ),
      reported.stream,
      reported.session,
      clock
    );

    expect(() =>
      planContextEventCorrection(
        correctCommand(
          { contextType: "towel", zoneInstanceIds: ["zone-a"] },
          {
            sessionId: initial.session.id,
            targetEventId: "event-2",
            correctionEventId: "event-4",
            clientSequence: 4,
            expectedRevision: 3
          }
        ),
        first.stream,
        first.session,
        clock
      )
    ).toThrow(/已有 correction successor/);
  });

  it("更正後的時間位於未來時拒絕", () => {
    const initial = makeSession();
    const reported = planContextEvent(
      reportCommand(
        { contextType: "friction", zoneInstanceIds: ["zone-a"] },
        { sessionId: initial.session.id }
      ),
      initial.stream,
      initial.session,
      clock
    );

    expect(() =>
      planContextEventCorrection(
        correctCommand(
          { contextType: "friction", zoneInstanceIds: ["zone-a"] },
          {
            sessionId: initial.session.id,
            targetEventId: "event-2",
            occurredAt: "2026-08-01T11:00:00.000Z"
          }
        ),
        reported.stream,
        reported.session,
        clock
      )
    ).toThrow(/未來/);
  });

  it("void 一般原因事件後該事件不再影響狀態", () => {
    const initial = makeSession();
    const reported = planContextEvent(
      reportCommand(
        { contextType: "hand_wash", zoneInstanceIds: ["zone-a"] },
        { sessionId: initial.session.id }
      ),
      initial.stream,
      initial.session,
      clock
    );

    const voided = planContextEventCorrection(
      correctCommand(
        { contextType: "hand_wash", zoneInstanceIds: ["zone-a"] },
        {
          sessionId: initial.session.id,
          targetEventId: "event-2",
          action: "void"
        }
      ),
      reported.stream,
      reported.session,
      clock
    );

    const zoneA = voided.projection.zones.find(
      (zone) => zone.zoneInstanceId === "zone-a"
    );
    const beforeReport = initial.projection.zones.find(
      (zone) => zone.zoneInstanceId === "zone-a"
    );
    expect(zoneA?.activeCauseRefs).toEqual(beforeReport?.activeCauseRefs);
  });
});

describe("planContextEventCorrection 的水上限制", () => {
  function withOpenWater() {
    const initial = makeSession();
    const started = planContextEvent(
      reportCommand(
        {
          contextType: "water_start",
          activityIntervalId: "interval-1",
          zoneInstanceIds: ["zone-a", "zone-b"],
          startConfidence: "confirmed",
          activityStartedAt: "2026-08-01T10:05:00.000Z"
        },
        { sessionId: initial.session.id }
      ),
      initial.stream,
      initial.session,
      clock
    );
    return { initial, started };
  }

  it("更正入水的部位集合會讓已配對的離水變孤兒，必須擋下", () => {
    const { initial, started } = withOpenWater();
    const ended = planContextEvent(
      {
        ...(reportCommand(
          {
            contextType: "water_end",
            activityIntervalId: "interval-1",
            zoneInstanceIds: ["zone-a", "zone-b"],
            endedAt: "2026-08-01T10:15:00.000Z"
          },
          {
            sessionId: initial.session.id,
            eventId: "event-3",
            occurredAt: "2026-08-01T10:20:00.000Z"
          }
        ) as Record<string, unknown>),
        clientSequence: 3,
        expectedRevision: 2
      } as never,
      started.stream,
      started.session,
      clock
    );

    expect(() =>
      planContextEventCorrection(
        correctCommand(
          {
            contextType: "water_start",
            activityIntervalId: "interval-1",
            zoneInstanceIds: ["zone-a"],
            startConfidence: "confirmed",
            activityStartedAt: "2026-08-01T10:05:00.000Z"
          },
          {
            sessionId: initial.session.id,
            targetEventId: "event-2",
            correctionEventId: "event-4",
            clientSequence: 4,
            expectedRevision: 3
          }
        ),
        ended.stream,
        ended.session,
        clock
      )
    ).toThrow(/部位集合相同/);
  });

  it("void 未配對的入水是允許的", () => {
    const { initial, started } = withOpenWater();

    const voided = planContextEventCorrection(
      correctCommand(
        {
          contextType: "water_start",
          activityIntervalId: "interval-1",
          zoneInstanceIds: ["zone-a", "zone-b"],
          startConfidence: "confirmed",
          activityStartedAt: "2026-08-01T10:05:00.000Z"
        },
        {
          sessionId: initial.session.id,
          targetEventId: "event-2",
          action: "void"
        }
      ),
      started.stream,
      started.session,
      clock
    );

    expect(voided.event.correctionAction).toBe("void");
  });
});

describe("planApplicationGroupCorrection", () => {
  function withReapplication() {
    const initial = makeSession();
    const snapshot = makeProductSnapshot();
    const reapplied = planReapplication(
      {
        commandVersion: "1.0.0",
        commandType: "record_reapplication",
        commandId: "command-2",
        idempotencyKey: "idem-2",
        owner: { type: "guest", localVisitorId: "visitor" },
        deviceLocalId: "device",
        sessionId: initial.session.id,
        clientSequence: 2,
        clientCreatedAt: "2026-08-01T10:30:00.000Z",
        expectedRevision: 1,
        payload: {
          applicationConfirmationId: "group-1",
          appliedAt: "2026-08-01T10:10:00.000Z",
          applications: [
            {
              eventId: "app-1",
              zoneInstanceIds: ["zone-a", "zone-b"],
              sourceProductId: null,
              productSnapshotFingerprint: "fp-1",
              productLabelSnapshot: snapshot
            }
          ]
        }
      } as never,
      initial.stream,
      initial.session,
      clock
    );
    return { initial, reapplied, snapshot };
  }

  function groupCommand(o: {
    sessionId: string;
    action: "replace" | "void";
    applications: unknown[];
    appliedAt?: string;
  }) {
    return {
      commandVersion: "1.0.0",
      commandType: "correct_application_group",
      commandId: "command-3",
      idempotencyKey: "idem-3",
      owner: { type: "guest", localVisitorId: "visitor" },
      deviceLocalId: "device",
      sessionId: o.sessionId,
      clientSequence: 3,
      clientCreatedAt: "2026-08-01T10:30:00.000Z",
      expectedRevision: 2,
      payload: {
        correctionGroupId: "group-2",
        targetGroupId: "group-1",
        action: o.action,
        appliedAt: o.appliedAt ?? "2026-08-01T10:00:00.000Z",
        applications: o.applications
      }
    } as never;
  }

  it("replace 連同 application 一起重發，部位不遺失", () => {
    const { initial, reapplied, snapshot } = withReapplication();

    const corrected = planApplicationGroupCorrection(
      groupCommand({
        sessionId: initial.session.id,
        action: "replace",
        applications: [
          {
            eventId: "app-2",
            zoneInstanceIds: ["zone-a", "zone-b"],
            sourceProductId: null,
            productSnapshotFingerprint: "fp-1",
            productLabelSnapshot: snapshot
          }
        ]
      }),
      reapplied.stream,
      reapplied.session,
      clock
    );

    expect(corrected.group).toMatchObject({
      correctionAction: "replace",
      correctionOfGroupId: "group-1",
      appliedAt: "2026-08-01T10:00:00.000Z"
    });
    expect(corrected.events).toHaveLength(1);
    expect(corrected.events[0]?.applicationConfirmationId).toBe("group-2");
    // 兩個部位都還在，補擦時間換成更正後的值。
    expect(
      corrected.projection.zones.every(
        (zone) => zone.currentApplicationId === "app-2"
      )
    ).toBe(true);
  });

  it("void 之後那次補擦不再有效", () => {
    const { initial, reapplied } = withReapplication();

    const voided = planApplicationGroupCorrection(
      groupCommand({
        sessionId: initial.session.id,
        action: "void",
        applications: []
      }),
      reapplied.stream,
      reapplied.session,
      clock
    );

    expect(voided.group.correctionAction).toBe("void");
    expect(voided.events).toHaveLength(0);
    expect(
      voided.projection.zones.every(
        (zone) => zone.currentApplicationId !== "app-1"
      )
    ).toBe(true);
  });

  it("replace 沒帶 application 時在契約層就被擋下", () => {
    const { initial, reapplied } = withReapplication();

    expect(() =>
      planApplicationGroupCorrection(
        groupCommand({
          sessionId: initial.session.id,
          action: "replace",
          applications: []
        }),
        reapplied.stream,
        reapplied.session,
        clock
      )
    ).toThrow(/部位會全部消失/);
  });
});
