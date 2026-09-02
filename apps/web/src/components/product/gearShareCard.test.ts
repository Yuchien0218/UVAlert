// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import {
  fingerprintProductLabelSnapshot,
  PRODUCT_CATALOG_RECORD_VERSION
} from "@sunshield/contracts";
import { makeProductSnapshot } from "@sunshield/test-fixtures";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import GearShareCard, {
  type GearShareCardData
} from "./GearShareCard.vue";

/**
 * 分享卡（計畫階段一，`docs/superpowers/plans/2026-09-01-gear-share-card.md`）。
 */

const snapshot = makeProductSnapshot();

function product(
  overrides: Partial<ProductCatalogRecordV1> = {}
): ProductCatalogRecordV1 {
  return {
    schemaVersion: PRODUCT_CATALOG_RECORD_VERSION,
    productId: "prod-1",
    displayName: "安耐曬 金鑽高效防曬露",
    gearCategory: "sunscreen",
    archivedAt: null,
    status: "active",
    purchaseMonth: null,
    expiryDate: null,
    note: null,
    priceTwd: 620,
    usageRating: null,
    size: null,
    color: null,
    currentSnapshot: snapshot,
    snapshotFingerprint: fingerprintProductLabelSnapshot(snapshot),
    createdAt: "2026-08-01T08:00:00.000Z",
    updatedAt: "2026-08-01T08:00:00.000Z",
    ...overrides
  };
}

function data(overrides: Partial<GearShareCardData> = {}): GearShareCardData {
  return {
    session: null,
    regionName: "臺北市 大安區",
    uvi: 6,
    riskLevel: "high",
    sunscreen: product(),
    gear: [],
    ...overrides
  };
}

function mountCard(
  cardData: GearShareCardData,
  showPrice = false
): ReturnType<typeof mount> {
  return mount(GearShareCard, { props: { data: cardData, showPrice } });
}

describe("兩種模式", () => {
  /*
   * 沒有進行中的提醒時，這張卡不是「今天」的快照。**這時不印日期也不印 UV**
   * ——一張沒有日期的卡片配一個當下的 UV 值，傳出去過幾天再看就是錯的。
   *
   * 三件事分開守：標題、日期、UV。只守標題的話，把日期留著也會過。
   */
  it("沒有進行中的提醒：標題不帶「今天」，不印日期與 UV", () => {
    const wrapper = mountCard(data());

    expect(wrapper.text()).toContain("我的防曬裝備");
    expect(wrapper.text()).not.toContain("我今天的防曬裝備");
    expect(wrapper.text()).not.toContain("今日 UV");
    expect(wrapper.text()).not.toContain("臺北市");
  });

  it("有進行中的提醒：標題帶「今天」，並印出日期與 UV", () => {
    const wrapper = mountCard(
      data({
        session: {
          context: "outdoor_general",
          startedAt: "2026-08-23T01:00:00.000Z"
        }
      })
    );

    expect(wrapper.text()).toContain("我今天的防曬裝備");
    expect(wrapper.text()).toContain("今日 UV");
    expect(wrapper.text()).toContain("臺北市");
    expect(wrapper.text()).toContain("6");
  });

  it("有情境時才印情境", () => {
    expect(mountCard(data()).text()).not.toContain("情境");

    const withSession = mountCard(
      data({
        session: {
          context: "outdoor_general",
          startedAt: "2026-08-23T01:00:00.000Z"
        }
      })
    );
    expect(withSession.text()).toContain("情境");
  });
});

describe("價格", () => {
  /*
   * **預設不印**（2026-09-01 使用者裁決）。裝備區的價格是私人記帳，把它印進
   * 一張要傳給別人的圖是另一回事。兩個方向都守——只守「預設不印」的話，
   * 開關打開也不印同樣會過，那時開關就是壞的。
   */
  it("預設不印價格", () => {
    const wrapper = mountCard(
      data({ gear: [product({ productId: "g", priceTwd: 1280 })] })
    );
    expect(wrapper.text()).not.toContain("NT$");
  });

  it("showPrice 打開才印", () => {
    const wrapper = mountCard(
      data({ gear: [product({ productId: "g", priceTwd: 1280 })] }),
      true
    );
    expect(wrapper.text()).toContain("NT$ 1280");
  });
});

