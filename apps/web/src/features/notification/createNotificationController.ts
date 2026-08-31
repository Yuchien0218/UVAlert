import type { SessionProjection } from "@sunshield/contracts";
import type {
  BackgroundPushState,
  ConnectivityStatus,
  NotificationPermissionState,
  NotificationPort,
  RemotePushPort
} from "@sunshield/platform";
import {
  shallowReadonly,
  shallowRef,
  watch,
  type Ref,
  type ShallowRef
} from "vue";

const SESSION_REMINDER_ID = "session-next-due";

export interface NotificationController {
  readonly permission: Readonly<ShallowRef<NotificationPermissionState>>;
  readonly isSupported: boolean;
  readonly canDeliverInBackground: boolean;
  readonly backgroundPushState: Readonly<ShallowRef<BackgroundPushState>>;
  requestPermission(): Promise<NotificationPermissionState>;
  enableBackgroundPush(): Promise<void>;
  disableBackgroundPush(): Promise<void>;
  retryBackgroundSync(): Promise<void>;
  sendTestNotification(): Promise<boolean>;
  dispose(): void;
}

interface Dependencies {
  notifications: NotificationPort;
  remotePush: RemotePushPort;
  currentSession: Readonly<Ref<SessionProjection | null>>;
  connectivity: Readonly<Ref<ConnectivityStatus>>;
  createOperationId(): string;
}

/**
 * Reconciles the authoritative Session projection with two independent paths:
 * the tab-alive local notice and an explicitly opted-in remote push channel.
 */
export function createNotificationController(
  dependencies: Dependencies
): NotificationController {
  const { notifications, remotePush } = dependencies;
  const permission = shallowRef<NotificationPermissionState>(
    notifications.getPermission()
  );
  const remoteSupported = remotePush.isSupported();
  const backgroundPushState = shallowRef<BackgroundPushState>(
    remoteSupported ? "permission-required" : "unsupported"
  );
  let backgroundEnabled = false;
  let disablePending = false;
  let disposed = false;
  let generation = 0;

  function nextGeneration(): number {
    generation += 1;
    return generation;
  }

  function isCurrent(token: number): boolean {
    return !disposed && token === generation;
  }

  function setBackgroundState(token: number, state: BackgroundPushState): void {
    if (isCurrent(token)) backgroundPushState.value = state;
  }

  function activeDueAt(): string | null {
    const session = dependencies.currentSession.value;
    return session === null ||
      session.overallStatus === "ended" ||
      session.sessionNextDueAt === null
      ? null
      : session.sessionNextDueAt;
  }

  async function reconcileRemote(token: number): Promise<void> {
    if (!backgroundEnabled || !isCurrent(token)) return;

    try {
      const dueAt = activeDueAt();
      const result =
        dueAt === null
          ? await remotePush.cancel(dependencies.createOperationId())
          : await remotePush.schedule(dueAt, dependencies.createOperationId());
      setBackgroundState(token, result);
    } catch {
      setBackgroundState(token, "schedule-error");
    }
  }

  async function reconcileSession(): Promise<void> {
    const token = nextGeneration();
    const dueAt = activeDueAt();

    if (dueAt === null) {
      await notifications.cancelAll();
    } else {
      await notifications.schedule({
        id: SESSION_REMINDER_ID,
        dueAt,
        title: "該補擦防曬乳了",
        body: "",
        repeatMinutes: null
      });
    }

    await reconcileRemote(token);
  }

  async function flushRemote(token: number): Promise<void> {
    if (!backgroundEnabled || !isCurrent(token)) return;
    try {
      setBackgroundState(token, await remotePush.flushPendingIntent());
    } catch {
      setBackgroundState(token, "schedule-error");
    }
  }

  void notifications.ensureReady();

  const stopSessionWatch = watch(
    () => ({
      dueAt: dependencies.currentSession.value?.sessionNextDueAt ?? null,
      status: dependencies.currentSession.value?.overallStatus ?? null
    }),
    () => {
      void reconcileSession();
    },
    { immediate: true }
  );
  const stopConnectivityWatch = watch(
    dependencies.connectivity,
    (status, previousStatus) => {
      if (
        previousStatus === "offline" &&
        status === "online" &&
        backgroundEnabled &&
        backgroundPushState.value === "pending-sync"
      ) {
        void flushRemote(nextGeneration());
      }
    }
  );

  return {
    permission: shallowReadonly(permission),
    isSupported: notifications.isSupported(),
    canDeliverInBackground: remoteSupported,
    backgroundPushState: shallowReadonly(backgroundPushState),

    async requestPermission(): Promise<NotificationPermissionState> {
      const result = await notifications.requestPermission();
      if (disposed) return result;
      permission.value = result;
      if (result === "granted") await reconcileSession();
      return result;
    },

    async enableBackgroundPush(): Promise<void> {
      if (disposed || !remoteSupported || disablePending || backgroundEnabled) {
        return;
      }
      const token = nextGeneration();
      setBackgroundState(token, "subscribing");
      let result: BackgroundPushState;
      try {
        result = await remotePush.enable();
      } catch {
        result = "schedule-error";
      }
      if (!isCurrent(token)) return;
      setBackgroundState(token, result);
      backgroundEnabled =
        result === "enabled" ||
        result === "scheduled" ||
        result === "pending-sync";
      if (backgroundEnabled) await reconcileRemote(token);
    },

    async disableBackgroundPush(): Promise<void> {
      if (disposed || !remoteSupported) return;
      const token = nextGeneration();
      backgroundEnabled = false;
      disablePending = true;
      let result: BackgroundPushState;
      try {
        result = await remotePush.disable();
      } catch {
        result = "schedule-error";
      }
      if (!isCurrent(token)) return;
      setBackgroundState(token, result);
      if (result === "permission-required") disablePending = false;
    },

    async retryBackgroundSync(): Promise<void> {
      if (disposed || !remoteSupported) return;
      const token = nextGeneration();
      if (disablePending) {
        backgroundEnabled = false;
        let result: BackgroundPushState;
        try {
          result = await remotePush.disable();
        } catch {
          result = "schedule-error";
        }
        if (!isCurrent(token)) return;
        setBackgroundState(token, result);
        if (result === "permission-required") disablePending = false;
        return;
      }
      await flushRemote(token);
    },

    sendTestNotification(): Promise<boolean> {
      return notifications.sendTest();
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      nextGeneration();
      stopSessionWatch();
      stopConnectivityWatch();
      void notifications.cancelAll();
    }
  };
}
