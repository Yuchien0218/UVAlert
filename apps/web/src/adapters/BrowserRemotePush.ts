import type {
  BackgroundPushState,
  PendingPushIntent,
  PushDeviceCredentials,
  PushStatePort,
  RemotePushPort
} from "@sunshield/platform";
import { readConfiguredEnvironmentValue } from "./configuredEnvironment";

export type BrowserRemotePushDependencies = {
  state: PushStatePort;
  apiBaseUrl: string;
  publicVapidKey: string | undefined;
  isSecureContext(): boolean;
  hasServiceWorker(): boolean;
  hasPushManager(): boolean;
  hasNotification(): boolean;
  getPermission(): NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
  getRegistration(): Promise<ServiceWorkerRegistration | null>;
  fetch: typeof fetch;
  isOnline(): boolean;
  createOperationId(): string;
  now(): Date;
};

type SubscriptionPayload = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export class BrowserRemotePush implements RemotePushPort {
  readonly #deps: BrowserRemotePushDependencies;
  readonly #apiBase: string;
  readonly #publicVapidKey: string | undefined;
  #transport: Promise<void> = Promise.resolve();

  constructor(dependencies: BrowserRemotePushDependencies) {
    this.#deps = dependencies;
    this.#apiBase = dependencies.apiBaseUrl.replace(/\/+$/u, "");
    this.#publicVapidKey = readConfiguredEnvironmentValue(
      dependencies.publicVapidKey
    );
  }

  isSupported(): boolean {
    return (
      this.#publicVapidKey !== undefined &&
      this.#deps.isSecureContext() &&
      this.#deps.hasServiceWorker() &&
      this.#deps.hasPushManager() &&
      this.#deps.hasNotification()
    );
  }

  async enable(): Promise<BackgroundPushState> {
    return this.#enqueue(() => this.#enable());
  }

  async #enable(): Promise<BackgroundPushState> {
    if (!this.isSupported()) return "unsupported";
    let permission = this.#deps.getPermission();
    if (permission === "default") {
      permission = await this.#deps.requestPermission();
    }
    if (permission !== "granted") return "permission-required";

    try {
      const registration = await this.#deps.getRegistration();
      if (registration === null) return "unsupported";
      let subscription = await registration.pushManager.getSubscription();
      const hadExistingSubscription = subscription !== null;
      if (subscription === null) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(
            this.#publicVapidKey as string
          )
        });
      }
      const payload = subscriptionPayload(subscription);
      const existing = await this.#deps.state.readCredentials();
      if (hadExistingSubscription && existing === null) {
        return "schedule-error";
      }
      const response = await this.#deps.fetch(
        `${this.#apiBase}/push-subscription`,
        existing === null
          ? jsonRequest("POST", payload)
          : authenticatedJsonRequest("PUT", payload, existing)
      );
      if (!response.ok) return "schedule-error";
      if (existing === null) {
        const created = await readCreatedCredentials(response);
        await this.#deps.state.writeCredentials(created);
      }
      return "enabled";
    } catch {
      return "schedule-error";
    }
  }

  async schedule(
    dueAt: string,
    operationId: string
  ): Promise<BackgroundPushState> {
    const intent: PendingPushIntent = { kind: "schedule", dueAt, operationId };
    await this.#deps.state.replacePendingIntent(intent);
    return this.#enqueue(() => this.#sendIntent(intent));
  }

  async cancel(operationId: string): Promise<BackgroundPushState> {
    const intent: PendingPushIntent = { kind: "cancel", operationId };
    await this.#deps.state.replacePendingIntent(intent);
    return this.#enqueue(() => this.#sendIntent(intent));
  }

  async disable(): Promise<BackgroundPushState> {
    return this.#enqueue(async () => {
      if (!this.#deps.isOnline()) return "pending-sync";
      const credentials = await this.#deps.state.readCredentials();
      const registration = await this.#deps.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (credentials !== null) {
        let response: Response;
        try {
          response = await this.#deps.fetch(
            `${this.#apiBase}/push-subscription`,
            authenticatedRequest("DELETE", credentials)
          );
        } catch {
          return "pending-sync";
        }
        if (!response.ok)
          return retryable(response) ? "pending-sync" : "schedule-error";
      }
      try {
        await subscription?.unsubscribe();
      } catch {
        return "schedule-error";
      }
      await this.#deps.state.clearCredentials();
      const pending = await this.#deps.state.readPendingIntent();
      if (pending !== null) {
        await this.#deps.state.clearPendingIntent(pending.operationId);
      }
      return "permission-required";
    });
  }

  async flushPendingIntent(): Promise<BackgroundPushState> {
    return this.#enqueue(async () => {
      const intent = await this.#deps.state.readPendingIntent();
      return intent === null ? "enabled" : this.#sendIntent(intent);
    });
  }

  async #sendIntent(intent: PendingPushIntent): Promise<BackgroundPushState> {
    if (!this.#deps.isOnline()) return "pending-sync";
    if (
      intent.kind === "schedule" &&
      new Date(intent.dueAt).getTime() <= this.#deps.now().getTime()
    ) {
      await this.#deps.state.clearPendingIntent(intent.operationId);
      return "enabled";
    }
    const credentials = await this.#deps.state.readCredentials();
    if (credentials === null) return "schedule-error";

    let response: Response;
    try {
      response = await this.#deps.fetch(
        `${this.#apiBase}/push-schedule`,
        authenticatedJsonRequest(
          intent.kind === "schedule" ? "PUT" : "DELETE",
          intent.kind === "schedule"
            ? { dueAt: intent.dueAt, operationId: intent.operationId }
            : { operationId: intent.operationId },
          credentials
        )
      );
    } catch {
      return "pending-sync";
    }
    if (!response.ok) {
      return retryable(response) ? "pending-sync" : "schedule-error";
    }
    await this.#deps.state.clearPendingIntent(intent.operationId);
    return intent.kind === "schedule" ? "scheduled" : "enabled";
  }

  #enqueue(
    operation: () => Promise<BackgroundPushState>
  ): Promise<BackgroundPushState> {
    const result = this.#transport.then(operation, operation);
    this.#transport = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  }
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(
    normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
  );
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));
  for (const [index, character] of [...binary].entries()) {
    bytes[index] = character.charCodeAt(0);
  }
  return bytes;
}

