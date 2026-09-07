import { errorResponse, jsonResponse, toResponse } from "../_shared/http.ts";
import { renderPrivacyDigestEmail, type PrivacyDigestItem } from "./email.ts";

type PrivacyDigestSecretName =
  "PRIVACY_DIGEST_SECRET" | "RESEND_API_KEY" | "PRIVACY_DIGEST_RECIPIENT";

export type ClaimedPrivacyDigest = {
  batchId: string;
  claimToken: string;
  digestDate: string;
  items: PrivacyDigestItem[];
};

export type PrivacyDigestDependencies = {
  readSecret(name: PrivacyDigestSecretName): string | undefined;
  compareSecret(left: string, right: string): Promise<boolean>;
  claim(now: string): Promise<ClaimedPrivacyDigest | null>;
  settle(input: {
    batchId: string;
    claimToken: string;
    outcome: "sent" | "retry";
    now: string;
    providerMessageId: string | null;
    errorCode: string | null;
  }): Promise<boolean>;
  sendEmail(input: {
    apiKey: string;
    recipient: string;
    email: ReturnType<typeof renderPrivacyDigestEmail>;
    idempotencyKey: string;
  }): Promise<{ messageId: string }>;
  now(): Date;
  reportError(code: string): void;
};

type PrivacyDigestRpcClient = {
  rpc(
    name: "claim_privacy_digest" | "settle_privacy_digest",
    parameters: Record<string, unknown>
  ): Promise<{ data: unknown; error: unknown }>;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;
const datePattern = /^\d{4}-\d{2}-\d{2}$/u;
const timestampPattern =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u;

const requiredSecrets = [
  "PRIVACY_DIGEST_SECRET",
  "RESEND_API_KEY",
  "PRIVACY_DIGEST_RECIPIENT"
] as const;

export function createPrivacyDigestHandler(
  dependencies: PrivacyDigestDependencies
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") {
      return failure(405, "METHOD_NOT_ALLOWED", "不支援此操作");
    }

    const secrets = Object.fromEntries(
      requiredSecrets.map((name) => [name, dependencies.readSecret(name)])
    ) as Record<PrivacyDigestSecretName, string | undefined>;
    const expectedSecret = secrets.PRIVACY_DIGEST_SECRET ?? "0".repeat(64);
    const presentedSecret =
      request.headers.get("X-Privacy-Digest-Secret") ?? "";

    if (!(await dependencies.compareSecret(presentedSecret, expectedSecret))) {
      return failure(
        401,
        "PRIVACY_DIGEST_AUTH_INVALID",
        "Privacy digest 憑證無效"
      );
    }

    if (requiredSecrets.some((name) => !secrets[name]?.trim())) {
      dependencies.reportError("PRIVACY_DIGEST_CONFIG_MISSING");
      return failure(500, "SERVER_ERROR", "隱私資料請求摘要服務設定不完整");
    }

    let claim: ClaimedPrivacyDigest | null;
    try {
      claim = await dependencies.claim(dependencies.now().toISOString());
    } catch {
      dependencies.reportError("PRIVACY_DIGEST_CLAIM_FAILED");
      return failure(500, "SERVER_ERROR", "目前無法取得隱私資料請求摘要");
    }
    if (claim === null) {
      return jsonResponse({ status: "no-op", claimed: 0, sent: 0 });
    }

    const email = renderPrivacyDigestEmail({
      digestDate: claim.digestDate,
      items: claim.items
    });
    let providerMessageId: string;
    try {
      const result = await dependencies.sendEmail({
        apiKey: secrets.RESEND_API_KEY as string,
        recipient: secrets.PRIVACY_DIGEST_RECIPIENT as string,
        email,
        idempotencyKey: `privacy-digest:${claim.batchId}`
      });
      providerMessageId = result.messageId;
    } catch {
      dependencies.reportError("PRIVACY_DIGEST_SEND_FAILED");
      try {
        const settled = await dependencies.settle({
          batchId: claim.batchId,
          claimToken: claim.claimToken,
          outcome: "retry",
          now: dependencies.now().toISOString(),
          providerMessageId: null,
          errorCode: "RESEND_SEND_FAILED"
        });
        if (!settled) {
          dependencies.reportError("PRIVACY_DIGEST_SETTLE_FAILED");
        }
      } catch {
        dependencies.reportError("PRIVACY_DIGEST_SETTLE_FAILED");
      }
      return failure(
        502,
        "PRIVACY_DIGEST_SEND_FAILED",
        "目前無法寄送隱私資料請求摘要"
      );
    }

    try {
      const settled = await dependencies.settle({
        batchId: claim.batchId,
        claimToken: claim.claimToken,
        outcome: "sent",
        now: dependencies.now().toISOString(),
        providerMessageId,
        errorCode: null
      });
      if (!settled) {
        dependencies.reportError("PRIVACY_DIGEST_SETTLE_FAILED");
        return failure(500, "SERVER_ERROR", "目前無法完成隱私資料請求摘要");
      }
    } catch {
      dependencies.reportError("PRIVACY_DIGEST_SETTLE_FAILED");
      return failure(500, "SERVER_ERROR", "目前無法完成隱私資料請求摘要");
    }

    return jsonResponse({
      status: "sent",
      claimed: claim.items.length,
      sent: claim.items.length
    });
  };
}

