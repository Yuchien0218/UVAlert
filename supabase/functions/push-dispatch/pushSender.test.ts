import { describe, expect, it, vi } from "vitest";
import { createPushSender } from "./pushSender";

const subscription = {
  endpoint: "https://fcm.googleapis.com/fcm/send/subscription-abc",
  keys: { p256dh: "public-key-material", auth: "auth-key-material" }
};
const vapidPublicKey =
  "BEzcoREZz-TEzpfUVGWjLXNaa7iOnm0ACiOK7Siq1bzfNLT8LbVF7Ot1EQ4eoh1pqK9-Ih0XAKWmIk5OLqQVZVQ";
const vapidPrivateKey = "wqsR-4h_C_dNtQ-uDHWIaNL1roYcY-2XKXdARxOwnjE";
const vapid = {
  subject: "mailto:ops@example.test",
  publicKey: vapidPublicKey,
  privateKey: vapidPrivateKey
};

describe("Web Push sender", () => {
  it("sends only the stored subscription with the fixed reminder payload and options", async () => {
    const sendNotification = vi.fn(async () => ({ statusCode: 201 }));
    const result = await createPushSender({ sendNotification })(
      subscription,
      vapid
    );

    expect(result).toEqual({ kind: "sent" });
    expect(sendNotification).toHaveBeenCalledWith(
      subscription,
      JSON.stringify({ type: "reminder-due" }),
      {
        TTL: 600,
        urgency: "high",
        topic: "uvalert-reminder-due",
        timeout: 8_000,
        vapidDetails: vapid
      }
    );
  });

  it("rejects an untrusted stored endpoint before it can be sent", async () => {
    const sendNotification = vi.fn(async () => ({ statusCode: 201 }));

    await expect(
      createPushSender({ sendNotification })(
        { ...subscription, endpoint: "https://attacker.example.test/push" },
        vapid
      )
    ).resolves.toEqual({ kind: "permanent-failure", status: 400 });
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it.each([
    [404, { kind: "gone", status: 404 }],
    [410, { kind: "gone", status: 410 }],
    [400, { kind: "permanent-failure", status: 400 }]
  ] as const)(
    "maps push status %s without exposing provider errors",
    async (statusCode, expected) => {
      const sendNotification = vi.fn(async () => {
        throw Object.assign(
          new Error(`provider exposed ${subscription.endpoint}`),
          {
            statusCode
          }
        );
      });

      await expect(
        createPushSender({ sendNotification })(subscription, vapid)
      ).resolves.toEqual(expected);
    }
  );

  it.each([429, 500, 502, 503, 504] as const)(
    "maps transient status %s and its numeric Retry-After",
    async (statusCode) => {
      const sendNotification = vi.fn(async () => {
        throw { statusCode, headers: { "retry-after": "75" } };
      });

      await expect(
        createPushSender({ sendNotification })(subscription, vapid)
      ).resolves.toEqual({
        kind: "retry",
        status: statusCode,
        retryAfterSeconds: 75
      });
    }
  );

  it("maps an HTTP-date Retry-After to seconds from sender time", async () => {
    const sendNotification = vi.fn(async () => {
      throw {
        statusCode: 503,
        headers: { "retry-after": "Sun, 30 Aug 2026 10:02:00 GMT" }
      };
    });

    await expect(
      createPushSender({
        sendNotification,
        now: () => new Date("2026-08-30T10:00:00.000Z")
      })(subscription, vapid)
    ).resolves.toEqual({
      kind: "retry",
      status: 503,
      retryAfterSeconds: 120
    });
  });

  it("treats unknown transport failures as a retry without leaking details", async () => {
    const sendNotification = vi.fn(async () => {
      throw new Error(`network failed for ${subscription.keys.auth}`);
    });

    await expect(
      createPushSender({ sendNotification })(subscription, vapid)
    ).resolves.toEqual({
      kind: "retry",
      status: 503,
      retryAfterSeconds: null
    });
  });

  it.each([
    "invalid-subject",
    "https://localhost",
    "https://localhost/contact"
  ])("rejects unsafe VAPID subject %s before sending", async (subject) => {
    const sendNotification = vi.fn(async () => ({ statusCode: 201 }));

    await expect(
      createPushSender({ sendNotification })(subscription, {
        ...vapid,
        subject
      })
    ).rejects.toThrow("VAPID_SUBJECT_INVALID");
    expect(sendNotification).not.toHaveBeenCalled();
  });

  it("rejects length-correct but cryptographically invalid VAPID keys", async () => {
    const sendNotification = vi.fn(async () => ({ statusCode: 201 }));

    await expect(
      createPushSender({ sendNotification })(subscription, {
        ...vapid,
        publicKey: "A".repeat(87),
        privateKey: "A".repeat(43)
      })
    ).rejects.toThrow("VAPID_KEY_INVALID");
    expect(sendNotification).not.toHaveBeenCalled();
  });
});
