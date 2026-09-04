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
    /*
     * chevron 不用 transform: rotate。2026-09-04 起改由共用的
     * DisclosureChevron 承擔（兩顆圖示交叉淡入，仍然沒有旋轉），所以這裡
     * 比對的是元件而不是圖示 name——name 已經被收進元件裡了。
     */
    expect(toggle.slice(0, 400)).toContain("<DisclosureChevron");
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

  /*
   * 2026-08-31 複查（丙的後續）：SPF／PA 的驗證要跟著品類走。
   *
   * 這兩個欄位只對 sunscreen 渲染，save() 也只在 showSunscreenFields 時
   * 寫入；但驗證原本不分品類——「先填了 SPF、再把品類改成太陽眼鏡」會被
   * 一個畫面上根本不存在的欄位擋住存檔。
   *
   * 兩個欄位分開守：只守其中一個的話，另一個把條件拿掉仍然會綠。
   */
  it("SPF 的驗證只在防曬乳品類生效", () => {
    // 2026-09-03：條件改用 parseSpfInput，但「跟著品類走」這件事不變。
    expect(code).toContain("showSunscreenFields.value &&");
    expect(code).toContain('parseSpfInput(spfInput.value) === "invalid"');
  });

  it("PA 的驗證只在防曬乳品類生效", () => {
    expect(code).toContain(
      "if (showSunscreenFields.value && paGradeInput.value.trim().length > 20) {"
    );
  });

  it("SPF／PA 不再留在裝備暱稱卡", () => {
    const beforeSlot = code.slice(0, code.indexOf("<template #identity>"));
    expect(beforeSlot).not.toContain('id="gear-spf"');
    expect(beforeSlot).not.toContain('id="gear-pa"');
  });

  /*
   * 2026-08-31：欄位外觀已收斂到 app.css，這裡只守「格線裡的欄位要撐滿
   * 自己那一欄」——包含 select，否則「好不好用」會比左邊的價格欄短一截。
   * 外觀本身由 apps/web/src/assets/fieldStyles.test.ts 守。
   */
  it("格線裡的 input 與 select 都撐滿欄寬", () => {
    expect(code).toMatch(
      /\.field-pair input,\s*\.field-pair select \{\s*width: 100%;/
    );
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

/*
 * 2026-09-03（`2026-09-03-setup-gear-form-layout-todo.md` 第四項）。
 *
 * SPF 與 PA 兩欄並排，PA 一直有 placeholder、SPF 什麼提示都沒有。
 */
describe("SPF 欄位的提示", () => {
  it("SPF 有 placeholder", () => {
    // 比對完整屬性，不是 "placeholder" 這個字（CLAUDE.md 坑二）。
    expect(code).toContain('placeholder="50"');
  });

  /*
   * 值是 `50` 而不是瓶身上的 `50+`：這一欄是 `inputmode="numeric"`，
   * 數字鍵盤打不出加號，拿 `50+` 當範例等於示範一個手機上做不到的動作。
   * 加號的容錯在 `parseSpfInput()`，不在 placeholder。
   */
  it("placeholder 不放數字鍵盤打不出來的加號", () => {
    expect(code).not.toContain('placeholder="50+"');
  });

  /* 驗證與儲存共用同一份解析——各自 parse 一次是「存進去的是另一個值」的來源。 */
  it("驗證與儲存都走 parseSpfInput", () => {
    expect(code).not.toContain("Number(spfInput.value)");
    expect(code.match(/parseSpfInput\(spfInput\.value\)/g)?.length).toBe(2);
  });
});

/*
 * 2026-09-03（待辦第五項）：SPF／PA 併進包裝標示卡。
 */
describe("SPF／PA 是包裝標示卡的一段，不是另一張卡", () => {
  it("不再自己套 app-card", () => {
    expect(code).toContain('class="identity-fields"');
    expect(code).not.toContain('class="app-card identity-fields"');
  });

  it("用上緣一條線跟四題分開", () => {
    const rule = /\.identity-fields \{[^}]*\}/.exec(code)?.[0];

    expect(rule, "找不到 .identity-fields 規則").toBeDefined();
    expect(rule).toContain("border-top: 1px solid var(--border-subtle);");
  });

  /*
   * **這句不能刪。** 同一張卡裡上面四題會影響倒數、下面兩欄不會——
   * 不講清楚是安全相關的誤解，不只是版面問題。合併之後兩者靠得更近，
   * 這句話反而更重要。
   */
  it("保留「不影響補擦倒數」那句", () => {
    expect(code).toContain("不影響補擦倒數");
  });
});
