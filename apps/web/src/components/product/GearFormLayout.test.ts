import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./GearForm.vue", import.meta.url), "utf8");

/*
 * 這個檔案掃的是原始碼字串，所以**必須先剝掉註解**——否則解釋性的註解
 * 本身就會讓斷言通過，測試看起來全綠卻什麼都沒守到。2026-08-30 加下面
 * 那條守門時就差點踩到：新寫的註解裡正好提到 `.category-effect`。
 */
const strip = (input: string): string =>
  input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const code = strip(source);

describe("GearForm narrow layout", () => {
  it("allows both native date fields to shrink inside a 320px grid track", () => {
    expect(source).toMatch(
      /\.field-pair\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/
    );
  });
});

/*
 * 2026-08-30 裝備區簡化（規格見
 * docs/superpowers/specs/2026-08-30-gear-simplification-design.md）。
 */
describe("GearForm 裝備區簡化", () => {
  /*
   * `GearCategorySchema` 的註解明文要求：「UI 必須明示這件事——使用者記錄
   * 一副墨鏡時不得以為提醒行為會改變。」
   *
   * 原本有兩處在講同一件事：品類格下方的 `.category-effect`，以及只為了
   * 說「這件裝備不會建立補擦倒數」而存在的整張 124px 卡 `.no-effect-note`。
   * 稽核判定後者可刪，但**刪掉之後那條契約就完全由 `.category-effect`
   * 承擔**——若有人把它也收掉，契約會靜默破掉，畫面上不會有任何錯誤。
   */
  it("品類效果說明常駐，取代已移除的 no-effect-note 卡", () => {
    // 比對完整的 class 屬性而不是子字串——`toContain("category-effect")`
    // 會被 `category-effect-anything` 滿足，等於什麼都沒守（2026-08-30
    // 實測發現，改名後測試依然全綠）。
    expect(code).toContain('class="category-effect"');
    expect(code).toContain("GEAR_CATEGORY_REMINDER_EFFECT[gearCategory]");
    // 那張卡不得以任何形式復活。
    expect(code).not.toContain("no-effect-note");
    expect(code).not.toContain("這件裝備不會建立補擦倒數");
  });

  it("我的紀錄區塊提供價格與好不好用", () => {
    expect(code).toContain("我的紀錄");
    expect(code).toContain('v-model="priceTwd"');
    expect(code).toContain('v-model="usageRating"');
    // 三檔，不是自由文字也不是五星
    for (const value of ["good", "ok", "bad"]) {
      expect(code).toContain(`value="${value}"`);
    }
  });

  it("包裝標示維持可收合，不擋在必填欄位前面", () => {
    expect(code).toContain("collapsible");
  });
});
