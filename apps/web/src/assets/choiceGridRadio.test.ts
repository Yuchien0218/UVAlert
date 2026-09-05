import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * `.choice-grid` 的選項不再顯示原生的圓點（2026-09-03）。
 *
 * 承接同日「部位藥丸拿掉勾勾」那一批：使用者要我盤點其他頁面，然後裁決
 * 「改有預設值的那幾組」。
 *
 * `.choice-grid` 有三個使用點——記錄補擦的「為什麼補擦」、記錄狀況的下水
 * 時間確信度、產品標示問答——每一組都**保證永遠有一項是選的**，
 * 所以拿掉圓點之後仍然看得出選了什麼。checkbox 不在這一批裡：一組都沒勾時
 * 整排會變成一模一樣的素卡片，看不出那是選項。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const APP_CSS = strip(readFileSync("apps/web/src/assets/app.css", "utf8"));

/** 取出某個選擇器的宣告區塊。 */
function rule(selector: string): string {
  const match = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`
  ).exec(APP_CSS);
  expect(match, `找不到 ${selector} 的規則`).not.toBeNull();
  return match![1]!;
}

describe("選項卡片不顯示原生的圓點", () => {
  /*
   * **只藏 radio。** 選擇器寫成 `.choice-grid label input` 的話會連
   * ProductSnapshotEditor 的分鐘數欄位一起藏掉——那是使用者要輸入的東西。
   * 所以比對完整的屬性選擇器，不是「有沒有提到 input」。
   */
  it("只藏 radio，而且只藏直接子代", () => {
    expect(APP_CSS).toContain('.choice-grid label > input[type="radio"] {');
    expect(rule('.choice-grid label > input[type="radio"]')).toContain(
      "clip: rect(0, 0, 0, 0);"
    );
  });

  /*
   * **反向一：選取狀態要有別的出口。** 只藏掉圓點的話，選了哪一項完全看
   * 不出來。這條顏色 2026-08-24 從 5 個各自實作的地方收斂成一份。
   */
  it("選取狀態改由選項卡片本身呈現", () => {
    expect(APP_CSS).toMatch(
      /\.choice-grid label:has\(input:checked\) \{[^}]*background: var\(--color-hairline\);/
    );
  });

  /*
   * **反向二：焦點框要自己接回來。** 焦點原本畫在圓點上；圓點不見了，
   * 鍵盤使用者就看不出停在哪一項（WCAG SC 2.4.7）。radio 群組是靠方向鍵
   * 移動的，沒有焦點框等於完全不能用。
   */
  it("焦點框畫在選項卡片上", () => {
    expect(
      rule('.choice-grid label:has(> input[type="radio"]:focus-visible)')
    ).toContain("outline: 0.15rem solid var(--focus-ring);");
  });

  /*
   * **反向三：欄數要跟著改回一欄。** 圓點移出版面之後，內容留在原本的
   * `auto` 那一欄會縮成內容寬，長選項（「每 15 分鐘再提醒一次」）提早折行。
   */
  it("選項改回單欄", () => {
    const declarations = rule(".choice-grid label");

    expect(declarations).toContain("grid-template-columns: minmax(0, 1fr);");
    // 絕對定位的 radio 要以卡片為定位基準，否則會跑到頁面左上角。
    expect(declarations).toContain("position: relative;");
  });

  /*
   * **控制項只是藏起來，不是刪掉。** 三個使用點的 `<input type="radio">`
   * 都必須還在——這是鍵盤操作與螢幕閱讀器唯一的依據。
   */
  it.each([
    "apps/web/src/components/reapplication/ReapplyReasonPicker.vue",
    "apps/web/src/pages/ReportContextEventPage.vue",
    "apps/web/src/components/product/ProductSnapshotEditor.vue"
  ])("%s 仍然用原生的 radio", (path) => {
    expect(strip(readFileSync(path, "utf8"))).toContain('type="radio"');
  });

  /*
   * **checkbox 不在這一批裡。** 分享頁那個「在卡片上顯示價格」是單獨一個
   * 開關，不是一組選項——沒有方塊就沒有任何「這裡可以切換」的訊號。
   */
  it("分享頁的價格開關仍然看得到方塊", () => {
    const share = strip(readFileSync("apps/web/src/pages/GearSharePage.vue", "utf8"));

    expect(share).toContain('type="checkbox"');
    expect(share).not.toContain("choice-grid");
  });
});
