import { describe, expect, it, vi } from "vitest";
import {
  createPushSubscriptionHandler,
  type PushSubscriptionDependencies
} from "./handler";

const deviceId = "10000000-0000-4000-8000-000000000001";
const deviceSecret = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
const secretHash =
  "cc06735f40144811abf8ec62fe7d63a7426aaba80da5dff6a4c5583d4c23af7d";
const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/subscription-abc",
  expirationTime: null,
  keys: {
    p256dh: "BEl62iUYgUivxIkv69yViEuiBIa40HI0FCXjV2qfL-FiLJ7x",
    auth: "BTBZMqHH6r4Tts7J_aSIgg"
  }
};

function makeDependencies(
  overrides: Partial<PushSubscriptionDependencies> = {}
): PushSubscriptionDependencies {
  return {
    readSecret: vi.fn(() => "fixed-test-pepper"),
    now: vi.fn(() => new Date("2026-08-30T10:00:00.000Z")),
    createCredentials: vi.fn(() => ({ deviceId, deviceSecret })),
    hashSecret: vi.fn(async () => secretHash),
    verifySecret: vi.fn(async () => true),
    hashRateLimitKey: vi.fn(async (value) => `hash:${value}`),
    readClientAddress: vi.fn(() => "203.0.113.10"),
    consumeRateLimit: vi.fn(async () => true),
    createSubscription: vi.fn(async () => undefined),
    readSubscriptionAuth: vi.fn(async () => ({
      deviceSecretHash: secretHash,
      status: "active"
    })),
    updateSubscription: vi.fn(async () => true),
    deleteSubscription: vi.fn(async () => true),
    reportError: vi.fn(),
    allowLocalHttp: false,
    ...overrides
  };
}

