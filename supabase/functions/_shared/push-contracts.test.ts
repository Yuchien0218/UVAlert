import { describe, expect, it } from "vitest";
import {
  parsePushScheduleCancelRequest,
  parsePushScheduleRequest,
  parsePushSubscriptionRequest,
  PushContractError
} from "./push-contracts";

const validSubscription = {
  endpoint: "https://push.example.test/subscription/abc",
  expirationTime: null,
  keys: {
    p256dh: "BEl62iUYgUivxIkv69yViEuiBIa40HI0FCXjV2qfL-FiLJ7x",
    auth: "BTBZMqHH6r4Tts7J_aSIgg"
  }
};

function request(body: unknown, options: { contentType?: string } = {}) {
  return new Request("https://api.test/push-subscription", {
    method: "POST",
    headers: {
      "Content-Type": options.contentType ?? "application/json"
    },
    body: typeof body === "string" ? body : JSON.stringify(body)
  });
}

describe("push subscription request contract", () => {
  it("accepts a minimal HTTPS PushSubscription", async () => {
    await expect(
      parsePushSubscriptionRequest(request(validSubscription), {
        allowLocalHttp: false
      })
    ).resolves.toEqual(validSubscription);
  });

  it.each([
    "http://push.example.test/subscription/abc",
    "ftp://push.example.test/subscription/abc",
    "https://user:password@push.example.test/subscription/abc"
  ])("rejects unsafe endpoint %s", async (endpoint) => {
    await expect(
      parsePushSubscriptionRequest(
        request({ ...validSubscription, endpoint }),
        { allowLocalHttp: false }
      )
    ).rejects.toBeInstanceOf(PushContractError);
  });

  it.each(["http://localhost:54321/push", "http://127.0.0.1:54321/push"])(
    "accepts an explicit local HTTP endpoint only in local mode",
    async (endpoint) => {
      await expect(
        parsePushSubscriptionRequest(
          request({ ...validSubscription, endpoint }),
          { allowLocalHttp: true }
        )
      ).resolves.toMatchObject({ endpoint });
      await expect(
        parsePushSubscriptionRequest(
          request({ ...validSubscription, endpoint }),
          { allowLocalHttp: false }
        )
      ).rejects.toBeInstanceOf(PushContractError);
    }
  );

  it.each([
    [
      {
        ...validSubscription,
        keys: { ...validSubscription.keys, p256dh: "short" }
      }
    ],
    [
      {
        ...validSubscription,
        keys: { ...validSubscription.keys, auth: "short" }
      }
    ],
    [{ ...validSubscription, keys: { p256dh: validSubscription.keys.p256dh } }],
    [{ ...validSubscription, unknown: true }],
    [{ ...validSubscription, expirationTime: -1 }],
    [{ ...validSubscription, expirationTime: 1.5 }]
  ])(
    "rejects missing, malformed or unknown subscription fields",
    async (body) => {
      await expect(
        parsePushSubscriptionRequest(request(body), { allowLocalHttp: false })
      ).rejects.toBeInstanceOf(PushContractError);
    }
  );

  it("rejects invalid JSON, wrong content type and bodies over 16 KiB", async () => {
    await expect(
      parsePushSubscriptionRequest(request("{"), { allowLocalHttp: false })
    ).rejects.toMatchObject({ reason: "INVALID_JSON" });
    await expect(
      parsePushSubscriptionRequest(
        request(validSubscription, { contentType: "text/plain" }),
        { allowLocalHttp: false }
      )
    ).rejects.toMatchObject({ reason: "CONTENT_TYPE_INVALID" });
    await expect(
      parsePushSubscriptionRequest(
        request({ ...validSubscription, padding: "x".repeat(17 * 1024) }),
        { allowLocalHttp: false }
      )
    ).rejects.toMatchObject({ reason: "BODY_TOO_LARGE" });
  });
});

describe("push schedule request contract", () => {
  const now = new Date("2026-08-30T10:00:00.000Z");
  const operationId = "20000000-0000-4000-8000-000000000001";

  it("accepts a timezone-aware due time inside the server window", async () => {
    await expect(
      parsePushScheduleRequest(
        request({ dueAt: "2026-08-30T10:30:00+00:00", operationId }),
        now
      )
    ).resolves.toEqual({
      dueAt: "2026-08-30T10:30:00.000Z",
      operationId
    });
  });

  it.each(["2026-08-30T09:50:00.000Z", "2026-08-31T10:00:00.000Z"])(
    "accepts the inclusive server-time boundary %s",
    async (dueAt) => {
      await expect(
        parsePushScheduleRequest(request({ dueAt, operationId }), now)
      ).resolves.toEqual({ dueAt, operationId });
    }
  );

  it.each([
    { dueAt: "2026-08-30T10:30:00", operationId },
    { dueAt: "2026-08-30T09:49:59Z", operationId },
    { dueAt: "2026-08-31T10:00:01Z", operationId },
    { dueAt: "not-a-date", operationId },
    { dueAt: "2026-08-30T10:30:00Z", operationId: "invalid" },
    { dueAt: "2026-08-30T10:30:00Z", operationId, sessionId: "private" }
  ])("rejects invalid schedule fields", async (body) => {
    await expect(
      parsePushScheduleRequest(request(body), now)
    ).rejects.toBeInstanceOf(PushContractError);
  });

  it("accepts only an operation id for cancellation", async () => {
    await expect(
      parsePushScheduleCancelRequest(request({ operationId }))
    ).resolves.toEqual({ operationId });
    await expect(
      parsePushScheduleCancelRequest(
        request({ operationId, dueAt: "2026-08-30T10:30:00Z" })
      )
    ).rejects.toBeInstanceOf(PushContractError);
  });
});
