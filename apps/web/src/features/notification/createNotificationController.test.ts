import { describe, expect, it, vi } from "vitest";
import { nextTick, shallowRef, type Ref } from "vue";
import type { SessionProjection } from "@sunshield/contracts";
import type {
  NotificationPermissionState,
  NotificationPort
} from "@sunshield/platform";
import { createNotificationController } from "./createNotificationController";

function createNotificationsStub(
  permission: NotificationPermissionState = "granted"
): NotificationPort & {
  schedule: ReturnType<typeof vi.fn>;
  cancelAll: ReturnType<typeof vi.fn>;
  requestPermission: ReturnType<typeof vi.fn>;
} {
  return {
    isSupported: () => true,
    getPermission: () => permission,
    requestPermission: vi.fn().mockResolvedValue("granted"),
    schedule: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    cancelAll: vi.fn().mockResolvedValue(undefined),
    canDeliverInBackground: () => false
  } as never;
}

function sessionWith(
  overrides: Partial<SessionProjection> = {}
): SessionProjection {
  return {
    sessionId: "session-1",
    rulesetVersion: "p0-working-v1",
    revision: 1,
    overallStatus: "tracking",
    sessionNextDueAt: "2026-08-23T12:00:00.000Z",
    zones: [],
    primaryAction: {} as never,
    derivedFromEventRefs: [],
    ...overrides
  } as SessionProjection;
}

/** watch 的回呼呼叫 async sync()，需要讓 microtask 跑完才看得到結果。 */
async function flush(): Promise<void> {
  await nextTick();
  await Promise.resolve();
}

describe("createNotificationController", () => {
  it("有下一個到期時間時排一則提醒", async () => {
    const notifications = createNotificationsStub();
    const currentSession: Ref<SessionProjection | null> = shallowRef(
      sessionWith()
    );

    createNotificationController({ notifications, currentSession });
    await flush();

    expect(notifications.schedule).toHaveBeenCalledOnce();
    expect(notifications.schedule).toHaveBeenCalledWith({
      id: "session-next-due",
      dueAt: "2026-08-23T12:00:00.000Z",
      title: "該補擦了",
      body: "打開查看要補哪些部位"
    });
  });

  it("只排一則，不替每個部位各排一則", async () => {
    const notifications = createNotificationsStub();
    const currentSession = shallowRef<SessionProjection | null>(
      sessionWith({
        zones: [{ zoneDueAt: "2026-08-23T12:00:00.000Z" }] as never
      })
    );

    createNotificationController({ notifications, currentSession });
    await flush();

    expect(notifications.schedule).toHaveBeenCalledOnce();
  });

  it.each([
    ["沒有 Session", null],
    [
      "Session 已結束",
      sessionWith({ overallStatus: "ended" })
    ],
    [
      "沒有下一個到期時間",
      sessionWith({ sessionNextDueAt: null })
    ]
  ])("%s 時清空排程", async (_label, session) => {
    const notifications = createNotificationsStub();
    const currentSession = shallowRef<SessionProjection | null>(
      session as SessionProjection | null
    );

    createNotificationController({ notifications, currentSession });
    await flush();

    expect(notifications.cancelAll).toHaveBeenCalled();
    expect(notifications.schedule).not.toHaveBeenCalled();
  });

  it("到期時間變動時重排", async () => {
    const notifications = createNotificationsStub();
    const currentSession = shallowRef<SessionProjection | null>(
      sessionWith()
    );

    createNotificationController({ notifications, currentSession });
    await flush();

    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T13:30:00.000Z"
    });
    await flush();

    expect(notifications.schedule).toHaveBeenCalledTimes(2);
    expect(notifications.schedule).toHaveBeenLastCalledWith(
      expect.objectContaining({ dueAt: "2026-08-23T13:30:00.000Z" })
    );
  });

  it("補擦後 Session 結束，殘留的排程會被清掉", async () => {
    const notifications = createNotificationsStub();
    const currentSession = shallowRef<SessionProjection | null>(
      sessionWith()
    );

    createNotificationController({ notifications, currentSession });
    await flush();

    currentSession.value = sessionWith({
      overallStatus: "ended",
      sessionNextDueAt: null
    });
    await flush();

    expect(notifications.cancelAll).toHaveBeenCalled();
  });

  describe("權限", () => {
    it("剛取得權限後補排既有 Session 的提醒", async () => {
      const notifications = createNotificationsStub("default");
      const currentSession = shallowRef<SessionProjection | null>(
        sessionWith()
      );

      const controller = createNotificationController({
        notifications,
        currentSession
      });
      await flush();

      const before = notifications.schedule.mock.calls.length;
      await controller.requestPermission();

      expect(controller.permission.value).toBe("granted");
      expect(notifications.schedule.mock.calls.length).toBeGreaterThan(
        before
      );
    });

    it("被拒絕時不補排", async () => {
      const notifications = createNotificationsStub("default");
      notifications.requestPermission.mockResolvedValue("denied");
      const currentSession = shallowRef<SessionProjection | null>(
        sessionWith()
      );

      const controller = createNotificationController({
        notifications,
        currentSession
      });
      await flush();
      notifications.schedule.mockClear();

      await controller.requestPermission();

      expect(controller.permission.value).toBe("denied");
      expect(notifications.schedule).not.toHaveBeenCalled();
    });
  });

  it("dispose 後停止追蹤並清空排程", async () => {
    const notifications = createNotificationsStub();
    const currentSession = shallowRef<SessionProjection | null>(
      sessionWith()
    );

    const controller = createNotificationController({
      notifications,
      currentSession
    });
    await flush();
    controller.dispose();
    notifications.schedule.mockClear();

    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T14:00:00.000Z"
    });
    await flush();

    expect(notifications.schedule).not.toHaveBeenCalled();
  });

  /**
   * 這個斷言是刻意的：畫面必須據此告訴使用者「仍需自己回來查看」。
   * 若哪天接上 Web Push 讓它變 true，文案也必須跟著改。
   */
  it("回報無法在背景送達", () => {
    const notifications = createNotificationsStub();
    const currentSession = shallowRef<SessionProjection | null>(null);

    const controller = createNotificationController({
      notifications,
      currentSession
    });

    expect(controller.canDeliverInBackground).toBe(false);
  });
});
