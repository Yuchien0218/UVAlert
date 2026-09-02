// @vitest-environment happy-dom

import { readFileSync } from "node:fs";

import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import { flushPromises, mount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../../app/createWebAppServices";
import { useWebAppServices } from "../../app/injection";
import {
  fingerprintProductLabelSnapshot,
  PRODUCT_CATALOG_RECORD_VERSION
} from "@sunshield/contracts";
import { makeProductSnapshot } from "@sunshield/test-fixtures";
import { makeSessionOnlyProductSnapshot } from "../../features/setup/productSnapshot";
import GearDetailSheet from "./GearDetailSheet.vue";

/**
 * 2026-09-01：裝備詳情從 `/products/:id` 整頁改成清單上的抽屜。
 *
 * **舊的 `ProductDetailPage.test.ts` 整份搬到這裡，斷言意圖一條都沒有丟。**
 * 那一頁被刪掉，但它守的行為（主要行動依狀態切換、安全狀態封鎖不給恢復、
 * 刪除要二次確認、規格只顯示真實欄位）在抽屜裡完全一樣，所以測試跟著搬，
 * 不是重寫。
 *
 * 少掉的只有兩條：路由層的「找不到裝備時的防呆提示」（抽屜沒有這個狀態，
 * 查不到就不開），以及 `dt` 的 flex 守門（改由本檔最後一條掃 scoped CSS）。
 */

vi.mock("../../app/injection", () => ({
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
    priceTwd: null,
    usageRating: null,
    size: null,
    color: null,
    // paGrade 存照包裝抄的完整標示，顯示端不再自己加 PA 前綴。
    currentSnapshot: { ...snapshot, spf: 50, paGrade: "PA++++" },
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

async function mountSheet(
  product: ProductCatalogRecordV1 | null
): Promise<Harness> {
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

  // BottomSheet 用 Teleport to body，所以要 attach 才找得到內容。
  const wrapper = mount(GearDetailSheet, {
    props: { product },
    attachTo: document.body,
    global: { stubs: { Icon: true } }
  });
  await flushPromises();

  return { wrapper, archiveProduct, restoreProduct, deleteProduct };
}

/** 抽屜的內容被 teleport 到 body，用 document 查而不是 wrapper。 */
function sheetText(): string {
  return document.body.textContent ?? "";
}

function sheetButtons(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>(".bottom-sheet button")];
}

function findButton(label: string): HTMLButtonElement | undefined {
  return sheetButtons().find(
    (button) => button.textContent?.replace(/\s+/g, "") === label
  );
}

describe("GearDetailSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = "";
  });

  it("product 為 null 時不開啟", async () => {
    await mountSheet(null);
    expect(document.querySelector(".bottom-sheet")).toBeNull();
  });

  it("呈現名稱、真實規格與購買資訊", async () => {
    await mountSheet(makeProduct());

    expect(sheetText()).toContain("日常保濕防曬乳");
    expect(sheetText()).toContain("SPF 50");
    expect(sheetText()).toContain("PA++++");
    // 前綴重複的回歸守門：曾經寫成 `PA${paGrade}`，實測顯示成 PAPA++++。
    expect(sheetText()).not.toContain("PAPA");
    expect(sheetText()).toContain("2028-05-01");
    expect(sheetText()).toContain("清爽好推");
  });

  it("不顯示不存在於資料模型的容量", async () => {
    await mountSheet(makeProduct());
    expect(sheetText()).not.toContain("ml");
  });

  /*
   * 「補擦提醒」只在不會倒數時出現——防曬乳那句講的是品類通則，不是這一瓶
   * 的資料。兩個方向分開守。
   */
  it("防曬乳不印品類通則", async () => {
    await mountSheet(makeProduct());
    expect(sheetText()).not.toContain("自動建立補擦倒數");
  });

  /*
   * 2026-09-01：限制改由標題下的「僅供紀錄」膠囊表示（原本是一列「補擦提醒
   * ／不會建立補擦倒數」的規格）。**斷言的意圖沒變**——這個限制必須看得到，
   * 只是換了呈現方式，而且跟清單項目用同一組字。
   */
  it("不會倒數的裝備要說出這個限制", async () => {
    await mountSheet(makeProduct({ gearCategory: "eyewear" }));
    expect(sheetText()).toContain("僅供紀錄");
  });

  it("會倒數的裝備不掛這個膠囊", async () => {
    await mountSheet(makeProduct());
    expect(sheetText()).not.toContain("僅供紀錄");
  });

  describe("主要行動依狀態切換", () => {
    it("使用中的裝備，主 CTA 是移至收納，呼叫 archiveProduct", async () => {
      const { archiveProduct } = await mountSheet(makeProduct());

      const button = findButton("移至收納");
      expect(button).toBeDefined();
      expect(sheetText()).not.toContain("記錄使用中");

      button!.click();
      await flushPromises();
      expect(archiveProduct).toHaveBeenCalledWith("prod-1");
    });

    it("使用中的非防曬乳，主 CTA 同樣是移至收納", async () => {
      await mountSheet(
        makeProduct({ gearCategory: "eyewear", displayName: "太陽眼鏡" })
      );

      expect(findButton("移至收納")).toBeDefined();
    });

    it("收納中的裝備，主 CTA 是記錄使用中，呼叫 restoreProduct", async () => {
      const { restoreProduct } = await mountSheet(
        makeProduct({ status: "stopped" })
      );

      const button = findButton("記錄使用中");
      expect(button).toBeDefined();
      expect(sheetText()).not.toContain("移至收納");

      button!.click();
      await flushPromises();
      expect(restoreProduct).toHaveBeenCalledWith("prod-1");
    });

    /*
     * 安全狀態被封鎖的裝備不提供恢復（S-13）——同配方新批次要另建紀錄，
     * 不能用「記錄使用中」繞過異常回報。
     */
    it("被安全狀態封鎖的收納裝備，不提供記錄使用中", async () => {
      const blockedSnapshot = makeProductSnapshot({
        conditionStatus: "abnormal_reported"
      });
      await mountSheet(
        makeProduct({
          status: "stopped",
          currentSnapshot: blockedSnapshot,
          snapshotFingerprint: fingerprintProductLabelSnapshot(blockedSnapshot)
        })
      );

      expect(sheetText()).not.toContain("記錄使用中");
      expect(sheetText()).toContain("同配方的新批次請另建一筆新紀錄");
    });
  });

  describe("刪除", () => {
    it("需要先確認才會真的刪除", async () => {
      const { deleteProduct } = await mountSheet(makeProduct());

      findButton("刪除這件防曬裝備")!.click();
      await flushPromises();

      expect(deleteProduct).not.toHaveBeenCalled();
      expect(sheetText()).toContain("確定要刪除這件裝備");

      findButton("確定刪除")!.click();
      await flushPromises();

      expect(deleteProduct).toHaveBeenCalledWith("prod-1");
    });

    /*
     * 抽屜與整頁的差別：元件不會被重新建立，狀態會殘留。沒有那個 watch 的
     * 話，在 A 按了刪除、關掉、再開 B，B 會直接停在確認刪除的畫面——**這是
     * 從頁改成抽屜才會出現的 bug，舊的測試沒有理由守它。**
     */
    it("換一件裝備時，刪除確認會重置", async () => {
      const { wrapper } = await mountSheet(makeProduct());

      findButton("刪除這件防曬裝備")!.click();
      await flushPromises();
      expect(sheetText()).toContain("確定要刪除這件裝備");

      await wrapper.setProps({
        product: makeProduct({ productId: "prod-2", displayName: "另一瓶" })
      });
      await flushPromises();

      expect(sheetText()).not.toContain("確定要刪除這件裝備");
    });
  });

  it("編輯是 emit 而不是就地改，讓清單頁決定去哪裡", async () => {
    const { wrapper } = await mountSheet(makeProduct());

    findButton("編輯")!.click();
    await flushPromises();

    expect(wrapper.emitted("edit")).toEqual([["prod-1"]]);
  });
});

