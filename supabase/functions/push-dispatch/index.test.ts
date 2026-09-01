import { describe, expect, it, vi } from "vitest";
import {
  createPushDispatcher,
  type ClaimedPushSchedule,
  type PushDispatcherDependencies
} from "./handler";

const now = new Date("2026-08-30T10:00:00.000Z");
const vapidPublicKey =
  "BEzcoREZz-TEzpfUVGWjLXNaa7iOnm0ACiOK7Siq1bzfNLT8LbVF7Ot1EQ4eoh1pqK9-Ih0XAKWmIk5OLqQVZVQ";
const vapidPrivateKey = "wqsR-4h_C_dNtQ-uDHWIaNL1roYcY-2XKXdARxOwnjE";
const claimed: ClaimedPushSchedule = {
  deviceId: "10000000-0000-4000-8000-000000000001",
  endpoint: "https://fcm.googleapis.com/fcm/send/subscription-abc",
  p256dh: "public-key-material",
  auth: "auth-key-material",
  dueAt: "2026-08-30T09:59:30.000Z",
  attemptCount: 0,
  claimToken: "20000000-0000-4000-8000-000000000001"
};

function makeDependencies(
  overrides: Partial<PushDispatcherDependencies> = {}
): PushDispatcherDependencies {
  return {
    readSecret: vi.fn(
      (name) =>
        ({
          PUSH_DISPATCH_SECRET: "dispatch-secret",
          VAPID_SUBJECT: "mailto:ops@example.test",
          VAPID_PUBLIC_KEY: vapidPublicKey,
          VAPID_PRIVATE_KEY: vapidPrivateKey
        })[name]
    ),
    compareSecret: vi.fn(async (left, right) => left === right),
    now: vi.fn(() => now),
    claimDue: vi.fn(async () => [claimed]),
    renewClaim: vi.fn(async () => true),
    send: vi.fn(async () => ({ kind: "sent" })),
    settle: vi.fn(async () => true),
    expireSubscription: vi.fn(async () => true),
    reportError: vi.fn(),
    ...overrides
  };
}

function request(secret = "dispatch-secret") {
  return new Request("https://api.test/push-dispatch", {
    method: "POST",
    headers: { "X-Dispatch-Secret": secret }
  });
}

