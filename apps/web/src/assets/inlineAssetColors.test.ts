import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 守住 stylelint 掃不到的那個死角。
 *
 * CLAUDE.md 與 `DESIGN.md` 規定 scoped `<style>` 不准寫死顏色，`pnpm
 * lint:css` 也有擋——但 stylelint 只看得懂 CSS 語法節點，**看不進
 * `url()` 裡的字串**。2026-08-29 就有兩處把 `%236F5A54`（也就是
 * `--color-muted`）直接烤進 data URI SVG 的 stroke 裡，兩年份的規則與
 * lint 全部沒攔下來，是人工 review 才發現的。
 *
 * 修法是把顏色從 SVG 拿出來，改用遮罩讓 `background-color` 決定顏色，
 * 這樣顏色就能吃 token。這條測試守的是「不要再有人把顏色寫回去」。
 *
 * 遮罩本身允許 `%23000` 與 `%23fff`：在 mask 裡它們代表不透明／透明
 * 區域，是幾何不是顏色。
 */
const sourceRoot = "apps/web/src";
const maskOnlyValues = new Set(["000", "000000", "fff", "ffffff"]);

function discoverSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverSourceFiles(entryPath);
    return /\.(?:vue|css)$/.test(entry.name) ? [entryPath] : [];
  });
}

/** `%23abcdef`（URL 編碼）與 `#abcdef` 兩種寫法都要抓。 */
const inlineHex = /(?:%23|#)([0-9a-fA-F]{3,8})\b/g;

function findDataUriColors(contents: string): string[] {
  const found: string[] = [];
  for (const line of contents.split("\n")) {
    if (!line.includes("data:image/svg")) continue;
    for (const match of line.matchAll(inlineHex)) {
      const hex = match[1];
      if (hex === undefined) continue;
      if (!maskOnlyValues.has(hex.toLowerCase())) found.push(`#${hex}`);
    }
  }
  return found;
}

describe("行內 SVG 資產不得寫死顏色", () => {
  for (const file of discoverSourceFiles(sourceRoot).sort()) {
    if (file.endsWith("inlineAssetColors.test.ts")) continue;
    it(`${file} 的 data URI 不含色碼`, () => {
      const colors = findDataUriColors(readFileSync(file, "utf8"));
      expect(
        colors,
        `${file}: data URI 裡寫死了 ${colors.join("、")}。顏色要留給 CSS——` +
          `改用 mask-image 搭配 background-color: var(--token)，` +
          `讓顏色能跟著 token 走（見 app.css 的 --mask-wave-divider）。`
      ).toEqual([]);
    });
  }
});
