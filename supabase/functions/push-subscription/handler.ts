import { errorResponse, jsonResponse, toResponse } from "../_shared/http.ts";
import {
  DeviceAuthError,
  parseDeviceAuthorization,
  type DeviceCredentials
} from "../_shared/push-auth.ts";
import {
  parsePushSubscriptionRequest,
  PushContractError,
  type PushSubscriptionInput
} from "../_shared/push-contracts.ts";

type SubscriptionAuthRow = {
  deviceSecretHash: string;
  status: "active" | "revoked" | "expired";
};

type RateLimitInput = {
  scope: "register" | "device";
  keyHash: string;
  limit: number;
  window: "1 hour";
  now: string;
};

export type PushSubscriptionDependencies = {
  readSecret(name: "DEVICE_CREDENTIAL_PEPPER"): string | undefined;
  now(): Date;
  createCredentials(): DeviceCredentials;
  hashSecret(secret: string, pepper: string): Promise<string>;
  verifySecret(
    secret: string,
    storedHash: string,
    pepper: string
  ): Promise<boolean>;
  hashRateLimitKey(value: string, pepper: string): Promise<string>;
  readClientAddress(request: Request): string;
  consumeRateLimit(input: RateLimitInput): Promise<boolean>;
  createSubscription(input: {
    deviceId: string;
    deviceSecretHash: string;
    subscription: PushSubscriptionInput;
    now: string;
  }): Promise<void>;
  readSubscriptionAuth(deviceId: string): Promise<SubscriptionAuthRow | null>;
  updateSubscription(input: {
    deviceId: string;
    subscription: PushSubscriptionInput;
    now: string;
  }): Promise<boolean>;
  deleteSubscription(deviceId: string): Promise<boolean>;
  reportError(code: string): void;
  allowLocalHttp: boolean;
};

const dummySecretHash = "0".repeat(64);
type DeviceAuthenticationResult =
  | { state: "authenticated"; credentials: DeviceCredentials }
  | { state: "invalid" }
  | { state: "unavailable" };

export function createPushSubscriptionHandler(
  dependencies: PushSubscriptionDependencies
): (request: Request) => Promise<Response> {
  return async (request) => {
    if (request.method === "OPTIONS")
      return new Response(null, { status: 204 });
    if (!["POST", "PUT", "DELETE"].includes(request.method)) {
      return failure(405, "METHOD_NOT_ALLOWED", "不支援此操作");
    }

    const pepper = dependencies.readSecret("DEVICE_CREDENTIAL_PEPPER");
    if (pepper === undefined || pepper.trim() === "") {
      return failure(500, "SERVER_ERROR", "推播服務尚未完成設定");
    }
    const now = dependencies.now().toISOString();

    if (request.method === "POST") {
      let subscription: PushSubscriptionInput;
      try {
        subscription = await parsePushSubscriptionRequest(request, {
          allowLocalHttp: dependencies.allowLocalHttp
        });
      } catch (error) {
        return contractFailure(error);
      }

      try {
        const keyHash = await dependencies.hashRateLimitKey(
          dependencies.readClientAddress(request),
          pepper
        );
        if (
          !(await dependencies.consumeRateLimit({
            scope: "register",
            keyHash,
            limit: 10,
            window: "1 hour",
            now
          }))
        ) {
          return failure(429, "RATE_LIMITED", "操作次數較多，請稍後再試");
        }
        const credentials = dependencies.createCredentials();
        const deviceSecretHash = await dependencies.hashSecret(
          credentials.deviceSecret,
          pepper
        );
        await dependencies.createSubscription({
          deviceId: credentials.deviceId,
          deviceSecretHash,
          subscription,
          now
        });
        return jsonResponse(credentials, 201);
      } catch {
        dependencies.reportError("PUSH_SUBSCRIPTION_CREATE_FAILED");
        return failure(500, "SERVER_ERROR", "目前無法啟用背景推播");
      }
    }

    const authentication = await authenticateDevice(
      request,
      dependencies,
      pepper
    );
    if (authentication.state === "unavailable") {
      return failure(500, "SERVER_ERROR", "目前無法驗證裝置憑證");
    }
    if (authentication.state === "invalid") return authFailure();
    const { credentials: authenticated } = authentication;
    const limitResult = await consumeDeviceLimit(
      authenticated.deviceId,
      now,
      dependencies
    );
    if (limitResult === "unavailable") {
      return failure(500, "SERVER_ERROR", "目前無法驗證操作次數");
    }
    if (limitResult === "limited") {
      return failure(429, "RATE_LIMITED", "操作次數較多，請稍後再試");
    }

    if (request.method === "DELETE") {
      try {
        if (!(await dependencies.deleteSubscription(authenticated.deviceId))) {
          return authFailure();
        }
        return new Response(null, { status: 204 });
      } catch {
        dependencies.reportError("PUSH_SUBSCRIPTION_DELETE_FAILED");
        return failure(500, "SERVER_ERROR", "目前無法停用背景推播");
      }
    }

    let subscription: PushSubscriptionInput;
    try {
      subscription = await parsePushSubscriptionRequest(request, {
        allowLocalHttp: dependencies.allowLocalHttp
      });
    } catch (error) {
      return contractFailure(error);
    }
    try {
      if (
        !(await dependencies.updateSubscription({
          deviceId: authenticated.deviceId,
          subscription,
          now
        }))
      ) {
        return authFailure();
      }
      return jsonResponse({ state: "updated" });
    } catch {
      dependencies.reportError("PUSH_SUBSCRIPTION_UPDATE_FAILED");
      return failure(500, "SERVER_ERROR", "目前無法更新背景推播");
    }
  };
}

async function authenticateDevice(
  request: Request,
  dependencies: PushSubscriptionDependencies,
  pepper: string
): Promise<DeviceAuthenticationResult> {
  let credentials: DeviceCredentials;
  try {
    credentials = parseDeviceAuthorization(
      request.headers.get("Authorization")
    );
  } catch (error) {
    if (error instanceof DeviceAuthError) return { state: "invalid" };
    return { state: "invalid" };
  }
  try {
    const row = await dependencies.readSubscriptionAuth(credentials.deviceId);
    const matches = await dependencies.verifySecret(
      credentials.deviceSecret,
      row?.deviceSecretHash ?? dummySecretHash,
      pepper
    );
    return row?.status === "active" && matches
      ? { state: "authenticated", credentials }
      : { state: "invalid" };
  } catch {
    dependencies.reportError("PUSH_SUBSCRIPTION_AUTH_FAILED");
    return { state: "unavailable" };
  }
}

async function consumeDeviceLimit(
  deviceId: string,
  now: string,
  dependencies: PushSubscriptionDependencies
): Promise<"allowed" | "limited" | "unavailable"> {
  try {
    const allowed = await dependencies.consumeRateLimit({
      scope: "device",
      keyHash: deviceId,
      limit: 60,
      window: "1 hour",
      now
    });
    return allowed ? "allowed" : "limited";
  } catch {
    dependencies.reportError("PUSH_SUBSCRIPTION_RATE_LIMIT_FAILED");
    return "unavailable";
  }
}

function contractFailure(error: unknown): Response {
  return failure(
    422,
    "VALIDATION_ERROR",
    error instanceof PushContractError
      ? "訂閱資料格式不正確"
      : "JSON 格式不正確"
  );
}

function authFailure(): Response {
  return failure(401, "DEVICE_AUTH_INVALID", "裝置憑證無效");
}

function failure(status: number, code: string, message: string): Response {
  return toResponse(errorResponse({ status, code, message }));
}
