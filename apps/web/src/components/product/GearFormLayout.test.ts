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

  /*
   * 2026-08-31：「我的紀錄」在新增流程**收合**，不是消失。
   *
   * 先前那一版（選項甲）整塊 `v-if="isEdit"` 藏掉，使用者實際用過後回報
   * 「日期、價格、備註都不見了」——四個品類都受影響。所以這條守門守的是
   * 「看得到但預設收合」，而不是「不顯示」。
   *
   * 三件事分開守：section 沒有被 isEdit 藏掉、觸發器有揭露契約需要的
   * aria-controls、預設是關的（recordExpanded 初值 false）。合成一條的話
   * 少掉任何一項都可能被另外兩項掩護。
   */
  it("我的紀錄在新增流程仍然渲染，沒有被 isEdit 藏掉", () => {
    expect(code).toContain(
      '<section class="app-card" aria-labelledby="gear-record-title">'
    );
  });

  it("我的紀錄的觸發器符合揭露契約", () => {
    const toggle = code.slice(code.indexOf('aria-controls="gear-record-fields"'));
    expect(code).toContain(':aria-expanded="recordOpen"');
    expect(code).toContain('aria-controls="gear-record-fields"');
    // chevron 換圖示 name，不是 transform: rotate
    expect(toggle.slice(0, 400)).toContain("tool-chevron-right");
    expect(code).not.toMatch(/\.record-toggle[^}]*transform:\s*rotate/);
  });

  it("我的紀錄在新增流程預設收合，編輯時展開", () => {
    expect(code).toContain("const recordExpanded = shallowRef(false);");
    expect(code).toContain(
      "const recordOpen = computed(() => isEdit.value || recordExpanded.value);"
    );
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

  /*
   * 2026-08-31（選項丙）：SPF／PA 搬進包裝標示卡的 identity slot。
   *
   * 兩件事都要守，而且要**分開**守——只斷言「SPF 在 slot 裡」的話，把它
   * 複製一份留在暱稱卡也還是綠的；只斷言「暱稱卡沒有 SPF」的話，整個
   * 刪掉也是綠的。
   */
  it("SPF／PA 放在包裝標示的 identity slot 裡", () => {
    const slot = code.slice(code.indexOf("<template #identity>"));
    expect(slot).toContain('id="gear-spf"');
    expect(slot).toContain('id="gear-pa"');
  });

  it("SPF／PA 不再留在裝備暱稱卡", () => {
    const beforeSlot = code.slice(0, code.indexOf("<template #identity>"));
    expect(beforeSlot).not.toContain('id="gear-spf"');
    expect(beforeSlot).not.toContain('id="gear-pa"');
  });

  /*
   * 2026-08-31：select 要吃跟 input 同一組樣式。沒有它時「好不好用」是
   * 瀏覽器原生外觀（白底、系統藍框），跟旁邊的米色欄位不同一套。
   */
  it("select 與 input 共用同一組欄位樣式", () => {
    expect(code).toMatch(/input,\s*select,\s*textarea\s*\{/);
  });

  /*
   * 2026-08-31：品類名稱常駐。前一版讓文字只在選取後顯示，使用者回饋
   * 「很像消失」。守的是「沒有任何條件式把它藏起來」，不是只守文字存在
   * ——文字一直都在（只是被 .screen-reader-only 蓋掉），所以只斷言
   * `{{ label }}` 出現的話，改回隱藏版也會全綠。
   */
  it("品類名稱常駐，不隨選取狀態隱藏", () => {
    expect(code).toContain("<span>{{ label }}</span>");
    expect(code).not.toContain("screen-reader-only");
  });

  /*
   * 2026-08-31：價格欄不預寫數字。placeholder 的灰字在數字欄位裡會被讀成
   * 「已經填好的值」，而價格沒有需要提示的格式（不像 PA++++）。
   */
  it("價格欄不放範例數字當 placeholder", () => {
    const priceField = code.slice(code.indexOf('id="gear-price"'));
    expect(priceField.slice(0, priceField.indexOf("/>"))).not.toContain(
      "placeholder"
    );
  });
});
