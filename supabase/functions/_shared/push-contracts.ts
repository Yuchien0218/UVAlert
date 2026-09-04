export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export type PushScheduleRequest = {
  dueAt: string;
  operationId: string;
  intentRevision: number;
};

export type PushScheduleCancelRequest = {
  operationId: string;
  intentRevision: number;
};

export type PushContractErrorReason =
  | "BODY_TOO_LARGE"
  | "CONTENT_TYPE_INVALID"
  | "INVALID_JSON"
  | "SCHEDULE_INVALID"
  | "SUBSCRIPTION_INVALID";

export class PushContractError extends Error {
  readonly reason: PushContractErrorReason;

  constructor(reason: PushContractErrorReason) {
    super(reason);
    this.name = "PushContractError";
    this.reason = reason;
  }
}

const maxBodyBytes = 16 * 1024;
const base64UrlPattern = /^[A-Za-z0-9_-]+$/;

export async function parsePushSubscriptionRequest(
  request: Request,
  options: { allowLocalHttp: boolean }
): Promise<PushSubscriptionInput> {
  return validatePushSubscription(await readJsonBody(request), options);
}

export async function parsePushScheduleRequest(
  request: Request,
  now: Date
): Promise<PushScheduleRequest> {
  const value = await readJsonBody(request);
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, ["dueAt", "operationId", "intentRevision"]) ||
    typeof value.dueAt !== "string" ||
    !hasTimezone(value.dueAt) ||
    !isUuid(value.operationId) ||
    !isPositiveSafeInteger(value.intentRevision)
  ) {
    throw new PushContractError("SCHEDULE_INVALID");
  }
  const dueTime = Date.parse(value.dueAt);
  if (!Number.isFinite(dueTime)) {
    throw new PushContractError("SCHEDULE_INVALID");
  }
  const earliest = now.getTime() - 10 * 60 * 1000;
  const latest = now.getTime() + 24 * 60 * 60 * 1000;
  if (dueTime < earliest || dueTime > latest) {
    throw new PushContractError("SCHEDULE_INVALID");
  }
  return {
    dueAt: new Date(dueTime).toISOString(),
    operationId: value.operationId.toLowerCase(),
    intentRevision: value.intentRevision
  };
}

export async function parsePushScheduleCancelRequest(
  request: Request
): Promise<PushScheduleCancelRequest> {
  const value = await readJsonBody(request);
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, ["operationId", "intentRevision"]) ||
    !isUuid(value.operationId) ||
    !isPositiveSafeInteger(value.intentRevision)
  ) {
    throw new PushContractError("SCHEDULE_INVALID");
  }
  return {
    operationId: value.operationId.toLowerCase(),
    intentRevision: value.intentRevision
  };
}

async function readJsonBody(request: Request): Promise<unknown> {
  if (!isJsonContentType(request.headers.get("Content-Type"))) {
    throw new PushContractError("CONTENT_TYPE_INVALID");
  }
  const contentLength = Number(request.headers.get("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > maxBodyBytes) {
    throw new PushContractError("BODY_TOO_LARGE");
  }

  const text = await request.text();
  if (new TextEncoder().encode(text).length > maxBodyBytes) {
    throw new PushContractError("BODY_TOO_LARGE");
  }

  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new PushContractError("INVALID_JSON");
  }
  return value;
}

function validatePushSubscription(
  value: unknown,
  options: { allowLocalHttp: boolean }
): PushSubscriptionInput {
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, ["endpoint", "expirationTime", "keys"])
  ) {
    throw new PushContractError("SUBSCRIPTION_INVALID");
  }
  if (
    typeof value.endpoint !== "string" ||
    value.endpoint.length < 1 ||
    value.endpoint.length > 4096 ||
    (value.expirationTime !== null &&
      (typeof value.expirationTime !== "number" ||
        !Number.isFinite(value.expirationTime) ||
        !Number.isSafeInteger(value.expirationTime) ||
        value.expirationTime < 0)) ||
    !isPlainObject(value.keys) ||
    !hasExactKeys(value.keys, ["p256dh", "auth"]) ||
    !isValidKey(value.keys.p256dh, 40, 512) ||
    !isValidKey(value.keys.auth, 8, 256)
  ) {
    throw new PushContractError("SUBSCRIPTION_INVALID");
  }

  let endpoint: URL;
  try {
    endpoint = new URL(value.endpoint);
  } catch {
    throw new PushContractError("SUBSCRIPTION_INVALID");
  }
  const localHttp =
    options.allowLocalHttp &&
    endpoint.protocol === "http:" &&
    ["localhost", "127.0.0.1"].includes(endpoint.hostname);
  if (
    endpoint.username !== "" ||
    endpoint.password !== "" ||
    (!localHttp && !isTrustedPushServiceEndpoint(endpoint))
  ) {
    throw new PushContractError("SUBSCRIPTION_INVALID");
  }

  return {
    endpoint: endpoint.toString(),
    expirationTime: value.expirationTime,
    keys: { p256dh: value.keys.p256dh, auth: value.keys.auth }
  };
}

/**
 * Accept only the documented Web Push service endpoints supported by UVAlert.
 * This is a trust boundary, not a DNS or IP-address policy: requests are only
 * ever sent to a fixed HTTPS origin and provider-specific endpoint path.
 */
export function isTrustedPushServiceEndpoint(endpoint: URL): boolean {
  if (
    endpoint.protocol !== "https:" ||
    endpoint.port !== "" ||
    endpoint.username !== "" ||
    endpoint.password !== "" ||
    endpoint.search !== "" ||
    endpoint.hash !== ""
  ) {
    return false;
  }

  if (
    endpoint.hostname === "fcm.googleapis.com" &&
    hasRequiredPathSegment(endpoint.pathname, "/fcm/send/")
  ) {
    return true;
  }
  if (
    endpoint.hostname === "updates.push.services.mozilla.com" &&
    (hasRequiredPathSegment(endpoint.pathname, "/wpush/v1/") ||
      hasRequiredPathSegment(endpoint.pathname, "/wpush/v2/"))
  ) {
    return true;
  }
  return (
    endpoint.hostname.endsWith(".push.apple.com") &&
    endpoint.hostname.length > ".push.apple.com".length &&
    hasRequiredPathSegment(endpoint.pathname, "/")
  );
}

export function isTrustedPushServiceEndpointString(value: string): boolean {
  try {
    return isTrustedPushServiceEndpoint(new URL(value));
  } catch {
    return false;
  }
}

function hasRequiredPathSegment(pathname: string, prefix: string): boolean {
  const remaining = pathname.slice(prefix.length);
  return pathname.startsWith(prefix) && remaining.length > 0;
}

function isJsonContentType(value: string | null): boolean {
  return value?.split(";", 1)[0]?.trim().toLowerCase() === "application/json";
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  expected: readonly string[]
): boolean {
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    [...expected].sort().every((key, index) => actual[index] === key)
  );
}

function isValidKey(
  value: unknown,
  minimumLength: number,
  maximumLength: number
): value is string {
  return (
    typeof value === "string" &&
    value.length >= minimumLength &&
    value.length <= maximumLength &&
    base64UrlPattern.test(value)
  );
}

function isPositiveSafeInteger(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value > 0
  );
}

function hasTimezone(value: string): boolean {
  return /(?:Z|[+-]\d{2}:\d{2})$/u.test(value);
}

function isUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
      value
    )
  );
}