export function mapPrivacyDigestClaimRows(
  value: unknown
): ClaimedPrivacyDigest | null {
  if (!Array.isArray(value)) throw invalidClaimResult();
  if (value.length === 0) return null;

  const first = mapClaimRow(value[0]);
  const items: PrivacyDigestItem[] = [];
  for (const valueRow of value) {
    const row = mapClaimRow(valueRow);
    if (
      row.batchId !== first.batchId ||
      row.claimToken !== first.claimToken ||
      row.digestDate !== first.digestDate
    ) {
      throw invalidClaimResult();
    }
    items.push(row.item);
  }

  return {
    batchId: first.batchId,
    claimToken: first.claimToken,
    digestDate: first.digestDate,
    items
  };
}

export function createPrivacyDigestRpcDependencies(
  client: PrivacyDigestRpcClient
): Pick<PrivacyDigestDependencies, "claim" | "settle"> {
  return {
    async claim(now) {
      const { data, error } = await client.rpc("claim_privacy_digest", {
        p_now: now
      });
      if (error !== null) {
        throw new Error("PRIVACY_DIGEST_CLAIM_FAILED");
      }
      return mapPrivacyDigestClaimRows(data);
    },
    async settle(input) {
      const { data, error } = await client.rpc("settle_privacy_digest", {
        p_batch_id: input.batchId,
        p_claim_token: input.claimToken,
        p_outcome: input.outcome,
        p_now: input.now,
        p_provider_message_id: input.providerMessageId,
        p_error_code: input.errorCode
      });
      if (error !== null || typeof data !== "boolean") {
        throw new Error("PRIVACY_DIGEST_SETTLEMENT_FAILED");
      }
      return data;
    }
  };
}

function mapClaimRow(value: unknown): {
  batchId: string;
  claimToken: string;
  digestDate: string;
  item: PrivacyDigestItem;
} {
  if (typeof value !== "object" || value === null) {
    throw invalidClaimResult();
  }
  const row = value as Record<string, unknown>;
  if (
    !isUuid(row.batch_id) ||
    !isUuid(row.claim_token) ||
    !isCalendarDate(row.digest_date) ||
    !isUuid(row.feedback_id) ||
    typeof row.message !== "string" ||
    (row.contact_email !== null && typeof row.contact_email !== "string") ||
    !isTimestamp(row.created_at)
  ) {
    throw invalidClaimResult();
  }

  return {
    batchId: row.batch_id,
    claimToken: row.claim_token,
    digestDate: row.digest_date,
    item: {
      feedbackId: row.feedback_id,
      message: row.message,
      contactEmail: row.contact_email,
      createdAt: row.created_at
    }
  };
}

function isNonblankString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isUuid(value: unknown): value is string {
  return isNonblankString(value) && uuidPattern.test(value);
}

function isCalendarDate(value: unknown): value is string {
  if (!isNonblankString(value) || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

function isTimestamp(value: unknown): value is string {
  if (!isNonblankString(value) || !timestampPattern.test(value)) return false;
  return isCalendarDate(value.slice(0, 10)) && !Number.isNaN(Date.parse(value));
}

function invalidClaimResult(): Error {
  return new Error("PRIVACY_DIGEST_CLAIM_RESULT_INVALID");
}

function failure(status: number, code: string, message: string): Response {
  return toResponse(errorResponse({ status, code, message }));
}
