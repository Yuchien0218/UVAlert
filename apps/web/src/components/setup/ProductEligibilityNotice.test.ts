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
  it("產品過期時以 alert 顯眼呈現警示", () => {
    const wrapper = mount(ProductEligibilityNotice, {
      props: {
        productSnapshot: makeProductSnapshot({ expiryStatus: "expired" })
      }
    });

    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("已超過記錄的有效期限");
  });

  /*
   * 2026-08-30：這條原本測 no_sunscreen_claim 會出現警示，斷言「不會產生
   * 120、40 或 80 分鐘期限」。規則改動後那句話是假的——不確認標示現在會
   * 用 120 分鐘保守預設建立倒數，所以警示本身被移除了。
   *
   * 改成守相反的性質：**這兩種狀態不得再顯示警示**。留著一則警告使用者
   * 「不會有倒數」、實際上倒數照跑的提示，比沒有提示更糟。
   */
  it.each([
    {
      name: "沒有明確防曬標示",
      snapshot: makeProductSnapshot({ sunscreenClaimStatus: "no_claim" })
    },
    {
      name: "身分尚未確認",
      snapshot: makeProductSnapshot({ identityStatus: "identity_unconfirmed" })
    }
  ])("$name 不再顯示警示（現在會建立 120 分鐘保守倒數）", ({ snapshot }) => {
    const wrapper = mount(ProductEligibilityNotice, {
      props: { productSnapshot: snapshot }
    });
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
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
