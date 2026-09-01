// @vitest-environment happy-dom

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
    await wrapper.get('input[value="no"]').setValue(true);

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
    expect(wrapper.findAll(".label-question__panel")).toHaveLength(1);
  });

  /*
   * `/setup` 的即時記錄不一樣：那條流程正在建立倒數，第一題直接決定這次
   * 能不能建立補擦倒數，不該要多按一下才看得到。其餘三題仍然收著。
   */
  it("/setup 的即時記錄預設開著第一題", () => {
    const wrapper = mountEditor({ collapsible: false });

    expect(rowFor(wrapper, "防曬標示").attributes("aria-expanded")).toBe("true");
    expect(wrapper.findAll(".label-question__panel")).toHaveLength(1);
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
    await wrapper.get('input[value="yes"]').setValue(true);

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
    await wrapper.get('input[value="yes"]').setValue(true);

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
    await wrapper.get('input[value="yes"]').setValue(true);

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
    await wrapper.get('input[value="yes"]').setValue(true);

    const outer = wrapper.get('input[value="yes"]').attributes("name");
    const inner = wrapper
      .get(".label-question__minutes")
      .get("input")
      .attributes("name");

    expect(outer).toBeDefined();
    expect(inner).not.toBe(outer);
  });

  /*
   * 「沒有耐水標示」（包裝沒寫）與「明確標示不耐水」（包裝寫了不耐水）在
   * reducer 裡走同一條路徑，但記錄的是不同的事實。為了幾十像素合併會弄丟
   * 「使用者看到了什麼」——這條擋的是「順手再簡化一點」。
   */
  it("第一層仍然分得出「沒寫」與「寫了不耐水」", async () => {
    const wrapper = mountEditor();
    await openWater(wrapper);

    const text = wrapper.get(".label-question__panel").text();
    expect(text).toContain("沒有耐水標示");
    expect(text).toContain("明確標示不耐水");
  });
});