describe("裝備列印名字、價格、尺寸、顏色", () => {
  it("只印有值的欄位", () => {
    const wrapper = mountCard(
      data({
        gear: [
          product({
            productId: "g1",
            displayName: "長袖防曬外套",
            gearCategory: "clothing",
            size: "M",
            color: "霧灰藍"
          }),
          product({
            productId: "g2",
            displayName: "偏光太陽眼鏡",
            gearCategory: "eyewear",
            size: null,
            color: "琥珀棕"
          })
        ]
      })
    );

    expect(wrapper.text()).toContain("長袖防曬外套");
    expect(wrapper.text()).toContain("M・霧灰藍");
    expect(wrapper.text()).toContain("偏光太陽眼鏡");
    // 沒有尺寸的那件不留一個空的分隔點。
    expect(wrapper.text()).not.toContain("・琥珀棕");
  });
});

describe("配色約束", () => {
  const SOURCE = readFileSync(
    "apps/web/src/components/product/GearShareCard.vue",
    "utf8"
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  /*
   * **五個 UV 風險色全部過不了深色卡**（實測 2.42–2.93）。它們是
   * 2026-08-31 為了暖象牙畫布才壓暗的，`uvRiskContrast.test.ts` 守的是
   * 那一組前提。
   *
   * 這條擋的是「順手把 UV 也搬進深色卡」——版面上 UV 必須留在淺色區。
   * 比對規則的巢狀關係，不是只找 token 名：`--color-uvi-*` 出現在檔案裡
   * 是對的（淺色區要用），錯的是出現在 `.share-card__primary` 底下。
   */
  it("UV 風險色不出現在深色卡裡", () => {
    const darkBlock = /\.share-card__primary[\s\S]*?\n\}/.exec(SOURCE)?.[0];

    expect(darkBlock, "找不到深色卡的規則").toBeDefined();
    expect(darkBlock).toContain("var(--surface-inverse)");
    expect(darkBlock).not.toContain("--color-uvi-");
  });

  /* 深色卡上的文字只用驗證過的兩顆：on-dark(13.66) 與 on-dark-soft(8.86)。 */
  it("深色卡的文字用 text-inverse 與 on-dark-soft", () => {
    expect(SOURCE).toMatch(
      /\.share-card__primary \{[^}]*color:\s*var\(--text-inverse\);/
    );
    expect(SOURCE).toMatch(
      /\.share-card__eyebrow \{[^}]*color:\s*var\(--color-on-dark-soft\);/
    );
  });

  /*
   * **不用琥珀金當深色卡上的標籤。** `#C1832E` 在 `#2e2925` 上是 4.49，
   * 差 0.01 過不了 AA——跟 2026-08-31 `#956900`→`#946800` 是同一種擦邊。
   */
  it("深色卡不用琥珀金當文字色", () => {
    const darkBlocks = [
      /\.share-card__primary[\s\S]*?\n\}/.exec(SOURCE)?.[0] ?? "",
      /\.share-card__eyebrow[\s\S]*?\n\}/.exec(SOURCE)?.[0] ?? ""
    ].join("\n");

    expect(darkBlocks).not.toContain("--color-amber");
    expect(darkBlocks).not.toContain("#C1832E");
  });

  /*
   * 這是 `--surface-inverse` 的第一個消費者。DESIGN.md 第十節記著這套規範
   * 「有效但引用 0 次」——這條讓那一列從此有實際落點。
   */
  it("深色卡用的是 --surface-inverse，不是寫死的深色", () => {
    expect(SOURCE).toContain("background: var(--surface-inverse);");
  });
});

