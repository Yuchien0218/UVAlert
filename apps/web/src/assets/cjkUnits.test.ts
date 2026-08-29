import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 禁止用 `ch` 當寬度單位。
 *
 * `1ch` 是字型裡「0」這個字的寬度。在 28px 字級下實測是 15.8px，而一個
 * 全形中文字是 28.2px——**差 1.79 倍**。所以 `max-width: 14ch` 實際只裝
 * 得下約 7.7 個中文字，不是 14 個。
 *
 * 2026-08-30 的實例：`.page-heading__title` 的 14ch 讓「問題回報與意見
 * 回饋」才 9 個字就被壓成兩行，而容器有 556px——兩倍空間沒用到。文章
 * 標題 21 個字，在第 13 個字後換行。那行來自第一個 commit 的鷹架，
 * `DESIGN.md` 從來沒有規範過標題寬度。
 *
 * 這是一個中文專案，量測寬度請用 `em`：1em 正好是一個全形字，數字寫幾
 * 就是幾個中文字。
 */
const roots = ["apps/web/src", "packages", "tools"];

const widthWithCh =
  /(?:max-|min-)?(?:width|inline-size)\s*:\s*[^;{}]*\b[\d.]+ch\b/g;
const blockComment = /\/\*[\s\S]*?\*\//g;
const lineComment = /^\s*\/\/.*$/gm;

function discoverFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") return [];
      return discoverFiles(entryPath);
    }
    return /\.(?:vue|css|mjs)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("寬度不得使用 ch 單位", () => {
  for (const file of roots.flatMap(discoverFiles).sort()) {
    it(`${file} 沒有用 ch 當寬度`, () => {
      /* 先去掉註解——說明「為什麼不能用 ch」的文字本身會含 ch。 */
      const source = readFileSync(file, "utf8")
        .replace(blockComment, "")
        .replace(lineComment, "");
      const offenders = [...source.matchAll(widthWithCh)].map((match) =>
        match[0].trim()
      );
      expect(
        offenders,
        `${file} 用了 ch 當寬度：${offenders.join("、")}。` +
          `ch 是「0」的字寬，對中文差 1.79 倍——改用 em，1em 正好是一個全形字。`
      ).toEqual([]);
    });
  }
});
