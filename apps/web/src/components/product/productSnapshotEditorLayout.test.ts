import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 2026-09-01：包裝標示卡的圖示改成衛教頁那種領銜排法（使用者要求
 * 「現在左側很空」）。
 *
 * 收斂前是 `grid-template-columns: auto 1fr` ＋ 24px 圖示：圖示只有 24px
 * 高，卻撐開一整條與卡片同高的欄——實測圖示下方 168px 空白，右欄文字被
 * 壓窄一個欄寬。跟 2026-08-31 衛教分類卡那個 122px 空欄同一個病。
 */

const SOURCE = readFileSync(
  "apps/web/src/components/product/ProductSnapshotEditor.vue",
  "utf8"
)
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

describe("包裝標示卡的標題列", () => {
  /*
   * 比對完整的開標籤，不是「IconLead」這個字串——後者連 import 那一行都
   * 算數，元件從畫面上被拿掉之後測試仍然會綠（CLAUDE.md 坑二）。
   */
  it("圖示與標題走 IconLead", () => {
    expect(SOURCE).toContain('<IconLead icon="feature-session-product">');
  });

  /*
   * **兩件事分開守。** 只守「有 IconLead」的話，把兩欄 grid 留著也會過
   * ——那時圖示排到標題旁邊了，但左邊那條空欄還在，等於問題沒解決。
   */
  it("卡片本身不再是「圖示一欄、內容一欄」", () => {
    const rule = /\.session-product \{[^}]*\}/.exec(SOURCE)?.[0];

    expect(rule, "找不到 .session-product 規則").toBeDefined();
    expect(rule).not.toContain("grid-template-columns");
  });

  /* 圖示尺寸不在這裡寫死——那是 IconLead 唯一的職責（2026-08-31 收斂）。 */
  it("不自己指定圖示尺寸", () => {
    const lead = /<IconLead[^>]*>/.exec(SOURCE)?.[0];

    expect(lead).toBeDefined();
    expect(lead).not.toContain(":size");
  });
});
