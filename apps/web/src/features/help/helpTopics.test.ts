import { describe, expect, it } from "vitest";
import {
  HELP_TOPICS,
  isPublishable,
  listPublishableTopics,
  type HelpTopic
} from "./helpTopics";

/**
 * 發布閘門（PRD §13、§13.4、AC-15、AC-63、S-15「不可發布狀態」）。
 *
 * 這些不是樣式偏好——未核准的衛教內容外流是內容治理事故，
 * 所以閘門的每個否決條件都要有測試守著。
 */

function makeTopic(overrides: Partial<HelpTopic> = {}): HelpTopic {
  return {
    slug: "sample",
    routeName: "help-sample",
    title: "範例主題",
    summary: "範例摘要",
    reviewStatus: "APPROVED",
    reviewedAt: "2026-08-01",
    nextReviewAt: "2027-08-01",
    requiredReview: "醫療",
    ...overrides
  };
}

describe("說明中心發布閘門", () => {
  it("審查狀態、審查日期與再審日期齊備時才可發布", () => {
    expect(isPublishable(makeTopic())).toBe(true);
  });

  it("reviewedAt 為 null 時阻擋發布", () => {
    expect(isPublishable(makeTopic({ reviewedAt: null }))).toBe(false);
  });

  it("nextReviewAt 為 null 時阻擋發布", () => {
    expect(isPublishable(makeTopic({ nextReviewAt: null }))).toBe(false);
  });

  it.each([
    "PRODUCT_DRAFT",
    "CONTENT_REVIEW",
    "MEDICAL_REVIEW",
    "LEGAL_REVIEW",
    "MARINE_REVIEW",
    "MULTI_REVIEW",
    "RETIRED",
    "BLOCKED"
  ] as const)("%s 不得視為可發布", (reviewStatus) => {
    expect(isPublishable(makeTopic({ reviewStatus }))).toBe(false);
  });

  it("目前登記的主題全部未核准，總覽不列出任何項目", () => {
    // FAQ_BEACH_SUN_V1 的 PRD §13.4 metadata 明載 reviewed_at/next_review_at 為 null；
    // 運作說明的 Copy Deck 條目為 MULTI_REVIEW。核准後本測試需同步更新。
    expect(HELP_TOPICS.length).toBeGreaterThan(0);
    expect(listPublishableTopics()).toEqual([]);
  });

  it("每則主題都標明未核准時要說明的必要審查類別", () => {
    for (const topic of HELP_TOPICS) {
      expect(topic.requiredReview.length).toBeGreaterThan(0);
    }
  });
});
