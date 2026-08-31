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

function createRemotePushStub(supported = true): RemotePushPort & {
  enable: ReturnType<typeof vi.fn>;
  schedule: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  disable: ReturnType<typeof vi.fn>;
  flushPendingIntent: ReturnType<typeof vi.fn>;
} {
  return {
    isSupported: () => supported,
    enable: vi.fn().mockResolvedValue("enabled"),
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
  } = {}
) {
  const notifications = createNotificationsStub();
  const remotePush = createRemotePushStub(options.supported);
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

  it("requires a successful disable after enable setup fails", async () => {
    const { controller, remotePush } = createController();
    remotePush.enable.mockResolvedValueOnce("schedule-error");

    await controller.enableBackgroundPush();
    await controller.enableBackgroundPush();
    await controller.retryBackgroundSync();

    expect(remotePush.enable).toHaveBeenCalledOnce();
    expect(remotePush.disable).toHaveBeenCalledOnce();
    expect(controller.backgroundPushState.value).toBe("permission-required");
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
});
