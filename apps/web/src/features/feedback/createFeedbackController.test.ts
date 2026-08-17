import { describe, expect, it, vi } from "vitest";
import type { FeedbackPort } from "@sunshield/platform";
import { createFeedbackController } from "./createFeedbackController";

function makePort(): FeedbackPort {
  return {
    submit: vi.fn(async () => ({
      schemaVersion: "feedback-v1" as const,
      receiptId: "receipt-1",
      createdAt: "2026-08-17T09:00:00.000Z"
    }))
  };
}

describe("createFeedbackController", () => {
  it("自動加入 route／版本／短 user agent，成功後只保存 receipt", async () => {
    const feedback = makePort();
    const controller = createFeedbackController({
      feedback,
      getRoute: () => "/more",
      appVersion: "1.0.0",
      getUserAgentSummary: () => "Chrome"
    });
    await expect(controller.submit({ feedbackType: "bug", message: "有問題" })).resolves.toBe(true);
    expect(feedback.submit).toHaveBeenCalledWith(expect.objectContaining({
      route: "/more",
      appVersion: "1.0.0",
      userAgentSummary: "Chrome"
    }));
    expect(controller.state.value).toMatchObject({ status: "submitted", receipt: { receiptId: "receipt-1" } });
  });

  it("送出中禁止重複提交，限流錯誤轉成 error state", async () => {
    let release: (() => void) | undefined;
    const feedback: FeedbackPort = {
      submit: vi.fn(async () => {
        await new Promise<void>((done) => { release = done; });
        return {
          schemaVersion: "feedback-v1" as const,
          receiptId: "receipt-2",
          createdAt: "2026-08-17T09:00:00.000Z"
        };
      })
    };
    const controller = createFeedbackController({ feedback });
    const first = controller.submit({ feedbackType: "bug", message: "第一次" });
    await expect(controller.submit({ feedbackType: "bug", message: "第二次" })).resolves.toBe(false);
    expect(feedback.submit).toHaveBeenCalledTimes(1);
    release?.();
    await expect(first).resolves.toBe(true);

    const failed: FeedbackPort = {
      submit: vi.fn(async () => { throw { status: 429, code: "RATE_LIMITED", message: "請稍後再試" }; })
    };
    const failedController = createFeedbackController({ feedback: failed });
    await expect(failedController.submit({ feedbackType: "bug", message: "太頻繁" })).resolves.toBe(false);
    expect(failedController.state.value.error).toMatchObject({ code: "RATE_LIMITED" });
  });
});
