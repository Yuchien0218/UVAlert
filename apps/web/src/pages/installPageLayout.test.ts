import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 安裝頁的狀態與限制併成同一張卡（2026-09-04 使用者要求）。
 *
 * 這一頁只有兩張卡，講的是同一件事的兩面——「這台裝置能不能裝、怎麼裝」
 * 與「裝或不裝各有什麼限制」。分成兩張時它們一樣寬、一樣底色、一樣的標題
 * 層級，中間那道 16px 的縫是唯一的差別。
 */

const strip = (source: string): string =>
  source.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

const SOURCE = strip(readFileSync("apps/web/src/pages/InstallPage.vue", "utf8"));
const TEMPLATE = SOURCE.slice(
  SOURCE.indexOf("<template>"),
  SOURCE.indexOf("<style")
);

describe("安裝頁只有一張卡", () => {
  it("模板裡只出現一次 app-card", () => {
    expect(TEMPLATE.match(/app-card/g) ?? []).toHaveLength(1);
  });

  /*
   * **反向一：四個狀態分支都還在。** 只守「一張卡」的話，把 v-else-if
   * 整串刪掉也是綠的——那時 iOS 使用者就看不到加入主畫面的步驟了。
   */
  it.each([
    "已安裝",
    "可以安裝到這台裝置",
    "用 Safari 加入主畫面",
    "從瀏覽器選單安裝",
    "需要知道的限制"
  ])("%s 這一段還在", (heading) => {
    expect(TEMPLATE).toContain(heading);
  });

  /*
   * **反向二：層級改由分隔線承擔。** 併卡之後兩段之間必須還有一條界線，
   * 否則限制清單會讀起來像安裝步驟的一部分。
   */
  it("兩段之間有分隔線", () => {
    expect(TEMPLATE).toContain('<hr class="install-card__rule" />');
    expect(SOURCE).toMatch(
      /\.install-card__rule \{[^}]*border-top: 1px solid var\(--border-subtle\);/
    );
  });
});
