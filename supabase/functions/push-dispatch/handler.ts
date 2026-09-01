import { errorResponse, jsonResponse, toResponse } from "../_shared/http.ts";
import { isTrustedPushServiceEndpointString } from "../_shared/push-contracts.ts";
import { validateVapidDetails } from "./pushSender.ts";
import type {
  PushSendResult,
  PushSubscriptionRecord,
  VapidDetails
} from "./pushSender.ts";

export type ClaimedPushSchedule = {
  deviceId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  dueAt: string;
  attemptCount: number;
  claimToken: string;
};

type SettlementOutcome = "sent" | "retry" | "expired" | "failed";

export type PushDispatcherDependencies = {
  readSecret(name: string): string | undefined;
  compareSecret(left: string, right: string): Promise<boolean>;
  now(): Date;
  claimDue(input: {
    limit: 100;
    now: string;
    lease: "2 minutes";
  }): Promise<ClaimedPushSchedule[]>;
  renewClaim(input: {
    deviceId: string;
    claimToken: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    now: string;
  }): Promise<boolean>;
  send(
    subscription: PushSubscriptionRecord,
    vapid: VapidDetails
  ): Promise<PushSendResult>;
  settle(input: {
    deviceId: string;
    claimToken: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    outcome: SettlementOutcome;
    now: string;
    errorCode: string | null;
    retryAt: string | null;
  }): Promise<boolean>;
  expireSubscription(input: {
    deviceId: string;
    claimToken: string;
    endpoint: string;
    p256dh: string;
    auth: string;
    now: string;
  }): Promise<boolean>;
  reportError(code: string): void;
};

type DispatchSummary = {
  claimed: number;
  sent: number;
  retried: number;
  failed: number;
  expired: number;
  gone: number;
};

const requiredSecrets = [
  "PUSH_DISPATCH_SECRET",
  "VAPID_SUBJECT",
  "VAPID_PUBLIC_KEY",
  "VAPID_PRIVATE_KEY"
] as const;

export function createPushDispatcher(
  dependencies: PushDispatcherDependencies
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method !== "POST") {
      return failure(405, "METHOD_NOT_ALLOWED", "不支援此操作");
    }

    const secrets = Object.fromEntries(
      requiredSecrets.map((name) => [name, dependencies.readSecret(name)])
    ) as Record<(typeof requiredSecrets)[number], string | undefined>;
    const expectedSecret = secrets.PUSH_DISPATCH_SECRET ?? "0".repeat(64);
    const presentedSecret = request.headers.get("X-Dispatch-Secret") ?? "";
    if (!(await dependencies.compareSecret(presentedSecret, expectedSecret))) {
      return failure(401, "DISPATCH_AUTH_INVALID", "Dispatcher 憑證無效");
    }
    if (requiredSecrets.some((name) => !secrets[name]?.trim())) {
      dependencies.reportError("PUSH_DISPATCH_CONFIG_MISSING");
      return failure(500, "SERVER_ERROR", "背景提醒服務設定不完整");
    }

    const vapid: VapidDetails = {
      subject: secrets.VAPID_SUBJECT as string,
      publicKey: secrets.VAPID_PUBLIC_KEY as string,
      privateKey: secrets.VAPID_PRIVATE_KEY as string
    };
    try {
      await validateVapidDetails(vapid);
    } catch {
      dependencies.reportError("PUSH_DISPATCH_VAPID_INVALID");
      return failure(500, "SERVER_ERROR", "背景提醒服務設定不完整");
    }

    const dispatchNow = dependencies.now();
    const nowIso = dispatchNow.toISOString();
    let rows: ClaimedPushSchedule[];
    try {
      rows = await dependencies.claimDue({
        limit: 100,
        now: nowIso,
        lease: "2 minutes"
      });
    } catch {
      dependencies.reportError("PUSH_DISPATCH_CLAIM_FAILED");
      return failure(500, "SERVER_ERROR", "目前無法取得背景提醒");
    }

    const summary: DispatchSummary = {
      claimed: rows.length,
      sent: 0,
      retried: 0,
      failed: 0,
      expired: 0,
      gone: 0
    };

    for (let index = 0; index < rows.length; index += 10) {
      const batch = rows.slice(index, index + 10);
      await Promise.all(
        batch.map(async (row) => {
          try {
            await dispatchRow(dependencies, row, vapid, summary);
          } catch {
            dependencies.reportError("PUSH_DISPATCH_ROW_FAILED");
          }
        })
      );
    }
    return jsonResponse(summary);
  };
}

