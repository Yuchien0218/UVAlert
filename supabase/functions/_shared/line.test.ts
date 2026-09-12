import { describe, expect, it, vi } from "vitest";
import {
  formatFeedbackLineMessage,
  notifyFeedbackLine,
  sendLinePushNotification
} from "./line";

describe("formatFeedbackLineMessage", () => {
  it("正確將回饋資訊轉換為繁體中文推播訊息", () => {
    const message = formatFeedbackLineMessage({
      feedbackType: "bug",
      message: "點擊按鈕沒有反應",
      contactEmail: "user@example.com",
      appVersion: "web-v1",
      route: "/settings/account",
      createdAt: "2026-09-12T12:00:00.000Z"
    });

    expect(message).toContain("【UVAlert 收到新的意見回饋】");
    expect(message).toContain("類型：功能無法正常使用");
    expect(message).toContain("聯絡信箱：user@example.com");
    expect(message).toContain("版本路徑：web-v1 (/settings/account)");
    expect(message).toContain("點擊按鈕沒有反應");
  });

  it("若未填寫信箱則顯示未提供", () => {
    const message = formatFeedbackLineMessage({
      feedbackType: "feature_request",
      message: "希望增加深色模式",
      contactEmail: null
    });

    expect(message).toContain("類型：我有功能建議");
    expect(message).toContain("聯絡信箱：未提供（匿名）");
  });
});

describe("sendLinePushNotification", () => {
  it("若未設定 LINE_USER_ID 則回傳未設定原因", async () => {
    const result = await sendLinePushNotification("測試", {
      readEnv: () => undefined
    });
    expect(result).toEqual({
      sent: false,
      reason: "LINE_USER_ID not configured"
    });
  });

  it("若未設定 Channel 認證資訊則回傳未設定原因", async () => {
    const result = await sendLinePushNotification("測試", {
      readEnv: (key) => (key === "LINE_USER_ID" ? "U12345" : undefined)
    });
    expect(result).toEqual({
      sent: false,
      reason: "LINE channel credentials not configured"
    });
  });

  it("若提供直接 LINE_CHANNEL_ACCESS_TOKEN 則直接呼叫 push API", async () => {
    const mockFetch = vi.fn(async () =>
      new Response(JSON.stringify({}), { status: 200 })
    );

    const result = await sendLinePushNotification("測試內容", {
      readEnv: (key) => {
        if (key === "LINE_USER_ID") return "U12345";
        if (key === "LINE_CHANNEL_ACCESS_TOKEN") return "token-abc";
        return undefined;
      },
      fetch: mockFetch as unknown as typeof fetch
    });

    expect(result).toEqual({ sent: true });
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.line.me/v2/bot/message/push",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer token-abc"
        },
        body: JSON.stringify({
          to: "U12345",
          messages: [{ type: "text", text: "測試內容" }]
        })
      })
    );
  });

  it("若提供 Channel ID 與 Secret 則先換取 Token 再發送推播", async () => {
    const mockFetch = vi
      .fn()
      .mockImplementationOnce(async () =>
        new Response(
          JSON.stringify({ access_token: "dynamic-token", expires_in: 3600 }),
          { status: 200 }
        )
      )
      .mockImplementationOnce(async () =>
        new Response(JSON.stringify({}), { status: 200 })
      );

    const result = await sendLinePushNotification("OAuth 測試", {
      readEnv: (key) => {
        if (key === "LINE_USER_ID") return "U12345";
        if (key === "LINE_CHANNEL_ID") return "client-1";
        if (key === "LINE_CHANNEL_SECRET") return "secret-1";
        return undefined;
      },
      fetch: mockFetch as unknown as typeof fetch
    });

    expect(result).toEqual({ sent: true });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe("notifyFeedbackLine", () => {
  it("即使 fetch 拋出例外錯誤也不拋出異常", async () => {
    const mockFetch = vi.fn(async () => {
      throw new Error("Network timeout");
    });

    await expect(
      notifyFeedbackLine(
        {
          feedbackType: "bug",
          message: "網路測試"
        },
        {
          readEnv: (key) => {
            if (key === "LINE_USER_ID") return "U12345";
            if (key === "LINE_CHANNEL_ACCESS_TOKEN") return "token-1";
            return undefined;
          },
          fetch: mockFetch as unknown as typeof fetch
        }
      )
    ).resolves.toBeUndefined();
  });
});