describe("安全註記不可省略", () => {
  /*
   * DESIGN.md 第五節的「不可隱藏」清單。分享出去的圖更需要它——收到圖的人
   * 沒有這個 App 的脈絡。
   */
  it("卡片一定帶著安全註記", () => {
    expect(mountCard(data()).text()).toContain(
      "不是安全曝曬時間或防護效果保證"
    );
  });

  /* 有印 UV 才附資料來源；沒印 UV 時附出處是多餘的。 */
  it("印了 UV 才附中央氣象署出處", () => {
    expect(mountCard(data()).text()).not.toContain("F-D0047-091");

    const withUv = mountCard(
      data({
        session: {
          context: "outdoor_general",
          startedAt: "2026-08-23T01:00:00.000Z"
        }
      })
    );
    expect(withUv.text()).toContain("F-D0047-091");
  });
});

describe("品牌 lockup 只有一份", () => {
  /*
   * 2026-09-01 從 `BrandHeader` 抽出 `BrandLockup`。這組 path 的真實來源是
   * Illustrator，複製一份等於之後重新匯出時一定會漏掉一邊。
   */
  it("兩個使用點都用 BrandLockup，沒有人自己貼一份 path", () => {
    for (const file of [
      "apps/web/src/components/shell/BrandHeader.vue",
      "apps/web/src/components/product/GearShareCard.vue"
    ]) {
      const source = readFileSync(file, "utf8");
      expect(source, file).toContain("<BrandLockup");
      expect(source, `${file} 不該自己貼 lockup 的 path`).not.toContain(
        'data-part="wordmark"'
      );
    }
  });
});

describe("尺寸與顏色只對有這個概念的品類顯示", () => {
  const FORM = readFileSync(
    "apps/web/src/components/product/GearForm.vue",
    "utf8"
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  /*
   * 防曬衣物與其他裝備兩者都有、太陽眼鏡只有顏色、**防曬乳兩者都沒有**
   * （它的識別資訊是 SPF／PA）。逐條比對條件，不是只看欄位存在——少了任何
   * 一半，防曬乳就會多出兩個沒有意義的欄位。
   */
  it("顯示條件照品類切分", () => {
    expect(FORM).toContain(
      'gearCategory.value === "clothing" || gearCategory.value === "other_gear"'
    );
    expect(FORM).toContain(
      'const showsColor = computed(() => gearCategory.value !== "sunscreen");'
    );
  });

  /*
   * 品類不適用時存 null，不是把畫面上看不到的舊值留著——那會變成「看不到
   * 但存著」的資料，跟 SPF／PA 在非防曬乳品類的處理一致。
   */
  it("品類不適用時存 null", () => {
    expect(FORM).toContain('showsSize.value && size.value.trim() !== ""');
    expect(FORM).toContain('showsColor.value && color.value.trim() !== ""');
  });
});

describe("不升版就能加欄位", () => {
  /*
   * `size`／`color` 都是 `.nullable().default(null)`，**版本號不動**。
   *
   * 升版會讓 `#normalize()` 那段為 1.0.0 寫的遷移吃到完整的 1.1.0 紀錄，
   * 把使用者存的太陽眼鏡變成防曬乳、清空購買月份與備註。
   * `product-catalog.test.ts` 有一條測試證明舊紀錄仍解析得過。
   */
  it("兩個新欄位都有 default(null)，版本維持 1.1.0", () => {
    const contract = readFileSync(
      "packages/contracts/src/product.ts",
      "utf8"
    ).replace(/\/\*\*[\s\S]*?\*\//g, "");

    expect(contract).toContain(
      'export const PRODUCT_CATALOG_RECORD_VERSION = "1.1.0" as const;'
    );
    expect(contract).toContain(
      "size: z.string().trim().max(20).nullable().default(null),"
    );
    expect(contract).toContain(
      "color: z.string().trim().max(20).nullable().default(null),"
    );
  });
});
