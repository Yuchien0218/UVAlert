import { describe, expect, it, vi } from "vitest";
import { flushPromises } from "@vue/test-utils";
import { nextTick, shallowRef, type Ref } from "vue";
import type { SessionProjection } from "@sunshield/contracts";
import type {
  BackgroundPushState,
  ConnectivityStatus,
  NotificationPermissionState,
  NotificationPort,
  RemotePushPort
} from "@sunshield/platform";
import { createNotificationController } from "./createNotificationController";

function createNotificationsStub(
  permission: NotificationPermissionState = "granted"
): NotificationPort & {
  schedule: ReturnType<typeof vi.fn>;
  cancelAll: ReturnType<typeof vi.fn>;
  requestPermission: ReturnType<typeof vi.fn>;
  sendTest: ReturnType<typeof vi.fn>;
} {
  return {
    isSupported: () => true,
    ensureReady: vi.fn().mockResolvedValue(undefined),
    getPermission: () => permission,
    requestPermission: vi.fn().mockResolvedValue("granted"),
    schedule: vi.fn().mockResolvedValue(undefined),
    cancel: vi.fn().mockResolvedValue(undefined),
    cancelAll: vi.fn().mockResolvedValue(undefined),
    canDeliverInBackground: () => false,
    sendTest: vi.fn().mockResolvedValue(true)
  };
}

function createRemotePushStub(
  supported = true,
  hydration:
    | {
        state: BackgroundPushState;
        isEnabled: boolean;
        needsTeardown: boolean;
      }
    | Promise<{
        state: BackgroundPushState;
        isEnabled: boolean;
        needsTeardown: boolean;
      }> = {
    state: "permission-required",
    isEnabled: false,
    needsTeardown: false
  }
): RemotePushPort & {
  enable: ReturnType<typeof vi.fn>;
  hydrate: ReturnType<typeof vi.fn>;
  schedule: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  disable: ReturnType<typeof vi.fn>;
  flushPendingIntent: ReturnType<typeof vi.fn>;
} {
  return {
    isSupported: () => supported,
    enable: vi.fn().mockResolvedValue("enabled"),
    hydrate: vi.fn().mockResolvedValue(hydration),
    schedule: vi.fn().mockResolvedValue("scheduled"),
    cancel: vi.fn().mockResolvedValue("enabled"),
    disable: vi.fn().mockResolvedValue("permission-required"),
    flushPendingIntent: vi.fn().mockResolvedValue("scheduled")
  };
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
    primaryAction: {} as SessionProjection["primaryAction"],
    derivedFromEventRefs: [],
    ...overrides
  } as SessionProjection;
}

async function flush(): Promise<void> {
  await nextTick();
  await flushPromises();
}

function createController(
  options: {
    session?: SessionProjection | null;
    supported?: boolean;
    connectivity?: ConnectivityStatus;
    hydration?:
      | {
          state: BackgroundPushState;
          isEnabled: boolean;
          needsTeardown: boolean;
        }
      | Promise<{
          state: BackgroundPushState;
          isEnabled: boolean;
          needsTeardown: boolean;
        }>;
  } = {}
) {
  const notifications = createNotificationsStub();
  const remotePush = createRemotePushStub(options.supported, options.hydration);
  const currentSession: Ref<SessionProjection | null> = shallowRef(
    options.session === undefined ? sessionWith() : options.session
  );
  const connectivity = shallowRef<ConnectivityStatus>(
    options.connectivity ?? "online"
  );
  let operation = 0;
  const controller = createNotificationController({
    notifications,
    remotePush,
    currentSession,
    connectivity,
    createOperationId: () => `operation-${++operation}`
  });
  return {
    controller,
    notifications,
    remotePush,
    currentSession,
    connectivity
  };
}