describe("push dispatcher", () => {
  it("rejects invalid dispatcher credentials before claiming", async () => {
    const dependencies = makeDependencies();
    const response = await createPushDispatcher(dependencies)(request("wrong"));

    expect(response.status).toBe(401);
    expect(dependencies.claimDue).not.toHaveBeenCalled();
  });

  it("returns a controlled 500 when any server secret is missing", async () => {
    const dependencies = makeDependencies({
      readSecret: vi.fn((name) =>
        name === "VAPID_PRIVATE_KEY" ? undefined : "configured"
      )
    });
    const response = await createPushDispatcher(dependencies)(
      request("configured")
    );

    expect(response.status).toBe(500);
    expect(dependencies.claimDue).not.toHaveBeenCalled();
  });

  it("claims at most 100 rows with a two-minute lease and reports an empty batch", async () => {
    const dependencies = makeDependencies({ claimDue: vi.fn(async () => []) });
    const response = await createPushDispatcher(dependencies)(request());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      claimed: 0,
      sent: 0,
      retried: 0,
      failed: 0,
      expired: 0,
      gone: 0
    });
    expect(dependencies.claimDue).toHaveBeenCalledWith({
      limit: 100,
      now: now.toISOString(),
      lease: "2 minutes"
    });
  });

  it("settles a successful send using the claim token", async () => {
    const dependencies = makeDependencies();
    const response = await createPushDispatcher(dependencies)(request());

    expect(response.status).toBe(200);
    expect(dependencies.settle).toHaveBeenCalledWith({
      deviceId: claimed.deviceId,
      claimToken: claimed.claimToken,
      endpoint: claimed.endpoint,
      p256dh: claimed.p256dh,
      auth: claimed.auth,
      outcome: "sent",
      now: now.toISOString(),
      errorCode: null,
      retryAt: null
    });
  });

  it.each([404, 410] as const)(
    "expires a subscription after push status %s",
    async (status) => {
      const dependencies = makeDependencies({
        send: vi.fn(async () => ({ kind: "gone", status }))
      });
      await createPushDispatcher(dependencies)(request());

      expect(dependencies.expireSubscription).toHaveBeenCalledWith({
        deviceId: claimed.deviceId,
        claimToken: claimed.claimToken,
        endpoint: claimed.endpoint,
        p256dh: claimed.p256dh,
        auth: claimed.auth,
        now: now.toISOString()
      });
    }
  );

  it("retries the first transient failure after one minute", async () => {
    const dependencies = makeDependencies({
      send: vi.fn(async () => ({
        kind: "retry",
        status: 503,
        retryAfterSeconds: null
      }))
    });
    await createPushDispatcher(dependencies)(request());

    expect(dependencies.settle).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "retry",
        errorCode: "PUSH_503",
        retryAt: "2026-08-30T10:01:00.000Z"
      })
    );
  });

  it("retries the second transient failure after three minutes", async () => {
    const dependencies = makeDependencies({
      claimDue: vi.fn(async () => [{ ...claimed, attemptCount: 1 }]),
      send: vi.fn(async () => ({
        kind: "retry",
        status: 502,
        retryAfterSeconds: null
      }))
    });
    await createPushDispatcher(dependencies)(request());

    expect(dependencies.settle).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "retry",
        errorCode: "PUSH_502",
        retryAt: "2026-08-30T10:03:00.000Z"
      })
    );
  });

  it("uses the later valid Retry-After but never beyond due time plus ten minutes", async () => {
    const dependencies = makeDependencies({
      send: vi.fn(async () => ({
        kind: "retry",
        status: 429,
        retryAfterSeconds: 300
      }))
    });
    await createPushDispatcher(dependencies)(request());

    expect(dependencies.settle).toHaveBeenCalledWith(
      expect.objectContaining({ retryAt: "2026-08-30T10:05:00.000Z" })
    );
  });

  it("ignores a Retry-After beyond cutoff when fixed backoff still fits", async () => {
    const dependencies = makeDependencies({
      send: vi.fn(async () => ({
        kind: "retry",
        status: 429,
        retryAfterSeconds: 3_600
      }))
    });
    await createPushDispatcher(dependencies)(request());

    expect(dependencies.settle).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "retry",
        retryAt: "2026-08-30T10:01:00.000Z"
      })
    );
  });

  it("does not send when claim ownership cannot be renewed", async () => {
    const dependencies = makeDependencies({
      renewClaim: vi.fn(async () => false)
    });
    await createPushDispatcher(dependencies)(request());

    expect(dependencies.send).not.toHaveBeenCalled();
    expect(dependencies.settle).not.toHaveBeenCalled();
  });

  it("does not send a malicious endpoint retained in an older database row", async () => {
    const dependencies = makeDependencies({
      claimDue: vi.fn(async () => [
        { ...claimed, endpoint: "https://attacker.example.test/push" }
      ])
    });

    await createPushDispatcher(dependencies)(request());

    expect(dependencies.send).not.toHaveBeenCalled();
    expect(dependencies.renewClaim).not.toHaveBeenCalled();
    expect(dependencies.settle).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "failed",
        errorCode: "PUSH_ENDPOINT_INVALID",
        retryAt: null
      })
    );
  });

  it("rejects invalid VAPID configuration before claiming", async () => {
    const dependencies = makeDependencies({
      readSecret: vi.fn((name) =>
        name === "VAPID_SUBJECT" ? "invalid-subject" : "configured"
      )
    });
    const response = await createPushDispatcher(dependencies)(
      request("configured")
    );

    expect(response.status).toBe(500);
    expect(dependencies.claimDue).not.toHaveBeenCalled();
  });

  it("marks the third failed attempt terminal instead of retrying", async () => {
    const dependencies = makeDependencies({
      claimDue: vi.fn(async () => [{ ...claimed, attemptCount: 2 }]),
      send: vi.fn(async () => ({
        kind: "retry",
        status: 503,
        retryAfterSeconds: null
      }))
    });
    await createPushDispatcher(dependencies)(request());

    expect(dependencies.settle).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "failed", retryAt: null })
    );
  });

  it("expires a claimed row that is already ten minutes old without sending", async () => {
    const dependencies = makeDependencies({
      claimDue: vi.fn(async () => [
        { ...claimed, dueAt: "2026-08-30T09:49:59.000Z" }
      ])
    });
    await createPushDispatcher(dependencies)(request());

    expect(dependencies.send).not.toHaveBeenCalled();
    expect(dependencies.settle).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: "expired", retryAt: null })
    );
  });

  it("rechecks cutoff with the current wave time before sending", async () => {
    const nowSequence = [
      new Date("2026-08-30T10:00:00.000Z"),
      new Date("2026-08-30T10:10:00.000Z")
    ];
    const dependencies = makeDependencies({
      now: vi.fn(() => nowSequence.shift() ?? now)
    });
    await createPushDispatcher(dependencies)(request());

    expect(dependencies.send).not.toHaveBeenCalled();
    expect(dependencies.settle).toHaveBeenCalledWith(
      expect.objectContaining({
        outcome: "expired",
        now: "2026-08-30T10:10:00.000Z"
      })
    );
  });

  it("isolates one row failure and continues with the next row", async () => {
    const second = {
      ...claimed,
      deviceId: "10000000-0000-4000-8000-000000000002",
      claimToken: "20000000-0000-4000-8000-000000000002"
    };
    const send = vi
      .fn()
      .mockRejectedValueOnce(new Error(`sensitive ${claimed.endpoint}`))
      .mockResolvedValueOnce({ kind: "sent" });
    const reportError = vi.fn();
    const dependencies = makeDependencies({
      claimDue: vi.fn(async () => [claimed, second]),
      send,
      reportError
    });
    const response = await createPushDispatcher(dependencies)(request());

    expect(response.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(2);
    expect(dependencies.settle).toHaveBeenCalledWith(
      expect.objectContaining({ deviceId: second.deviceId, outcome: "sent" })
    );
    expect(JSON.stringify(reportError.mock.calls)).not.toContain(
      claimed.endpoint
    );
  });
});
