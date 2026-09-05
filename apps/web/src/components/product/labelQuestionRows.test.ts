// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ProductSnapshotFormValue } from "../../features/setup/productSnapshot";
import ProductSnapshotEditor from "./ProductSnapshotEditor.vue";

/**
 * 2026-09-01（使用者裁決：甲＋丙）：包裝標示四題改成逐題展開。
 *
 * 起因是使用者回報「太長了要滑很久」。實測 375px 下攤開後整頁 2803px，
 * 四張問題卡佔 1368px——整頁的 49%。
 */

const BLANK: ProductSnapshotFormValue = {
  claimAnswer: "yes",
  waitAnswer: "none",
  waitMinutes: null,
  intervalAnswer: "none",
  intervalMinutes: null,
  waterResistance: "unknown"
};

/**
 * 預設用裝備表單的模式（`collapsible`）——四題全收，這是使用者回報「太長」
 * 的那個畫面。`/setup` 的即時記錄另外守（見最後一條）。
 */
function mountEditor(props: Record<string, unknown> = {}) {
  return mount(ProductSnapshotEditor, {
    props: {
      waterContext: true,
      collapsible: true,
      modelValue: { ...BLANK },
      ...props
    }
  });
}

function rows(wrapper: ReturnType<typeof mountEditor>) {
  return wrapper.findAll(".label-question__row");
}

function rowFor(wrapper: ReturnType<typeof mountEditor>, name: string) {
  return rows(wrapper).find((row) => row.text().includes(name))!;
}

/*
 * 面板全部常駐 DOM 之後（2026-09-04 改用 DisclosurePanel），
 * `wrapper.get('input[value="yes"]')` 會抓到**第一題**的「有」，而不是測試
 * 想操作的那一題——四題各自都有 value="yes"／"no" 的選項。這種誤抓不會報錯，
 * 只會讓斷言默默失去意義，所以一律先鎖定所屬面板再找 input。
 */
const panelInput = (
  wrapper: ReturnType<typeof mountEditor>,
  panel: string,
  value: string
) => wrapper.get(`[id$="-${panel}-panel"] input[value="${value}"]`);

const claimInput = (wrapper: ReturnType<typeof mountEditor>, value: string) =>
  panelInput(wrapper, "claim", value);

const waterInput = (wrapper: ReturnType<typeof mountEditor>, value: string) =>
  panelInput(wrapper, "water", value);

/** 展開中的面板。收合的面板仍在 DOM 裡，所以不能用面板總數判斷。 */
const openPanels = (wrapper: ReturnType<typeof mountEditor>) =>
  wrapper.findAll('.disclosure[data-open="true"]');

