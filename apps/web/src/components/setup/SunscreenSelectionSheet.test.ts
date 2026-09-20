// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import {
  fingerprintProductLabelSnapshot,
  PRODUCT_CATALOG_RECORD_VERSION
} from "@sunshield/contracts";
import { makeSessionOnlyProductSnapshot } from "../../features/setup/productSnapshot";
import SunscreenSelectionSheet from "./SunscreenSelectionSheet.vue";

const snapshot1 = makeSessionOnlyProductSnapshot(
  {
    claimAnswer: "yes",
    waitAnswer: "none",
    waitMinutes: null,
    intervalAnswer: "explicit",
    intervalMinutes: 80,
    waterResistance: "80"
  },
  "2026-09-01T00:00:00.000Z"
);
snapshot1.spf = 50;
snapshot1.paGrade = "PA++++";

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
    size: null,
    color: null,
    volume: null,
    formulation: null,
    protectionType: null,
    upf: null,
    shadingRate: null,
    weight: null,
    hatStyle: null,
    uvProtection: null,
    sortOrder: null,
    currentSnapshot: snapshot1,
    snapshotFingerprint: fingerprintProductLabelSnapshot(snapshot1),
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides
  };
}

const sampleProducts: ProductCatalogRecordV1[] = [
  makeProduct({
    productId: "sunscreen-1",
    displayName: "安耐曬金鑽高效防曬露"
  }),
  makeProduct({
    productId: "hat-1",
    displayName: "遮陽帽",
    gearCategory: "hat"
  }),
  makeProduct({
    productId: "sunscreen-archived",
    displayName: "已封存防曬乳",
    archivedAt: "2026-09-10T00:00:00.000Z"
  })
];

describe("SunscreenSelectionSheet", () => {
  it("只列出有效防曬乳與未指定標示選項", () => {
    const wrapper = mount(SunscreenSelectionSheet, {
      props: {
        open: true,
        products: sampleProducts,
        selectedProductId: "sunscreen-1"
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false
        }
      }
    });

    expect(wrapper.text()).toContain("安耐曬金鑽高效防曬露");
    expect(wrapper.text()).toContain("SPF 50");
    expect(wrapper.text()).toContain("PA++++");
    expect(wrapper.text()).toContain("耐水 80 分鐘");
    expect(wrapper.text()).toContain("未指定標示防曬乳");
    expect(wrapper.text()).toContain("採用 120 分鐘保守補擦間隔");

    // 不包含非防曬乳（遮陽帽）或已封存防曬乳
    expect(wrapper.text()).not.toContain("遮陽帽");
    expect(wrapper.text()).not.toContain("已封存防曬乳");
  });

  it("選擇未指定標示防曬乳並點擊確定發出 select 與 close 事件", async () => {
    const wrapper = mount(SunscreenSelectionSheet, {
      props: {
        open: true,
        products: sampleProducts,
        selectedProductId: "sunscreen-1"
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false
        }
      }
    });

    const unassignedRadio = wrapper.find<HTMLInputElement>(
      'input[type="radio"][value="unassigned"]'
    );
    expect(unassignedRadio.exists()).toBe(true);
    await unassignedRadio.setValue(true);

    const confirmBtn = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("確定"));
    expect(confirmBtn).toBeDefined();
    await confirmBtn?.trigger("click");

    expect(wrapper.emitted("select")?.[0]).toEqual([null]);
    expect(wrapper.emitted("close")).toHaveLength(1);
  });

  it("點擊填寫新防曬乳標示發出 addNew 事件", async () => {
    const wrapper = mount(SunscreenSelectionSheet, {
      props: {
        open: true,
        products: sampleProducts,
        selectedProductId: null
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false
        }
      }
    });

    const addBtn = wrapper
      .findAll("button")
      .find((btn) => btn.text().includes("填寫新防曬乳標示"));
    expect(addBtn).toBeDefined();
    await addBtn?.trigger("click");

    expect(wrapper.emitted("addNew")).toHaveLength(1);
  });
});
