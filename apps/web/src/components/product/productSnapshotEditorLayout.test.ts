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

/**
 * 2026-09-03（待辦第三＋五項）：標題、四題與 SPF／PA 合成一張卡。
 *
 * 改動前是三張各自獨立的 `app-card`，其中第一張**沒有任何控制項**——只有
 * 圖示、eyebrow、標題與一句說明，卻佔一張完整的卡。三塊講的是同一件事。
 */
describe("包裝標示只有一張卡", () => {
  /* 比對完整的 class 屬性，不是「app-card」這個字（CLAUDE.md 坑二）。 */
  const appCards = SOURCE.match(/class="[^"]*\bapp-card\b[^"]*"/g) ?? [];

  it("整個編輯器只出現一次 app-card", () => {
    expect(appCards).toEqual(['class="label-card app-card"']);
  });

  it("標題區與四題都在那張卡裡面，不再各自成卡", () => {
    expect(SOURCE).toContain('<div class="session-product">');
    expect(SOURCE).toContain('<div class="label-questions">');
  });

  /*
   * 卡片自己不能有內距：四題的分隔線要橫貫整張卡，有內距的話線會兩端
   * 各縮排一截，看起來像沒對齊。
   */
  it("卡片 padding 為 0，內距由各區自己出", () => {
    const rule = /\.label-card \{[^}]*\}/.exec(SOURCE)?.[0];

    expect(rule, "找不到 .label-card 規則").toBeDefined();
    expect(rule).toContain("padding: 0;");
  });

  /*
   * SPF／PA 進到卡裡（第五項）。
   *
   * 用「slot 出現在 </section> 之前」比對，而不是只看 slot 存在——後者在
   * slot 被搬到卡外時仍然會綠。
   */
  it("SPF／PA 的 slot 在卡片內", () => {
    const card = /<section class="label-card app-card">[\s\S]*?<\/section>/.exec(
      SOURCE
    )?.[0];

    expect(card, "找不到那張卡").toBeDefined();
    expect(card).toContain('<slot name="identity" />');
  });

  /*
   * **反向：警示不可以被一起收進卡裡。**
   *
   * 它的既有註解寫明「不受收合影響，這個後果必須一直看得到」。只守上面
   * 幾條的話，把 `<aside>` 也搬進卡裡仍然全綠。
   */
  it("未確認標示的警示仍然獨立在卡片外", () => {
    const card = /<section class="label-card app-card">[\s\S]*?<\/section>/.exec(
      SOURCE
    )?.[0];

    expect(card).not.toContain("identity-warning");
    expect(SOURCE).toContain('class="identity-warning"');
  });
});
