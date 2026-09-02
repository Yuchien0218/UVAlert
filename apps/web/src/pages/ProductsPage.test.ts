// @vitest-environment happy-dom
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import {
  fingerprintProductLabelSnapshot,
  PRODUCT_CATALOG_RECORD_VERSION
} from "@sunshield/contracts";
import { makeProductSnapshot } from "@sunshield/test-fixtures";
import { flushPromises, mount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import type { WebAppServices } from "../app/createWebAppServices";
import { useWebAppServices } from "../app/injection";
import ProductsPage from "./ProductsPage.vue";

vi.mock("../app/injection", () => ({
  useWebAppServices: vi.fn()
}));

/** 這一頁會 push 到 product-new／product-edit，路由表要有落點。 */
function productsRouter() {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/products", name: "products", component: ProductsPage },
      {
        path: "/products/new",
        name: "product-new",
        component: { template: "<div />" }
      },
      {
        path: "/products/:id/edit",
        name: "product-edit",
        component: { template: "<div />" }
      }
    ]
  });
}

const listSnapshot = makeProductSnapshot();

function listProduct(
  overrides: Partial<ProductCatalogRecordV1> = {}
): ProductCatalogRecordV1 {
  return {
    schemaVersion: PRODUCT_CATALOG_RECORD_VERSION,
    productId: "prod-1",
    displayName: "日常保濕防曬乳",
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
    currentSnapshot: listSnapshot,
    snapshotFingerprint: fingerprintProductLabelSnapshot(listSnapshot),
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
    ...overrides
  };
}

/**
 * 2026-08-31。這一頁先前沒有任何測試。
 *
 * 兩件事分開守：新增鈕的位置，以及**一整類會靜默壞掉的 bug**。
 *
 * 那一類 bug 這次真的踩到了：`SetupProcessBanner` emit `resume`，元件測試
 * 也驗證了 emit 有發出——但 `ProductsPage` 寫的是
 * `<SetupProcessBanner v-if="..." />`，**沒有 `@resume` 監聽器**。所以那顆
 * 「返回提醒設定」按鈕按下去什麼都不會發生，而測試全綠。Vue 對「emit 了
 * 但沒人聽」不會報錯也不會警告，這種錯只能靠掃描抓。
 */

const sourceRoot = "apps/web/src";

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

function discoverVueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverVueFiles(entryPath);
    return entry.name.endsWith(".vue") ? [entryPath] : [];
  });
}

const productsPage = strip(
  readFileSync("apps/web/src/pages/ProductsPage.vue", "utf8")
);

describe("ProductsPage", () => {
  /*
   * 使用者裁決：先看有什麼、再決定要不要加。守的是「新增鈕出現在使用中
   * 那個 section 之後」，用兩者在原始碼裡的位置比較——只斷言按鈕存在的
   * 話，把它搬回清單上方仍然會綠。
   */
  it("新增鈕排在「使用中」區塊之後", () => {
    const currentSection = productsPage.indexOf(
      'aria-labelledby="gear-current-title"'
    );
    const addButton = productsPage.indexOf("新增裝備", currentSection);
    const pastSection = productsPage.indexOf(
      'aria-labelledby="gear-past-title"'
    );

    expect(currentSection).toBeGreaterThan(-1);
    expect(addButton).toBeGreaterThan(currentSection);
    expect(pastSection).toBeGreaterThan(addButton);
  });

  it("不再渲染已移除的設定流程橫幅", () => {
    expect(productsPage).not.toContain("SetupProcessBanner");
  });
});

/**
 * 「元件 emit 了，但用它的頁面沒有接」——Vue 不會報錯，測試也照樣全綠。
 *
 * 掃描方式：找出每個元件宣告的 emit 名稱，再檢查每個把它掛上去的地方有
 * 沒有對應的 `@name`。只看**必要**的 emit（元件的唯一動作），所以用
 * 允許清單放行「可選的通知型 emit」，而不是反過來把全部都放行。
 */
