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
  let requiresDisable = false;
  let disposed = false;
  let lifecycleGeneration = 0;
  let sessionIntentGeneration = 0;
  let localReconciliation: Promise<void> = Promise.resolve();

  function nextLifecycleGeneration(): number {
    lifecycleGeneration += 1;
    return lifecycleGeneration;
  }

  function nextSessionIntentGeneration(): number {
    sessionIntentGeneration += 1;
    return sessionIntentGeneration;
  }

  function isCurrentLifecycle(token: number): boolean {
    return !disposed && token === lifecycleGeneration;
  }

  function isCurrentSessionIntent(token: number): boolean {
    return !disposed && token === sessionIntentGeneration;
  }

  function activeDueAt(): string | null {
    const session = dependencies.currentSession.value;
    return session === null ||
      session.overallStatus === "ended" ||
      session.sessionNextDueAt === null
      ? null
      : session.sessionNextDueAt;
  }

  function setSessionBackgroundState(
    token: number,
    state: BackgroundPushState
  ): void {
    if (isCurrentSessionIntent(token)) backgroundPushState.value = state;
  }

  async function reconcileRemoteSessionIntent(token: number): Promise<void> {
    if (!backgroundEnabled || !isCurrentSessionIntent(token)) return;

    try {
      const dueAt = activeDueAt();
      const result =
        dueAt === null
          ? await remotePush.cancel(dependencies.createOperationId())
          : await remotePush.schedule(dueAt, dependencies.createOperationId());
      setSessionBackgroundState(token, result);
    } catch {
      setSessionBackgroundState(token, "schedule-error");
    }
  }

  async function reconcileSessionIntent(token: number): Promise<void> {
    if (!isCurrentSessionIntent(token)) return;

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

    if (disposed) {
      await notifications.cancelAll();
      return;
    }
    if (!isCurrentSessionIntent(token)) {
      await notifications.cancelAll();
      return;
    }
    await reconcileRemoteSessionIntent(token);
  }

  function reconcileCurrentSession(): Promise<void> {
    const token = nextSessionIntentGeneration();
    localReconciliation = localReconciliation.then(
      () => reconcileSessionIntent(token),
      () => reconcileSessionIntent(token)
    );
    return localReconciliation;
  }

  async function flushPendingIntent(): Promise<void> {
    if (!backgroundEnabled || disposed) return;
    const token = nextSessionIntentGeneration();
    try {
      const result = await remotePush.flushPendingIntent();
      setSessionBackgroundState(token, result);
    } catch {
      setSessionBackgroundState(token, "schedule-error");
    }
  }

  async function performDisable(): Promise<void> {
    if (disposed || !remoteSupported) return;
    const lifecycleToken = nextLifecycleGeneration();
    nextSessionIntentGeneration();
    backgroundEnabled = false;
    requiresDisable = true;
    let result: BackgroundPushState;
    try {
      result = await remotePush.disable();
    } catch {
      result = "schedule-error";
    }
    if (!isCurrentLifecycle(lifecycleToken)) return;

    backgroundPushState.value = result;
    if (result === "permission-required") requiresDisable = false;
  }

  void notifications.ensureReady();

  const stopSessionWatch = watch(
    () => ({
      dueAt: dependencies.currentSession.value?.sessionNextDueAt ?? null,
      status: dependencies.currentSession.value?.overallStatus ?? null
    }),
    () => {
      void reconcileCurrentSession();
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
        void flushPendingIntent();
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
      if (result === "granted") await reconcileCurrentSession();
      return result;
    },

    async enableBackgroundPush(): Promise<void> {
      if (
        disposed ||
        !remoteSupported ||
        backgroundPushState.value !== "permission-required" ||
        requiresDisable
      ) {
        return;
      }
      const lifecycleToken = nextLifecycleGeneration();
      backgroundPushState.value = "subscribing";
      let result: BackgroundPushState;
      try {
        result = await remotePush.enable();
      } catch {
        result = "schedule-error";
      }
      if (!isCurrentLifecycle(lifecycleToken)) return;

      backgroundPushState.value = result;
      backgroundEnabled =
        result === "enabled" ||
        result === "scheduled" ||
        result === "pending-sync";
      requiresDisable = result === "schedule-error";
      if (backgroundEnabled) await reconcileCurrentSession();
    },

    disableBackgroundPush(): Promise<void> {
      return performDisable();
    },

    async retryBackgroundSync(): Promise<void> {
      if (requiresDisable) {
        await performDisable();
        return;
      }
      await flushPendingIntent();
    },

    sendTestNotification(): Promise<boolean> {
      return notifications.sendTest();
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;
      nextLifecycleGeneration();
      nextSessionIntentGeneration();
      stopSessionWatch();
      stopConnectivityWatch();
      void notifications.cancelAll();
    }
  };
}
