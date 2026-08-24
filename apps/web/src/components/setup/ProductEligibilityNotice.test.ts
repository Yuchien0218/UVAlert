// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { makeProductSnapshot } from "@sunshield/test-fixtures";
import { describe, expect, it } from "vitest";
import ProductEligibilityNotice from "./ProductEligibilityNotice.vue";

/**
 * 送出前的產品資格警示。
 *
 * 2026-08-24 從 SetupCompletionSummary.test.ts 移過來——那張摘要已移除，
 * 但這兩條斷言講的不是「摘要有沒有列出資訊」，而是「不會產生倒數／請停止
 * 使用這件事有沒有在送出前講清楚」，跟摘要在不在無關，必須留著。
 */

describe("ProductEligibilityNotice", () => {
  it("產品不具資格時以 alert 顯眼呈現警示", () => {
    const wrapper = mount(ProductEligibilityNotice, {
      props: {
        productSnapshot: makeProductSnapshot({
          sunscreenClaimStatus: "no_claim",
          ruleEligibilityAtApplication: "no_sunscreen_claim",
          reapplicationIntervalStatus: "unknown",
          reapplicationIntervalMinutes: null,
          preExposureWaitStatus: "unknown",
          preExposureWaitMinutes: null,
          waterResistanceStatus: "unknown",
          waterResistanceMinutes: null
        })
      }
    });

    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("沒有明確防曬標示");
    expect(alert.text()).toContain("不會產生 120、40 或 80 分鐘期限");
  });

  it("回報過不適時要求停止使用並提到尋求醫療協助", () => {
    const wrapper = mount(ProductEligibilityNotice, {
      props: {
        // 讓 fixture 自己從 conditionStatus 推導資格，直接覆寫
        // ruleEligibilityAtApplication 會與 snapshot 其他欄位不一致而被 schema 擋下。
        productSnapshot: makeProductSnapshot({
          conditionStatus: "discomfort_reported"
        })
      }
    });

    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("停止使用");
    expect(alert.text()).toContain("醫療協助");
  });

  it("產品合格時不顯示警示，也不佔版位", () => {
    const wrapper = mount(ProductEligibilityNotice, {
      props: { productSnapshot: makeProductSnapshot() }
    });

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.html()).toBe("<!--v-if-->");
  });

  it("沒有產品 snapshot 時不顯示警示", () => {
    const wrapper = mount(ProductEligibilityNotice, {
      props: { productSnapshot: null }
    });

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });
});
