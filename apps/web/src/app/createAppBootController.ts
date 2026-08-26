import type { SessionProjection } from "@sunshield/contracts";
import type {
  ConnectivityPort,
  ConnectivityStatus,
  CrossContextPort,
  LifecyclePort,
  LocalIdentityPort,
  SessionRepositoryPort
} from "@sunshield/platform";
import { shallowReadonly, shallowRef, type Ref } from "vue";

export type BootPhase =
  "idle" | "opening_database" | "restoring_session" | "ready" | "error";

export type BootErrorCode = "storage_unavailable" | "restore_failed";

export interface AppBootController {
  readonly phase: Readonly<Ref<BootPhase>>;
  readonly errorCode: Readonly<Ref<BootErrorCode | null>>;
  readonly connectivity: Readonly<Ref<ConnectivityStatus>>;
  readonly currentSession: Readonly<Ref<SessionProjection | null>>;
  ensureBooted(): Promise<void>;
  refresh(): Promise<void>;
  dispose(): void;
}

export interface AppBootDependencies {
  contextId: string;
  repository: SessionRepositoryPort;
  identity: LocalIdentityPort;
  connectivity: ConnectivityPort;
  lifecycle: LifecyclePort;
  crossContext: CrossContextPort;
}

export function createAppBootController(
  dependencies: AppBootDependencies
): AppBootController {
  const phaseState = shallowRef<BootPhase>("idle");
  const errorCodeState = shallowRef<BootErrorCode | null>(null);
  const connectivityState = shallowRef<ConnectivityStatus>(
    dependencies.connectivity.getCurrentStatus()
  );
  const currentSessionState = shallowRef<SessionProjection | null>(null);

  let localVisitorId: string | null = null;
  let bootPromise: Promise<void> | null = null;
  let disposed = false;
  let stopSubscriptions: Array<() => void> = [];

  async function refresh(): Promise<void> {
    if (disposed || localVisitorId === null) return;

    try {
      currentSessionState.value =
        await dependencies.repository.getCurrentSession(localVisitorId);
      errorCodeState.value = null;
    } catch {
      errorCodeState.value = "restore_failed";
    }
  }

  function subscribeToPlatformSignals(): void {
    if (stopSubscriptions.length > 0) return;

    stopSubscriptions = [
      dependencies.connectivity.subscribe((status) => {
        connectivityState.value = status;
      }),
      dependencies.lifecycle.subscribeForeground(() => {
        void refresh();
      }),
      dependencies.crossContext.subscribe((message) => {
        if (message.sourceContextId !== dependencies.contextId) {
          void refresh();
        }
      })
    ];
  }

  async function performBoot(): Promise<void> {
    phaseState.value = "opening_database";
    errorCodeState.value = null;

    try {
      await dependencies.repository.open();
      localVisitorId = await dependencies.identity.getOrCreateLocalVisitorId();
      subscribeToPlatformSignals();
      phaseState.value = "restoring_session";
      currentSessionState.value =
        await dependencies.repository.getCurrentSession(localVisitorId);
      phaseState.value = "ready";
    } catch (error) {
      console.error("[Boot Error]", error);
      errorCodeState.value = "storage_unavailable";
      phaseState.value = "error";
    }
  }

  function ensureBooted(): Promise<void> {
    if (disposed || phaseState.value === "ready") {
      return Promise.resolve();
    }
    if (bootPromise === null) {
      bootPromise = performBoot().finally(() => {
        bootPromise = null;
      });
    }
    return bootPromise;
  }

  function dispose(): void {
    if (disposed) return;
    disposed = true;
    for (const stop of stopSubscriptions) stop();
    stopSubscriptions = [];
  }

  return {
    phase: shallowReadonly(phaseState),
    errorCode: shallowReadonly(errorCodeState),
    connectivity: shallowReadonly(connectivityState),
    currentSession: shallowReadonly(currentSessionState),
    ensureBooted,
    refresh,
    dispose
  };
}
