import { describe, expect, it, vi } from "vitest";
import type {
  PendingPushIntent,
  PushDeviceCredentials,
  PushStatePort
} from "@sunshield/platform";
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
  intent?: PendingPushIntent | null | undefined;
}) {
  let storedCredentials = initial?.credentials ?? null;
  let pendingIntent = initial?.intent ?? null;
  const state: PushStatePort = {
    readCredentials: vi.fn(async () => storedCredentials),
    writeCredentials: vi.fn(async (value) => {
      storedCredentials = value;
    }),
    clearCredentials: vi.fn(async () => {
      storedCredentials = null;
    }),
    readPendingIntent: vi.fn(async () => pendingIntent),
    replacePendingIntent: vi.fn(async (value) => {
      pendingIntent = value;
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

function createHarness(
  options: {
    credentials?: PushDeviceCredentials | null;
    intent?: PendingPushIntent | null;
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
      return new Response(JSON.stringify({ state: "scheduled" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
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
    expect(JSON.parse(String(request?.body))).toEqual({ dueAt, operationId });
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
    expect(JSON.parse(String(request?.body))).toEqual({ operationId });
    expect(local.readIntent()).toBeNull();
  });

  it("replaces the latest offline intent and flushes it after reconnect", async () => {
    let online = false;
    const { state, readIntent } = createState({ credentials });
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, { status: 200 })
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
    expect(readIntent()).toEqual({ kind: "cancel", operationId: replacement });

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
      return new Response(null, { status: 200 });
    });
    const adapter = new BrowserRemotePush({
      ...createHarness({ credentials }).dependencies,
      state: local.state,
      fetch: fetchMock
    });

    await expect(adapter.flushPendingIntent()).resolves.toBe("scheduled");
    expect(local.readIntent()).toEqual({
      kind: "cancel",
      operationId: replacement
    });
  });

  it("converts an expired offline schedule into a durable remote cancel", async () => {
    const local = createState({
      credentials,
      intent: { kind: "schedule", dueAt, operationId }
    });
    const fetchMock = vi.fn(
      async (_input: RequestInfo | URL, _init?: RequestInit) =>
        new Response(null, { status: 200 })
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
      async () => new Response(null, { status: 200 })
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
      intent: { kind: "revoke", operationId, remoteRevoked: false },
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
      remoteRevoked: false
    });
    expect(subscription.unsubscribe).not.toHaveBeenCalled();
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
    expect(requests[0]?.body).toEqual({ dueAt, operationId });

    requests[0]?.resolve(new Response(null, { status: 200 }));
    await vi.waitFor(() => expect(requests).toHaveLength(2));
    expect(requests[1]?.body).toEqual({ operationId: replacement });
    requests[1]?.resolve(new Response(null, { status: 200 }));

    await expect(Promise.all([first, second])).resolves.toEqual([
      "scheduled",
      "enabled"
    ]);
    expect(local.readIntent()).toBeNull();
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
      operationId
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
    expect(local.state.clearCredentials).toHaveBeenCalledOnce();
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
    expect(local.state.clearCredentials).not.toHaveBeenCalled();
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
      remoteRevoked: false
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
    expect(local.state.clearCredentials).toHaveBeenCalledOnce();
  });
});
