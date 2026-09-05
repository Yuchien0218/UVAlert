import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 讀數樣式（`.stat-figure`）不決定顏色與行高（2026-09-04，使用者：「更新
 * 時間後面的字體顏色要跟前面一樣」）。
 *
 * 它原本寫死 `color: var(--text-primary)` 與 `line-height: 0.95`。五日預報
 * 的「更新時間 9/4 00:15」因此比同一行的「更新時間」深一階——實測
 * `rgb(46, 41, 37)` 對 `rgb(111, 90, 84)`，看起來像另一個元件掉進來。
 *
 * 需要特定顏色的地方本來就自己指定（首頁 UV 讀數依風險等級上色）；其餘
 * 使用點的父層本來就是 `--text-primary`，所以拿掉之後只有這一處會變。
 */

const strip = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, "");

const APP_CSS = strip(readFileSync("apps/web/src/assets/app.css", "utf8"));

function rule(selector: string): string {
  const start = APP_CSS.indexOf(`${selector} {`);
  expect(start, `找不到 ${selector}`).toBeGreaterThanOrEqual(0);
  return APP_CSS.slice(start, APP_CSS.indexOf("}", start));
}

describe("讀數樣式只管字形，不管顏色與行高", () => {
  it("stat-figure 不寫死顏色", () => {
    expect(rule(".stat-figure")).not.toMatch(/color:/);
  });

  it("stat-figure 不寫死行高", () => {
    expect(rule(".stat-figure")).not.toMatch(/line-height:/);
  });

  /*
   * **反向一：字形還在。** 只守上面兩條的話，把整個 class 清空也是綠的——
   * 那時倒數與 UV 指數會退回內文字體，`tabular-nums` 也沒了，數字每跳一格
   * 就會左右晃。
   */
  it("等寬與 tabular-nums 仍然在", () => {
    const declarations = rule(".stat-figure");

    expect(declarations).toContain("font-family: var(--font-mono);");
    expect(declarations).toContain("font-variant-numeric: tabular-nums;");
    expect(declarations).toContain("font-weight: 600;");
  });

  /*
   * **反向二：大讀數仍然要壓行高。** 0.95 是移走不是刪掉——首頁那顆
   * 倒數少了它，數字上下會多出兩條空白。
   */
  it("--display 變體接手 line-height", () => {
    expect(rule(".stat-figure--display")).toContain("line-height: 0.95;");
  });

  /*
   * **反向三：文件要跟著改。** frontmatter 原本宣告 `textColor`，那是
   * 設計系統對這個 class 的承諾；程式碼改了而文件沒改，下一個人會照文件
   * 把顏色加回去。
   */
  it("DESIGN.md 不再宣告 stat-figure 的顏色", () => {
    const design = readFileSync("DESIGN.md", "utf8");
    const block = design.slice(
      design.indexOf("  stat-figure:"),
      design.indexOf("  status-card-tracking:")
    );

    expect(block).not.toContain("textColor");
    expect(design).toContain("顏色與行高由所在的那句話決定");
  });
});

describe("五日預報的來源兩行分開", () => {
  /*
   * 「資料從哪裡來」與「它多新」是兩件事，貼著排時讀起來像第一句折行。
   * 行距 21px 之間再加 4px。
   */
  it("更新時間那一行有上距", () => {
    const card = strip(
      readFileSync("apps/web/src/components/uv/FiveDayUvCard.vue", "utf8")
    );

    expect(card).toMatch(
      /\.uv-forecast__source > span \{[^}]*margin-top: var\(--space-1\);/
    );
  });
});