describe("createNotificationController", () => {
  it("initial active Session uses the fixed single local notification and leaves remote untouched", async () => {
    const { notifications, remotePush } = createController();
    await flush();

    expect(notifications.schedule).toHaveBeenCalledWith({
      id: "session-next-due",
      dueAt: "2026-08-23T12:00:00.000Z",
      title: "該補擦防曬乳了",
      body: "",
      repeatMinutes: null
    });
    expect(remotePush.schedule).not.toHaveBeenCalled();
  });

  it("fails closed to permission-required until the user explicitly enables remote delivery", async () => {
    const { controller } = createController();
    await flush();
    expect(controller.backgroundPushState.value).toBe("permission-required");
  });

  it("keeps a persisted offline revoke under controller teardown ownership after reload", async () => {
    const { controller, connectivity, remotePush } = createController({
      connectivity: "offline",
      hydration: {
        state: "pending-sync",
        isEnabled: false,
        needsTeardown: true
      }
    });
    await flush();

    expect(controller.backgroundPushState.value).toBe("pending-sync");
    expect(remotePush.schedule).not.toHaveBeenCalled();

    connectivity.value = "online";
    await flush();

    expect(remotePush.flushPendingIntent).toHaveBeenCalledOnce();
  });

  it("hydrates an enabled device after reload then replaces and cancels its remote schedule from the latest Session", async () => {
    const { controller, currentSession, remotePush } = createController({
      hydration: { state: "enabled", isEnabled: true, needsTeardown: false }
    });
    await flush();

    expect(remotePush.hydrate).toHaveBeenCalledOnce();
    expect(controller.backgroundPushState.value).toBe("scheduled");
    expect(remotePush.schedule).toHaveBeenCalledWith(
      "2026-08-23T12:00:00.000Z",
      "operation-1"
    );

    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T13:30:00.000Z"
    });
    await flush();
    expect(remotePush.schedule).toHaveBeenLastCalledWith(
      "2026-08-23T13:30:00.000Z",
      "operation-2"
    );

    currentSession.value = sessionWith({
      overallStatus: "ended",
      sessionNextDueAt: null
    });
    await flush();
    expect(remotePush.cancel).toHaveBeenCalledWith("operation-3");
  });

  it("returns to re-registerable permission-required after a recovered remote credential 401", async () => {
    const { controller, currentSession, remotePush } = createController({
      hydration: { state: "enabled", isEnabled: true, needsTeardown: false }
    });
    remotePush.schedule.mockResolvedValueOnce("permission-required");
    await flush();

    expect(controller.backgroundPushState.value).toBe("permission-required");
    const callsAfterRecovery = remotePush.schedule.mock.calls.length;
    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T13:00:00.000Z"
    });
    await flush();
    expect(remotePush.schedule).toHaveBeenCalledTimes(callsAfterRecovery);

    await controller.enableBackgroundPush();
    expect(remotePush.enable).toHaveBeenCalledOnce();
  });

  it("keeps hydrated ownership when boot restores the latest Session while hydration is pending", async () => {
    let resolveHydration!: (value: {
      state: BackgroundPushState;
      isEnabled: boolean;
      needsTeardown: boolean;
    }) => void;
    const hydration = new Promise<{
      state: BackgroundPushState;
      isEnabled: boolean;
      needsTeardown: boolean;
    }>((resolve) => {
      resolveHydration = resolve;
    });
    const { controller, currentSession, remotePush } = createController({
      session: null,
      hydration
    });

    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T15:00:00.000Z"
    });
    await nextTick();
    resolveHydration({
      state: "enabled",
      isEnabled: true,
      needsTeardown: false
    });
    await flush();

    expect(controller.backgroundPushState.value).toBe("scheduled");
    expect(remotePush.schedule).toHaveBeenCalledOnce();
    expect(remotePush.schedule).toHaveBeenCalledWith(
      "2026-08-23T15:00:00.000Z",
      "operation-1"
    );
  });

  it("keeps the local fallback and makes no remote call when unsupported", async () => {
    const { controller, notifications, remotePush } = createController({
      supported: false
    });
    await flush();

    expect(controller.backgroundPushState.value).toBe("unsupported");
    expect(notifications.schedule).toHaveBeenCalledOnce();
    expect(remotePush.enable).not.toHaveBeenCalled();
    await controller.enableBackgroundPush();
    expect(remotePush.enable).not.toHaveBeenCalled();
  });

  it.each([null, sessionWith({ sessionNextDueAt: null })])(
    "cancels local notices without remote traffic when there is no active due time",
    async (session) => {
      const { notifications, remotePush } = createController({ session });
      await flush();

      expect(notifications.cancelAll).toHaveBeenCalled();
      expect(remotePush.cancel).not.toHaveBeenCalled();
    }
  );

  it("enables against the latest due time and sends only dueAt plus a fresh operation id", async () => {
    const { controller, remotePush } = createController();
    await controller.enableBackgroundPush();

    expect(remotePush.enable).toHaveBeenCalledOnce();
    expect(remotePush.schedule).toHaveBeenCalledWith(
      "2026-08-23T12:00:00.000Z",
      "operation-1"
    );
    expect(remotePush.schedule.mock.calls[0]).toHaveLength(2);
  });

  it("enables without scheduling when there is no active Session due time", async () => {
    const { controller, remotePush } = createController({ session: null });
    await controller.enableBackgroundPush();

    expect(controller.backgroundPushState.value).toBe("enabled");
    expect(remotePush.schedule).not.toHaveBeenCalled();
  });

  it("keeps the local fallback when a remote schedule reports schedule-error", async () => {
    const { controller, notifications, remotePush } = createController();
    remotePush.schedule.mockResolvedValue("schedule-error");
    await controller.enableBackgroundPush();

    expect(notifications.schedule).toHaveBeenCalled();
    expect(controller.backgroundPushState.value).toBe("schedule-error");
  });

  it("replaces local and remote schedules when the due time changes", async () => {
    const { controller, notifications, remotePush, currentSession } =
      createController();
    await controller.enableBackgroundPush();
    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T13:30:00.000Z"
    });
    await flush();

    expect(notifications.schedule).toHaveBeenLastCalledWith(
      expect.objectContaining({ dueAt: "2026-08-23T13:30:00.000Z" })
    );
    expect(remotePush.schedule).toHaveBeenLastCalledWith(
      "2026-08-23T13:30:00.000Z",
      "operation-2"
    );
  });

  it("cancels local and enabled remote delivery when the Session ends", async () => {
    const { controller, notifications, remotePush, currentSession } =
      createController();
    await controller.enableBackgroundPush();
    currentSession.value = sessionWith({
      overallStatus: "ended",
      sessionNextDueAt: null
    });
    await flush();

    expect(notifications.cancelAll).toHaveBeenCalled();
    expect(remotePush.cancel).toHaveBeenCalledWith("operation-2");
  });

  it("flushes the retained remote intent once after reconnecting", async () => {
    const { controller, remotePush, connectivity } = createController({
      connectivity: "offline"
    });
    remotePush.schedule.mockResolvedValue("pending-sync");
    await controller.enableBackgroundPush();
    connectivity.value = "online";
    await flush();

    expect(remotePush.flushPendingIntent).toHaveBeenCalledOnce();
    expect(controller.backgroundPushState.value).toBe("scheduled");
  });

  it("retries a retained remote intent without changing the local schedule", async () => {
    const { controller, notifications, remotePush } = createController();
    remotePush.schedule.mockResolvedValueOnce("pending-sync");
    remotePush.flushPendingIntent.mockResolvedValueOnce("scheduled");
    await controller.enableBackgroundPush();
    const localSchedules = notifications.schedule.mock.calls.length;

    await controller.retryBackgroundSync();

    expect(remotePush.flushPendingIntent).toHaveBeenCalledOnce();
    expect(controller.backgroundPushState.value).toBe("scheduled");
    expect(notifications.schedule).toHaveBeenCalledTimes(localSchedules);
  });

  it("only exposes enable again after a successful disable", async () => {
    const { controller, remotePush } = createController();
    await controller.enableBackgroundPush();
    remotePush.disable.mockResolvedValueOnce("schedule-error");
    await controller.disableBackgroundPush();

    expect(controller.backgroundPushState.value).toBe("schedule-error");
    expect(remotePush.enable).toHaveBeenCalledOnce();
  });

  it("automatically resumes a pending disable teardown after reconnecting", async () => {
    const { controller, connectivity, remotePush } = createController();
    await controller.enableBackgroundPush();
    remotePush.disable.mockResolvedValueOnce("pending-sync");
    remotePush.flushPendingIntent.mockResolvedValueOnce("permission-required");

    await controller.disableBackgroundPush();
    connectivity.value = "offline";
    await flush();
    connectivity.value = "online";
    await flush();

    expect(remotePush.flushPendingIntent).toHaveBeenCalledOnce();
    expect(controller.backgroundPushState.value).toBe("permission-required");
  });

  it("allows a fresh enable only after disable fully succeeds", async () => {
    const { controller, remotePush } = createController();
    await controller.enableBackgroundPush();
    await controller.disableBackgroundPush();
    await controller.enableBackgroundPush();

    expect(controller.backgroundPushState.value).toBe("scheduled");
    expect(remotePush.disable).toHaveBeenCalledOnce();
    expect(remotePush.enable).toHaveBeenCalledTimes(2);
  });

  it("does not send new remote Session intents after a successful disable", async () => {
    const { controller, currentSession, remotePush } = createController();
    await controller.enableBackgroundPush();
    await controller.disableBackgroundPush();
    remotePush.schedule.mockClear();
    remotePush.cancel.mockClear();
    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T18:00:00.000Z"
    });
    await flush();

    expect(remotePush.schedule).not.toHaveBeenCalled();
    expect(remotePush.cancel).not.toHaveBeenCalled();
  });

  it("ignores an older remote schedule result after a newer due time wins", async () => {
    let resolveFirst!: (state: BackgroundPushState) => void;
    const firstSchedule = new Promise<BackgroundPushState>((resolve) => {
      resolveFirst = resolve;
    });
    const { controller, remotePush, currentSession } = createController();
    remotePush.schedule
      .mockReturnValueOnce(firstSchedule)
      .mockResolvedValueOnce("scheduled");

    const enabling = controller.enableBackgroundPush();
    await vi.waitFor(() =>
      expect(remotePush.schedule).toHaveBeenCalledWith(
        "2026-08-23T12:00:00.000Z",
        "operation-1"
      )
    );
    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T14:00:00.000Z"
    });
    resolveFirst("schedule-error");
    await enabling;
    await vi.waitFor(() =>
      expect(remotePush.schedule).toHaveBeenCalledTimes(2)
    );

    expect(remotePush.schedule).toHaveBeenLastCalledWith(
      "2026-08-23T14:00:00.000Z",
      "operation-2"
    );
    expect(controller.backgroundPushState.value).toBe("scheduled");
  });

  it("atomically exposes recovered credential loss when an older remote schedule loses to a newer Session", async () => {
    let resolveFirst!: (state: BackgroundPushState) => void;
    const firstSchedule = new Promise<BackgroundPushState>((resolve) => {
      resolveFirst = resolve;
    });
    const { controller, remotePush, currentSession } = createController();
    remotePush.schedule.mockReturnValueOnce(firstSchedule);

    const enabling = controller.enableBackgroundPush();
    await vi.waitFor(() => expect(remotePush.schedule).toHaveBeenCalledOnce());
    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T14:00:00.000Z"
    });
    await nextTick();
    resolveFirst("permission-required");
    await enabling;
    await flush();

    expect(remotePush.schedule).toHaveBeenCalledOnce();
    expect(controller.backgroundPushState.value).toBe("permission-required");
    await controller.enableBackgroundPush();
    expect(remotePush.enable).toHaveBeenCalledTimes(2);
  });

  it("disposes watchers, local notices, and late remote state writes", async () => {
    let resolveSchedule!: (state: BackgroundPushState) => void;
    const pendingSchedule = new Promise<BackgroundPushState>((resolve) => {
      resolveSchedule = resolve;
    });
    const { controller, notifications, remotePush, currentSession } =
      createController();
    remotePush.schedule.mockReturnValueOnce(pendingSchedule);
    const enabling = controller.enableBackgroundPush();
    controller.dispose();
    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T14:00:00.000Z"
    });
    resolveSchedule("scheduled");
    await enabling;
    await flush();

    expect(notifications.cancelAll).toHaveBeenCalled();
    expect(controller.backgroundPushState.value).not.toBe("scheduled");
  });

  it("reconciles the newest Session after enable settles during a Session change", async () => {
    let resolveEnable!: (state: BackgroundPushState) => void;
    const pendingEnable = new Promise<BackgroundPushState>((resolve) => {
      resolveEnable = resolve;
    });
    const { controller, currentSession, remotePush } = createController();
    remotePush.enable.mockReturnValueOnce(pendingEnable);

    const enabling = controller.enableBackgroundPush();
    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T16:00:00.000Z"
    });
    await flush();
    resolveEnable("enabled");
    await enabling;

    expect(controller.backgroundPushState.value).toBe("scheduled");
    expect(remotePush.schedule).toHaveBeenCalledWith(
      "2026-08-23T16:00:00.000Z",
      "operation-1"
    );
  });

  it("commits successful disable despite an interleaved Session change", async () => {
    let resolveDisable!: (state: BackgroundPushState) => void;
    const pendingDisable = new Promise<BackgroundPushState>((resolve) => {
      resolveDisable = resolve;
    });
    const { controller, currentSession, remotePush } = createController();
    await controller.enableBackgroundPush();
    remotePush.disable.mockReturnValueOnce(pendingDisable);

    const disabling = controller.disableBackgroundPush();
    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T17:00:00.000Z"
    });
    await flush();
    resolveDisable("permission-required");
    await disabling;

    expect(controller.backgroundPushState.value).toBe("permission-required");
  });

  it("does not disguise teardown as retry after enable setup fails", async () => {
    const { controller, remotePush } = createController();
    remotePush.enable.mockResolvedValueOnce("schedule-error");

    await controller.enableBackgroundPush();
    await controller.enableBackgroundPush();
    await controller.retryBackgroundSync();

    expect(remotePush.enable).toHaveBeenCalledOnce();
    expect(remotePush.disable).not.toHaveBeenCalled();
    expect(remotePush.flushPendingIntent).not.toHaveBeenCalled();
    expect(controller.backgroundPushState.value).toBe("schedule-error");
  });

  it("cancels again after a local schedule settles following dispose", async () => {
    let resolveLocalSchedule!: () => void;
    const pendingLocalSchedule = new Promise<void>((resolve) => {
      resolveLocalSchedule = resolve;
    });
    const { controller, notifications } = createController();
    notifications.schedule.mockReturnValueOnce(pendingLocalSchedule);

    await flush();
    controller.dispose();
    resolveLocalSchedule();
    await flush();

    expect(notifications.cancelAll).toHaveBeenCalledTimes(2);
  });

  it("keeps an in-flight local schedule after disabling background push", async () => {
    let resolveLocalSchedule!: (value: undefined) => void;
    const pendingLocalSchedule = new Promise<undefined>((resolve) => {
      resolveLocalSchedule = resolve;
    });
    const { controller, currentSession, notifications } = createController();
    await controller.enableBackgroundPush();
    notifications.schedule.mockClear();
    notifications.cancelAll.mockClear();
    notifications.schedule.mockReturnValueOnce(pendingLocalSchedule);

    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T19:00:00.000Z"
    });
    await vi.waitFor(() =>
      expect(notifications.schedule).toHaveBeenCalledOnce()
    );
    await controller.disableBackgroundPush();
    resolveLocalSchedule(undefined);
    await flush();

    expect(notifications.cancelAll).not.toHaveBeenCalled();
  });

  it("keeps an in-flight local schedule while a reconnect flushes remote state", async () => {
    let resolveLocalSchedule!: (value: undefined) => void;
    const pendingLocalSchedule = new Promise<undefined>((resolve) => {
      resolveLocalSchedule = resolve;
    });
    const {
      controller,
      connectivity,
      currentSession,
      notifications,
      remotePush
    } = createController({ connectivity: "offline" });
    remotePush.schedule.mockResolvedValueOnce("pending-sync");
    await controller.enableBackgroundPush();
    notifications.schedule.mockClear();
    notifications.cancelAll.mockClear();
    notifications.schedule.mockReturnValueOnce(pendingLocalSchedule);

    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T20:00:00.000Z"
    });
    await vi.waitFor(() =>
      expect(notifications.schedule).toHaveBeenCalledOnce()
    );
    connectivity.value = "online";
    await vi.waitFor(() =>
      expect(remotePush.flushPendingIntent).toHaveBeenCalledOnce()
    );
    resolveLocalSchedule(undefined);
    await flush();

    expect(notifications.cancelAll).not.toHaveBeenCalled();
    expect(controller.backgroundPushState.value).toBe("scheduled");
  });
});
