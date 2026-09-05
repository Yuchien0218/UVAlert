// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import type { ProductCatalogRecordV1 } from "@sunshield/contracts";
import {
  fingerprintProductLabelSnapshot,
  PRODUCT_CATALOG_RECORD_VERSION
} from "@sunshield/contracts";
import { makeProductSnapshot } from "@sunshield/test-fixtures";
import { mount } from "@vue/test-utils";
import { formatFullDate } from "../../helpers/datetime";
import { describe, expect, it } from "vitest";
import GearShareCard, { type GearShareCardData } from "./GearShareCard.vue";

/**
 * 分享卡（計畫階段一，`docs/superpowers/plans/2026-09-01-gear-share-card.md`）。
 */

const PAINTER_PATH = "apps/web/src/features/share/paintShareCard.ts";

/** 掃原始碼前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

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
    volume: null,
    formulation: null,
    protectionType: null,
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
   * 沒有進行中的提醒時，這張卡不是「今天」的快照，所以**不印 UV**——一張
   * 通用清單配一個當下的 UV 值，傳出去過幾天再看就是錯的。
   *
   * **2026-09-02：日期不再是這條守門的一部分。** 原本這裡連日期一起擋（測試
   * 名稱寫「不印日期與 UV」），因為當時的版面把日期放在頁首、只有進行中提醒
   * 才有。頁尾改成日期之後兩種模式都印，守日期的責任移到「頁尾是日期」那一
   * 組。留下這段是為了說明規則變了，不是被漏掉。
   */
  it("沒有進行中的提醒：標題不帶「今天」，不印 UV", () => {
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

/*
 * **2026-09-02：頁尾從安全註記改成日期（使用者裁決）。**
 *
 * 這裡原本有兩條守門，守的是 DESIGN.md 第五節「不可隱藏」清單上的安全
 * 註記。它們現在被移除了，取代的是下面這組守日期的測試。
 *
 * 保留這段說明是刻意的：把守門刪掉而不留痕跡，下一個人會以為那條規則
 * 從來不存在。裁決的理由與代價見
 * `docs/decisions/2026-09-02-share-card-footer-date.md`。
 */
describe("頁尾是日期", () => {
  /*
   * 兩種模式都要有日期。分享出去的圖會被轉傳，收到的人需要知道它是什麼
   * 時候的清單——沒有進行中提醒時用「今天」，也就是卡片被做出來的日子。
   */
  it("沒有進行中提醒時用今天的日期", () => {
    const text = mountCard(data()).text();

    expect(text).toContain(formatFullDate(new Date()));
  });

  it("有進行中提醒時用提醒的起始日", () => {
    const text = mountCard(
      data({
        session: {
          context: "outdoor_general",
          startedAt: "2026-08-23T01:00:00.000Z"
        }
      })
    ).text();

    expect(text).toContain(
      formatFullDate(new Date("2026-08-23T01:00:00.000Z"))
    );
  });

  /*
   * 日期從頁首搬到頁尾。兩邊都留會變成一張卡上有兩個日期——這條擋住
   * 「補回頁首那個」時沒有人發現重複。
   */
  it("日期只出現一次", () => {
    const text = mountCard(data()).text();
    const today = formatFullDate(new Date());

    expect(text.split(today).length - 1).toBe(1);
  });
});

/*
 * 深色卡的規格分隔線。
 *
 * 2026-09-02 使用者回報「線條不見了」：畫面上一直有（border-top），**畫布
 * 從來沒畫過**。兩份各自獨立的繪圖程式碼，少一行不會有人發現，除非把圖
 * 存下來比對——所以兩邊都要守。
 */
describe("預覽與輸出都有規格分隔線", () => {
  it("畫面上的卡用 border-top", () => {
    const card = stripComments(
      readFileSync("apps/web/src/components/product/GearShareCard.vue", "utf8")
    );

    expect(card).toContain("border-top: 1px solid var(--color-on-dark-soft);");
  });

  it("畫布也描一條，用同一個 token", () => {
    const painter = stripComments(readFileSync(PAINTER_PATH, "utf8"));

    expect(painter).toContain('colors["--color-on-dark-soft"];');
    // 頁尾本來就有一條線，所以要確認深色卡那條是**另外**一條。
    expect(painter.match(/context\.stroke\(\)/g)?.length ?? 0).toBe(2);
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

  /*
   * 2026-09-02 多了**第三個消費者**：分享圖的 canvas 繪圖。
   *
   * 它是唯一不能用 `<BrandLockup>` 的地方——canvas 讀不到 Vue 模板，所以
   * 幾何才往下抽成 `brandLockupMarkup.ts`。這條擋住「那就在畫布這邊貼一份
   * path 吧」，那正是抽出來想避免的事。
   */
  it("canvas 繪圖也從同一份幾何讀，沒有第三份 path", () => {
    const painter = readFileSync(PAINTER_PATH, "utf8");

    // 比對完整的 import 來源而不是常數名——`BRAND_LOCKUP_MARKUP_X` 也會
    // 滿足名稱片段的比對（CLAUDE.md「守門測試：坑二」，實測過會滑過去）。
    expect(painter).toContain(
      'from "../../components/shell/brandLockupMarkup"'
    );
    // 2026-09-02 起畫布用的是**只有標記**那一份（標題前面不放中文字標）。
    // 守的是「幾何來自那個模組」，不是特定常數名——哪一個 variant 是版面
    // 決定，換 variant 不該讓這條紅。
    expect(painter).toMatch(/\bBRAND_(?:LOCKUP|MARK)_MARKUP\b/);
    expect(painter, "畫布不該自己貼 lockup 的 path").not.toContain(
      'data-part="wordmark"'
    );
  });

  /*
   * 品牌列曾經在畫布上退化成「防曬晴報員」四個字，而畫面上的卡一直是
   * 真的 lockup——預覽跟存下來的圖頂端長得不一樣。修掉之後留一條守門，
   * 因為那種不一致只有把圖存下來比對才看得出來。
   */
  it("畫布不再用文字冒充品牌列", () => {
    const painter = readFileSync(PAINTER_PATH, "utf8");

    expect(stripComments(painter)).not.toContain('fillText("防曬晴報員"');
  });
});

/*
 * 畫面上的卡與輸出的 PNG 是兩份各自獨立的繪圖程式碼。它們**必須**看起來
 * 一樣——那張卡的存在意義就是「等一下會被分享出去的就是這個」。
 *
 * 品類圖示是最容易漂移的部分：兩邊各自寫一次對照表的話，哪天新增品類就
 * 會有一邊漏掉，而且漏掉的那邊是使用者看不到的（PNG 要存下來才知道）。
 * 所以守的是「兩邊都從 GEAR_CATEGORY_ICONS 讀」，不是「兩邊都有圖示」。
 */
/*
 * 2026-09-02（使用者要求）：分享卡拿掉「標記＋防曬晴報員」那一組，改成
 * 標題前面只放標記。
 *
 * 兩邊都要守，理由跟品類圖示那組一樣：預覽與 PNG 是兩份獨立的繪圖程式碼。
 */
describe("卡片抬頭只有標記，沒有中文字標", () => {
  it('畫面上的卡用 variant="mark"', () => {
    const card = stripComments(
      readFileSync("apps/web/src/components/product/GearShareCard.vue", "utf8")
    );

    // 比對完整屬性，不是片段——`variant` 三個字自己會出現在別處。
    expect(card).toContain('variant="mark"');
  });

  it("畫布畫的也是標記，不是完整 lockup", () => {
    const painter = stripComments(readFileSync(PAINTER_PATH, "utf8"));

    expect(painter).toContain("BRAND_MARK_MARKUP");
    expect(painter, "畫布不該畫到中文字標").not.toContain(
      "BRAND_LOCKUP_MARKUP"
    );
  });

  /*
   * 字標本身沒有被刪除——App 頁首仍然用完整 lockup。這條擋的是「順手把
   * 字標從幾何檔裡拿掉」，那會讓頁首跟著壞掉。
   */
  it("完整 lockup 仍然存在，頁首還在用", () => {
    const markup = readFileSync(
      "apps/web/src/components/shell/brandLockupMarkup.ts",
      "utf8"
    );
    const header = readFileSync(
      "apps/web/src/components/shell/BrandHeader.vue",
      "utf8"
    );

    expect(markup).toContain("BRAND_LOCKUP_MARKUP");
    expect(header).toContain("<BrandLockup");
    expect(header, "頁首要的是完整 lockup").not.toContain('variant="mark"');
  });
});

/* 2026-09-02：頁尾日期靠右（使用者要求）。 */
describe("日期靠右", () => {
  it("畫面上的卡用 text-align: end", () => {
    const card = stripComments(
      readFileSync("apps/web/src/components/product/GearShareCard.vue", "utf8")
    );
    const dateBlock = /\.share-card__date \{[^}]*\}/.exec(card)?.[0];

    expect(dateBlock, "找不到日期的規則").toBeDefined();
    expect(dateBlock).toContain("text-align: end;");
  });

  /*
   * canvas 沒有 text-align: end，只能自己量字寬再往回推。這條擋住
   * 「畫面改了、畫布忘了改」——那正是分隔線與品牌列各出過一次的事。
   */
  it("畫布自己量寬度靠右", () => {
    const painter = stripComments(readFileSync(PAINTER_PATH, "utf8"));

    expect(painter).toContain(
      "context.fillText(input.dateLabel, OUTPUT_WIDTH - pad - dateWidth, y);"
    );
  });
});

describe("預覽與輸出用同一份品類圖示", () => {
  it("兩邊都讀 GEAR_CATEGORY_ICONS，沒有人自己列一張表", () => {
    for (const file of [
      "apps/web/src/components/product/GearShareCard.vue",
      PAINTER_PATH
    ]) {
      const source = stripComments(readFileSync(file, "utf8"));
      expect(source, `${file} 應該從 gearPresentation 讀品類圖示`).toContain(
        "GEAR_CATEGORY_ICONS"
      );
      expect(source, `${file} 不該自己寫圖示名稱`).not.toContain(
        "gear-sunglasses"
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

describe("補擦間隔只印包裝真的有寫的（2026-09-02 裁決）", () => {
  /*
   * 兩個方向分開守。原本沒有明確分鐘數時會印「一般 120 分」——那個 120 是
   * `reducer.ts` 的 `GENERAL_MAX_MINUTES` **系統預設**，不是包裝上寫的。
   * 只守「有寫才印」的話，改成永遠不印也會過，那時真的有標示也看不到。
   */
  it("包裝沒寫分鐘數時不印這一列", () => {
    const wrapper = mountCard(data());
    expect(wrapper.text()).not.toContain("補擦間隔");
    expect(wrapper.text(), "不得把系統預設印成規格").not.toContain("120 分");
  });

  it("包裝有寫分鐘數時照印", () => {
    const wrapper = mountCard(
      data({
        sunscreen: product({
          currentSnapshot: {
            ...snapshot,
            reapplicationIntervalStatus: "explicit_minutes",
            reapplicationIntervalMinutes: 80
          }
        })
      })
    );
    expect(wrapper.text()).toContain("補擦間隔");
    expect(wrapper.text()).toContain("80 分");
  });
});

describe("耐水要印上卡片（會影響倒數）", () => {
  it("有耐水標示就印", () => {
    const wrapper = mountCard(
      data({
        sunscreen: product({
          currentSnapshot: {
            ...snapshot,
            waterResistanceStatus: "80",
            waterResistanceMinutes: 80
          }
        })
      })
    );
    expect(wrapper.text()).toContain("耐水");
    expect(wrapper.text()).toContain("80 分鐘");
  });

  /* 「不確定」與「沒有標示」不是資訊，不佔一格。 */
  it("耐水未確認時不印", () => {
    expect(mountCard(data()).text()).not.toContain("耐水");
  });
});

describe("容量與劑型", () => {
  it("有填才印，並用中文標籤", () => {
    const wrapper = mountCard(
      data({ sunscreen: product({ volume: "60ml", formulation: "spray" }) })
    );
    expect(wrapper.text()).toContain("60ml");
    expect(wrapper.text()).toContain("噴霧");
  });

  it("沒填就整格不出現", () => {
    const wrapper = mountCard(data());
    expect(wrapper.text()).not.toContain("容量");
    expect(wrapper.text()).not.toContain("劑型");
  });
});

describe("防曬乳規格欄位的範圍", () => {
  const FORM = readFileSync(
    "apps/web/src/components/product/GearForm.vue",
    "utf8"
  ).replace(/\/\*[\s\S]*?\*\//g, "");

  it("容量／劑型／防護機制只對防曬乳顯示", () => {
    expect(FORM).toMatch(
      /showsSunscreenSpecs = computed\(\s*\(\) => gearCategory\.value === "sunscreen"\s*\)/
    );
    // 三個欄位都掛在同一個條件底下，不是各自判斷。
    expect(FORM).toContain('<template v-if="showsSunscreenSpecs">');
  });

  /* 品類不適用時存 null，跟 size／color 一致：不留「看不到但存著」的資料。 */
  it("非防曬乳存 null", () => {
    for (const field of ["volume", "formulation", "protectionType"]) {
      expect(FORM, field).toContain(`showsSunscreenSpecs.value &&`);
    }
  });

  /*
   * **這條擋的是範圍蔓延，不是 bug。**
   *
   * 2026-09-02 的提案原本有 11 項規格。刻意沒做的兩類：
   *
   *   - Broad Spectrum、BOOTS 星級：台灣市售包裝幾乎不標，欄位會永遠空著
   *   - 海洋友善、不易致粉刺、低敏：**那些是產品宣稱不是規格**。讓使用者
   *     自己勾再印到一張要分享出去的圖上，等於這個 App 幫忙散布未經驗證的
   *     宣稱——跟「不是防護效果保證」「只依包裝標示選擇，不從產品名稱推測」
   *     的立場衝突。
   *
   * 要加回來是可以的，但必須是一次明確的裁決，不是順手加欄位。
   */
  it("沒有偷偷長出宣稱型欄位", () => {
    const contract = readFileSync("packages/contracts/src/product.ts", "utf8");
    for (const claim of [
      "reefSafe",
      "nonComedogenic",
      "hypoallergenic",
      "fragranceFree",
      "broadSpectrum",
      "bootsStars"
    ]) {
      expect(contract, `${claim} 是宣稱不是規格，要加須先裁決`).not.toContain(
        claim
      );
    }
  });
});