function subscriptionPayload(
  subscription: PushSubscription
): SubscriptionPayload {
  const serialized = subscription.toJSON();
  if (
    typeof serialized.endpoint !== "string" ||
    serialized.keys === undefined ||
    typeof serialized.keys.p256dh !== "string" ||
    typeof serialized.keys.auth !== "string"
  ) {
    throw new Error("PUSH_SUBSCRIPTION_INVALID");
  }
  return {
    endpoint: serialized.endpoint,
    expirationTime: serialized.expirationTime ?? null,
    keys: { p256dh: serialized.keys.p256dh, auth: serialized.keys.auth }
  };
}

async function readCreatedCredentials(
  response: Response
): Promise<PushDeviceCredentials> {
  const body = (await response.json()) as Record<string, unknown>;
  if (
    typeof body.deviceId !== "string" ||
    typeof body.deviceSecret !== "string"
  ) {
    throw new Error("PUSH_CREDENTIAL_RESPONSE_INVALID");
  }
  return { deviceId: body.deviceId, deviceSecret: body.deviceSecret };
}

function authorization(credentials: PushDeviceCredentials): string {
  return `Device ${credentials.deviceId}.${credentials.deviceSecret}`;
}

function jsonRequest(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  };
}

function authenticatedJsonRequest(
  method: string,
  body: unknown,
  credentials: PushDeviceCredentials
): RequestInit {
  return {
    ...jsonRequest(method, body),
    headers: {
      "Content-Type": "application/json",
      Authorization: authorization(credentials)
    }
  };
}

function authenticatedRequest(
  method: string,
  credentials: PushDeviceCredentials
): RequestInit {
  return { method, headers: { Authorization: authorization(credentials) } };
}

function retryable(response: Response): boolean {
  return response.status === 429 || response.status >= 500;
}
