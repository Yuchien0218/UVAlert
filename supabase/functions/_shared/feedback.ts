export const FEEDBACK_SCHEMA_VERSION = "feedback-v1" as const;
export const FEEDBACK_TYPES = [
  "bug",
  "feature_request",
  "content_correction"
] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type FeedbackRequest = {
  schemaVersion: typeof FEEDBACK_SCHEMA_VERSION;
  feedbackType: FeedbackType;
  message: string;
  contactEmail: string | null;
  appVersion: string;
  route: string;
  userAgentSummary: string | null;
};

export type FeedbackReceipt = {
  schemaVersion: typeof FEEDBACK_SCHEMA_VERSION;
  receiptId: string;
  createdAt: string;
};

export class FeedbackValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FeedbackValidationError";
  }
}

export function parseFeedbackRequest(input: unknown): FeedbackRequest {
  if (!isObject(input)) throw new FeedbackValidationError("回報資料格式不正確");
  const allowed = new Set([
    "schemaVersion",
    "feedbackType",
    "message",
    "contactEmail",
    "appVersion",
    "route",
    "userAgentSummary"
  ]);
  if (Object.keys(input).some((key) => !allowed.has(key))) {
    throw new FeedbackValidationError("回報資料包含不支援的欄位");
  }
  if (input.schemaVersion !== FEEDBACK_SCHEMA_VERSION) {
    throw new FeedbackValidationError("回報版本不正確");
  }
  if (!isFeedbackType(input.feedbackType)) {
    throw new FeedbackValidationError("回報類型不正確");
  }
  const message = requiredText(input.message, 4000, "回報內容");
  const appVersion = requiredText(input.appVersion, 64, "App 版本");
  const route = requiredText(input.route, 256, "目前頁面");
  const contactEmail = optionalText(input.contactEmail, 320, "聯絡信箱");
  if (
    contactEmail !== null &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)
  ) {
    throw new FeedbackValidationError("聯絡信箱格式不正確");
  }
  const userAgentSummary = optionalText(
    input.userAgentSummary,
    256,
    "瀏覽器摘要"
  );
  return {
    schemaVersion: FEEDBACK_SCHEMA_VERSION,
    feedbackType: input.feedbackType,
    message,
    contactEmail,
    appVersion,
    route,
    userAgentSummary
  };
}

export function parseFeedbackReceipt(input: unknown): FeedbackReceipt {
  if (!isObject(input) || input.schemaVersion !== FEEDBACK_SCHEMA_VERSION) {
    throw new FeedbackValidationError("回報服務回應格式不正確");
  }
  const receiptId = requiredText(input.receiptId, 200, "receiptId");
  const createdAt = normalizeInstant(input.createdAt, "createdAt");
  return { schemaVersion: FEEDBACK_SCHEMA_VERSION, receiptId, createdAt };
}

export function canonicalFeedback(input: FeedbackRequest): string {
  return JSON.stringify([
    input.feedbackType,
    input.message,
    input.contactEmail,
    input.appVersion,
    input.route,
    input.userAgentSummary
  ]);
}

function requiredText(value: unknown, max: number, field: string): string {
  if (typeof value !== "string")
    throw new FeedbackValidationError(`${field} 必須是文字`);
  const text = value.trim();
  if (text.length < 1 || text.length > max) {
    throw new FeedbackValidationError(`${field} 長度不正確`);
  }
  return text;
}

function optionalText(
  value: unknown,
  max: number,
  field: string
): string | null {
  if (value === null || value === undefined || value === "") return null;
  return requiredText(value, max, field);
}

function normalizeInstant(value: unknown, field: string): string {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new FeedbackValidationError(`${field} 時間不正確`);
  }
  return new Date(value).toISOString();
}

function isFeedbackType(value: unknown): value is FeedbackType {
  return (
    typeof value === "string" &&
    (FEEDBACK_TYPES as readonly string[]).includes(value)
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
