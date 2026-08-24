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
    currentSnapshot: baseSnapshot,
    snapshotFingerprint: fingerprintProductLabelSnapshot(baseSnapshot),
    createdAt: "2026-08-24T00:00:00.000Z",
    updatedAt: "2026-08-24T00:00:00.000Z",
    ...overrides
  };
}

function summaryOf(product: ProductCatalogRecordV1): string {
  const wrapper = mount(GearListItem, {
    props: { product },
    global: { stubs: { Icon: true } }
  });
  return wrapper.get(".gear-item__summary").text();
}

describe("GearListItem 摘要", () => {
  it("有 SPF 與 PA 時顯示真實規格，且不重複 PA 前綴", () => {
    const summary = summaryOf(
      makeProduct({
        currentSnapshot: {
          ...baseSnapshot,
          spf: 50,
          paGrade: "PA++++"
        }
      })
    );

    expect(summary).toContain("SPF 50");
    expect(summary).toContain("PA++++");
    expect(summary).not.toContain("PAPA");
  });

  it("有補擦間隔時一併顯示", () => {
    const summary = summaryOf(
      makeProduct({
        currentSnapshot: { ...baseSnapshot, spf: 50, paGrade: null }
      })
    );

    expect(summary).toContain("SPF 50");
    expect(summary).toContain("補擦間隔 120 分鐘");
  });

  it("沒有任何規格時落回品類的提醒效果說明，不編造資料", () => {
    const summary = summaryOf(
      makeProduct({
        currentSnapshot: {
          ...baseSnapshot,
          spf: null,
          paGrade: null,
          reapplicationIntervalStatus: "no_numeric_interval",
          reapplicationIntervalMinutes: null
        }
      })
    );

    expect(summary).toContain("會建立補擦倒數");
    expect(summary).not.toContain("SPF");
  });

  it("安全狀態被封鎖時，摘要改講封鎖原因而不是規格", () => {
    const summary = summaryOf(
      makeProduct({
        currentSnapshot: {
          ...baseSnapshot,
          spf: 50,
          conditionStatus: "abnormal_reported",
          ruleEligibilityAtApplication: "abnormal_reported"
        }
      })
    );

    expect(summary).toContain("回報過異常");
    expect(summary).not.toContain("SPF 50");
  });
});