describe("版型", () => {
  /*
   * 2026-08-31 的回歸守門，跟著搬過來：`.spec-row` 是 flex ＋ space-between，
   * `dt` 少了 flex-shrink 就會被長 `dd` 壓成一行一個字。
   */
  it("dt 宣告了 flex: 0 0 auto，不會被長內容壓縮", () => {
    const source = readFileSync(
      "apps/web/src/components/product/GearDetailSheet.vue",
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\//g, "");

    expect(source).toMatch(/\.spec-row dt \{[^}]*flex: 0 0 auto;/);
  });
});

/**
 * 2026-09-01：抽屜的外觀對齊整體設計風格（使用者要求）。
 */
describe("外觀與設計系統一致", () => {
  const SOURCE = readFileSync(
    "apps/web/src/components/product/GearDetailSheet.vue",
    "utf8"
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  /*
   * 破壞性動作與日常動作原本都是 `button--quiet`，**兩顆長得一模一樣，
   * 其中一顆會永久刪掉資料**。兩件事分開守：要有分隔，也要有紅字。
   * 只守其中一件的話，拿掉另一件仍然會綠。
   */
  it("刪除自己一區，與日常動作用 hairline 隔開", () => {
    expect(SOURCE).toContain('<div class="gear-detail__danger">');
    expect(SOURCE).toMatch(
      /\.gear-detail__danger \{[^}]*border-top:\s*1px solid var\(--border-subtle\);/
    );
  });

  it("刪除的按鈕文字用到期紅，但不是整顆紅按鈕", () => {
    expect(SOURCE).toMatch(
      /\.gear-detail__delete \{[^}]*color:\s*var\(--color-due\);/
    );
    // 這個 App 的破壞性動作是「紅字＋中性按鈕」，跟資料設定頁一致。
    expect(SOURCE).not.toContain("button--danger");
  });

  /*
   * 品類與狀態沿用 `GearListItem` 的 caption 語彙（說明文字 ＋ 外框膠囊），
   * 不在 sheet 裡另外發明一種標示法。
   */
  it("狀態用外框膠囊，值與清單項目一致", () => {
    expect(SOURCE).toMatch(
      /\.gear-detail__badge \{[^}]*border:\s*1px solid var\(--border-strong\);[^}]*border-radius:\s*var\(--radius-pill\);/
    );
  });
});

describe("BottomSheet 的內距照 DESIGN.md 第四節", () => {
  const SHEET = readFileSync(
    "apps/web/src/components/common/BottomSheet.vue",
    "utf8"
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  /*
   * DESIGN.md 第四節訂 bottom sheet 用 24px，程式碼一直沿用 `--card-padding`
   * （20px），差異被記在第六節「等裁決」。2026-09-01 裁決成照規範走。
   *
   * 守 token 名而不是數值：改 `--sheet-padding` 的值是一次調整，把 sheet
   * 改回 `--card-padding` 才是回歸。
   */
  it("header 與 body 都用 --sheet-padding", () => {
    expect(SHEET).toMatch(/\.bottom-sheet__header \{[^}]*var\(--sheet-padding\)/);
    expect(SHEET).toMatch(/\.bottom-sheet__body \{[^}]*var\(--sheet-padding\)/);
    expect(SHEET, "不再沿用卡片內距").not.toContain("var(--card-padding)");
  });

  it("--sheet-padding 是 24px 那一階", () => {
    const tokens = readFileSync("packages/ui/src/styles.css", "utf8").replace(
      /\/\*[\s\S]*?\*\//g,
      ""
    );
    expect(tokens).toContain("--sheet-padding: var(--space-6);");
    expect(tokens).toContain("--space-6: 1.5rem;");
  });
});
