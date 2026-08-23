// @vitest-environment happy-dom

import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import { flushPromises, mount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../app/createWebAppServices";
import { useWebAppServices } from "../app/injection";
import {
  fingerprintProductLabelSnapshot,
  PRODUCT_CATALOG_RECORD_VERSION
} from "@sunshield/contracts";
import { makeProductSnapshot } from "@sunshield/test-fixtures";
import { makeSessionOnlyProductSnapshot } from "../features/setup/productSnapshot";
import ProductDetailPage from "./ProductDetailPage.vue";

vi.mock("../app/injection", () => ({
  useWebAppServices: vi.fn()
}));

const snapshot = makeSessionOnlyProductSnapshot(
  {
    claimAnswer: "yes",
    waitAnswer: "explicit",
    waitMinutes: 15,
    intervalAnswer: "explicit",
    intervalMinutes: 120,
    waterResistance: "80"
  },
  "2026-08-01T08:00:00.000Z"
);

function makeProduct(
  overrides: Partial<ProductCatalogRecordV1> = {}
): ProductCatalogRecordV1 {
  return {
    schemaVersion: PRODUCT_CATALOG_RECORD_VERSION,
    productId: "prod-1",
    displayName: "日常保濕防曬乳",
    gearCategory: "sunscreen",
    archivedAt: null,
    status: "active",
    purchaseMonth: "2026-05",
    expiryDate: "2028-05-01",
    note: "清爽好推",
    currentSnapshot: { ...snapshot, spf: 50, paGrade: "++++" },
    snapshotFingerprint: fingerprintProductLabelSnapshot(snapshot),
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
    ...overrides
  };
}

interface Harness {
  wrapper: ReturnType<typeof mount>;
  archiveProduct: ReturnType<typeof vi.fn>;
  restoreProduct: ReturnType<typeof vi.fn>;
  deleteProduct: ReturnType<typeof vi.fn>;
}

async function mountDetail(
  product: ProductCatalogRecordV1 | null,
  routeId = "prod-1"
): Promise<Harness> {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/products/:id", name: "product-detail", component: ProductDetailPage },
      { path: "/products", name: "products", component: { template: "<div />" } },
      {
        path: "/products/:id/edit",
        name: "product-edit",
        component: { template: "<div />" }
      }
    ]
  });

  const archiveProduct = vi.fn(async () => true);
  const restoreProduct = vi.fn(async () => true);
  const deleteProduct = vi.fn(async () => true);

  vi.mocked(useWebAppServices).mockReturnValue({
    productSettings: {
      phase: shallowReadonly(shallowRef("ready")),
      products: shallowReadonly(shallowRef(product === null ? [] : [product])),
      ensureLoaded: vi.fn(async () => undefined),
      archiveProduct,
      restoreProduct,
      deleteProduct
    }
  } as unknown as WebAppServices);

  await router.push(`/products/${routeId}`);
  await router.isReady();

  const wrapper = mount(ProductDetailPage, {
    global: { plugins: [router], stubs: { Icon: true } }
  });
  await flushPromises();

  return { wrapper, archiveProduct, restoreProduct, deleteProduct };
}

describe("ProductDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("呈現名稱、真實規格與購買資訊", async () => {
    const { wrapper } = await mountDetail(makeProduct());

    expect(wrapper.text()).toContain("日常保濕防曬乳");
    expect(wrapper.text()).toContain("防曬乳");
    expect(wrapper.text()).toContain("SPF50");
    expect(wrapper.text()).toContain("PA++++");
    expect(wrapper.text()).toContain("2028-05-01");
    expect(wrapper.text()).toContain("清爽好推");
  });

  /**
   * wireframe 06 寫「120ml」，但資料模型沒有容量欄位——
   * 不可以把不存在的資料顯示出來。
   */
  it("不顯示不存在於資料模型的容量", async () => {
    const { wrapper } = await mountDetail(makeProduct());

    expect(wrapper.text()).not.toContain("ml");
  });

  it("找不到裝備時呈現防呆提示", async () => {
    const { wrapper } = await mountDetail(null, "non-existent");

    expect(wrapper.text()).toContain("找不到這件裝備");
  });

  describe("主要行動依狀態切換", () => {
    it("使用中的防曬乳，主 CTA 是換新的一瓶，呼叫 archiveProduct", async () => {
      const { wrapper, archiveProduct } = await mountDetail(makeProduct());

      const button = wrapper.findAll("button").find(
        (b) => b.text() === "換新的一瓶"
      );
      expect(button).toBeDefined();
      expect(wrapper.text()).not.toContain("記錄使用中");

      await button!.trigger("click");
      expect(archiveProduct).toHaveBeenCalledWith("prod-1");
    });

    it("使用中的非防曬乳，主 CTA 文字改為移至收納", async () => {
      const { wrapper } = await mountDetail(
        makeProduct({ gearCategory: "eyewear", displayName: "太陽眼鏡" })
      );

      expect(
        wrapper.findAll("button").some((b) => b.text() === "移至收納")
      ).toBe(true);
      expect(wrapper.text()).not.toContain("換新的一瓶");
    });

    it("收納中的裝備，主 CTA 是記錄使用中，呼叫 restoreProduct", async () => {
      const { wrapper, restoreProduct } = await mountDetail(
        makeProduct({ status: "stopped" })
      );

      const button = wrapper.findAll("button").find(
        (b) => b.text() === "記錄使用中"
      );
      expect(button).toBeDefined();
      expect(wrapper.text()).not.toContain("換新的一瓶");

      await button!.trigger("click");
      expect(restoreProduct).toHaveBeenCalledWith("prod-1");
    });

    /**
     * 安全狀態被封鎖的裝備不提供恢復（S-13）——同配方新批次要另建紀錄，
     * 不能用「記錄使用中」繞過異常回報。
     */
    it("被安全狀態封鎖的收納裝備，不提供記錄使用中", async () => {
      const blockedSnapshot = makeProductSnapshot({
        conditionStatus: "abnormal_reported"
      });
      const { wrapper } = await mountDetail(
        makeProduct({
          status: "stopped",
          currentSnapshot: blockedSnapshot,
          snapshotFingerprint: fingerprintProductLabelSnapshot(blockedSnapshot)
        })
      );

      expect(wrapper.text()).not.toContain("記錄使用中");
      expect(wrapper.text()).toContain("同配方的新批次請另建一筆新紀錄");
    });
  });

  describe("刪除", () => {
    it("需要先確認才會真的刪除", async () => {
      const { wrapper, deleteProduct } = await mountDetail(makeProduct());

      const deleteButton = wrapper
        .findAll("button")
        .find((b) => b.text() === "刪除這件防曬裝備");
      await deleteButton!.trigger("click");

      expect(deleteProduct).not.toHaveBeenCalled();
      expect(wrapper.text()).toContain("確定要刪除這件裝備");

      const confirmButton = wrapper
        .findAll("button")
        .find((b) => b.text() === "確定刪除");
      await confirmButton!.trigger("click");

      expect(deleteProduct).toHaveBeenCalledWith("prod-1");
    });
  });
});