describe("元件 emit 有人接", () => {
  /** 可選的 emit：沒接也不會讓功能壞掉。 */
  const OPTIONAL_EMITS = new Set([
    "update:modelValue", // v-model 的另一半，由 v-model 語法自動接
    "refresh",
    "saved",
    "close",
    "cancel",
    "back",
    "accept",
    "adjust",
    "open",
    "start",
    "confirm",
    "resetError",
    "locate",
    "save",
    "select"
  ]);

  const files = discoverVueFiles(sourceRoot).sort();

  it("有掃到檔案（避免走訪壞掉時靜默通過）", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  for (const file of files) {
    it(`${file} 使用到的元件，必要 emit 都有人接`, () => {
      const source = strip(readFileSync(file, "utf8"));
      const offenders: string[] = [];

      for (const match of source.matchAll(
        /<([A-Z][A-Za-z0-9]*)\b([^>]*?)\/?>/g
      )) {
        const componentName = match[1]!;
        const attributes = match[2] ?? "";
        const componentFile = files.find(
          (candidate) =>
            candidate.endsWith(`${componentName}.vue`) && candidate !== file
        );
        if (componentFile === undefined) continue;

        const emitBlock = strip(readFileSync(componentFile, "utf8")).match(
          /defineEmits<\{([\s\S]*?)\}>\(\)/
        );
        if (emitBlock === null) continue;

        for (const emitMatch of emitBlock[1]!.matchAll(
          /^\s*([A-Za-z][A-Za-z0-9]*)\s*:/gm
        )) {
          const emitName = emitMatch[1]!;
          if (OPTIONAL_EMITS.has(emitName)) continue;
          if (attributes.includes(`@${emitName}`)) continue;
          offenders.push(`<${componentName}> 的 @${emitName}`);
        }
      }

      expect(
        offenders,
        `${file} 用了元件卻沒有接它的必要 emit：${offenders.join("、")}。` +
          `Vue 不會為此報錯，按鈕會變成按了沒反應。`
      ).toEqual([]);
    });
  }
});

/**
 * 2026-09-01：裝備詳情改成清單上的抽屜（`/products/:id` 整頁已刪除）。
 *
 * **這一段是掛載測試，不是掃原始碼**——要守的正是掃描看不到的東西：點清單
 * 會不會真的把抽屜打開、關閉會不會真的收回去。上面那條 emit 掃描只能確認
 * `@close` 這個字有寫，不能確認它接到的 handler 做了對的事。
 *
 * 實測時還踩到一個假象值得記著：在 preview 工具裡（分頁 `visibilityState`
 * 是 hidden）`requestAnimationFrame` 被節流，Vue `<Transition>` 的 class
 * 換不到下一步，抽屜看起來「關不掉」。那是環境造成的，不是這裡的邏輯——
 * 所以這條測試改用掛載驗證，不依賴動畫。
 */
describe("裝備詳情抽屜的開關", () => {
  function mountPage(products: ProductCatalogRecordV1[]) {
    vi.mocked(useWebAppServices).mockReturnValue({
      productSettings: {
        phase: shallowReadonly(shallowRef("ready")),
        products: shallowReadonly(shallowRef(products)),
        ensureLoaded: vi.fn(async () => undefined),
        archiveProduct: vi.fn(async () => true),
        restoreProduct: vi.fn(async () => true),
        deleteProduct: vi.fn(async () => true)
      }
    } as unknown as WebAppServices);

    return mount(ProductsPage, {
      global: {
        plugins: [productsRouter()],
        stubs: { Icon: true, GearDetailSheet: true }
      }
    });
  }

  it("點清單項目會把那件裝備交給抽屜", async () => {
    const wrapper = mountPage([listProduct()]);
    await flushPromises();

    const sheet = wrapper.findComponent({ name: "GearDetailSheet" });
    expect(sheet.props("product")).toBeNull();

    await wrapper.get(".gear-list button").trigger("click");
    expect(
      (sheet.props("product") as ProductCatalogRecordV1).productId
    ).toBe("prod-1");
  });

  it("抽屜 emit close 之後真的收回去", async () => {
    const wrapper = mountPage([listProduct()]);
    await flushPromises();
    await wrapper.get(".gear-list button").trigger("click");

    const sheet = wrapper.findComponent({ name: "GearDetailSheet" });
    sheet.vm.$emit("close");
    await flushPromises();

    expect(sheet.props("product")).toBeNull();
  });

  /*
   * 裝備被刪掉之後，`openProduct` 在清單裡查不到就變成 null，抽屜自己關上
   * ——這是「存 id 不存整筆紀錄」的用意。存快照的話畫面會停在一筆已經不存在
   * 的資料上。
   */
  it("裝備從清單消失時抽屜自動關上", async () => {
    const products = shallowRef<ProductCatalogRecordV1[]>([listProduct()]);
    vi.mocked(useWebAppServices).mockReturnValue({
      productSettings: {
        phase: shallowReadonly(shallowRef("ready")),
        products: shallowReadonly(products),
        ensureLoaded: vi.fn(async () => undefined),
        archiveProduct: vi.fn(async () => true),
        restoreProduct: vi.fn(async () => true),
        deleteProduct: vi.fn(async () => true)
      }
    } as unknown as WebAppServices);

    const wrapper = mount(ProductsPage, {
      global: {
        plugins: [productsRouter()],
        stubs: { Icon: true, GearDetailSheet: true }
      }
    });
    await flushPromises();
    await wrapper.get(".gear-list button").trigger("click");

    const sheet = wrapper.findComponent({ name: "GearDetailSheet" });
    expect(sheet.props("product")).not.toBeNull();

    products.value = [];
    await flushPromises();

    expect(sheet.props("product")).toBeNull();
  });
});
