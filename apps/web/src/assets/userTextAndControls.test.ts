import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 稽核第二輪的三項（2026-09-04，使用者裁決）。
 *
 * 第一輪全部在 375px、而且是「一致性」視角，所以這三件都看不到：使用者
 * 自己打的字、觸控目標的實際高度、桌面寬度。
 */

const strip = (source: string): string =>
  source.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

const read = (path: string): string => strip(readFileSync(path, "utf8"));

const APP_CSS = read("apps/web/src/assets/app.css");
const STYLES = read("packages/ui/src/styles.css");
const HEADER = read("apps/web/src/components/shell/BrandHeader.vue");

function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到 ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

/**
 * 長裝備名稱會把整頁撐寬。
 *
 * 實測：取名 `SuperUltraWaterproofSunscreenSPF50PLUSPAplusplusplus…` 之後，
 * 375px 視窗的 `scrollWidth` 變成 **781**——整頁可以左右捲，頁首、大標、
 * 主按鈕全被切掉右半邊。那串字沒有空格，`overflow-wrap: normal` 不會在詞
 * 中間斷，於是它撐開卡片再撐開整頁。
 */
describe("使用者輸入的字不會撐開版面", () => {
  it("有一個共用的 .user-text", () => {
    expect(rule(APP_CSS, ".user-text")).toContain("overflow-wrap: anywhere;");
  });

  /*
   * **`anywhere` 而不是 `break-word`**：後者不影響 `min-content` 的計算，
   * 在 flex／grid 版型裡撐開容器的行為照樣發生——那正是這次的病灶。
   */
  it("用的是 anywhere，不是 break-word", () => {
    expect(rule(APP_CSS, ".user-text")).not.toContain("break-word");
  });

  it.each([
    ["apps/web/src/components/product/GearListItem.vue", "裝備名稱"],
    ["apps/web/src/components/reminder/ZoneSelectorGrid.vue", "部位藥丸"],
    ["apps/web/src/components/reminder/ZoneStatusList.vue", "部位狀態藥丸"],
    ["apps/web/src/pages/ReapplyPage.vue", "補擦成功卡的防曬乳名稱"]
  ])("%s（%s）套了 .user-text", (file) => {
    expect(read(file)).toContain("user-text");
  });

  /*
   * **反向：不要掛到全站文字上。** `.prose-block` 那條註解講過理由——衛教
   * 文章滿是 UV／SPF／WHO 與英文來源標題，在詞中間亂斷會很難讀。
   */
  it("沒有掛到 body 或全域段落上", () => {
    expect(APP_CSS).not.toMatch(/body \{[^}]*overflow-wrap: anywhere;/);
    expect(APP_CSS).not.toMatch(/^p \{[^}]*overflow-wrap: anywhere;/m);
  });
});

/**
 * 頁首的觸控目標。
 *
 * 實測 Logo 連結 26px、UV／地區入口 42px，`DESIGN.md` 訂的是 44px。
 * 而且元件註解原本寫著「觸控目標靠 padding 撐到 44px」——那句話從一開始
 * 就不成立（12 ＋ 18 ＋ 12 ＝ 42）。
 */
describe("頁首的觸控目標達到 44px", () => {
  it.each([
    ".brand-header__brand",
    ".brand-header__uv",
    ".brand-header__set-region"
  ])("%s 有 min-height", (selector) => {
    expect(rule(HEADER, selector)).toContain(
      "min-height: var(--tap-target);"
    );
  });

  /*
   * **反向：Logo 本身不准跟著長大。** 1.6rem 是 2026-08-31 的裁決（前一版
   * 32px 被回報「太大了」）。要撐的是**可以按的範圍**，不是圖。
   */
  it("Logo 的視覺高度仍然是 1.6rem", () => {
    expect(rule(HEADER, ".brand-header__logo")).toContain("height: 1.6rem;");
  });
});

/**
 * 桌面／平板的控制項寬度。
 *
 * 1280px 視窗實測（內容欄 662px）：首頁主 CTA 662、回饋頁送出鈕 620、
 * textarea 620、select 620。內容欄本身有 752px 上限並且置中，那部分是
 * 對的；沒有上限的是控制項。
 */
describe("控制項有寬度上限", () => {
  it("token 存在", () => {
    expect(STYLES).toMatch(/--control-max:\s*26rem;/);
  });

  it("按鈕有上限", () => {
    expect(rule(APP_CSS, ".button")).toContain(
      "max-width: var(--control-max);"
    );
  });

  it("輸入欄位有上限", () => {
    expect(APP_CSS).toMatch(
      /input:not\(\[type="radio"\], \[type="checkbox"\]\),\s*select,\s*textarea \{[^}]*max-width: var\(--control-max\);/
    );
  });

  /*
   * **反向一：手機的滿版按鈕不受影響。** 26rem 比手機的內容欄寬，這條上限
   * 在小螢幕本來就不作用；但 `.button` 在 31rem 以下那條 `width: 100%`
   * 必須還在，否則主要行動會縮成一顆小按鈕。
   */
  it("窄螢幕的滿版按鈕規則還在", () => {
    expect(APP_CSS).toMatch(/@media \(max-width: 31rem\) \{\s*\.button \{\s*width: 100%;/);
  });

  /*
   * **反向二：內容欄的上限沒有被改掉。** 這次動的是控制項，不是版心——
   * 兩者都改的話畫面會縮成一條，而那不是使用者選的方向。
   */
  it("內容欄仍然是 47rem", () => {
    expect(STYLES).toMatch(/--content-max:\s*47rem;/);
  });
});
