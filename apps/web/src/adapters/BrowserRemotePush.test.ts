import { describe, expect, it, vi } from "vitest";
import type {
  NewPendingPushIntent,
  PendingPushIntent,
  PushDeviceCredentials,
  PushStatePort
} from "@sunshield/platform";
import {
  LocalPushStateRepository,
  SunshieldDatabase
} from "@sunshield/persistence-web";
import {
  BrowserRemotePush,
  type BrowserRemotePushDependencies
} from "./BrowserRemotePush";

const credentials: PushDeviceCredentials = {
  deviceId: "10000000-0000-4000-8000-000000000001",
  deviceSecret: "device-secret"
};
const operationId = "20000000-0000-4000-8000-000000000001";
const dueAt = "2026-08-30T10:30:00.000Z";
const publicVapidKey = "BEl62iUYgUivxIkv69yViEuiBIa40HI0FCXjV2qfL-FiLJ7x";

function createState(initial?: {
  credentials?: PushDeviceCredentials | null | undefined;
  intent?: PendingPushIntent | NewPendingPushIntent | null | undefined;
}) {
  let storedCredentials = initial?.credentials ?? null;
  let nextRevision =
    initial?.intent !== undefined &&
    initial.intent !== null &&
    "revision" in initial.intent
      ? initial.intent.revision
      : initial?.intent
        ? 1
        : 0;
  let pendingIntent =
    initial?.intent === undefined || initial.intent === null
      ? null
      : ({ ...initial.intent, revision: nextRevision } as PendingPushIntent);
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
    replacePendingIntent: vi.fn(async (value: NewPendingPushIntent) => {
      pendingIntent = {
        ...value,
        revision: ++nextRevision
      } as PendingPushIntent;
      return pendingIntent;
    }),
    clearPendingIntent: vi.fn(async (matchingOperationId) => {
      if (pendingIntent?.operationId === matchingOperationId) {
        pendingIntent = null;
      }
    })
  };
  return {
    state,
    readIntent: () => pendingIntent,
    readCredentials: () => storedCredentials
  };
}

function createSubscription() {
  return {
    endpoint: "https://push.example.test/subscription/abc",
    expirationTime: null,
    toJSON: () => ({
      endpoint: "https://push.example.test/subscription/abc",
      expirationTime: null,
      keys: { p256dh: "p256dh-key", auth: "auth-key" }
    }),
    unsubscribe: vi.fn(async () => true)
  } as unknown as PushSubscription;
}

function authoritativeScheduleResponse(
  state: "scheduled" | "cancelled",
  authoritativeDueAt: string | null = state === "scheduled" ? dueAt : null
) {
  return new Response(
    JSON.stringify(
      state === "scheduled" ? { state, dueAt: authoritativeDueAt } : { state }
    ),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

function createHarness(
  options: {
    credentials?: PushDeviceCredentials | null;
    intent?: PendingPushIntent | NewPendingPushIntent | null;
    subscription?: PushSubscription | null;
    permission?: NotificationPermission;
    online?: boolean;
    supported?: boolean;
    publicKey?: string;
    fetch?: typeof fetch;
    now?: Date;
  } = {}
) {
  const local = createState({
    credentials: options.credentials,
    intent: options.intent
  });
  let permission = options.permission ?? "granted";
  const subscription = options.subscription ?? createSubscription();
  let activeSubscription = options.subscription ?? null;
  const subscribe = vi.fn(async () => {
    activeSubscription = subscription;
    return subscription;
  });
  const pushManager = {
    getSubscription: vi.fn(async () => activeSubscription),
    subscribe
  } as unknown as PushManager;
  const registration = { pushManager } as ServiceWorkerRegistration;
  const requestPermission = vi.fn(async () => {
    permission = "granted";
    return permission;
  });
  const fetchMock =
    options.fetch ??
    (vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/push-subscription") && init?.method === "POST") {
        return new Response(JSON.stringify(credentials), {
          status: 201,
          headers: { "Content-Type": "application/json" }
        });
      }
      return authoritativeScheduleResponse(
        init?.method === "DELETE" ? "cancelled" : "scheduled"
      );
    }) as typeof fetch);
  const dependencies: BrowserRemotePushDependencies = {
    state: local.state,
    apiBaseUrl: "https://project.supabase.co/functions/v1/",
    publicVapidKey: options.publicKey ?? publicVapidKey,
    isSecureContext: () => options.supported ?? true,
    hasServiceWorker: () => options.supported ?? true,
    hasPushManager: () => options.supported ?? true,
    hasNotification: () => options.supported ?? true,
    getPermission: () => permission,
    requestPermission,
    getRegistration: vi.fn(async () => registration),
    fetch: fetchMock,
    isOnline: () => options.online ?? true,
    createOperationId: vi.fn(() => operationId),
    now: () => options.now ?? new Date("2026-08-30T10:00:00.000Z")
  };
  return {
    adapter: new BrowserRemotePush(dependencies),
    dependencies,
    fetchMock,
    subscribe,
    subscription,
    local
  };
}

