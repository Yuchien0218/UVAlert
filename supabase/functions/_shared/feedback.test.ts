import { describe, expect, it } from "vitest";
import {
  canonicalFeedback,
  FeedbackValidationError,
  parseFeedbackReceipt,
  parseFeedbackRequest
} from "./feedback";

const valid = {
  schemaVersion: "feedback-v1",
  feedbackType: "bug",
  message: "提醒頁的按鈕沒有反應",
  contactEmail: null,
  appVersion: "web-dev",
  route: "/reminder",
  userAgentSummary: "Chrome"
};

describe("feedback request boundary", () => {
  it("只接受公開回報欄位，拒絕 session／座標等私人欄位", () => {
    expect(parseFeedbackRequest(valid)).toEqual(valid);
    expect(() =>
      parseFeedbackRequest({ ...valid, session: { id: "private" } })
    ).toThrow(FeedbackValidationError);
    expect(() =>
      parseFeedbackRequest({ ...valid, contactEmail: "bad" })
    ).toThrow(FeedbackValidationError);
    expect(() => parseFeedbackRequest({ ...valid, message: "" })).toThrow(
      FeedbackValidationError
    );
  });

  it("accepts privacy_request as a feedback type", () => {
    expect(
      parseFeedbackRequest({
        ...valid,
        feedbackType: "privacy_request",
        message: "請協助處理我的隱私資料請求"
      }).feedbackType
    ).toBe("privacy_request");
  });

  it("receipt 只保留可公開顯示的識別碼與時間", () => {
    const receipt = parseFeedbackReceipt({
      schemaVersion: "feedback-v1",
      receiptId: "receipt-1",
      createdAt: "2026-08-17T09:00:00+00:00"
    });
    expect(receipt.createdAt).toBe("2026-08-17T09:00:00.000Z");
    expect(canonicalFeedback(parseFeedbackRequest(valid))).not.toContain(
      "session"
    );
  });
});
