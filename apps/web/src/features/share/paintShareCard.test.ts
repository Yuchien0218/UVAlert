import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 分享卡輸出 PNG（計畫階段二）與系統分享（階段三）的守門。
 *
 * **這裡刻意只掃原始碼，不掛載。** canvas 2D 在 happy-dom 裡沒有實作，
 * `getContext("2d")` 回 null——硬要在單元測試裡跑繪圖只能整段 mock 掉，
 * 那時測的是 mock 不是程式。真正的輸出是在瀏覽器裡驗的（1080×1548 的
 * PNG，實測內容從第 71 列到第 1452 列、上下留白 71／96）。
 *
 * 所以這裡守的是**看不見但會壞的約束**：色碼不得寫死、風險色不得進深色卡、
 * 版面數學不得有第二份、使用者取消不得當成錯誤。
 */

const strip = (source: string): string =>
  source
    .replace(/\/\*\*[\s\S]*?\*\//g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const PAINTER = strip(
  readFileSync("apps/web/src/features/share/paintShareCard.ts", "utf8")
);
const TOKENS = strip(
  readFileSync("apps/web/src/features/share/shareCardTokens.ts", "utf8")
);
const ADAPTER = strip(
  readFileSync("apps/web/src/adapters/BrowserShare.ts", "utf8")
);

describe("繪圖不得自己抄一份設計系統", () => {
  /*
   * 手繪 canvas 最大的風險就是「把色碼抄進 JS」——那會變成 token 的第四份
   * 真相，而且沒有任何東西守著它（DESIGN.md 第十節、2026-08-26 收斂清單都
   * 把「多份真相、無同步機制」列為根因）。
   */
  it("沒有任何色碼字面量", () => {
    expect(PAINTER).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(PAINTER).not.toMatch(/\brgba?\(/);
  });

  it("顏色從實際套用的 CSS 讀出來", () => {
    expect(PAINTER).toContain("readShareCardColors(COLOR_TOKENS)");
    expect(PAINTER).toContain("readSpacingScale(SPACING_TOKENS, SCALE)");
  });

  /*
   * 用探針元素而不是 `getPropertyValue`：`--surface-inverse` 的宣告值是
   * `var(--color-surface-dark)`，不同瀏覽器對這種轉指是否展開並不一致，
   * 拿到字面的 "var(...)" 時 canvas 只會畫出透明。
   */
  it("顏色走探針元素，不直接讀自訂屬性字串", () => {
    expect(TOKENS).toContain("getComputedStyle(probe).color");
    expect(TOKENS).toContain("probe.remove()");
  });
});

describe("風險色的約束跟著進到 canvas", () => {
  /*
   * 五個 UV 風險色在深色卡上是 2.42–2.93，全部過不了 AA。DOM 版有守門
   * （`gearShareCard.test.ts`），**canvas 是另一份實作，同一個約束要再守
   * 一次**——只守 DOM 的話，圖片版把 UV 畫進深色卡不會有人擋。
   */
  it("風險色只在深色卡之外使用", () => {
    const darkCard = /roundedRect\(context, pad, y, contentWidth, cardHeight[\s\S]*?y \+= cardHeight/.exec(
      PAINTER
    )?.[0];

    expect(darkCard, "找不到深色卡的繪製段落").toBeDefined();
    expect(darkCard).toContain('colors["--surface-inverse"]');
    expect(darkCard).not.toContain("UVI_COLOR_TOKEN");
  });
});

describe("版面數學只有一份", () => {
  /*
   * 高度必須由 `paint` 自己回報，不能另外寫一個 measure()。兩份版面數學
   * 一定會漂移：之後調 paint 裡的一個間距，measure 不會跟著改，而畫面上
   * 只會表現成圖片底部多或少一截空白——會靜靜爛掉。
   */
  it("高度由 paint 回傳，沒有第二份 measure", () => {
    expect(PAINTER).toContain("const contentBottom = paint(scratchContext");
    expect(PAINTER, "不得再出現獨立的 measure()").not.toMatch(
      /function measure\s*\(/
    );
  });

  /*
   * 安全註記是 DESIGN.md 第五節的「不可隱藏」項目。固定高度會在內容多時
   * 把它切掉——切掉比圖片比例不標準嚴重得多。
   */
  it("內容超過最小高度時讓畫布長，不裁切", () => {
    expect(PAINTER).toContain(
      "Math.max(MIN_OUTPUT_HEIGHT, Math.ceil(contentBottom + pad))"
    );
  });
});

describe("字型要等載入完成", () => {
  /*
   * 沒等 `document.fonts.ready` 的話，canvas 會用 fallback 字型畫，而畫面上
   * 的 DOM 已經換成 web font——同一張卡在畫面與圖片裡長得不一樣。
   */
  it("繪圖前 await document.fonts.ready", () => {
    expect(PAINTER).toContain("await document.fonts.ready;");
  });
});

describe("系統分享", () => {
  /*
   * **只檢查 `navigator.share` 存在是不夠的。** 桌面 Chrome 有 share 但多半
   * 不接受 files，直接呼叫會 reject。而且要帶著真的那個 file 去問——有些
   * 實作依 MIME 與大小拒絕。
   */
  it("用 canShare({ files }) 而不是只看 share 存在", () => {
    expect(ADAPTER).toContain("nav.canShare({ files: [file] })");
  });

  /*
   * **使用者按取消不是錯誤。** Web Share API 對取消與失敗都是 reject，只能
   * 靠 name === "AbortError" 分辨。不分辨的話每次取消都會跳「分享失敗」。
   */
  it("取消與失敗分開", () => {
    expect(ADAPTER).toContain('error.name === "AbortError"');
    expect(ADAPTER).toContain('return "cancelled"');
    expect(ADAPTER).toContain('return "failed"');
  });

  /*
   * 瀏覽器 API 走 port＋adapter，不在元件裡直接碰 navigator——這個 repo 的
   * 依賴方向是單向的（CLAUDE.md「套件邊界」）。
   */
  it("分享頁不直接碰 navigator", () => {
    const page = strip(
      readFileSync("apps/web/src/pages/GearSharePage.vue", "utf8")
    );
    expect(page).not.toContain("navigator.");
    expect(page).toContain("share.canShareFiles(file)");
  });

  /*
   * 「儲存圖片」是主要動作、永遠都在；「分享」只在瀏覽器真的收得下檔案時
   * 才出現。反過來會讓多數桌面使用者按到一顆不能用的按鈕。
   */
  it("儲存圖片無條件顯示，分享鈕有條件", () => {
    const page = strip(
      readFileSync("apps/web/src/pages/GearSharePage.vue", "utf8")
    );
    const save = /<button[^>]*@click="saveImage"/.exec(page)?.[0] ?? "";
    const shareButton = /<button[\s\S]{0,200}?@click="shareImage"/.exec(page)?.[0] ?? "";

    expect(save, "儲存圖片不該有 v-if").not.toContain("v-if");
    expect(shareButton).toContain('v-if="canShare"');
  });
});
