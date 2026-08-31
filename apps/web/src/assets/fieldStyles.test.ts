import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 表單欄位外觀收斂守門（2026-08-31）。
 *
 * 收斂前是四份各自的 scoped 拷貝——QuickTimePicker、GearForm、
 * ReapplicationProductAssignments、FeedbackPage——同樣的宣告抄四次然後
 * 各自漂移。分歧已經造成兩個實際問題：GearForm 漏掉 `select`（下拉是
 * 瀏覽器原生外觀），FeedbackPage 漏掉 `min-height`（欄位可能低於 44px，
 * WCAG SC 2.5.5）。
 *
 * 掃原始碼前先剝註解（CLAUDE.md「守門測試」段的坑一）——否則上面這段
 * 說明裡的 `border: 1px solid var(--border-strong)` 就會讓測試誤判。
 */

const APP_CSS = "apps/web/src/assets/app.css";

/** 收斂前各自抄過一份的四個檔案。 */
const FORMERLY_DUPLICATED = [
  "apps/web/src/components/common/QuickTimePicker.vue",
  "apps/web/src/components/product/GearForm.vue",
  "apps/web/src/components/reapplication/ReapplicationProductAssignments.vue",
  "apps/web/src/pages/FeedbackPage.vue"
];

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const appCss = strip(readFileSync(APP_CSS, "utf8"));

/** 共用宣告那條規則的內容。 */
const sharedRule =
  appCss.match(
    /input:not\(\[type="radio"\], \[type="checkbox"\]\),\s*select,\s*textarea \{([^}]*)\}/
  )?.[1] ?? "";

describe("表單欄位外觀收斂到 app.css", () => {
  it("共用宣告存在，且同時涵蓋 input／select／textarea", () => {
    expect(sharedRule).not.toBe("");
  });

  /*
   * 逐項守，不是整段字串比對——整段比對只要有人重排順序就會紅，而少掉
   * 其中一條卻可能因為別的宣告還在而看起來「差不多」。min-height 那條
   * 尤其重要，它是 FeedbackPage 原本缺的那一項。
   */
  for (const [property, value] of [
    ["min-height", "var(--tap-target)"],
    ["padding", "var(--space-2) var(--space-3)"],
    ["border", "1px solid var(--border-strong)"],
    ["border-radius", "var(--radius-sm)"],
    ["color", "var(--text-primary)"],
    ["background", "var(--surface-primary)"],
    ["font", "inherit"]
  ] as const) {
    it(`共用宣告有 ${property}`, () => {
      expect(sharedRule).toContain(`${property}: ${value};`);
    });
  }

  /*
   * radio／checkbox 必須被排除：那兩種走 .choice-grid（原生外觀 ＋
   * accent-color）或被 .category-option input 藏起來，套上邊框與內距會
   * 把它們變成奇怪的方塊。守選擇器本身，不是守「某處有 radio 這個字」。
   */
  it("radio 與 checkbox 被排除在共用宣告之外", () => {
    expect(appCss).toContain('input:not([type="radio"], [type="checkbox"])');
  });

  /*
   * 收斂的重點是「只有一份」。四個檔案任何一個把 border 抄回去，就代表
   * 又開始漂移了。比對完整宣告而不是 border 這個字——後者會被
   * `.category-option` 之類的其他用途誤判（GearForm 真的有一個）。
   */
  for (const file of FORMERLY_DUPLICATED) {
    it(`${file} 不再自己宣告欄位外觀`, () => {
      const source = strip(readFileSync(file, "utf8"));
      const fieldRule = source.match(
        /^(?:input|select|textarea)[^{]*\{([^}]*)\}/m
      );
      // 只留 width 是允許的（寬度是版面決定，不是外觀）。
      const declarations = (fieldRule?.[1] ?? "")
        .split(";")
        .map((line) => line.trim().split(":")[0]?.trim())
        .filter((name) => name !== undefined && name !== "");
      expect(declarations.filter((name) => name !== "width")).toEqual([]);
    });
  }
});
