import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 待修清單第三批（2026-09-04）：首頁 UV 讀數列的基線、裝備頁的標題區。
 */

const strip = (source: string): string =>
  source.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

const read = (path: string): string => strip(readFileSync(path, "utf8"));

const UV = read("apps/web/src/components/home/HomeUvHeadline.vue");
const PRODUCTS = read("apps/web/src/pages/ProductsPage.vue");

function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到 ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * 首頁 UV 讀數列。
 *
 * `flex-end` 對齊的是**盒子**下緣，三個盒子確實都收在同一條線上（實測都是
 * 196.4）。但「五日預報 ›」是 `ChevronLink`，它有 44px 的觸控高度、文字在
 * 裡面垂直置中——盒子貼齊底部時那行字反而被抬高約 8px。
 */
describe("UV 讀數列對齊文字而不是盒子", () => {
  it("用 baseline 對齊", () => {
    expect(rule(UV, ".uv-headline__value")).toContain("align-items: baseline;");
  });

  /*
   * **反向：不可以退回 flex-end。** 那是這次要修掉的東西，而且它「看起來
   * 也像對齊了」——盒子確實齊，只有字沒齊。
   */
  it("不再用 flex-end", () => {
    expect(rule(UV, ".uv-headline__value")).not.toContain(
      "align-items: flex-end;"
    );
  });
});

/**
 * 裝備頁的標題區。
 */
describe("裝備頁的標題區", () => {
  /*
   * #130／#137 修過的同一個坑的第三個病例：標題與說明包在同一個 `<div>`
   * 當左欄，說明因此也少掉圖示鈕的寬度（實測可用 336、只拿到 320）。
   */
  it("改用共用的 page-heading--with-exit", () => {
    expect(PRODUCTS).toContain("page-heading page-heading--with-exit");
  });

  it("不再有自己那一套兩欄版型", () => {
    expect(PRODUCTS).not.toContain(".gear-heading");
  });

  /*
   * **反向：分享鈕要還在。** 只守版型的話，把 IconButton 刪掉也是綠的——
   * 那時這一頁就沒有分享入口了。
   */
  it("分享鈕還在，而且只在有使用中的裝備時出現", () => {
    expect(PRODUCTS).toContain('icon="tool-share"');
    expect(PRODUCTS).toContain('v-if="current.length > 0"');
  });

  /*
   * 標題區與清單之間的分隔線。量出來的原因是**間距完全一樣**：`.page-stack`
   * 的 gap 是 20px，標題區到「使用中」是 20、「使用中」到新增鈕也是 20，
   * 標題區沒有任何訊號說它是上一層。
   */
  it("標題區下面有一條分隔線", () => {
    /*
     * 2026-09-04：線改成標題區自己的下緣（`<hr>` 上下各吃一整份 stack gap，
     * 於是與兩邊等距、不屬於任何一段）。守的東西沒變——標題區與清單之間
     * 仍然要有一條可見的界線。
     */
    expect(PRODUCTS).toMatch(
      /\.page-heading--with-exit \{[^}]*border-bottom:\s*1px solid var\(--border-subtle\);/
    );
  });

  /*
   * **反向：兩組之間那條線要還在。** 它是 2026-09-01 使用者指定位置的，
   * 標的是「會用於新提醒」與「不會」的轉折。
   */
  it("使用中與收納中之間的線也還在", () => {
    expect(PRODUCTS).toMatch(
      /\.gear-past \{[^}]*border-top:\s*1px solid var\(--border-subtle\);/
    );
  });
});
