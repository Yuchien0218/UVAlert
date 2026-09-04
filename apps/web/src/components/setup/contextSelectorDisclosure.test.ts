// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import type { SessionContext } from "@sunshield/contracts";
import { describe, expect, it } from "vitest";
import ContextSelector from "./ContextSelector.vue";

/**
 * 情境選擇的展開區：每個群組各自一個面板（2026-09-04）。
 *
 * 改版前說明與子選項共用同一個 `v-if` / `v-else-if` 區塊，於是它有三種狀態
 * （子選項／說明／空），高度在 24px、171px、192px、0 之間直接跳——實測從
 * 說明切到室內子選項是 **+147px 的瞬跳**。
 *
 * 共用區接不上 `DisclosurePanel`：那個元件做的是「0 ↔ 內容高度」，而共用區
 * 是「內容高度 ↔ 另一個內容高度」；而且 `activeGroup` 收合時會變 `undefined`，
 * 模板直接炸。**這是元件結構問題，不是動效問題**——拆成一個群組一個面板
 * 之後，每個面板都回到單純的開／關。
 */

const mountSelector = (modelValue: SessionContext | null = null) =>
  mount(ContextSelector, {
    props: { modelValue, "onUpdate:modelValue": () => undefined },
    global: { stubs: { Icon: true } }
  });

const panels = (wrapper: ReturnType<typeof mountSelector>) =>
  wrapper.findAll(".disclosure");

const openPanels = (wrapper: ReturnType<typeof mountSelector>) =>
  wrapper.findAll('.disclosure[data-open="true"]');

describe("情境選擇的展開區", () => {
  /*
   * 三個面板：室內、水上、說明。共用一個的話就回到原本那個「內容高度換
   * 內容高度」的結構，DisclosurePanel 接不上。
   */
  it("拆成三個獨立面板", () => {
    expect(panels(mountSelector())).toHaveLength(3);
  });

  /*
   * **同時只有一個是開的。** 少了這條，一個「全部都開」的實作也會過上面
   * 那條——而那會讓三段內容同時出現在畫面上。
   */
  it("同時只有一個面板是開的", async () => {
    const wrapper = mountSelector("outdoor_general");
    expect(openPanels(wrapper)).toHaveLength(1);

    await wrapper.get('button[aria-controls="indoor-context-options"]').trigger("click");
    expect(openPanels(wrapper)).toHaveLength(1);

    await wrapper.get('button[aria-controls="water-context-options"]').trigger("click");
    expect(openPanels(wrapper)).toHaveLength(1);
  });

  /*
   * **`aria-controls` 指的 id 必須一直存在。**
   *
   * 改版前那個 id 只有展開時才在 DOM 裡，收合時 `aria-controls` 指向一個
   * 不存在的元素——螢幕閱讀器無法把觸發器跟被控制的區塊關聯起來
   * （DESIGN.md 第五節的展開收合契約要求兩者齊備）。這是拆開面板順帶修好的。
   */
  it("收合時 aria-controls 指的面板仍在 DOM 裡", () => {
    const wrapper = mountSelector();

    for (const key of ["indoor", "water"]) {
      const trigger = wrapper.get(`button[aria-controls="${key}-context-options"]`);
      expect(trigger.attributes("aria-expanded")).toBe("false");
      expect(wrapper.find(`#${key}-context-options`).exists()).toBe(true);
    }
  });

  /*
   * **收合中的內容要留著。** 說明文字以前會在展開群組的當下變成 null，
   * 那樣高度動畫是在一個空盒子上跑——看起來就是瞬間消失，等於沒做。
   */
  it("展開群組時，說明的內容仍然渲染著（只是收起來）", async () => {
    const wrapper = mountSelector("outdoor_general");
    expect(wrapper.text()).toContain("通勤、散步或一般外出。");

    await wrapper.get('button[aria-controls="indoor-context-options"]').trigger("click");

    // 面板收起來了，但字還在——收合動畫才有東西可以縮。
    expect(wrapper.text()).toContain("通勤、散步或一般外出。");
    expect(
      wrapper.findAll('.disclosure[data-open="true"]').length
    ).toBe(1);
  });

  /* 展開群組時，那一組的子選項要真的在打開的那個面板裡。 */
  it("展開的面板裝的是對應群組的子選項", async () => {
    const wrapper = mountSelector();
    await wrapper.get('button[aria-controls="water-context-options"]').trigger("click");

    const open = wrapper.get('.disclosure[data-open="true"]');
    expect(open.text()).toContain("準備下水");
    expect(open.text()).toContain("已在水中");
    expect(open.text()).not.toContain("近直射窗邊");
  });
});
