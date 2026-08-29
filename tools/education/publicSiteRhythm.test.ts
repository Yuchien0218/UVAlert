import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 公開衛教靜態頁是獨立的 HTML 產生器，**不吃 CSS 變數**，所以它的排版
 * 數值只能手抄 App 端的 token。手抄的東西一定會漂開——這條測試就是那個
 * 「記得兩邊一起改」的機制。
 *
 * 比對方式是把 styles.css 的 token 值換算成 rem/無單位，再確認產生器裡
 * 出現對應的字面值。不比對整段 CSS，因為兩邊的排版脈絡本來就不同（靜態
 * 頁沒有 App 外殼），只守「同一個決定的數值有沒有一致」。
 */
const stylesCss = readFileSync("packages/ui/src/styles.css", "utf8");
const generator = readFileSync(
  "tools/education/generate-public-site.mjs",
  "utf8"
);

function tokenValue(name: string): string {
  const match = new RegExp(`--${name}:\s*([^;]+);`).exec(stylesCss);
  expect(match?.[1], `styles.css 找不到 --${name}`).toBeDefined();
  return (match?.[1] ?? "").trim();
}

/** `var(--space-3)` → 該 space token 的 rem 值。 */
function resolveSpace(expression: string): string {
  const ref = /var\(--(space-[\w-]+)\)/.exec(expression);
  if (ref?.[1] === undefined) return expression;
  return tokenValue(ref[1]);
}

describe("公開靜態頁的長文節奏與 App 端一致", () => {
  it("正文行高一致", () => {
    expect(
      generator,
      `App 端 --line-height-body 是 ${tokenValue("line-height-body")}，` +
        `產生器要用同一個值`
    ).toContain(`line-height: ${tokenValue("line-height-body")};`);
  });

  it("段落間距一致", () => {
    const gap = resolveSpace(tokenValue("prose-paragraph-gap"));
    expect(
      generator,
      `App 端 --prose-paragraph-gap 換算是 ${gap}，產生器要用同一個值`
    ).toContain(`margin: 0 0 ${gap.replace(/^0/, "")};`);
  });

  it("章節標題上緣間距一致", () => {
    const gap = resolveSpace(tokenValue("prose-heading-gap-before"));
    expect(
      generator,
      `App 端 --prose-heading-gap-before 換算是 ${gap}，產生器要用同一個值`
    ).toContain(`h2 { margin: ${gap} 0`);
  });

  it("長文排版三件套都有套用", () => {
    for (const rule of [
      "text-align: justify",
      "text-wrap: pretty",
      "overflow-wrap: break-word"
    ]) {
      expect(generator, `產生器缺少 ${rule}`).toContain(rule);
    }
  });
});
