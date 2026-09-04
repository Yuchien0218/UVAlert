import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 2026-09-01：「已選取」只有一種長相（使用者要求統一）。
 *
 * 2026-09-04 補：這條守門當初漏掉了 `ContextSelector`（原因見下方迴圈的
 * 註解），所以「統一」實際上只做了一半。CSS 與比對範圍同日一起修好。
 *
 * 使用者在同一個表單裡看到兩種選中樣式：裝備分類卡是 `--color-primary`
 * 邊框 ＋ `--color-surface-cream-strong` 底，其餘九個使用點與所有
 * `.choice-grid` 走 app.css 的 `--color-muted` 邊框 ＋ `--color-hairline` 底。
 *
 * 選共用那組的理由：一比九，而且 `--color-primary` 是**行動色**（按鈕、
 * 連結）——拿它當選取狀態會讓「這裡可以按」跟「這個已經選了」共用訊號。
 * 視覺強度沒有損失，兩種底色對卡片的對比是 1.20 與 1.26，差別在色相不在
 * 明度；邊框反而更清楚（5.56 vs 4.37，SC 1.4.11 門檻 3:1）。
 */

const sourceRoot = "apps/web/src";
const sharedRules = join(sourceRoot, "assets", "app.css");
const thisTest = join(sourceRoot, "assets", "selectedOptionStyle.test.ts");

function discover(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return discover(path);
    return /\.(?:vue|css)$/.test(entry.name) ? [path] : [];
  });
}

/*
 * 掃描前剝註解——否則「不要用 --color-primary 當選取色」這種解釋文字會被
 * 判成違規，等於禁止在程式碼裡寫明規則（CLAUDE.md 坑一，這個 repo 踩過）。
 */
const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("已選取的外觀只有一組值", () => {
  it("共用規則本身沒有被改掉", () => {
    const css = strip(readFileSync(sharedRules, "utf8"));

    expect(css).toMatch(
      /\.option-selected,\s*\.choice-grid label:has\(input:checked\)\s*\{[^}]*border-color:\s*var\(--color-muted\);[^}]*background:\s*var\(--color-hairline\);/
    );
  });

  /*
   * 每個自己寫「選中」樣式的地方都必須落在同一組值上。
   *
   * **比對完整的宣告**（`border-color: var(--color-primary);`）而不是只找
   * token 名字：只找名字的話，同一個檔案在別處合法地用 --color-primary
   * （例如按鈕）就會誤判（CLAUDE.md 坑二的反面）。
   *
   * 2026-09-04 放寬比對範圍——**這條守門原本漏掉了 ContextSelector**，而它
   * 正是全站最後一個沒統一的地方，等於 2026-09-01 全綠但守了空氣。兩個洞：
   *
   *   1. 只認字面上的 `input:checked`，認不得 `.context-tile__input:checked`
   *      這種帶 class 的寫法。
   *   2. 要求 `:has()` 後面**緊接** `{`，於是
   *      `:has(…:checked),
.context-tile--active {` 這種多重選擇器直接滑掉。
   *
   * 現在的 pattern 允許 `:has()` 到 `{` 之間還有其他選擇器（`[^{}]*` 不跨
   * 區塊，所以不會誤吞下一條規則），選擇器內部也放寬成任意 `…:checked`。
   */
  for (const file of discover(sourceRoot).filter(
    (path) => path !== sharedRules && path !== thisTest
  )) {
    const source = strip(readFileSync(file, "utf8"));
    const blocks = [
      ...source.matchAll(/:has\([^)]*:checked\)[^{}]*\{([^}]*)\}/g)
    ];
    if (blocks.length === 0) continue;

    it(`${file} 的選取樣式沿用共用那組值`, () => {
      for (const [, body] of blocks) {
        expect(body, file).not.toContain("var(--color-primary)");
        expect(body, file).not.toContain("var(--color-surface-cream-strong)");

        if (body!.includes("border-color")) {
          expect(body, file).toContain("border-color: var(--color-muted);");
        }
        if (body!.includes("background")) {
          expect(body, file).toContain("background: var(--color-hairline);");
        }
      }
    });
  }
});