async function dispatchRow(
  dependencies: PushDispatcherDependencies,
  row: ClaimedPushSchedule,
  vapid: VapidDetails,
  summary: DispatchSummary
): Promise<void> {
  const now = dependencies.now();
  const cutoff = new Date(row.dueAt).getTime() + 10 * 60_000;
  if (!Number.isFinite(cutoff) || now.getTime() >= cutoff) {
    if (await settle(dependencies, row, "expired", now, "PUSH_EXPIRED", null)) {
      summary.expired += 1;
    }
    return;
  }

  if (!isTrustedPushServiceEndpointString(row.endpoint)) {
    if (
      await settle(
        dependencies,
        row,
        "failed",
        now,
        "PUSH_ENDPOINT_INVALID",
        null
      )
    ) {
      summary.failed += 1;
    }
    return;
  }

  const sendNow = dependencies.now();
  const ownsClaim = await dependencies.renewClaim({
    deviceId: row.deviceId,
    claimToken: row.claimToken,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    now: sendNow.toISOString()
  });
  if (!ownsClaim) return;

  let result: PushSendResult;
  try {
    result = await dependencies.send(
      { endpoint: row.endpoint, keys: { p256dh: row.p256dh, auth: row.auth } },
      vapid
    );
  } catch {
    result = { kind: "retry", status: 503, retryAfterSeconds: null };
    dependencies.reportError("PUSH_SEND_UNCERTAIN");
  }
  const completedAt = dependencies.now();

  if (result.kind === "sent") {
    if (await settle(dependencies, row, "sent", completedAt, null, null)) {
      summary.sent += 1;
    }
    return;
  }
  if (result.kind === "gone") {
    const removed = await dependencies.expireSubscription({
      deviceId: row.deviceId,
      claimToken: row.claimToken,
      endpoint: row.endpoint,
      p256dh: row.p256dh,
      auth: row.auth,
      now: completedAt.toISOString()
    });
    if (removed) summary.gone += 1;
    return;
  }
  if (result.kind === "permanent-failure") {
    if (
      await settle(
        dependencies,
        row,
        "failed",
        completedAt,
        `PUSH_${result.status}`,
        null
      )
    ) {
      summary.failed += 1;
    }
    return;
  }

  if (row.attemptCount >= 2) {
    if (
      await settle(
        dependencies,
        row,
        "failed",
        completedAt,
        `PUSH_${result.status}`,
        null
      )
    ) {
      summary.failed += 1;
    }
    return;
  }

  const delayMinutes = row.attemptCount === 0 ? 1 : 3;
  const baseRetry = completedAt.getTime() + delayMinutes * 60_000;
  const providerRetry =
    result.retryAfterSeconds === null
      ? baseRetry
      : completedAt.getTime() + result.retryAfterSeconds * 1000;
  const candidate = Math.max(
    baseRetry,
    providerRetry <= cutoff ? providerRetry : baseRetry
  );
  if (candidate > cutoff) {
    if (
      await settle(
        dependencies,
        row,
        "expired",
        completedAt,
        "PUSH_RETRY_EXPIRED",
        null
      )
    ) {
      summary.expired += 1;
    }
    return;
  }
  if (
    await settle(
      dependencies,
      row,
      "retry",
      completedAt,
      `PUSH_${result.status}`,
      new Date(candidate).toISOString()
    )
  ) {
    summary.retried += 1;
  }
}

function settle(
  dependencies: PushDispatcherDependencies,
  row: ClaimedPushSchedule,
  outcome: SettlementOutcome,
  now: Date,
  errorCode: string | null,
  retryAt: string | null
) {
  return dependencies.settle({
    deviceId: row.deviceId,
    claimToken: row.claimToken,
    endpoint: row.endpoint,
    p256dh: row.p256dh,
    auth: row.auth,
    outcome,
    now: now.toISOString(),
    errorCode,
    retryAt
  });
}

function failure(status: number, code: string, message: string): Response {
  return toResponse(errorResponse({ status, code, message }));
}
