import { describe, expect, it } from "vitest";
import { makeStartSessionCommand } from "../../test-fixtures/src/index";
import { DomainInvariantError } from "./errors";
import { planContextEvent, planStartSession } from "./planning";

const clock = {
  status: "trusted",
  trustedNow: "2026-08-01T10:30:00.000Z",
  connectivity: "online"
} as const;

function makeSession() {
  return planStartSession(
    makeStartSessionCommand({
      idPrefix: "ctx",
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

function command(
  detail: Record<string, unknown>,
  overrides: {
    eventId?: string;
    sessionId: string;
    clientSequence?: number;
    expectedRevision?: number;
    effectiveOccurredAt?: string;
  }
) {
  return {
    commandVersion: "1.0.0",
    commandType: "report_context_event",
    commandId: `command-${overrides.clientSequence ?? 2}`,
    idempotencyKey: `idem-${overrides.clientSequence ?? 2}`,
    owner: { type: "guest", localVisitorId: "visitor" },
    deviceLocalId: "device",
    sessionId: overrides.sessionId,
    clientSequence: overrides.clientSequence ?? 2,
    clientCreatedAt: "2026-08-01T10:30:00.000Z",
    expectedRevision: overrides.expectedRevision ?? 1,
    payload: {
      eventId: overrides.eventId ?? "event-2",
      effectiveOccurredAt:
        overrides.effectiveOccurredAt ?? "2026-08-01T10:20:00.000Z",
      detail
    }
  };
}

describe("planContextEvent", () => {
  it("記錄一般原因事件並推進 revision", () => {
    const initial = makeSession();

    const plan = planContextEvent(
      command(
        { contextType: "hand_wash", zoneInstanceIds: ["zone-a"] },
        { sessionId: initial.session.id }
      ) as never,
      initial.stream,
      initial.session,
      clock
    );

    expect(plan.event.contextType).toBe("hand_wash");
    expect(plan.stream.contextEvents).toHaveLength(1);
    expect(plan.projection.revision).toBe(2);
    expect(plan.committedEventIds).toEqual(["event-2"]);
  });

  it("事件時間位於未來時拒絕建立", () => {
    const initial = makeSession();

    expect(() =>
      planContextEvent(
        command(
          { contextType: "towel", zoneInstanceIds: ["zone-a"] },
          {
            sessionId: initial.session.id,
            effectiveOccurredAt: "2026-08-01T11:00:00.000Z"
          }
        ) as never,
        initial.stream,
        initial.session,
        clock
      )
    ).toThrow(DomainInvariantError);
  });

  it("已有進行中的水上區間時不允許重疊起點", () => {
    const initial = makeSession();
    const first = planContextEvent(
      command(
        {
          contextType: "water_start",
          activityIntervalId: "interval-1",
          zoneInstanceIds: ["zone-a", "zone-b"],
          startConfidence: "confirmed",
          activityStartedAt: "2026-08-01T10:10:00.000Z"
        },
        { sessionId: initial.session.id }
      ) as never,
      initial.stream,
      initial.session,
      clock
    );

    expect(() =>
      planContextEvent(
        command(
          {
            contextType: "water_start",
            activityIntervalId: "interval-2",
            zoneInstanceIds: ["zone-a", "zone-b"],
            startConfidence: "confirmed",
            activityStartedAt: "2026-08-01T10:20:00.000Z"
          },
          {
            sessionId: initial.session.id,
            eventId: "event-3",
            clientSequence: 3,
            expectedRevision: 2
          }
        ) as never,
        first.stream,
        first.session,
        clock
      )
    ).toThrow(/水上活動區間不得重疊/);
  });

  it("沒有對應起點的離水事件會被擋下", () => {
    const initial = makeSession();

    expect(() =>
      planContextEvent(
        command(
          {
            contextType: "water_end",
            activityIntervalId: "interval-1",
            zoneInstanceIds: ["zone-a"],
            endedAt: "2026-08-01T10:15:00.000Z"
          },
          { sessionId: initial.session.id }
        ) as never,
        initial.stream,
        initial.session,
        clock
      )
    ).toThrow(/找不到唯一且部位集合相同的起點/);
  });

  it("離水部位集合必須與起點一致", () => {
    const initial = makeSession();
    const started = planContextEvent(
      command(
        {
          contextType: "water_start",
          activityIntervalId: "interval-1",
          zoneInstanceIds: ["zone-a", "zone-b"],
          startConfidence: "confirmed",
          activityStartedAt: "2026-08-01T10:10:00.000Z"
        },
        { sessionId: initial.session.id }
      ) as never,
      initial.stream,
      initial.session,
      clock
    );

    expect(() =>
      planContextEvent(
        command(
          {
            contextType: "water_end",
            activityIntervalId: "interval-1",
            zoneInstanceIds: ["zone-a"],
            endedAt: "2026-08-01T10:15:00.000Z"
          },
          {
            sessionId: initial.session.id,
            eventId: "event-3",
            clientSequence: 3,
            expectedRevision: 2
          }
        ) as never,
        started.stream,
        started.session,
        clock
      )
    ).toThrow(/部位集合相同/);
  });

  it("完整的入水與離水配對會被接受", () => {
    const initial = makeSession();
    const started = planContextEvent(
      command(
        {
          contextType: "water_start",
          activityIntervalId: "interval-1",
          zoneInstanceIds: ["zone-a", "zone-b"],
          startConfidence: "confirmed",
          activityStartedAt: "2026-08-01T10:10:00.000Z"
        },
        { sessionId: initial.session.id }
      ) as never,
      initial.stream,
      initial.session,
      clock
    );

    const ended = planContextEvent(
      command(
        {
          contextType: "water_end",
          activityIntervalId: "interval-1",
          zoneInstanceIds: ["zone-a", "zone-b"],
          endedAt: "2026-08-01T10:15:00.000Z"
        },
        {
          sessionId: initial.session.id,
          eventId: "event-3",
          clientSequence: 3,
          expectedRevision: 2
        }
      ) as never,
      started.stream,
      started.session,
      clock
    );

    expect(ended.stream.contextEvents).toHaveLength(2);
    expect(ended.projection.revision).toBe(3);
  });

  it("入水時間未知時不寫入起點時刻", () => {
    const initial = makeSession();

    const plan = planContextEvent(
      command(
        {
          contextType: "water_start",
          activityIntervalId: "interval-1",
          zoneInstanceIds: ["zone-a"],
          startConfidence: "unknown",
          activityStartedAt: null
        },
        { sessionId: initial.session.id }
      ) as never,
      initial.stream,
      initial.session,
      clock
    );

    expect(plan.event).toMatchObject({
      contextType: "water_start",
      startConfidence: "unknown",
      activityStartedAt: null
    });
  });
});
