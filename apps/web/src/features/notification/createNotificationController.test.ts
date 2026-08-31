import { describe, expect, it, vi } from "vitest";
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

type ProposedController = ReturnType<typeof createNotificationController> & {
  readonly backgroundPushState: { readonly value: BackgroundPushState };
  enableBackgroundPush(): Promise<void>;
  disableBackgroundPush(): Promise<void>;
  retryBackgroundSync(): Promise<void>;
};

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
  } as never;
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
    primaryAction: {} as never,
    derivedFromEventRefs: [],
    ...overrides
  } as SessionProjection;
}

async function flush(): Promise<void> {
  await nextTick();
  await Promise.resolve();
  await Promise.resolve();
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
  } as never) as ProposedController;
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
    await flush();
    currentSession.value = sessionWith({
      sessionNextDueAt: "2026-08-23T14:00:00.000Z"
    });
    await flush();
    resolveFirst("schedule-error");
    await enabling;
    await flush();

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
});
