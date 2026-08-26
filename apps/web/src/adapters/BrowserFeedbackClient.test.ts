import { describe, expect, it, vi } from "vitest";
import { BrowserFeedbackClient } from "./BrowserFeedbackClient";

const request = {
  schemaVersion: "feedback-v1" as const,
  feedbackType: "bug" as const,
  message: "按鈕沒有反應",
  contactEmail: null,
  appVersion: "web-dev",
  route: "/more",
  userAgentSummary: "Chrome"
};

describe("BrowserFeedbackClient", () => {
  it("送出不含私人 session 的回報並驗證 receipt", async () => {
    const fetch = vi.fn(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        expect(JSON.parse(String(init?.body))).toEqual(request);
        return new Response(
          JSON.stringify({
            schemaVersion: "feedback-v1",
            receiptId: "receipt-1",
            createdAt: "2026-08-17T09:00:00.000Z"
          }),
          { status: 200 }
        );
      }
    );
    const client = new BrowserFeedbackClient({ fetch });
    await expect(client.submit(request)).resolves.toMatchObject({
      receiptId: "receipt-1"
    });
  });

  it("將 429 轉成可理解的 CloudError", async () => {
    const client = new BrowserFeedbackClient({
      fetch: async () =>
        new Response(
          JSON.stringify({
            error: { code: "RATE_LIMITED", message: "請稍後再試" }
          }),
          { status: 429 }
        )
    });
    await expect(client.submit(request)).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED",
      message: "請稍後再試"
    });
  });
});
