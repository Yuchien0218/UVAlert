import { errorResponse, jsonResponse, toResponse } from "../_shared/http.ts";
import {
  parsePushScheduleCancelRequest,
  parsePushScheduleRequest,
  PushContractError
} from "../_shared/push-contracts.ts";

export type StoredScheduleState = {
  state: "scheduled" | "cancelled";
  dueAt: string | null;
  operationId: string;
  intentRevision: number;
};

type AuthenticationResult =
  | { state: "authenticated"; deviceId: string }
  | { state: "invalid" }
  | { state: "unavailable" };

type RateLimitResult = "allowed" | "limited" | "unavailable";

export type PushScheduleDependencies = {
  now(): Date;
  authenticateDevice(
    authorization: string | null
  ): Promise<AuthenticationResult>;
  consumeRateLimit(input: {
    deviceId: string;
    limit: 60;
    window: "1 hour";
    now: string;
  }): Promise<RateLimitResult>;
  readSchedule(deviceId: string): Promise<StoredScheduleState | null>;
  upsertSchedule(input: {
    deviceId: string;
    dueAt: string;
    operationId: string;
    intentRevision: number | null;
    now: string;
  }): Promise<StoredScheduleState>;
  cancelSchedule(input: {
    deviceId: string;
    operationId: string;
    intentRevision: number | null;
    now: string;
  }): Promise<StoredScheduleState>;
  reportError(code: string): void;
};

export function createPushScheduleHandler(
  dependencies: PushScheduleDependencies
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204 });
    if (!["PUT", "DELETE"].includes(request.method)) {
      return failure(405, "METHOD_NOT_ALLOWED", "不支援此操作");
    }

    const authentication = await dependencies.authenticateDevice(
      request.headers.get("Authorization")
    );
    if (authentication.state === "invalid") return authFailure();
    if (authentication.state === "unavailable") {
      return failure(500, "SERVER_ERROR", "目前無法驗證裝置憑證");
    }

    const now = dependencies.now();
    const nowIso = now.toISOString();
    let limit: RateLimitResult;
    try {
      limit = await dependencies.consumeRateLimit({
        deviceId: authentication.deviceId,
        limit: 60,
        window: "1 hour",
        now: nowIso
      });
    } catch {
      dependencies.reportError("PUSH_SCHEDULE_RATE_LIMIT_FAILED");
      limit = "unavailable";
    }
    if (limit === "limited") {
      return failure(429, "RATE_LIMITED", "操作次數較多，請稍後再試");
    }
    if (limit === "unavailable") {
      return failure(500, "SERVER_ERROR", "目前無法驗證操作次數");
    }

    let parsed:
      | {
          action: "schedule";
          dueAt: string;
          operationId: string;
          intentRevision: number | null;
        }
      | {
          action: "cancel";
          operationId: string;
          intentRevision: number | null;
        };
    try {
      parsed =
        request.method === "PUT"
          ? {
              action: "schedule",
              ...(await parsePushScheduleRequest(request, now))
            }
          : {
              action: "cancel",
              ...(await parsePushScheduleCancelRequest(request))
            };
    } catch (error) {
      return contractFailure(error);
    }

    try {
      const stored = await dependencies.readSchedule(authentication.deviceId);
      if (stored?.operationId === parsed.operationId) {
        const requestedState =
          parsed.action === "schedule" ? "scheduled" : "cancelled";
        if (
          stored.state !== requestedState ||
          (parsed.intentRevision !== null &&
            stored.intentRevision !== parsed.intentRevision)
        ) {
          return failure(409, "OPERATION_CONFLICT", "操作代碼已用於其他要求");
        }
        return scheduleResponse(stored);
      }

      const result =
        parsed.action === "schedule"
          ? await dependencies.upsertSchedule({
              deviceId: authentication.deviceId,
              dueAt: parsed.dueAt,
              operationId: parsed.operationId,
              intentRevision: parsed.intentRevision,
              now: nowIso
            })
          : await dependencies.cancelSchedule({
              deviceId: authentication.deviceId,
              operationId: parsed.operationId,
              intentRevision: parsed.intentRevision,
              now: nowIso
            });
      return scheduleResponse(result);
    } catch {
      dependencies.reportError("PUSH_SCHEDULE_WRITE_FAILED");
      return failure(500, "SERVER_ERROR", "目前無法更新背景提醒");
    }
  };
}

function scheduleResponse(state: StoredScheduleState): Response {
  return state.state === "scheduled"
    ? jsonResponse({ state: "scheduled", dueAt: state.dueAt })
    : jsonResponse({ state: "cancelled" });
}

function contractFailure(error: unknown): Response {
  return failure(
    422,
    "VALIDATION_ERROR",
    error instanceof PushContractError
      ? "排程資料格式不正確"
      : "JSON 格式不正確"
  );
}

function authFailure(): Response {
  return failure(401, "DEVICE_AUTH_INVALID", "裝置憑證無效");
}

function failure(status: number, code: string, message: string): Response {
  return toResponse(errorResponse({ status, code, message }));
}
