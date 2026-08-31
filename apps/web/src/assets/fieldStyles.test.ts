import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
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

/*
 * 2026-08-31 補強：原本只掃「四個具名檔案的 bare element 選擇器」，
 * 於是漏掉三份用 descendant selector 寫的拷貝——`.water-start input`、
 * `.number-field input`、`.field input`（設定流程）。它們的值還跟共用宣告
 * 不一樣（`--border-subtle` 而非 `--border-strong`、`--page-background`
 * 而非 `--surface-primary`、`padding: --space-3`），所以整個設定流程的欄位
 * 長得跟 App 其他地方不同——**守門全綠但收斂根本沒完成**。
 *
 * 現在改成掃全部 `.vue`，並認得 `.foo input {` 這種寫法。
 */
const sourceRoot = "apps/web/src";

/** 允許保留的宣告：寬度是版面決定，不是外觀。 */
const LAYOUT_ONLY = new Set(["width", "max-width", "min-width"]);

/** 會被判定成「自己宣告欄位外觀」的屬性。 */
const APPEARANCE_PROPERTIES = new Set([
  "min-height",
  "padding",
  "border",
  "border-radius",
  "background",
  "color",
  "font",
  "color-scheme"
]);

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const appCss = strip(readFileSync(APP_CSS, "utf8"));

function discoverVueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverVueFiles(entryPath);
    return entry.name.endsWith(".vue") ? [entryPath] : [];
  });
}

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
   * 收斂的重點是「只有一份」。任何 `.vue` 把外觀宣告抄回去就代表又開始
   * 漂移了。
   *
   * 只看**選擇器最後一段**是 input／select／textarea 的規則——`.foo input`
   * 算、`.foo input + label` 不算（那是相鄰元素）。radio／checkbox 的規則
   * 排除在外：它們走 .choice-grid，本來就有自己的外觀。
   */
  for (const file of discoverVueFiles(sourceRoot).sort()) {
    it(`${file} 不再自己宣告欄位外觀`, () => {
      const source = strip(readFileSync(file, "utf8"));
      const offenders: string[] = [];

      for (const match of source.matchAll(
        /(^|\n)\s*([^{}\n]*?(?:input|select|textarea))\s*\{([^}]*)\}/g
      )) {
        const selector = match[2]!.trim();
        // radio／checkbox 與被藏起來的原生控制項不在收斂範圍。
        if (/\[type=|checkbox|radio|choice-grid|category-option/.test(selector))
          continue;
        for (const declaration of (match[3] ?? "").split(";")) {
          const property = declaration.split(":")[0]?.trim();
          if (property === undefined || property === "") continue;
          if (LAYOUT_ONLY.has(property)) continue;
          if (APPEARANCE_PROPERTIES.has(property)) {
            offenders.push(`${selector} → ${property}`);
          }
        }
      }

      expect(
        offenders,
        `${file} 自己宣告了欄位外觀：${offenders.join("、")}。` +
          `請改用 app.css 的共用宣告；只有寬度可以留在 scoped style。`
      ).toEqual([]);
    });
  }
});
