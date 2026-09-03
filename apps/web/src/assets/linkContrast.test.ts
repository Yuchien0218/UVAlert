import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 文字連結的對比（2026-09-03，使用者裁決）。
 *
 * `--color-primary` `#9F5E42` 是為「填色底＋白字」調的：白字在它上面 4.80，
 * 通過。但拿它當**文字**色時底色換成介面本身——畫布 4.66（勉強），
 * **卡片 4.37，未達 WCAG AA 的 4.5**，而卡片上有 6 個文字連結。
 *
 * `DESIGN.md` 第十二節原本寫「文字連結 4.66:1 … 全數通過 AA」，那句話只量了
 * 畫布底。這裡把數字算出來守住，不再靠人工量一次寫死在文件裡。
 */

const STYLES = readFileSync("packages/ui/src/styles.css", "utf8");
const APP_CSS = readFileSync("apps/web/src/assets/app.css", "utf8");

function token(name: string): string {
  const value = new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6});`).exec(STYLES)?.[1];
  expect(value, `找不到 ${name}`).toBeDefined();
  return value!;
}

function channels(hex: string): [number, number, number] {
  return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [
    number,
    number,
    number
  ];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

describe("文字連結在每一種底色上都通過 AA", () => {
  const AA_NORMAL = 4.5;

  /*
   * 三種底都要守，因為**卡片有兩個深度**：一般卡片是
   * `--color-surface-soft`，更深的是 `--color-surface-card`。只守常見的那個
   * 的話，`#96583e` 也會過（4.83）——但它在深的那個上只有 4.39，仍然不過。
   */
  it.each(["--color-canvas", "--color-surface-soft", "--color-surface-card"])(
    "在 %s 上 ≥ 4.5",
    (surface) => {
      expect(
        contrast(token("--color-primary-text"), token(surface))
      ).toBeGreaterThanOrEqual(AA_NORMAL);
    }
  );

  /*
   * **反向一：這個 token 真的被用在連結上。** 只守顏色值的話，定義了一個
   * 通過 AA 的 token 卻沒人用，測試照樣全綠。
   */
  it("共用的 .text-link 用的是文字版行動色", () => {
    expect(APP_CSS).toMatch(
      /\.text-link \{[^}]*color: var\(--color-primary-text\);/
    );
  });

  /*
   * **反向二：填色用的行動色不要跟著改深。** 按鈕那裡的對比是白字對底色
   * （4.80），把底色壓暗只會讓按鈕變重，而且會改掉品牌主色。
   */
  it("填色用的 --color-primary 維持原值", () => {
    expect(token("--color-primary")).toBe("#9f5e42");
  });

  /*
   * **反向三：把舊數字留在 DESIGN.md 裡等於留著一句錯的話。** 那句「文字
   * 連結 4.66:1，全數通過」是這次問題能藏這麼久的原因。
   */
  it("DESIGN.md 不再宣稱文字連結 4.66 就通過", () => {
    const design = readFileSync("DESIGN.md", "utf8");

    expect(design).not.toContain("文字連結 4.66:1、焦點環");
    expect(design).toContain("文字連結要看底色");
  });
});
