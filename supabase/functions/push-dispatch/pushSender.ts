import { isTrustedPushServiceEndpointString } from "../_shared/push-contracts.ts";

export type PushSubscriptionRecord = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type VapidDetails = {
  subject: string;
  publicKey: string;
  privateKey: string;
};

export type PushSendResult =
  | { kind: "sent" }
  | { kind: "gone"; status: 404 | 410 }
  | {
      kind: "retry";
      status: 429 | 500 | 502 | 503 | 504;
      retryAfterSeconds: number | null;
    }
  | { kind: "permanent-failure"; status: number };

type WebPushOptions = {
  TTL: 600;
  urgency: "high";
  topic: "uvalert-reminder-due";
  timeout: 8_000;
  vapidDetails: VapidDetails;
};

export type PushSenderDependencies = {
  sendNotification(
    subscription: PushSubscriptionRecord,
    payload: string,
    options: WebPushOptions
  ): Promise<unknown>;
  now?(): Date;
};

const transientStatuses = new Set([429, 500, 502, 503, 504]);

export function createPushSender(dependencies: PushSenderDependencies) {
  return async (
    subscription: PushSubscriptionRecord,
    vapid: VapidDetails
  ): Promise<PushSendResult> => {
    if (!isTrustedPushServiceEndpointString(subscription.endpoint)) {
      return { kind: "permanent-failure", status: 400 };
    }
    await validateVapidDetails(vapid);
    try {
      await dependencies.sendNotification(
        subscription,
        JSON.stringify({ type: "reminder-due" }),
        {
          TTL: 600,
          urgency: "high",
          topic: "uvalert-reminder-due",
          timeout: 8_000,
          vapidDetails: vapid
        }
      );
      return { kind: "sent" };
    } catch (error) {
      const status = readStatus(error);
      if (status === 404 || status === 410) return { kind: "gone", status };
      if (status !== null && transientStatuses.has(status)) {
        return {
          kind: "retry",
          status: status as 429 | 500 | 502 | 503 | 504,
          retryAfterSeconds: readRetryAfterSeconds(
            error,
            dependencies.now?.() ?? new Date()
          )
        };
      }
      if (status !== null) return { kind: "permanent-failure", status };
      return { kind: "retry", status: 503, retryAfterSeconds: null };
    }
  };
}

export async function validateVapidDetails(vapid: VapidDetails): Promise<void> {
  const isMailto = vapid.subject.startsWith("mailto:");
  let validHttps = false;
  try {
    const url = new URL(vapid.subject);
    validHttps = url.protocol === "https:" && url.hostname !== "localhost";
  } catch {
    validHttps = false;
  }
  if (!isMailto && !validHttps) {
    throw new Error("VAPID_SUBJECT_INVALID");
  }
  const publicKey = decodeBase64Url(vapid.publicKey);
  const privateKey = decodeBase64Url(vapid.privateKey);
  if (
    publicKey.length !== 65 ||
    publicKey[0] !== 4 ||
    privateKey.length !== 32 ||
    !isValidPrivateScalar(privateKey)
  ) {
    throw new Error("VAPID_KEY_INVALID");
  }
  try {
    await crypto.subtle.importKey(
      "raw",
      publicKey,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["verify"]
    );
  } catch {
    throw new Error("VAPID_KEY_INVALID");
  }
}

const p256Order = decodeHex(
  "ffffffff00000000ffffffffffffffffbce6faada7179e84f3b9cac2fc632551"
);

function isValidPrivateScalar(value: Uint8Array): boolean {
  let nonzero = false;
  for (const byte of value) nonzero ||= byte !== 0;
  if (!nonzero) return false;
  for (let index = 0; index < value.length; index += 1) {
    const byte = value[index] ?? 0;
    const limit = p256Order[index] ?? 0;
    if (byte < limit) return true;
    if (byte > limit) return false;
  }
  return false;
}

function decodeBase64Url(value: string): Uint8Array {
  if (!/^[A-Za-z0-9_-]+$/u.test(value)) return new Uint8Array();
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const binary = atob(
      normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
    );
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return new Uint8Array();
  }
}

function decodeHex(value: string): Uint8Array {
  return Uint8Array.from({ length: value.length / 2 }, (_, index) =>
    Number.parseInt(value.slice(index * 2, index * 2 + 2), 16)
  );
}

function readStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const value = (error as { statusCode?: unknown }).statusCode;
  return typeof value === "number" && Number.isInteger(value) ? value : null;
}

function readRetryAfterSeconds(error: unknown, now: Date): number | null {
  if (typeof error !== "object" || error === null) return null;
  const headers = (error as { headers?: unknown }).headers;
  if (typeof headers !== "object" || headers === null) return null;
  const value = (headers as Record<string, unknown>)["retry-after"];
  if (typeof value !== "string") return null;
  if (/^\d+$/u.test(value)) {
    const seconds = Number(value);
    return Number.isSafeInteger(seconds) && seconds >= 0 ? seconds : null;
  }
  const retryAt = Date.parse(value);
  if (!Number.isFinite(retryAt)) return null;
  const seconds = Math.ceil((retryAt - now.getTime()) / 1000);
  return seconds >= 0 ? seconds : null;
}