function request(
  method: string,
  options: { body?: unknown; authorization?: string } = {}
) {
  const headers = new Headers();
  if (options.body !== undefined)
    headers.set("Content-Type", "application/json");
  if (options.authorization !== undefined) {
    headers.set("Authorization", options.authorization);
  }
  return new Request("https://api.test/push-subscription", {
    method,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
}

const authorization = `Device ${deviceId}.${deviceSecret}`;

describe("anonymous push subscription handler", () => {
  it("returns 204 for OPTIONS without reading secrets or the database", async () => {
    const dependencies = makeDependencies();
    const response = await createPushSubscriptionHandler(dependencies)(
      request("OPTIONS")
    );

    expect(response.status).toBe(204);
    expect(dependencies.readSecret).not.toHaveBeenCalled();
    expect(dependencies.createSubscription).not.toHaveBeenCalled();
  });

  it("POST creates a rate-limited device and returns raw credentials once", async () => {
    const dependencies = makeDependencies();
    const response = await createPushSubscriptionHandler(dependencies)(
      request("POST", { body: subscription })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ deviceId, deviceSecret });
    expect(dependencies.consumeRateLimit).toHaveBeenCalledWith({
      scope: "register",
      keyHash: "hash:203.0.113.10",
      limit: 10,
      window: "1 hour",
      now: "2026-08-30T10:00:00.000Z"
    });
    expect(dependencies.createSubscription).toHaveBeenCalledWith({
      deviceId,
      deviceSecretHash: secretHash,
      subscription,
      now: "2026-08-30T10:00:00.000Z"
    });
  });

  it("POST rejects an untrusted HTTPS endpoint before creating a device", async () => {
    const dependencies = makeDependencies();
    const response = await createPushSubscriptionHandler(dependencies)(
      request("POST", {
        body: {
          ...subscription,
          endpoint: "https://attacker.example.test/subscription/abc"
        }
      })
    );

    expect(response.status).toBe(422);
    expect(dependencies.consumeRateLimit).not.toHaveBeenCalled();
    expect(dependencies.createSubscription).not.toHaveBeenCalled();
  });

  it("PUT authenticates and rotates endpoint and keys without credentials", async () => {
    const dependencies = makeDependencies();
    const response = await createPushSubscriptionHandler(dependencies)(
      request("PUT", { body: subscription, authorization })
    );
    const responseForRedaction = response.clone();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ state: "updated" });
    expect(dependencies.consumeRateLimit).toHaveBeenCalledWith(
      expect.objectContaining({
        scope: "device",
        keyHash: deviceId,
        limit: 60,
        window: "1 hour"
      })
    );
    expect(dependencies.updateSubscription).toHaveBeenCalledWith({
      deviceId,
      subscription,
      now: "2026-08-30T10:00:00.000Z"
    });
    expect(await responseForRedaction.text()).not.toContain(deviceSecret);
  });

  it("DELETE authenticates and removes the subscription", async () => {
    const dependencies = makeDependencies();
    const response = await createPushSubscriptionHandler(dependencies)(
      request("DELETE", { authorization })
    );

    expect(response.status).toBe(204);
    expect(dependencies.deleteSubscription).toHaveBeenCalledWith(deviceId);
  });

  it("rejects unsupported methods and malformed JSON", async () => {
    const handler = createPushSubscriptionHandler(makeDependencies());
    expect((await handler(request("PATCH"))).status).toBe(405);

    const invalidJson = new Request("https://api.test/push-subscription", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{"
    });
    const response = await handler(invalidJson);
    expect(response.status).toBe(422);
  });

  it.each([
    [undefined, null],
    [authorization, null],
    [authorization, { deviceSecretHash: secretHash, status: "revoked" }],
    [authorization, { deviceSecretHash: secretHash, status: "active" }]
  ])(
    "returns the same 401 for every invalid credential state",
    async (header, row) => {
      const dependencies = makeDependencies({
        readSubscriptionAuth: vi.fn(async () => row),
        verifySecret: vi.fn(async () => row !== null && row.status !== "active")
      });
      const response = await createPushSubscriptionHandler(dependencies)(
        request("DELETE", { authorization: header })
      );

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        error: { code: "DEVICE_AUTH_INVALID", message: "裝置憑證無效" }
      });
      expect(dependencies.deleteSubscription).not.toHaveBeenCalled();
    }
  );

  it("returns controlled configuration, rate limit and database errors", async () => {
    const missingPepper = await createPushSubscriptionHandler(
      makeDependencies({ readSecret: vi.fn(() => undefined) })
    )(request("POST", { body: subscription }));
    expect(missingPepper.status).toBe(500);

    const limited = await createPushSubscriptionHandler(
      makeDependencies({ consumeRateLimit: vi.fn(async () => false) })
    )(request("POST", { body: subscription }));
    expect(limited.status).toBe(429);

    const failed = await createPushSubscriptionHandler(
      makeDependencies({
        createSubscription: vi.fn(async () => {
          throw new Error(`database failed for ${subscription.endpoint}`);
        })
      })
    )(request("POST", { body: subscription }));
    expect(failed.status).toBe(500);
  });

  it("returns 500 when authenticated device rate limiting is unavailable", async () => {
    const reportError = vi.fn();
    const response = await createPushSubscriptionHandler(
      makeDependencies({
        consumeRateLimit: vi.fn(async () => {
          throw new Error("rate limit database unavailable");
        }),
        reportError
      })
    )(request("DELETE", { authorization }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "SERVER_ERROR", message: "目前無法驗證操作次數" }
    });
    expect(reportError).toHaveBeenCalledWith(
      "PUSH_SUBSCRIPTION_RATE_LIMIT_FAILED"
    );
  });

  it("returns a controlled 500 when device authentication storage is unavailable", async () => {
    const reportError = vi.fn();
    const response = await createPushSubscriptionHandler(
      makeDependencies({
        readSubscriptionAuth: vi.fn(async () => {
          throw new Error(`database exposed ${authorization}`);
        }),
        reportError
      })
    )(request("DELETE", { authorization }));

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: { code: "SERVER_ERROR", message: "目前無法驗證裝置憑證" }
    });
    expect(reportError).toHaveBeenCalledWith("PUSH_SUBSCRIPTION_AUTH_FAILED");
    expect(JSON.stringify(reportError.mock.calls)).not.toContain(authorization);
  });

  it("never reports endpoint, keys, credentials or authorization values", async () => {
    const reportError = vi.fn();
    const dependencies = makeDependencies({
      reportError,
      updateSubscription: vi.fn(async () => {
        throw new Error(`sensitive ${subscription.endpoint} ${deviceSecret}`);
      })
    });
    const response = await createPushSubscriptionHandler(dependencies)(
      request("PUT", { body: subscription, authorization })
    );
    const text = await response.text();
    const reports = JSON.stringify(reportError.mock.calls);

    expect(response.status).toBe(500);
    for (const sensitive of [
      subscription.endpoint,
      subscription.keys.p256dh,
      subscription.keys.auth,
      deviceSecret,
      authorization
    ]) {
      expect(text).not.toContain(sensitive);
      expect(reports).not.toContain(sensitive);
    }
  });
});
