// @vitest-environment happy-dom

import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import {
  fingerprintProductLabelSnapshot,
  PRODUCT_CATALOG_RECORD_VERSION
} from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { makeSessionOnlyProductSnapshot } from "../../features/setup/productSnapshot";
import GearListItem from "./GearListItem.vue";

/**
 * 摘要行的回歸測試。
 *
 * 這段邏輯 2026-08-24 連錯兩次，都是實測才抓到，所以留測試守住：
 * 1. SPF／PA 分支曾是死碼——寫了讀取邏輯，但當時表單沒有輸入欄位、
 *    `makeSessionOnlyProductSnapshot` 一律寫 null，永遠不會觸發。
 * 2. 修好寫入路徑後才發現摘要自己加了 `PA` 前綴，而 `paGrade` 存的
 *    是照包裝抄的完整標示，結果顯示成「PAPA++++」。
 */

const baseSnapshot = makeSessionOnlyProductSnapshot(
  {
    claimAnswer: "yes",
    waitAnswer: "none",
    waitMinutes: null,
    intervalAnswer: "explicit",
    intervalMinutes: 120,
    waterResistance: "unknown"
  },
  "2026-08-24T00:00:00.000Z"
);

function makeProduct(
  overrides: Partial<ProductCatalogRecordV1> = {}
): ProductCatalogRecordV1 {
  return {
    schemaVersion: PRODUCT_CATALOG_RECORD_VERSION,
    productId: "prod-1",
    displayName: "測試防曬乳",
    gearCategory: "sunscreen",
    archivedAt: null,
    status: "active",
    purchaseMonth: null,
    expiryDate: null,
    note: null,
    priceTwd: null,
    usageRating: null,
    currentSnapshot: baseSnapshot,
    snapshotFingerprint: fingerprintProductLabelSnapshot(baseSnapshot),
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    ...overrides
  };
}

describe("GearListItem 收合狀態", () => {
  /*
   * 2026-08-31 使用者裁決：清單收合前只留名稱，以圖示為主。
   *
   * 原本這裡有三條測試守著 SPF／PA／補擦間隔的摘要——那些**規格已經從
   * 清單移到詳情頁**，所以改守「不再顯示」。其中「不重複 PA 前綴」那條
   * 的回歸保護沒有消失：ProductDetailPage.test.ts 仍然斷言不出現 PAPA，
   * 而 PA 的組字現在只發生在那一頁。
   */
  function mountItem(product: ProductCatalogRecordV1) {
    return mount(GearListItem, {
      props: { product },
      global: { stubs: { Icon: true } }
    });
  }

  it("顯示名稱與品類", () => {
    const wrapper = mountItem(makeProduct());

    expect(wrapper.get(".gear-item__name").text()).toBe("測試防曬乳");
    expect(wrapper.get(".gear-item__category").text()).toContain("防曬乳");
  });

  it("不再顯示規格", () => {
    const wrapper = mountItem(
      makeProduct({
        currentSnapshot: { ...baseSnapshot, spf: 50, paGrade: "PA++++" }
      })
    );

    expect(wrapper.text()).not.toContain("SPF");
    expect(wrapper.text()).not.toContain("PA++++");
    expect(wrapper.text()).not.toContain("補擦間隔");
  });

  /*
   * 那句品類固定說明對每一張同品類的卡都一樣（重複度 100%、資訊量 0），
   * 正是使用者說「文字太多」的來源。
   */
  it("不再顯示品類的固定說明", () => {
    const wrapper = mountItem(makeProduct());

    expect(wrapper.text()).not.toContain("會建立補擦倒數；到期");
  });

  /*
   * 購買月份、到期日、個人附註都只在詳情頁。分開守是因為它們來自不同
   * 欄位——只斷言其中一個的話，另外兩個被加回來仍然會綠。
   */
  it("不再顯示購買月份、到期日與個人附註", () => {
    const wrapper = mountItem(
      makeProduct({
        purchaseMonth: "2026-05",
        expiryDate: "2028-05-01",
        note: "清爽好推"
      })
    );

    expect(wrapper.text()).not.toContain("2026");
    expect(wrapper.text()).not.toContain("2028-05-01");
    expect(wrapper.text()).not.toContain("清爽好推");
  });

  /*
   * **安全狀態是唯一保留的說明。** 被封鎖的裝備必須在清單上就看得出來，
   * 不能等使用者點進詳情頁才知道——規格則是「進去看」也不遲。
   */
  it("安全狀態被封鎖時，摘要改講封鎖原因而不是規格", () => {
    const summary = mountItem(
      makeProduct({
        currentSnapshot: {
          ...baseSnapshot,
          spf: 50,
          conditionStatus: "abnormal_reported",
          ruleEligibilityAtApplication: "abnormal_reported"
        }
      })
    ).get(".gear-item__summary").text();

    expect(summary).toContain("回報過異常");
    expect(summary).not.toContain("SPF 50");
  });
});
