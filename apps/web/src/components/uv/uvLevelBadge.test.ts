import { readFileSync } from "node:fs";
import { UvRiskLevelSchema } from "@sunshield/contracts";
import { describe, expect, it } from "vitest";

/**
 * 五個 UV 等級都要有底色（2026-09-04，使用者回報「跑掉樣式了」）。
 *
 * 模板原本直接內插 `riskLevel` 產生 class，而 CSS 用的是連字號版本——
 * 五個等級裡只有 `very_high` 帶底線，所以只有「過量級」那一顆壞掉：
 * class 是 `uv-day__level-badge--very_high`，沒有任何規則接得住，實測
 * `background-color: rgba(0, 0, 0, 0)`，藥丸變成一段裸文字。
 *
 * 卡片外框那一組一直是對的，因為它走 `riskSuffix()`。現在兩處共用同一個
 * 函式，這條測試守的是「每一個等級都真的有規則」。
 */

const SOURCE = readFileSync(
  "apps/web/src/components/uv/FiveDayUvCard.vue",
  "utf8"
);

/** 掃樣式前先剝註解——上面那段說明裡就寫了壞掉的 class 名。 */
const STYLES = SOURCE.slice(SOURCE.indexOf("<style")).replace(
  /\/\*[\s\S]*?\*\//g,
  ""
);

const LEVELS = UvRiskLevelSchema.options;

describe("五日預報的等級藥丸", () => {
  /*
   * 等級清單直接取自 contracts 的 enum，不在測試裡另抄一份——新增第六個
   * 等級時這條測試會自己跟上。
   */
  it("contracts 的等級數量沒有變動到讓這條測試失去意義", () => {
    expect(LEVELS.length).toBeGreaterThanOrEqual(5);
    expect(LEVELS).toContain("very_high");
  });

  it.each(LEVELS)("%s 有底色規則", (level) => {
    const suffix = level.replace("_", "-");

    /*
     * 比對完整的選擇器與宣告，不是片段：`--high` 是 `--very-high` 的子字串，
     * 只比對名字的話「過量級壞掉」這件事永遠測不出來。
     */
    expect(STYLES).toMatch(
      new RegExp(
        `\\.uv-day__level-badge--${suffix} \\{[^}]*background: var\\(--color-uvi-${suffix}\\);`
      )
    );
  });

  it.each(LEVELS)("%s 有卡片外框規則", (level) => {
    const suffix = level.replace("_", "-");

    expect(STYLES).toMatch(
      new RegExp(
        `\\.uv-day--${suffix} \\{[^}]*border-color: var\\(--color-uvi-${suffix}\\);`
      )
    );
  });

  /*
   * **反向：模板要用同一個函式產生 class。** 只守「CSS 有這些規則」的話，
   * 模板改回直接內插 `riskLevel` 仍然全綠——那正是這次的 bug。
   */
  it("模板用 riskSuffix 產生 class，不直接內插 riskLevel", () => {
    const template = SOURCE.slice(
      SOURCE.indexOf("<template>"),
      SOURCE.indexOf("<style")
    );

    expect(template).toContain(':class="levelBadgeClass(day.riskLevel)"');
    expect(template).not.toContain("uv-day__level-badge--${day.riskLevel}");
    expect(SOURCE).toContain('riskLevel.replace("_", "-")');
  });
});
