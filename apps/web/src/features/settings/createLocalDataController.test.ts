import { flushPromises } from "@vue/test-utils";
import { nextTick, shallowRef } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { SessionProjection } from "@sunshield/contracts";
import type {
  ConnectivityStatus,
  LocalDataPort,
  LocalDataSummary,
  NotificationPort,
  PendingPushIntent,
  PushDeviceCredentials,
  PushStatePort
} from "@sunshield/platform";
import type { AppBootController } from "../../app/createAppBootController";
import { BrowserRemotePush } from "../../adapters/BrowserRemotePush";
import { createNotificationController } from "../notification/createNotificationController";
import { createLocalDataController } from "./createLocalDataController";

const summary: LocalDataSummary = {
  productCount: 0,
  hasActiveSession: false,
  endedSessionCount: 0,
  hasSetupDraft: false,
  lastWeatherSnapshotAt: null,
  lastClockCalibrationAt: null
};

describe("createLocalDataController", () => {
  it("starts durable push teardown before clear-all removes ordinary local data", async () => {
    const order: string[] = [];
    const repository: LocalDataPort = {
      getSummary: vi.fn(async () => summary),
      exportData: vi.fn(async () => ({})),
      importData: vi.fn(async () => ({ productCount: 0, sessionCount: 0 })),
      clearSetupDrafts: vi.fn(async () => undefined),
      clearProductsAndHistory: vi.fn(async () => undefined),
      clearAll: vi.fn(async () => {
        order.push("clear-all");
      })
    };
    const beforeClearAll = vi.fn(async () => {
      order.push("teardown");
    });
    const controller = createLocalDataController({
      repository,
      boot: {
        refresh: vi.fn(async () => undefined)
      } as unknown as AppBootController,
      now: () => new Date("2026-08-31T00:00:00.000Z"),
      saveFile: vi.fn(),
      beforeClearAll
    });

    await expect(controller.clearAll()).resolves.toBe(true);
    expect(order).toEqual(["teardown", "clear-all"]);
  });

  it("finishes durable push revocation after offline clear-all, boot refresh, and reconnect", async () => {
    const credentials: PushDeviceCredentials = {
      deviceId: "10000000-0000-4000-8000-000000000001",
      deviceSecret: "device-secret"
    };
    let storedCredentials: PushDeviceCredentials | null = credentials;
    let pendingIntent: PendingPushIntent | null = null;
    let online = false;
    const state: PushStatePort = {
      readCredentials: vi.fn(async () => storedCredentials),
      writeCredentials: vi.fn(async (value) => {
        storedCredentials = value;
      }),
      clearCredentialsIfOwned: vi.fn(async (value) => {
        if (
          storedCredentials === null ||
          storedCredentials.deviceId !== value.deviceId ||
          storedCredentials.deviceSecret !== value.deviceSecret
        ) {
          return false;
        }
        storedCredentials = null;
        return true;
      }),
      readPendingIntent: vi.fn(async () => pendingIntent),
      replacePendingIntent: vi.fn(async (value) => {
        pendingIntent = { ...value, revision: 1 } as PendingPushIntent;
        return pendingIntent;
      }),
      clearPendingIntent: vi.fn(async (operationId) => {
        if (pendingIntent?.operationId === operationId) pendingIntent = null;
      })
    };
    const subscription = {
      unsubscribe: vi.fn(async () => true)
    } as unknown as PushSubscription;
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    let operation = 0;
    const remotePush = new BrowserRemotePush({
      state,
      apiBaseUrl: "https://project.supabase.co/functions/v1",
      publicVapidKey: "AQ",
      isSecureContext: () => true,
      hasServiceWorker: () => true,
      hasPushManager: () => true,
      hasNotification: () => true,
      getPermission: () => "granted",
      requestPermission: async () => "granted",
      getRegistration: async () =>
        ({
          pushManager: { getSubscription: async () => subscription }
        }) as unknown as ServiceWorkerRegistration,
      fetch: fetchMock as typeof fetch,
      isOnline: () => online,
      createOperationId: () => `adapter-operation-${++operation}`,
      now: () => new Date("2026-08-31T00:00:00.000Z")
    });
    const currentSession = shallowRef<SessionProjection | null>({
      sessionId: "session-1",
      rulesetVersion: "p0-working-v1",
      revision: 1,
      overallStatus: "tracking",
      sessionNextDueAt: "2026-08-31T01:00:00.000Z",
      zones: [],
      primaryAction: {} as SessionProjection["primaryAction"],
      derivedFromEventRefs: []
    } as SessionProjection);
    const connectivity = shallowRef<ConnectivityStatus>("offline");
    const notifications: NotificationPort = {
      isSupported: () => true,
      ensureReady: async () => undefined,
      getPermission: () => "granted",
      requestPermission: async () => "granted",
      schedule: async () => undefined,
      cancel: async () => undefined,
      cancelAll: async () => undefined,
      canDeliverInBackground: () => false,
      sendTest: async () => true
    };
    const notificationController = createNotificationController({
      notifications,
      remotePush,
      currentSession,
      connectivity,
      createOperationId: () => `controller-operation-${++operation}`
    });
    await flushPromises();

    const repository: LocalDataPort = {
      getSummary: vi.fn(async () => summary),
      exportData: vi.fn(async () => ({})),
      importData: vi.fn(async () => ({ productCount: 0, sessionCount: 0 })),
      clearSetupDrafts: vi.fn(async () => undefined),
      clearProductsAndHistory: vi.fn(async () => undefined),
      clearAll: vi.fn(async () => {
        if (pendingIntent?.kind !== "revoke") {
          storedCredentials = null;
          pendingIntent = null;
        }
      })
    };
    const boot = {
      refresh: vi.fn(async () => {
        currentSession.value = null;
      })
    } as unknown as AppBootController;
    const localDataController = createLocalDataController({
      repository,
      boot,
      now: () => new Date("2026-08-31T00:00:00.000Z"),
      saveFile: vi.fn(),
      beforeClearAll: async () => {
        await remotePush.disable();
      }
    });

    await expect(localDataController.clearAll()).resolves.toBe(true);
    await nextTick();
    await flushPromises();
    online = true;
    connectivity.value = "online";
    await nextTick();
    await flushPromises();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/functions/v1/push-subscription",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(storedCredentials).toBeNull();
    expect(pendingIntent).toBeNull();
    expect(notificationController.backgroundPushState.value).toBe(
      "permission-required"
    );
    const remoteCallsAfterRevoke = fetchMock.mock.calls.length;
    currentSession.value = {
      ...currentSession.value,
      overallStatus: "tracking",
      sessionNextDueAt: "2026-08-31T02:00:00.000Z"
    } as SessionProjection;
    await nextTick();
    await flushPromises();
    expect(fetchMock).toHaveBeenCalledTimes(remoteCallsAfterRevoke);
    expect(pendingIntent).toBeNull();

    localDataController.dispose();
    notificationController.dispose();
  });

  it("retains persisted offline revoke ownership across reload until manual retry tears it down", async () => {
    const credentials: PushDeviceCredentials = {
      deviceId: "10000000-0000-4000-8000-000000000001",
      deviceSecret: "device-secret"
    };
    let storedCredentials: PushDeviceCredentials | null = credentials;
    let pendingIntent: PendingPushIntent | null = {
      kind: "revoke",
      operationId: "revoke-operation",
      remoteRevoked: false,
      credentialSnapshot: credentials,
      revision: 1
    };
    let online = false;
    const state: PushStatePort = {
      readCredentials: vi.fn(async () => storedCredentials),
      writeCredentials: vi.fn(async (value) => {
        storedCredentials = value;
      }),
      clearCredentialsIfOwned: vi.fn(async (value) => {
        if (
          storedCredentials === null ||
          storedCredentials.deviceId !== value.deviceId ||
          storedCredentials.deviceSecret !== value.deviceSecret
        ) {
          return false;
        }
        storedCredentials = null;
        return true;
      }),
      readPendingIntent: vi.fn(async () => pendingIntent),
      replacePendingIntent: vi.fn(async (value) => {
        pendingIntent = { ...value, revision: 1 } as PendingPushIntent;
        return pendingIntent;
      }),
      clearPendingIntent: vi.fn(async (operationId) => {
        if (pendingIntent?.operationId === operationId) pendingIntent = null;
      })
    };
    const subscription = {
      unsubscribe: vi.fn(async () => true)
    } as unknown as PushSubscription;
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }));
    const remotePush = new BrowserRemotePush({
      state,
      apiBaseUrl: "https://project.supabase.co/functions/v1",
      publicVapidKey: "AQ",
      isSecureContext: () => true,
      hasServiceWorker: () => true,
      hasPushManager: () => true,
      hasNotification: () => true,
      getPermission: () => "granted",
      requestPermission: async () => "granted",
      getRegistration: async () =>
        ({
          pushManager: { getSubscription: async () => subscription }
        }) as unknown as ServiceWorkerRegistration,
      fetch: fetchMock as typeof fetch,
      isOnline: () => online,
      createOperationId: () => "unused-operation",
      now: () => new Date("2026-08-31T00:00:00.000Z")
    });
    const connectivity = shallowRef<ConnectivityStatus>("offline");
    const notifications: NotificationPort = {
      isSupported: () => true,
      ensureReady: async () => undefined,
      getPermission: () => "granted",
      requestPermission: async () => "granted",
      schedule: async () => undefined,
      cancel: async () => undefined,
      cancelAll: async () => undefined,
      canDeliverInBackground: () => false,
      sendTest: async () => true
    };
    const notificationController = createNotificationController({
      notifications,
      remotePush,
      currentSession: shallowRef(null),
      connectivity,
      createOperationId: () => "unused-controller-operation"
    });
    await flushPromises();

    expect(notificationController.backgroundPushState.value).toBe(
      "pending-sync"
    );
    expect(fetchMock).not.toHaveBeenCalled();
    online = true;
    await notificationController.retryBackgroundSync();

    expect(fetchMock).toHaveBeenCalledWith(
      "https://project.supabase.co/functions/v1/push-subscription",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(storedCredentials).toBeNull();
    expect(pendingIntent).toBeNull();
    notificationController.dispose();
  });

  describe("importData", () => {
    it("成功讀取合規 JSON 並通知 boot 重新整理與更新摘要", async () => {
      const repository: LocalDataPort = {
        getSummary: vi.fn(async () => ({ ...summary, productCount: 3 })),
        exportData: vi.fn(async () => ({})),
        importData: vi.fn(async () => ({ productCount: 3, sessionCount: 2 })),
        clearSetupDrafts: vi.fn(async () => undefined),
        clearProductsAndHistory: vi.fn(async () => undefined),
        clearAll: vi.fn(async () => undefined)
      };
      const boot = {
        refresh: vi.fn(async () => undefined)
      } as unknown as AppBootController;
      const controller = createLocalDataController({
        repository,
        boot,
        now: () => new Date("2026-08-31T00:00:00.000Z"),
        saveFile: vi.fn()
      });

      const file = new File(
        [JSON.stringify({ formatVersion: "1.0.0", application: "防曬晴報員" })],
        "backup.json",
        { type: "application/json" }
      );

      const success = await controller.importData(file);

      expect(success).toBe(true);
      expect(repository.importData).toHaveBeenCalledWith({
        formatVersion: "1.0.0",
        application: "防曬晴報員"
      });
      expect(boot.refresh).toHaveBeenCalledOnce();
      expect(controller.summary.value?.productCount).toBe(3);
      expect(controller.notice.value).toEqual({
        kind: "imported",
        productCount: 3,
        sessionCount: 2
      });
      expect(controller.error.value).toBeNull();
    });

    it("檔案非有效 JSON 時設定 import_invalid_file 且不調用 boot refresh", async () => {
      const repository: LocalDataPort = {
        getSummary: vi.fn(async () => summary),
        exportData: vi.fn(async () => ({})),
        importData: vi.fn(async () => ({ productCount: 0, sessionCount: 0 })),
        clearSetupDrafts: vi.fn(async () => undefined),
        clearProductsAndHistory: vi.fn(async () => undefined),
        clearAll: vi.fn(async () => undefined)
      };
      const boot = {
        refresh: vi.fn(async () => undefined)
      } as unknown as AppBootController;
      const controller = createLocalDataController({
        repository,
        boot,
        now: () => new Date("2026-08-31T00:00:00.000Z"),
        saveFile: vi.fn()
      });

      const brokenFile = new File(["not a valid json {{" ], "broken.json");

      const success = await controller.importData(brokenFile);

      expect(success).toBe(false);
      expect(controller.error.value).toBe("import_invalid_file");
      expect(boot.refresh).not.toHaveBeenCalled();
      expect(repository.importData).not.toHaveBeenCalled();
    });

    it("repository 拋出 INVALID_BACKUP_PAYLOAD 時設定 import_invalid_file", async () => {
      const repository: LocalDataPort = {
        getSummary: vi.fn(async () => summary),
        exportData: vi.fn(async () => ({})),
        importData: vi.fn(async () => {
          throw new Error("INVALID_BACKUP_PAYLOAD");
        }),
        clearSetupDrafts: vi.fn(async () => undefined),
        clearProductsAndHistory: vi.fn(async () => undefined),
        clearAll: vi.fn(async () => undefined)
      };
      const boot = {
        refresh: vi.fn(async () => undefined)
      } as unknown as AppBootController;
      const controller = createLocalDataController({
        repository,
        boot,
        now: () => new Date("2026-08-31T00:00:00.000Z"),
        saveFile: vi.fn()
      });

      const file = new File([JSON.stringify({ invalid: true })], "invalid.json");

      const success = await controller.importData(file);

      expect(success).toBe(false);
      expect(controller.error.value).toBe("import_invalid_file");
    });
  });
});
