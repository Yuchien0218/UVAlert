import type { SessionEventStreamV1 } from "@sunshield/contracts";
import { describe, expect, it, vi } from "vitest";
import { createSessionEventsController } from "./createSessionEventsController";

function makeStream(): SessionEventStreamV1 {
  return {
    sessionStarted: {
      id: "evt-start",
      sessionId: "s-1",
      effectiveStartedAt: "2026-08-07T09:00:00.000Z",
      zoneInstanceIds: ["z-face"]
    },
    zoneTrackingEvents: [],
    zoneMethodEvents: [],
    applicationConfirmationGroups: [],
    applicationEvents: [],
    productSafetyEvents: [],
    contextEvents: [],
    sessionEndedEvents: []
  } as unknown as SessionEventStreamV1;
}

function makeIdentity() {
  return { getOrCreateLocalVisitorId: vi.fn(async () => "visitor-1") };
}

describe("createSessionEventsController", () => {
  it("載入目前 Session 的事件流", async () => {
    const stream = makeStream();
    const controller = createSessionEventsController({
      repository: {
        getCurrentSessionEventStream: vi.fn(async () => stream)
      },
      identity: makeIdentity()
    });

    await controller.ensureLoaded();

    expect(controller.phase.value).toBe("ready");
    expect(controller.stream.value).toBe(stream);
  });

  it("ensureLoaded 重複呼叫只讀取一次", async () => {
    const getCurrentSessionEventStream = vi.fn(async () => makeStream());
    const controller = createSessionEventsController({
      repository: { getCurrentSessionEventStream },
      identity: makeIdentity()
    });

    await Promise.all([
      controller.ensureLoaded(),
      controller.ensureLoaded()
    ]);
    await controller.ensureLoaded();

    expect(getCurrentSessionEventStream).toHaveBeenCalledTimes(1);
  });

  it("refresh 會重新讀取，Session 換人時清單才不會停在舊資料", async () => {
    const getCurrentSessionEventStream = vi.fn(async () => makeStream());
    const controller = createSessionEventsController({
      repository: { getCurrentSessionEventStream },
      identity: makeIdentity()
    });

    await controller.ensureLoaded();
    await controller.refresh();

    expect(getCurrentSessionEventStream).toHaveBeenCalledTimes(2);
  });

  it("沒有進行中 Session 時回傳 null 而非拋錯", async () => {
    const controller = createSessionEventsController({
      repository: {
        getCurrentSessionEventStream: vi.fn(async () => null)
      },
      identity: makeIdentity()
    });

    await controller.ensureLoaded();

    expect(controller.phase.value).toBe("ready");
    expect(controller.stream.value).toBeNull();
  });

  it("讀取失敗只進入 error，不拋出讓提醒頁整頁失效", async () => {
    const controller = createSessionEventsController({
      repository: {
        getCurrentSessionEventStream: vi.fn(async () => {
          throw new Error("db unavailable");
        })
      },
      identity: makeIdentity()
    });

    await expect(controller.ensureLoaded()).resolves.toBeUndefined();
    expect(controller.phase.value).toBe("error");
    expect(controller.stream.value).toBeNull();
  });
});
