// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 2026-09-01 第八批的裝備兩頁。
 *
 * 使用者要求：清單頁「使用中／收納中」之間加分隔線。
 *
 * 詳情頁的部分（叉叉改返回、裝備資訊卡的文字）2026-09-01 稍後整頁改成抽屜，
 * 那些守門搬到 `components/product/GearDetailSheet.test.ts`。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const LIST = strip(readFileSync("apps/web/src/pages/ProductsPage.vue", "utf8"));

describe("裝備清單的分隔線", () => {
  /*
   * **2026-09-04：兩條線都從 `<hr>` 改成相鄰區塊自己的邊。**
   *
   * `<hr>` 是 `.page-stack` 的子元素，上下各吃一整份 stack gap，於是線與
   * 兩邊等距——它不屬於任何一段（使用者：「加了水平線之後這一區很空」）。
   */
  it("使用中與收納中之間那條線是收納中那一段的上緣", () => {
    expect(LIST).toMatch(
      /\.gear-past \{[^}]*border-top:\s*1px solid var\(--border-subtle\);/
    );
    expect(LIST).toContain('class="gear-past"');
  });

  /*
   * 沒有收納中的裝備時不畫線——一條下面什麼都沒有的線，讀起來像內容沒載入
   * 完。改成 border 之後這件事是白送的：線跟著那個 section 的 v-if，
   * 整段不在就沒有線，不必再維護第二個一模一樣的條件。
   */
  it("沒有收納中的裝備時整段都不在，所以也沒有線", () => {
    expect(LIST).toMatch(
      /<section\s+v-if="past\.length > 0"\s+class="gear-past"/
    );
  });

  /* 頁面裡不該再有任何獨立的 `<hr>`。 */
  it("不再用 <hr> 畫分隔", () => {
    expect(LIST).not.toContain("<hr");
  });
});
