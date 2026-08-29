import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 守住 `line-height` 一律走 token。
 *
 * 2026-08-25 使用者為了內文行距連調三次（1.7 → 1.75 → 1.7 → 1.6），那次
 * 是用 sed 批次改「1.7」。但衛教文章正文是 **1.85**（更早的 SEO 頁
 * commit 帶進來的），所以整批漏掉，一路留到 2026-08-30 才被發現。
 *
 * 當時全站 105 處 `line-height` 只有 2 處用 token——**漏網不是意外，是這
 * 個結構的必然結果**：值各寫各的，改一處其他不會跟著動。2026-08-30 把
 * 86 處換成 token，這條測試擋住新的寫死值長回來。
 *
 * 允許清單只放「不屬於文字量表」的元件級數值：讀數、圖示與行內元素的
 * 緊湊行高，它們沒有對應的語意角色，硬套 token 是誤用。
 */
const sourceRoot = "apps/web/src";
const packagesRoot = "packages";

/** 元件級例外：讀數／圖示的緊湊行高，以及尚無語意 token 的 1.4。 */
const allowedRawValues = new Set(["1", "0.98", "0.95", "1.2", "1.4"]);

function discoverStyleFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") return [];
      return discoverStyleFiles(entryPath);
    }
    return /\.(?:vue|css)$/.test(entry.name) ? [entryPath] : [];
  });
}

/** 只抓宣告，不抓 `--line-height-body: 1.6` 這種 token 定義本身。 */
const rawLineHeight = /(?:^|[^-\w])line-height:\s*([0-9.]+)\s*;/g;

describe("line-height 一律走 token", () => {
  const files = [
    ...discoverStyleFiles(sourceRoot),
    ...discoverStyleFiles(packagesRoot)
  ].sort();

  for (const file of files) {
    it(`${file} 沒有新的寫死行高`, () => {
      const offenders: string[] = [];
      for (const match of readFileSync(file, "utf8").matchAll(rawLineHeight)) {
        const value = match[1];
        if (value !== undefined && !allowedRawValues.has(value))
          offenders.push(value);
      }
      expect(
        offenders,
        `${file} 寫死了 line-height: ${offenders.join("、")}。` +
          `改用 var(--line-height-body) 等 token——寫死值會讓下次調整行距時` +
          `漏掉這裡，2026-08-25 的 1.85 就是這樣漏了五天。`
      ).toEqual([]);
    });
  }
});
