import { describe, expect, it } from "vitest";
import {
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
