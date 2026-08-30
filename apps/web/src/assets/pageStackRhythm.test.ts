import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * `.page-stack` 的區塊間距只能用三個具名檔位。
 *
 * 2026-08-30 之前，5 個頁面各自把它覆寫成 16／20／24／32 四種值，而
 * `DESIGN.md` 沒有任何規則說什麼時候該用哪個。結果是「這頁太開」只能
 * 憑感覺判斷，沒有依據可以爭論。
 *
 * 現在三個檔位是：
 *
 * - `--page-stack-gap-compact`（16px）區塊多、每塊短的設定頁
 * - `--page-stack-gap`（24px）預設，18 個頁面在用
 * - `--page-stack-gap-prose`（32px）閱讀為主、區塊少而長的長文頁
 *
 * 收斂時數值一個都沒變，只是給了名字與適用場合。
 *
 * **實作註記**：這裡刻意用字串搜尋而不是動態組出來的 RegExp。這個檔案
 * 的第一版用 `new RegExp` 拼選擇器，跳脫在產生檔案的過程中被吃掉，結果
 * 樣式永遠匹配不到——測試全綠但守的是空氣。字串比對沒有跳脫問題。
 */
const sourceRoot = "apps/web/src/pages";

const allowedGaps = [
  "var(--page-stack-gap)",
  "var(--page-stack-gap-compact)",
  "var(--page-stack-gap-prose)"
];

/**
 * 唯一的例外：首頁 20px。
 *
 * 首屏「不捲動就要看完倒數、狀態與下一步」是實測出來的約束（DESIGN.md
 * 第四節），收進 compact 或放大到預設都會動到核心畫面。要改是視覺決定，
 * 不是收斂決定。
 */
const documentedExceptions = new Set(["HomePage.vue"]);

function discoverPages(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverPages(entryPath);
    return entry.name.endsWith(".vue") ? [entryPath] : [];
  });
}

function stripComments(css: string): string {
  return css
    .split("/*")
    .map((part, index) =>
      index === 0 ? part : part.slice(part.indexOf("*/") + 2)
    )
    .join("");
}

/** 取出 `.name { … }` 規則的內容；找不到回傳 null。 */
function ruleBody(css: string, name: string): string | null {
  const start = css.indexOf("." + name + " {");
  if (start < 0) return null;
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  if (open < 0 || close < 0) return null;
  return css.slice(open + 1, close);
}

/** 取出宣告區塊裡的 gap 值；沒有回傳 null。 */
function gapValue(body: string): string | null {
  for (const declaration of body.split(";")) {
    const [property, ...rest] = declaration.split(":");
    if (property !== undefined && property.trim() === "gap")
      return rest.join(":").trim();
  }
  return null;
}

describe("page-stack 的區塊間距只用具名檔位", () => {
  for (const file of discoverPages(sourceRoot).sort()) {
    const source = readFileSync(file, "utf8");
    const usage = /class="page-stack([^"]*)"/.exec(source);
    if (usage === null) continue;
    if (documentedExceptions.has(basename(file))) continue;

    const styleStart = source.indexOf("<style");
    const style = stripComments(styleStart < 0 ? "" : source.slice(styleStart));
    const companions = (usage[1] ?? "").trim().split(/ +/).filter(Boolean);

    it(`${file} 的 page-stack 間距用具名檔位`, () => {
      const offenders: string[] = [];
      for (const name of [...companions, "page-stack"]) {
        const body = ruleBody(style, name);
        if (body === null) continue;
        const gap = gapValue(body);
        if (gap === null) continue;
        if (!allowedGaps.includes(gap)) offenders.push("." + name + " → " + gap);
      }
      expect(
        offenders,
        `${file} 的區塊間距沒有用具名檔位：${offenders.join("、")}。` +
          `請改用 --page-stack-gap（預設 24px）、-compact（16px）或 -prose（32px）；` +
          `真的需要別的值就是新增一個檔位，要先在 DESIGN.md 說明適用場合。`
      ).toEqual([]);
    });
  }
});
