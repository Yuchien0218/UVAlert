import { describe, expect, it } from "vitest";
import { FeedbackRequestV1Schema } from "./feedback";

const validFeedback = {
  schemaVersion: "feedback-v1" as const,
  feedbackType: "bug" as const,
  message: "按鈕按下後沒有反應",
  contactEmail: null,
  appVersion: "0.1.0",
  route: "/",
  userAgentSummary: "Chrome on Android"
};

describe("feedback contracts", () => {
  it("accepts a normal feedback request", () => {
    expect(FeedbackRequestV1Schema.parse(validFeedback)).toEqual(validFeedback);
  });

  it("rejects missing messages and malformed contact emails", () => {
    expect(() =>
      FeedbackRequestV1Schema.parse({ ...validFeedback, message: "" })
    ).toThrow();
    expect(() =>
      FeedbackRequestV1Schema.parse({
        ...validFeedback,
        contactEmail: "not-an-email"
      })
    ).toThrow();
  });

  it("rejects an oversized user agent summary", () => {
    expect(() =>
      FeedbackRequestV1Schema.parse({
        ...validFeedback,
        userAgentSummary: "x".repeat(257)
      })
    ).toThrow();
  });
});
