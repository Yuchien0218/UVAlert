export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export type PushScheduleRequest = {
  dueAt: string;
  operationId: string;
};

export type PushScheduleCancelRequest = {
  operationId: string;
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
    !hasExactKeys(value, ["dueAt", "operationId"]) ||
    typeof value.dueAt !== "string" ||
    !hasTimezone(value.dueAt) ||
    !isUuid(value.operationId)
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
    operationId: value.operationId.toLowerCase()
  };
}

export async function parsePushScheduleCancelRequest(
  request: Request
): Promise<PushScheduleCancelRequest> {
  const value = await readJsonBody(request);
  if (
    !isPlainObject(value) ||
    !hasExactKeys(value, ["operationId"]) ||
    !isUuid(value.operationId)
  ) {
    throw new PushContractError("SCHEDULE_INVALID");
  }
  return { operationId: value.operationId.toLowerCase() };
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
    (endpoint.protocol !== "https:" && !localHttp) ||
    endpoint.username !== "" ||
    endpoint.password !== ""
  ) {
    throw new PushContractError("SUBSCRIPTION_INVALID");
  }

  return {
    endpoint: endpoint.toString(),
    expirationTime: value.expirationTime,
    keys: { p256dh: value.keys.p256dh, auth: value.keys.auth }
  };
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
