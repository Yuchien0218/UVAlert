import { describe, expect, it } from "vitest";
import {
  renderPrivacyDigestEmail,
  sendResendEmail,
  type PrivacyDigestItem
} from "./email";

const item = (
  overrides: Partial<PrivacyDigestItem> = {}
): PrivacyDigestItem => ({
  feedbackId: "case-1",
  message: "請刪除資料",
  contactEmail: null,
  createdAt: "2026-09-07T01:00:00.000Z",
  ...overrides
});

const renderedEmail = {
  subject: "UVAlert 隱私資料請求摘要｜2026-09-07",
  text: "privacy request digest",
  html: "<p>privacy request digest</p>"
};

describe("privacy digest email rendering", () => {
  it("renders a request without contact email", () => {
    const email = renderPrivacyDigestEmail({
      digestDate: "2026-09-07",
      items: [item()]
    });

    expect(email.text).toContain("未提供聯絡信箱");
    expect(email.html).toContain("未提供聯絡信箱");
  });

  it("escapes requester text instead of executing it as HTML", () => {
    const email = renderPrivacyDigestEmail({
      digestDate: "2026-09-07",
      items: [item({ message: '<img src=x onerror=alert(1)> & "quoted"' })]
    });

    expect(email.html).toContain("&lt;img");
    expect(email.html).not.toContain("<img");
    expect(email.html).toContain("&amp;");
    expect(email.html).toContain("&quot;quoted&quot;");
  });

  it("escapes every claim field included in HTML", () => {
    const email = renderPrivacyDigestEmail({
      digestDate: "2026-09-07&<",
      items: [
        item({
          feedbackId: "case-<1>",
          contactEmail: "requester&<@example.test",
          createdAt: "2026-09-07T01:00:00Z<"
        })
      ]
    });

    expect(email.html).toContain("case-&lt;1&gt;");
    expect(email.html).toContain("requester&amp;&lt;@example.test");
    expect(email.html).toContain("2026-09-07&amp;&lt;");
  });
});

describe("Resend email boundary", () => {
  it("sends the private test sender with an idempotency key and no tracking options", async () => {
    let request: Request | undefined;
    const fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      request = new Request(input, init);
      return new Response(JSON.stringify({ id: "re_message_123" }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    };

    await expect(
      sendResendEmail(
        fetch,
        "secret-api-key",
        "private@example.test",
        renderedEmail,
        "privacy-digest:batch-1"
      )
    ).resolves.toEqual({ messageId: "re_message_123" });

    expect(request?.url).toBe("https://api.resend.com/emails");
    expect(request?.method).toBe("POST");
    expect(request?.headers.get("Authorization")).toBe("Bearer secret-api-key");
    expect(request?.headers.get("Content-Type")).toBe("application/json");
    expect(request?.headers.get("Idempotency-Key")).toBe(
      "privacy-digest:batch-1"
    );
    const body = JSON.parse(await request!.text()) as Record<string, unknown>;
    expect(body).toEqual({
      from: "UVAlert <onboarding@resend.dev>",
      to: ["private@example.test"],
      subject: renderedEmail.subject,
      text: renderedEmail.text,
      html: renderedEmail.html
    });
    expect(body).not.toHaveProperty("open");
    expect(body).not.toHaveProperty("click");
    expect(body).not.toHaveProperty("tracking");
  });

  it("rejects a non-2xx provider response with a stable private error", async () => {
    const fetch = async () =>
      new Response(
        JSON.stringify({
          message: "provider detail for private@example.test"
        }),
        { status: 500 }
      );

    const loggedError = await sendResendEmail(
      fetch,
      "secret-api-key",
      "private@example.test",
      renderedEmail,
      "privacy-digest:batch-1"
    ).catch((error: unknown) => error);

    expect(loggedError).toBeInstanceOf(Error);
    expect((loggedError as Error).message).toBe("RESEND_SEND_FAILED");
    expect(JSON.stringify(loggedError)).not.toContain("secret-api-key");
    expect(JSON.stringify(loggedError)).not.toContain("private@example.test");
    expect(JSON.stringify(loggedError)).not.toContain(renderedEmail.text);
  });

  it("rejects a successful provider response without a nonblank id", async () => {
    const fetch = async () =>
      new Response(JSON.stringify({ id: "   " }), { status: 200 });

    await expect(
      sendResendEmail(
        fetch,
        "secret-api-key",
        "private@example.test",
        renderedEmail,
        "privacy-digest:batch-1"
      )
    ).rejects.toThrow("RESEND_SEND_FAILED");
  });

  it("rejects a provider response whose id is not a string", async () => {
    const fetch = async () =>
      new Response(JSON.stringify({ id: 123 }), { status: 200 });

    await expect(
      sendResendEmail(
        fetch,
        "secret-api-key",
        "private@example.test",
        renderedEmail,
        "privacy-digest:batch-1"
      )
    ).rejects.toThrow("RESEND_SEND_FAILED");
  });

  it("does not leak transport error details", async () => {
    const fetch = async () => {
      throw new Error(
        "network failed for secret-api-key and private@example.test"
      );
    };

    const error = await sendResendEmail(
      fetch,
      "secret-api-key",
      "private@example.test",
      renderedEmail,
      "privacy-digest:batch-1"
    ).catch((value: unknown) => value);

    expect(error).toEqual(new Error("RESEND_SEND_FAILED"));
  });
});