describe("四題各佔一列", () => {
  it("四題都在，收合時每一列都寫著目前狀態", () => {
    const wrapper = mountEditor();

    expect(rows(wrapper)).toHaveLength(4);
    for (const name of ["防曬標示", "擦上後等待", "補擦間隔", "耐水標示"]) {
      expect(rowFor(wrapper, name).text(), name).toContain("尚未填寫");
    }
  });

  /*
   * **兩個方向分開守。** 只守「沒動過寫尚未填寫」的話，永遠都寫「尚未填寫」
   * 也會過——那時使用者回答完看不到自己選了什麼。
   */
  it("回答之後那一列改寫實際答案", async () => {
    const wrapper = mountEditor();

    await rowFor(wrapper, "防曬標示").trigger("click");
    await claimInput(wrapper, "no").setValue(true);

    const row = rowFor(wrapper, "防曬標示");
    expect(row.text()).toContain("沒有");
    expect(row.text()).not.toContain("尚未填寫");
  });

  /*
   * 編輯既有裝備時每一列都有真正的答案——那份 snapshot 存過。元件自己
   * 分不出「沒填過」與「填了、剛好等於預設值」，所以靠呼叫端傳 prefilled。
   */
  it("prefilled 時直接顯示答案，不寫「尚未填寫」", () => {
    const wrapper = mountEditor({
      prefilled: true,
      modelValue: { ...BLANK, waterResistance: "80" }
    });

    expect(wrapper.text()).not.toContain("尚未填寫");
    expect(rowFor(wrapper, "耐水標示").text()).toContain("耐水 80 分鐘");
  });

  /*
   * 一次只開一題。不守這條的話，四題同時展開就回到收斂前的長度了——那正是
   * 使用者抱怨的東西。
   */
  it("開第二題時第一題會收起來", async () => {
    const wrapper = mountEditor();

    await rowFor(wrapper, "防曬標示").trigger("click");
    expect(rowFor(wrapper, "防曬標示").attributes("aria-expanded")).toBe("true");

    await rowFor(wrapper, "補擦間隔").trigger("click");
    expect(rowFor(wrapper, "防曬標示").attributes("aria-expanded")).toBe(
      "false"
    );
    expect(openPanels(wrapper)).toHaveLength(1);
  });

  /*
   * `/setup` 的即時記錄不一樣：那條流程正在建立倒數，第一題直接決定這次
   * 能不能建立補擦倒數，不該要多按一下才看得到。其餘三題仍然收著。
   */
  it("/setup 的即時記錄預設開著第一題", () => {
    const wrapper = mountEditor({ collapsible: false });

    expect(rowFor(wrapper, "防曬標示").attributes("aria-expanded")).toBe("true");
    expect(openPanels(wrapper)).toHaveLength(1);
  });

  it("aria-controls 指到真的存在的面板", async () => {
    const wrapper = mountEditor();
    const row = rowFor(wrapper, "耐水標示");
    await row.trigger("click");

    expect(
      wrapper.find(`#${row.attributes("aria-controls")}`).exists()
    ).toBe(true);
  });
});

