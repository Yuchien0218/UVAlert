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
  it("使用中與收納中之間有一條線", () => {
    expect(LIST).toContain('<hr v-if="past.length > 0" class="gear-section-rule" />');
    expect(LIST).toMatch(
      /\.gear-section-rule \{[^}]*border-top:\s*1px solid var\(--border-subtle\);/
    );
  });

  /*
   * 沒有收納中的裝備時不畫線——一條下面什麼都沒有的線，讀起來像內容沒載入
   * 完。條件與那個 section 的 v-if 綁在一起。
   */
  it("沒有收納中的裝備時不畫線", () => {
    expect(LIST).toContain('v-if="past.length > 0" class="gear-section-rule"');
  });
});
