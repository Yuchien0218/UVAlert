import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { makeStartSessionCommand } from "../../../test-fixtures/src/index";
import { SunshieldDatabase } from "../db/database";
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

async function seedSessionWithEvent() {
  const database = new SunshieldDatabase(`correct-${crypto.randomUUID()}`);
  databases.push(database);
  const repository = new LocalSessionRepository({
    database,
    sourceContextId: "test"
  });
  const start = makeStartSessionCommand({ idPrefix: "corr" });
  const started = await repository.startSession(start, clock);
  expect(started.ok).toBe(true);

  const zoneId = start.payload.zones[0]!.zoneInstanceId;
  const reported = await repository.reportContextEvent(
    {
      commandVersion: "1.0.0",
      commandType: "report_context_event",
      commandId: "report-command",
      idempotencyKey: "report-idem",
      owner: start.owner,
      deviceLocalId: start.deviceLocalId,
      sessionId: start.sessionId,
      clientSequence: 2,
      clientCreatedAt: clock.trustedNow,
      expectedRevision: 1,
      payload: {
        eventId: "context-event-1",
        effectiveOccurredAt: "2026-08-01T10:10:00.000Z",
        detail: { contextType: "hand_wash", zoneInstanceIds: [zoneId] }
      }
    } as never,
    clock
  );
  expect(reported.ok).toBe(true);

  return { database, repository, start, zoneId };
}

function correctionCommand(o: {
  start: ReturnType<typeof makeStartSessionCommand>;
  zoneId: string;
  correctionEventId: string;
  clientSequence: number;
  expectedRevision: number;
  suffix: string;
}) {
  return {
    commandVersion: "1.0.0",
    commandType: "correct_context_event",
    commandId: `correct-command-${o.suffix}`,
    idempotencyKey: `correct-idem-${o.suffix}`,
    owner: o.start.owner,
    deviceLocalId: o.start.deviceLocalId,
    sessionId: o.start.sessionId,
    clientSequence: o.clientSequence,
    clientCreatedAt: clock.trustedNow,
    expectedRevision: o.expectedRevision,
    payload: {
      correctionEventId: o.correctionEventId,
      targetEventId: "context-event-1",
      action: "replace",
      effectiveOccurredAt: "2026-08-01T10:05:00.000Z",
      detail: { contextType: "hand_wash", zoneInstanceIds: [o.zoneId] }
    }
  } as never;
}

describe("LocalSessionRepository.correctContextEvent", () => {
  it("提交後繼事件並在同一交易內登記 CorrectionSuccessors", async () => {
    const { database, repository, start, zoneId } =
      await seedSessionWithEvent();

    const result = await repository.correctContextEvent(
      correctionCommand({
        start,
        zoneId,
        correctionEventId: "context-event-2",
        clientSequence: 3,
        expectedRevision: 2,
        suffix: "a"
      }),
      clock
    );

    expect(result.ok).toBe(true);
    // 原事件仍在——不可變稽核鏈。
    expect(await database.ContextEvents.get("context-event-1")).toBeDefined();
    const successor = await database.ContextEvents.get("context-event-2");
    expect(successor).toMatchObject({
      correctionAction: "replace",
      correctionOfEventId: "context-event-1"
    });
    // 這張表在 S-10 之前從未被寫入過。
    expect(await database.CorrectionSuccessors.get("context-event-1")).toEqual({
      targetRef: "context-event-1",
      successorId: "context-event-2"
    });
  });

  it("同一筆事件的第二個 successor 被擋下並回 CORRECTION_CONFLICT", async () => {
    const { database, repository, start, zoneId } =
      await seedSessionWithEvent();

    expect(
      (
        await repository.correctContextEvent(
          correctionCommand({
            start,
            zoneId,
            correctionEventId: "context-event-2",
            clientSequence: 3,
            expectedRevision: 2,
            suffix: "a"
          }),
          clock
        )
      ).ok
    ).toBe(true);

    const second = await repository.correctContextEvent(
      correctionCommand({
        start,
        zoneId,
        correctionEventId: "context-event-3",
        clientSequence: 4,
        expectedRevision: 3,
        suffix: "b"
      }),
      clock
    );

    expect(second).toMatchObject({
      ok: false,
      code: "CORRECTION_CONFLICT"
    });
    // 失敗時原有效狀態保持不變，沒有寫進第二個後繼事件。
    expect(await database.ContextEvents.get("context-event-3")).toBeUndefined();
  });

  it("重送同一個 command 走冪等收據，不再寫一次", async () => {
    const { database, repository, start, zoneId } =
      await seedSessionWithEvent();
    const command = correctionCommand({
      start,
      zoneId,
      correctionEventId: "context-event-2",
      clientSequence: 3,
      expectedRevision: 2,
      suffix: "a"
    });

    const first = await repository.correctContextEvent(command, clock);
    const replay = await repository.correctContextEvent(command, clock);

    expect(first.ok).toBe(true);
    expect(replay).toEqual(first);
    expect(await database.ContextEvents.count()).toBe(2);
  });
});

describe("LocalSessionRepository.getCorrectionContext", () => {
  it("回報 target 是否仍是有效 leaf", async () => {
    const { repository, start, zoneId } = await seedSessionWithEvent();
    const visitorId = start.owner.localVisitorId;

    const before = await repository.getCorrectionContext(
      visitorId,
      "context-event-1"
    );
    expect(before).toMatchObject({ kind: "context_event", isLeaf: true });

    await repository.correctContextEvent(
      correctionCommand({
        start,
        zoneId,
        correctionEventId: "context-event-2",
        clientSequence: 3,
        expectedRevision: 2,
        suffix: "a"
      }),
      clock
    );

    const after = await repository.getCorrectionContext(
      visitorId,
      "context-event-1"
    );
    expect(after).toMatchObject({ isLeaf: false });
    const successor = await repository.getCorrectionContext(
      visitorId,
      "context-event-2"
    );
    expect(successor).toMatchObject({ isLeaf: true });
  });

  it("找不到的事件回傳 null", async () => {
    const { repository, start } = await seedSessionWithEvent();
    expect(
      await repository.getCorrectionContext(start.owner.localVisitorId, "nope")
    ).toBeNull();
  });
});