describe("耐水拆成兩層（裁決丙）", () => {
  async function openWater(wrapper: ReturnType<typeof mountEditor>) {
    await rowFor(wrapper, "耐水標示").trigger("click");
  }

  it("沒有耐水標示時不出現 40／80", async () => {
    const wrapper = mountEditor();
    await openWater(wrapper);

    expect(wrapper.find(".label-question__minutes").exists()).toBe(false);
  });

  it("選了「有耐水標示」才出現 40／80，預設 40", async () => {
    const wrapper = mountEditor();
    await openWater(wrapper);
    await waterInput(wrapper, "yes").setValue(true);

    expect(wrapper.find(".label-question__minutes").exists()).toBe(true);
    expect(rowFor(wrapper, "耐水標示").text()).toContain("耐水 40 分鐘");
  });

  /*
   * **這條是畫出來看才發現的。**
   *
   * 第一版把 40／80 放在四個選項的最後，只靠縮排表示層級——畫面上讀成
   * 「六個並列的選項」，因為它跟母選項之間隔著三個同層級的選項。
   * DOM 存在、數值正確、當時所有斷言都是綠的（CLAUDE.md 那一節）。
   *
   * 所以這裡守的是**順序**：40／80 必須緊接在「有耐水標示」後面。
   */
  it("40／80 緊接在「有耐水標示」下面，不是排在所有選項之後", async () => {
    const wrapper = mountEditor();
    await openWater(wrapper);
    await waterInput(wrapper, "yes").setValue(true);

    const html = wrapper.html();
    const parentIndex = html.indexOf("有耐水標示");
    const minutesIndex = html.indexOf("label-question__minutes");
    const nextSiblingIndex = html.indexOf("沒有耐水標示");

    expect(parentIndex).toBeLessThan(minutesIndex);
    expect(minutesIndex).toBeLessThan(nextSiblingIndex);
  });

  /*
   * 沿用 `.choice-grid` 的選項外觀。第一版自己刻了一份 label 樣式，畫出來
   * 之後 radio 變回瀏覽器預設的藍點——同一個面板裡兩種 radio 外觀。
   */
  it("40／80 沿用 choice-grid 的選項外觀", async () => {
    const wrapper = mountEditor();
    await openWater(wrapper);
    await waterInput(wrapper, "yes").setValue(true);

    expect(wrapper.get(".label-question__minutes").classes()).toContain(
      "choice-grid"
    );
  });

  /*
   * 兩層各自是一個 radio group。共用同一個 name 的話，選 40 會把第一層的
   * 「有耐水標示」清掉。
   */
  it("兩層是不同的 radio group", async () => {
    const wrapper = mountEditor();
    await openWater(wrapper);
    await waterInput(wrapper, "yes").setValue(true);

    const outer = waterInput(wrapper, "yes").attributes("name");
    const inner = wrapper
      .get(".label-question__minutes")
      .get("input")
      .attributes("name");

    expect(outer).toBeDefined();
    expect(inner).not.toBe(outer);
  });

  /*
   * 2026-09-01 第二次調整（使用者：「旁邊有一條顏色怪怪的，字也分兩行」）。
   *
   * 前一版靠「縮排＋左側 2px 連接線」表示層級——那條線不圍住任何東西，
   * 在畫面上是一段沒有來由的色塊；縮排又把選項擠窄到讓「耐水 40 分鐘」
   * 折成兩行。改成**用包含關係取代連接線**：母選項與分鐘那一排接成同一
   * 張卡。
   *
   * 兩件事分開守：沒有連接線、而且真的接在一起。只守前者的話，把整段拆
   * 開變成兩張獨立的卡也會過，那時層級又不見了。
   */
  it("不用連接線表示層級", () => {
    const source = readFileSync(
      "apps/web/src/components/product/ProductSnapshotEditor.vue",
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\//g, "");

    const rule = /\.label-question__minutes \{[^}]*\}/.exec(source)?.[0];
    expect(rule, "找不到 .label-question__minutes 規則").toBeDefined();
    expect(rule).not.toContain("border-inline-start");
  });

  it("分鐘那一排與母選項接成同一張卡", async () => {
    const wrapper = mountEditor();
    await openWater(wrapper);
    await waterInput(wrapper, "yes").setValue(true);

    // 母選項下緣去圓角，分鐘那一排去上框線——兩者一起才接得起來。
    expect(wrapper.get(".water-claim-option").classes()).toContain(
      "water-claim-option--joined"
    );

    const source = readFileSync(
      "apps/web/src/components/product/ProductSnapshotEditor.vue",
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    const rule = /\.label-question__minutes \{[^}]*\}/.exec(source)![0];
    expect(rule).toContain("border-top: 0;");
  });

  /*
   * 母選項已經寫了「有耐水標示」，分鐘那一排再重複一次「耐水」正是把字
   * 擠到第二行的原因。
   */
  it("分鐘的文字不重複「耐水」", async () => {
    const wrapper = mountEditor();
    await openWater(wrapper);
    await waterInput(wrapper, "yes").setValue(true);

    const text = wrapper.get(".label-question__minutes").text();
    expect(text).toContain("40 分鐘");
    expect(text).not.toContain("耐水");
  });

  /*
   * 「沒有耐水標示」（包裝沒寫）與「明確標示不耐水」（包裝寫了不耐水）在
   * reducer 裡走同一條路徑，但記錄的是不同的事實。為了幾十像素合併會弄丟
   * 「使用者看到了什麼」——這條擋的是「順手再簡化一點」。
   */
  it("第一層仍然分得出「沒寫」與「寫了不耐水」", async () => {
    const wrapper = mountEditor();
    await openWater(wrapper);

    // 四個面板都在 DOM 裡，`.label-question__panel` 會抓到第一題。
    const text = wrapper.get('[id$="-water-panel"]').text();
    expect(text).toContain("沒有耐水標示");
    expect(text).toContain("明確標示不耐水");
  });
});