describe("BrowserRemotePush", () => {
  it("reports unsupported without secure Push, Service Worker and Notification APIs", async () => {
    const { adapter, fetchMock } = createHarness({ supported: false });

    expect(adapter.isSupported()).toBe(false);
    await expect(adapter.enable()).resolves.toBe("unsupported");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("treats a blank public key as unsupported without affecting local notifications", async () => {
    const { adapter, fetchMock } = createHarness({ publicKey: "   " });

    expect(adapter.isSupported()).toBe(false);
    await expect(adapter.enable()).resolves.toBe("unsupported");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not subscribe when notification permission is denied", async () => {
    const { adapter, subscribe } = createHarness({ permission: "denied" });

    await expect(adapter.enable()).resolves.toBe("permission-required");
    expect(subscribe).not.toHaveBeenCalled();
  });

  it("reports a sanitized stage when browser subscription creation fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { adapter, subscribe } = createHarness({
      credentials: null,
      subscription: null
    });
    vi.mocked(subscribe).mockRejectedValue(
      new DOMException("Registration failed - push service error", "AbortError")
    );

    await expect(adapter.enable()).resolves.toBe("schedule-error");
    expect(warning).toHaveBeenCalledWith("[push] enable failed", {
      stage: "subscribe",
      name: "AbortError",
      message: "Registration failed - push service error"
    });
  });

  it("subscribes and registers a new anonymous device", async () => {
    const { adapter, subscribe, fetchMock, local } = createHarness({
      credentials: null,
      subscription: null
    });

    await expect(adapter.enable()).resolves.toBe("enabled");
    expect(subscribe).toHaveBeenCalledWith({
      userVisibleOnly: true,
      applicationServerKey: expect.any(Uint8Array)
    });
    const [, request] = vi.mocked(fetchMock).mock.calls[0] ?? [];
    expect(request?.method).toBe("POST");
    expect(JSON.parse(String(request?.body))).toEqual({
      endpoint: "https://push.example.test/subscription/abc",
      expirationTime: null,
      keys: { p256dh: "p256dh-key", auth: "auth-key" }
    });
    expect(local.state.writeCredentials).toHaveBeenCalledWith(credentials);
  });

  it("reuses an existing subscription and credentials through authenticated PUT", async () => {
    const subscription = createSubscription();
    const { adapter, subscribe, fetchMock } = createHarness({
      credentials,
      subscription
    });

    await expect(adapter.enable()).resolves.toBe("enabled");
    expect(subscribe).not.toHaveBeenCalled();
    const [url, request] = vi.mocked(fetchMock).mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://project.supabase.co/functions/v1/push-subscription"
    );
    expect(request?.method).toBe("PUT");
    expect(new Headers(request?.headers).get("Authorization")).toBe(
      `Device ${credentials.deviceId}.${credentials.deviceSecret}`
    );
    expect(String(url)).not.toContain(credentials.deviceSecret);
  });

  it("replaces an existing browser subscription before registering a new device when local credentials are lost", async () => {
    const existingSubscription = createSubscription();
    const { adapter, fetchMock, subscribe } = createHarness({
      credentials: null,
      subscription: existingSubscription
    });

    await expect(adapter.enable()).resolves.toBe("enabled");
    expect(existingSubscription.unsubscribe).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledOnce();
    expect(vi.mocked(fetchMock).mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("rechecks a stale subscription when unsubscribe reports false before registering a new device", async () => {
    const existingSubscription = createSubscription();
    vi.mocked(existingSubscription.unsubscribe).mockResolvedValue(false);
    const { adapter, dependencies, fetchMock, subscribe } = createHarness({
      credentials: null,
      subscription: existingSubscription
    });
    const registration = await dependencies.getRegistration();
    vi.mocked(registration!.pushManager.getSubscription)
      .mockResolvedValueOnce(existingSubscription)
      .mockResolvedValueOnce(null);

    await expect(adapter.enable()).resolves.toBe("enabled");
    expect(existingSubscription.unsubscribe).toHaveBeenCalledOnce();
    expect(subscribe).toHaveBeenCalledOnce();
    expect(vi.mocked(fetchMock).mock.calls[0]?.[1]?.method).toBe("POST");
  });

  it("persists then schedules one remote due time", async () => {
    const { adapter, fetchMock, local } = createHarness({ credentials });

    await expect(adapter.schedule(dueAt, operationId)).resolves.toBe(
      "scheduled"
    );
    expect(local.state.replacePendingIntent).toHaveBeenCalledWith({
      kind: "schedule",
      dueAt,
      operationId
    });
    const [url, request] = vi.mocked(fetchMock).mock.calls[0] ?? [];
    expect(String(url)).toBe(
      "https://project.supabase.co/functions/v1/push-schedule"
    );
    expect(request?.method).toBe("PUT");
    expect(JSON.parse(String(request?.body))).toEqual({
      dueAt,
      operationId,
      intentRevision: 1
    });
    expect(local.readIntent()).toBeNull();
  });

  it("persists then cancels the remote schedule with DELETE", async () => {
    const { adapter, fetchMock, local } = createHarness({ credentials });

    await expect(adapter.cancel(operationId)).resolves.toBe("enabled");
    expect(local.state.replacePendingIntent).toHaveBeenCalledWith({
      kind: "cancel",
      operationId
    });
    const [, request] = vi.mocked(fetchMock).mock.calls[0] ?? [];
    expect(request?.method).toBe("DELETE");
    expect(JSON.parse(String(request?.body))).toEqual({
      operationId,
      intentRevision: 1
    });
    expect(local.readIntent()).toBeNull();
  });

  it("reports the authoritative cancellation when an older schedule is rejected", async () => {
    const { adapter, local } = createHarness({
      credentials,
      fetch: vi.fn(async () =>
        authoritativeScheduleResponse("cancelled")
      ) as typeof fetch
    });

    await expect(adapter.schedule(dueAt, operationId)).resolves.toBe("enabled");
    expect(local.readIntent()).toBeNull();
  });

  it("reports the authoritative schedule when an older cancellation is rejected", async () => {
    const { adapter, local } = createHarness({
      credentials,
      fetch: vi.fn(async () =>
        authoritativeScheduleResponse("scheduled")
      ) as typeof fetch
    });

    await expect(adapter.cancel(operationId)).resolves.toBe("scheduled");
    expect(local.readIntent()).toBeNull();
  });

  it("does not settle an intent from a malformed successful response", async () => {
    const { adapter, local } = createHarness({
      credentials,
      fetch: vi.fn(
        async () =>
          new Response(JSON.stringify({ state: "unknown" }), {
            status: 200,
            headers: { "Content-Type": "application/json" }
          })
      ) as typeof fetch
    });

    await expect(adapter.schedule(dueAt, operationId)).resolves.toBe(
      "schedule-error"
    );
    expect(local.readIntent()).toMatchObject({ operationId, revision: 1 });
  });

  it("replaces the latest offline intent and flushes it after reconnect", async () => {
    let online = false;
    const { state, readIntent } = createState({ credentials });
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        authoritativeScheduleResponse("cancelled")
    ) as typeof fetch;
    const adapter = new BrowserRemotePush({
      ...createHarness({ credentials }).dependencies,
      state,
      fetch: fetchMock,
      isOnline: () => online
    });

    await expect(adapter.schedule(dueAt, operationId)).resolves.toBe(
      "pending-sync"
    );
    const replacement = "20000000-0000-4000-8000-000000000002";
    await expect(adapter.cancel(replacement)).resolves.toBe("pending-sync");
    expect(readIntent()).toEqual({
      kind: "cancel",
      operationId: replacement,
      revision: 2
    });

    online = true;
    await expect(adapter.flushPendingIntent()).resolves.toBe("enabled");
    expect(vi.mocked(fetchMock).mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(readIntent()).toBeNull();
  });

  it("compare-and-clear cannot erase an intent replaced during fetch", async () => {
    const replacement = "20000000-0000-4000-8000-000000000002";
    const local = createState({
      credentials,
      intent: { kind: "schedule", dueAt, operationId }
    });
    const fetchMock = vi.fn(async () => {
      await local.state.replacePendingIntent({
        kind: "cancel",
        operationId: replacement
      });
      return authoritativeScheduleResponse("scheduled");
    });
    const adapter = new BrowserRemotePush({
      ...createHarness({ credentials }).dependencies,
      state: local.state,
      fetch: fetchMock
    });

    await expect(adapter.flushPendingIntent()).resolves.toBe("scheduled");
    expect(local.readIntent()).toEqual({
      kind: "cancel",
      operationId: replacement,
      revision: 2
    });
  });

  it("converts an expired offline schedule into a durable remote cancel", async () => {
    const local = createState({
      credentials,
      intent: { kind: "schedule", dueAt, operationId }
    });
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        authoritativeScheduleResponse("cancelled")
    ) as typeof fetch;
    const adapter = new BrowserRemotePush({
      ...createHarness({ credentials }).dependencies,
      state: local.state,
      fetch: fetchMock,
      now: () => new Date("2026-08-30T10:30:00.000Z")
    });

    await expect(adapter.flushPendingIntent()).resolves.toBe("enabled");
    expect(vi.mocked(fetchMock).mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(local.readIntent()).toBeNull();
  });

  it("durably cancels an older remote schedule when its offline replacement expires", async () => {
    let online = true;
    let now = new Date("2026-08-30T10:00:00.000Z");
    const replacementDueAt = "2026-08-30T10:15:00.000Z";
    const replacementOperationId = "20000000-0000-4000-8000-000000000002";
    const { state, readIntent } = createState({ credentials });
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        authoritativeScheduleResponse(
          init?.method === "DELETE" ? "cancelled" : "scheduled"
        )
    ) as typeof fetch;
    const adapter = new BrowserRemotePush({
      ...createHarness({ credentials }).dependencies,
      state,
      fetch: fetchMock,
      isOnline: () => online,
      createOperationId: vi.fn(() => "20000000-0000-4000-8000-000000000003"),
      now: () => now
    });

    await expect(adapter.schedule(dueAt, operationId)).resolves.toBe(
      "scheduled"
    );
    online = false;
    await expect(
      adapter.schedule(replacementDueAt, replacementOperationId)
    ).resolves.toBe("pending-sync");

    online = true;
    now = new Date("2026-08-30T10:15:00.000Z");
    await expect(adapter.flushPendingIntent()).resolves.toBe("enabled");

    expect(vi.mocked(fetchMock).mock.calls).toHaveLength(2);
    expect(vi.mocked(fetchMock).mock.calls[0]?.[1]?.method).toBe("PUT");
    expect(vi.mocked(fetchMock).mock.calls[1]?.[1]?.method).toBe("DELETE");
    expect(readIntent()).toBeNull();
  });

  it("hydrates an offline persisted revoke as explicit pending teardown", async () => {
    const { adapter, fetchMock, local, subscription } = createHarness({
      credentials,
      intent: {
        kind: "revoke",
        operationId,
        remoteRevoked: false,
        credentialSnapshot: credentials
      },
      online: false
    });

    await expect(adapter.hydrate()).resolves.toEqual({
      state: "pending-sync",
      isEnabled: false,
      needsTeardown: true
    });
    expect(fetchMock).not.toHaveBeenCalled();

    await expect(adapter.flushPendingIntent()).resolves.toBe("pending-sync");
    expect(local.readIntent()).toEqual({
      kind: "revoke",
      operationId,
      remoteRevoked: false,
      credentialSnapshot: credentials,
      revision: 1
    });
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
  });

  it.each([false, true])(
    "keeps a missing-snapshot legacy revoke with remoteRevoked=%s unresolved even when credentials currently exist",
    async (remoteRevoked) => {
      const database = new SunshieldDatabase(
        `push-legacy-revoke-${String(remoteRevoked)}-${crypto.randomUUID()}`
      );
      const state = new LocalPushStateRepository(database);
      const subscription = createSubscription();
      const fetchMock = vi.fn(
        async () => new Response(null, { status: 204 })
      ) as typeof fetch;

      try {
        await database.table("PushDeliveryState").put({
          id: "current-device",
          credentials,
          intentRevision: 1,
          pendingIntent: {
            kind: "revoke",
            operationId,
            remoteRevoked,
            revision: 1
          }
        });
        const adapter = new BrowserRemotePush({
          ...createHarness({ credentials, subscription }).dependencies,
          state,
          fetch: fetchMock
        });

        await expect(adapter.hydrate()).resolves.toEqual({
          state: "schedule-error",
          isEnabled: false,
          needsTeardown: true
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(subscription.unsubscribe).not.toHaveBeenCalled();
        await expect(state.readCredentials()).resolves.toEqual(credentials);
        await expect(state.readPendingIntent()).resolves.toEqual({
          kind: "revoke",
          operationId,
          remoteRevoked,
          credentialSnapshot: undefined,
          revision: 1
        });
      } finally {
        await database.delete();
      }
    }
  );

  it("does not infer replacement B ownership when an old writer replaces A before the first new-code read", async () => {
    const database = new SunshieldDatabase(
      `push-legacy-revoke-unowned-${crypto.randomUUID()}`
    );
    const state = new LocalPushStateRepository(database);
    const replacementCredentials: PushDeviceCredentials = {
      deviceId: "10000000-0000-4000-8000-000000000002",
      deviceSecret: "replacement-device-secret"
    };
    const replacementSubscription = createSubscription();
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 204 })
    ) as typeof fetch;

    try {
      await database.table("PushDeliveryState").put({
        id: "current-device",
        credentials,
        intentRevision: 1,
        pendingIntent: {
          kind: "revoke",
          operationId,
          remoteRevoked: false,
          revision: 1
        }
      });
      await database
        .table("PushDeliveryState")
        .update("current-device", { credentials: replacementCredentials });
      const adapter = new BrowserRemotePush({
        ...createHarness({
          credentials: replacementCredentials,
          subscription: replacementSubscription
        }).dependencies,
        state,
        fetch: fetchMock
      });

      await expect(adapter.hydrate()).resolves.toEqual({
        state: "schedule-error",
        isEnabled: false,
        needsTeardown: true
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(replacementSubscription.unsubscribe).not.toHaveBeenCalled();
      await expect(state.readCredentials()).resolves.toEqual(
        replacementCredentials
      );
      await expect(state.readPendingIntent()).resolves.toMatchObject({
        kind: "revoke",
        operationId,
        remoteRevoked: false,
        revision: 1
      });
    } finally {
      await database.delete();
    }
  });

  it("creates a fresh revoke snapshot only after the user explicitly disables an unresolved legacy intent", async () => {
    const database = new SunshieldDatabase(
      `push-legacy-revoke-recovery-${crypto.randomUUID()}`
    );
    const state = new LocalPushStateRepository(database);
    const replacementCredentials: PushDeviceCredentials = {
      deviceId: "10000000-0000-4000-8000-000000000002",
      deviceSecret: "replacement-device-secret"
    };
    const replacementSubscription = createSubscription();
    const fetchMock = vi.fn(
      async () => new Response(null, { status: 204 })
    ) as typeof fetch;

    try {
      await database.table("PushDeliveryState").put({
        id: "current-device",
        credentials,
        intentRevision: 1,
        pendingIntent: {
          kind: "revoke",
          operationId,
          remoteRevoked: false,
          revision: 1
        }
      });
      await database
        .table("PushDeliveryState")
        .update("current-device", { credentials: replacementCredentials });
      const adapter = new BrowserRemotePush({
        ...createHarness({
          credentials: replacementCredentials,
          subscription: replacementSubscription
        }).dependencies,
        state,
        fetch: fetchMock
      });

      await expect(adapter.hydrate()).resolves.toEqual({
        state: "schedule-error",
        isEnabled: false,
        needsTeardown: true
      });
      expect(fetchMock).not.toHaveBeenCalled();
      expect(replacementSubscription.unsubscribe).not.toHaveBeenCalled();

      await expect(adapter.disable()).resolves.toBe("permission-required");

      expect(fetchMock).toHaveBeenCalledOnce();
      const [, request] = vi.mocked(fetchMock).mock.calls[0] ?? [];
      expect(request?.method).toBe("DELETE");
      expect(new Headers(request?.headers).get("Authorization")).toBe(
        `Device ${replacementCredentials.deviceId}.${replacementCredentials.deviceSecret}`
      );
      expect(replacementSubscription.unsubscribe).toHaveBeenCalledOnce();
      await expect(state.readCredentials()).resolves.toBeNull();
      await expect(state.readPendingIntent()).resolves.toBeNull();
    } finally {
      await database.delete();
    }
  });

  it("serializes remote writes so an older response cannot win after a newer intent", async () => {
    const requests: Array<{
      body: Record<string, unknown>;
      resolve(response: Response): void;
    }> = [];
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((resolve) => {
          requests.push({
            body: JSON.parse(String(init?.body)) as Record<string, unknown>,
            resolve
          });
        })
    ) as typeof fetch;
    const { adapter, local } = createHarness({ credentials, fetch: fetchMock });
    const replacement = "20000000-0000-4000-8000-000000000002";

    const first = adapter.schedule(dueAt, operationId);
    const second = adapter.cancel(replacement);
    await vi.waitFor(() => expect(requests).toHaveLength(1));
    expect(requests[0]?.body).toEqual({
      dueAt,
      operationId,
      intentRevision: 1
    });

    requests[0]?.resolve(authoritativeScheduleResponse("scheduled"));
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.body).toEqual({
      operationId: replacement,
      intentRevision: 2
    });
    requests[1]?.resolve(authoritativeScheduleResponse("cancelled"));

    await expect(Promise.all([first, second])).resolves.toEqual([
      "scheduled",
      "enabled"
    ]);
    expect(local.readIntent()).toBeNull();
  });

  it("keeps two database connections and adapters aligned with the authoritative late response", async () => {
    const databaseName = `push-two-tabs-${crypto.randomUUID()}`;
    const databaseA = new SunshieldDatabase(databaseName);
    const databaseB = new SunshieldDatabase(databaseName);
    const stateA = new LocalPushStateRepository(databaseA);
    const stateB = new LocalPushStateRepository(databaseB);
    const operationB = "20000000-0000-4000-8000-000000000002";
    const operationC = "20000000-0000-4000-8000-000000000003";
    let remote: {
      revision: number;
      state: "scheduled" | "cancelled";
      dueAt: string | null;
    } = { revision: 0, state: "cancelled", dueAt: null };
    let releaseFirstRequest: (() => void) | undefined;

    const applyAtServer = (init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as {
        dueAt?: string;
        intentRevision: number;
      };
      if (body.intentRevision > remote.revision) {
        remote =
          init.method === "DELETE"
            ? {
                revision: body.intentRevision,
                state: "cancelled",
                dueAt: null
              }
            : {
                revision: body.intentRevision,
                state: "scheduled",
                dueAt: body.dueAt ?? null
              };
      }
      return authoritativeScheduleResponse(remote.state, remote.dueAt);
    };
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = init as RequestInit;
        const body = JSON.parse(String(request.body)) as {
          operationId: string;
        };
        if (body.operationId === operationId) {
          return new Promise<Response>((resolve) => {
            releaseFirstRequest = () => resolve(applyAtServer(request));
          });
        }
        return applyAtServer(request);
      }
    ) as typeof fetch;

    try {
      await stateA.writeCredentials(credentials);
      const tabA = new BrowserRemotePush({
        ...createHarness({ credentials }).dependencies,
        state: stateA,
        fetch: fetchMock
      });
      const tabB = new BrowserRemotePush({
        ...createHarness({ credentials }).dependencies,
        state: stateB,
        fetch: fetchMock
      });

      const olderSchedule = tabA.schedule(dueAt, operationId);
      await vi.waitFor(() =>
        expect(releaseFirstRequest).toBeTypeOf("function")
      );
      await expect(
        tabB.schedule("2026-08-30T11:00:00.000Z", operationB)
      ).resolves.toBe("scheduled");
      await expect(tabB.cancel(operationC)).resolves.toBe("enabled");

      releaseFirstRequest?.();
      await expect(olderSchedule).resolves.toBe("enabled");
      expect(remote).toEqual({
        revision: 3,
        state: "cancelled",
        dueAt: null
      });
      await expect(stateA.readPendingIntent()).resolves.toBeNull();
    } finally {
      databaseB.close();
      await databaseA.delete();
    }
  });

  it("preserves a replacement registration when an older tab receives a delayed 401", async () => {
    const databaseName = `push-credential-ownership-${crypto.randomUUID()}`;
    const databaseA = new SunshieldDatabase(databaseName);
    const databaseB = new SunshieldDatabase(databaseName);
    const stateA = new LocalPushStateRepository(databaseA);
    const stateB = new LocalPushStateRepository(databaseB);
    const replacementCredentials: PushDeviceCredentials = {
      deviceId: "10000000-0000-4000-8000-000000000002",
      deviceSecret: "replacement-device-secret"
    };
    const replacementOperationId = "20000000-0000-4000-8000-000000000002";
    const oldSubscription = createSubscription();
    const replacementSubscription = createSubscription();
    Object.defineProperty(replacementSubscription, "endpoint", {
      value: "https://push.example.test/subscription/replacement"
    });
    Object.defineProperty(replacementSubscription, "toJSON", {
      value: vi.fn(() => ({
        endpoint: "https://push.example.test/subscription/replacement",
        expirationTime: null,
        keys: { p256dh: "replacement-p256dh", auth: "replacement-auth" }
      }))
    });
    let activeSubscription: PushSubscription | null = oldSubscription;
    vi.mocked(oldSubscription.unsubscribe).mockImplementation(async () => {
      if (activeSubscription === oldSubscription) activeSubscription = null;
      return true;
    });
    vi.mocked(replacementSubscription.unsubscribe).mockImplementation(
      async () => {
        if (activeSubscription === replacementSubscription) {
          activeSubscription = null;
        }
        return true;
      }
    );
    const registration = {
      pushManager: {
        getSubscription: vi.fn(async () => activeSubscription),
        subscribe: vi.fn(async () => {
          activeSubscription = replacementSubscription;
          return replacementSubscription;
        })
      }
    } as unknown as ServiceWorkerRegistration;
    let releaseOldRequest: (() => void) | undefined;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        const request = init as RequestInit;
        const authorization = new Headers(request.headers).get("Authorization");
        if (
          request.method === "PUT" &&
          authorization ===
            `Device ${credentials.deviceId}.${credentials.deviceSecret}`
        ) {
          return new Promise<Response>((resolve) => {
            releaseOldRequest = () =>
              resolve(new Response(null, { status: 401 }));
          });
        }
        if (request.method === "DELETE") {
          return new Response(null, { status: 401 });
        }
        if (request.method === "POST") {
          return new Response(JSON.stringify(replacementCredentials), {
            status: 201,
            headers: { "Content-Type": "application/json" }
          });
        }
        return authoritativeScheduleResponse("scheduled");
      }
    ) as typeof fetch;
    const dependencies = {
      ...createHarness({ credentials }).dependencies,
      getRegistration: vi.fn(async () => registration),
      fetch: fetchMock
    };

    try {
      await stateA.writeCredentials(credentials);
      const tabA = new BrowserRemotePush({ ...dependencies, state: stateA });
      const tabB = new BrowserRemotePush({ ...dependencies, state: stateB });

      const delayedSchedule = tabA.schedule(dueAt, operationId);
      await vi.waitFor(() => expect(releaseOldRequest).toBeTypeOf("function"));

      await expect(tabB.disable()).resolves.toBe("permission-required");
      await expect(tabB.enable()).resolves.toBe("enabled");
      await expect(
        tabB.schedule("2026-08-30T11:00:00.000Z", replacementOperationId)
      ).resolves.toBe("scheduled");

      releaseOldRequest?.();
      await expect(delayedSchedule).resolves.toBe("enabled");
      await expect(stateB.readCredentials()).resolves.toEqual(
        replacementCredentials
      );
      await expect(stateB.readPendingIntent()).resolves.toBeNull();
      expect(activeSubscription).toBe(replacementSubscription);
      expect(replacementSubscription.unsubscribe).not.toHaveBeenCalled();
    } finally {
      databaseB.close();
      await databaseA.delete();
    }
  });

  it("does not tear down a replacement registration when a stale disable captured no credentials", async () => {
    const databaseName = `push-null-credential-ownership-${crypto.randomUUID()}`;
    const databaseA = new SunshieldDatabase(databaseName);
    const databaseB = new SunshieldDatabase(databaseName);
    const stateA = new LocalPushStateRepository(databaseA);
    const stateB = new LocalPushStateRepository(databaseB);
    const replacementCredentials: PushDeviceCredentials = {
      deviceId: "10000000-0000-4000-8000-000000000002",
      deviceSecret: "replacement-device-secret"
    };
    const oldSubscription = createSubscription();
    const replacementSubscription = createSubscription();
    let activeSubscription: PushSubscription | null = oldSubscription;
    vi.mocked(oldSubscription.unsubscribe).mockImplementation(async () => {
      if (activeSubscription === oldSubscription) activeSubscription = null;
      return true;
    });
    vi.mocked(replacementSubscription.unsubscribe).mockImplementation(
      async () => {
        if (activeSubscription === replacementSubscription) {
          activeSubscription = null;
        }
        return true;
      }
    );
    const registration = {
      pushManager: {
        getSubscription: vi.fn(async () => activeSubscription),
        subscribe: vi.fn(async () => {
          activeSubscription = replacementSubscription;
          return replacementSubscription;
        })
      }
    } as unknown as ServiceWorkerRegistration;
    let announceSnapshotRead!: () => void;
    const snapshotReadStarted = new Promise<void>((resolve) => {
      announceSnapshotRead = resolve;
    });
    let releaseSnapshotRead!: () => void;
    const snapshotReadRelease = new Promise<void>((resolve) => {
      releaseSnapshotRead = resolve;
    });
    let firstCredentialRead = true;
    const staleState: PushStatePort = {
      readCredentials: vi.fn(async () => {
        if (!firstCredentialRead) return stateA.readCredentials();
        firstCredentialRead = false;
        announceSnapshotRead();
        await snapshotReadRelease;
        return null;
      }),
      writeCredentials: (value) => stateA.writeCredentials(value),
      clearCredentialsIfOwned: (value) => stateA.clearCredentialsIfOwned(value),
      readPendingIntent: () => stateA.readPendingIntent(),
      replacePendingIntent: (value) => stateA.replacePendingIntent(value),
      clearPendingIntent: (matchingOperationId) =>
        stateA.clearPendingIntent(matchingOperationId)
    };
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return new Response(JSON.stringify(replacementCredentials), {
            status: 201,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(null, { status: 204 });
      }
    ) as typeof fetch;
    const dependencies = {
      ...createHarness({ credentials: null }).dependencies,
      getRegistration: vi.fn(async () => registration),
      fetch: fetchMock
    };

    try {
      const staleTab = new BrowserRemotePush({
        ...dependencies,
        state: staleState
      });
      const replacementTab = new BrowserRemotePush({
        ...dependencies,
        state: stateB
      });

      const staleDisable = staleTab.disable();
      await snapshotReadStarted;
      await expect(replacementTab.enable()).resolves.toBe("enabled");
      releaseSnapshotRead();

      await expect(staleDisable).resolves.toBe("enabled");
      await expect(stateB.readCredentials()).resolves.toEqual(
        replacementCredentials
      );
      await expect(stateB.readPendingIntent()).resolves.toBeNull();
      expect(activeSubscription).toBe(replacementSubscription);
      expect(replacementSubscription.unsubscribe).not.toHaveBeenCalled();
    } finally {
      databaseB.close();
      await databaseA.delete();
    }
  });

  it("keeps replacement ownership when a persisted remote-revoked teardown resumes", async () => {
    const databaseName = `push-persisted-revoke-ownership-${crypto.randomUUID()}`;
    const databaseA = new SunshieldDatabase(databaseName);
    const databaseB = new SunshieldDatabase(databaseName);
    const stateA = new LocalPushStateRepository(databaseA);
    const stateB = new LocalPushStateRepository(databaseB);
    const replacementCredentials: PushDeviceCredentials = {
      deviceId: "10000000-0000-4000-8000-000000000002",
      deviceSecret: "replacement-device-secret"
    };
    const oldSubscription = createSubscription();
    const replacementSubscription = createSubscription();
    let activeSubscription: PushSubscription | null = oldSubscription;
    vi.mocked(oldSubscription.unsubscribe).mockImplementation(async () => {
      if (activeSubscription === oldSubscription) activeSubscription = null;
      return true;
    });
    vi.mocked(replacementSubscription.unsubscribe).mockImplementation(
      async () => {
        if (activeSubscription === replacementSubscription) {
          activeSubscription = null;
        }
        return true;
      }
    );
    const registration = {
      pushManager: {
        getSubscription: vi.fn(async () => activeSubscription),
        subscribe: vi.fn(async () => {
          activeSubscription = replacementSubscription;
          return replacementSubscription;
        })
      }
    } as unknown as ServiceWorkerRegistration;
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          return new Response(JSON.stringify(replacementCredentials), {
            status: 201,
            headers: { "Content-Type": "application/json" }
          });
        }
        return new Response(null, { status: 204 });
      }
    ) as typeof fetch;
    const dependencies = {
      ...createHarness({ credentials }).dependencies,
      getRegistration: vi.fn(async () => registration),
      fetch: fetchMock
    };

    try {
      await stateA.writeCredentials(credentials);
      const interruptedTab = new BrowserRemotePush({
        ...dependencies,
        state: stateA,
        getRegistration: vi.fn(async () => {
          throw new Error("registration unavailable");
        })
      });
      await expect(interruptedTab.disable()).resolves.toBe("schedule-error");
      await expect(stateA.readPendingIntent()).resolves.toEqual(
        expect.objectContaining({ kind: "revoke", remoteRevoked: true })
      );

      await expect(stateB.clearCredentialsIfOwned(credentials)).resolves.toBe(
        true
      );
      const replacementTab = new BrowserRemotePush({
        ...dependencies,
        state: stateB
      });
      await expect(replacementTab.enable()).resolves.toBe("enabled");

      const reloadedStaleTab = new BrowserRemotePush({
        ...dependencies,
        state: stateA
      });
      await expect(reloadedStaleTab.hydrate()).resolves.toEqual({
        state: "enabled",
        isEnabled: true,
        needsTeardown: false
      });
      await expect(stateB.readCredentials()).resolves.toEqual(
        replacementCredentials
      );
      await expect(stateB.readPendingIntent()).resolves.toBeNull();
      expect(activeSubscription).toBe(replacementSubscription);
      expect(replacementSubscription.unsubscribe).not.toHaveBeenCalled();
    } finally {
      databaseB.close();
      await databaseA.delete();
    }
  });

  it("keeps pending intent for network failures without exposing secrets", async () => {
    const fetchMock = vi.fn(() =>
      Promise.reject(new Error(`network ${credentials.deviceSecret}`))
    ) as unknown as typeof fetch;
    const { adapter, local } = createHarness({ credentials, fetch: fetchMock });
    const result = await adapter.schedule(dueAt, operationId);

    expect(["pending-sync", "schedule-error"]).toContain(result);
    expect(local.readIntent()).toEqual({
      kind: "schedule",
      dueAt,
      operationId,
      revision: 1
    });
  });

  it.each([
    [
      "schedule",
      (adapter: BrowserRemotePush) => adapter.schedule(dueAt, operationId)
    ],
    ["cancel", (adapter: BrowserRemotePush) => adapter.cancel(operationId)],
    ["revoke", (adapter: BrowserRemotePush) => adapter.disable()]
  ] as const)(
    "recovers from a controlled 401 while %s without retaining invalid device ownership",
    async (_operation, execute) => {
      const subscription = createSubscription();
      const { adapter, local } = createHarness({
        credentials,
        subscription,
        fetch: vi.fn(
          async () => new Response(null, { status: 401 })
        ) as typeof fetch
      });

      await expect(execute(adapter)).resolves.toBe("permission-required");
      expect(subscription.unsubscribe).toHaveBeenCalledOnce();
      expect(local.readCredentials()).toBeNull();
      expect(local.readIntent()).toBeNull();
    }
  );

  it("revokes the backend before browser unsubscribe and clears local state", async () => {
    const order: string[] = [];
    const subscription = createSubscription();
    vi.mocked(subscription.unsubscribe).mockImplementation(async () => {
      order.push("unsubscribe");
      return true;
    });
    const fetchMock = vi.fn(async () => {
      order.push("remote-delete");
      return new Response(null, { status: 204 });
    });
    const { adapter, local } = createHarness({
      credentials,
      subscription,
      fetch: fetchMock as typeof fetch
    });

    await expect(adapter.disable()).resolves.toBe("permission-required");
    expect(order).toEqual(["remote-delete", "unsubscribe"]);
    expect(local.state.clearCredentialsIfOwned).toHaveBeenCalledOnce();
  });

  it("keeps the browser subscription and credentials when backend revocation fails", async () => {
    const subscription = createSubscription();
    const fetchMock = vi.fn(async () => new Response(null, { status: 500 }));
    const { adapter, local } = createHarness({
      credentials,
      subscription,
      fetch: fetchMock as typeof fetch
    });

    await expect(adapter.disable()).resolves.toBe("pending-sync");
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
    expect(local.state.clearCredentialsIfOwned).not.toHaveBeenCalled();
  });

  it("persists a revoke teardown while offline then completes it after reload", async () => {
    let online = false;
    const local = createState({ credentials });
    const subscription = createSubscription();
    const { dependencies, fetchMock } = createHarness({
      credentials,
      subscription,
      online
    });
    const offlineAdapter = new BrowserRemotePush({
      ...dependencies,
      state: local.state,
      isOnline: () => online
    });

    await expect(offlineAdapter.disable()).resolves.toBe("pending-sync");
    expect(local.readIntent()).toEqual({
      kind: "revoke",
      operationId,
      remoteRevoked: false,
      credentialSnapshot: credentials,
      revision: 1
    });
    expect(local.readCredentials()).toEqual(credentials);

    online = true;
    const reloadedAdapter = new BrowserRemotePush({
      ...dependencies,
      state: local.state,
      isOnline: () => online
    });
    await expect(reloadedAdapter.hydrate()).resolves.toEqual({
      state: "permission-required",
      isEnabled: false,
      needsTeardown: false
    });
    expect(vi.mocked(fetchMock).mock.calls[0]?.[1]?.method).toBe("DELETE");
    expect(subscription.unsubscribe).toHaveBeenCalledOnce();
    expect(local.readCredentials()).toBeNull();
    expect(local.readIntent()).toBeNull();
  });

  it("serializes enable and disable so a late registration is revoked", async () => {
    let resolveRegistration: ((response: Response) => void) | undefined;
    const order: string[] = [];
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        if (init?.method === "POST") {
          order.push("register");
          return new Promise<Response>((resolve) => {
            resolveRegistration = resolve;
          });
        }
        order.push("remote-delete");
        return new Response(null, { status: 204 });
      }
    ) as typeof fetch;
    const { adapter, subscription, local } = createHarness({
      credentials: null,
      subscription: null,
      fetch: fetchMock
    });
    vi.mocked(subscription.unsubscribe).mockImplementation(async () => {
      order.push("unsubscribe");
      return true;
    });

    const enabling = adapter.enable();
    const disabling = adapter.disable();
    await vi.waitFor(() => expect(order).toEqual(["register"]));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    resolveRegistration?.(
      new Response(JSON.stringify(credentials), {
        status: 201,
        headers: { "Content-Type": "application/json" }
      })
    );

    await expect(enabling).resolves.toBe("enabled");
    await expect(disabling).resolves.toBe("permission-required");
    expect(order).toEqual(["register", "remote-delete", "unsubscribe"]);
    expect(local.state.clearCredentialsIfOwned).toHaveBeenCalledOnce();
  });
});
