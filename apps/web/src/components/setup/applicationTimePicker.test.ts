// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ApplicationTimePicker from "./ApplicationTimePicker.vue";
import WaterStartPicker from "./WaterStartPicker.vue";

/**
 * 塗抹時間選擇器的兩個狀態 bug（2026-09-04 使用者回報，實機重現）。
 *
 * 回報原文：「只要先按 1 分鐘前 再按調整時間的按鈕 再按回一分鐘前，
 * 調整時間的按鈕就會有顏色，下面的實際塗抹時間也不會收回」。
 *
 * 拆開之後是兩件不同的事，成因也不同——所以分成兩個 describe，並且各自
 * 只變動一個條件（否則兩條會互相掩護，見 CLAUDE.md）。
 */

/** 一個會把 v-model 真的回寫的容器——不然選取態永遠不會更新。 */
function mountPicker() {
  return mount(
    {
      components: { ApplicationTimePicker },
      data: () => ({ appliedAt: null as string | null }),
      template: `<ApplicationTimePicker v-model="appliedAt" />`
    },
    { attachTo: document.body }
  );
}

const optionAt = (wrapper: ReturnType<typeof mountPicker>, index: number) =>
  wrapper.findAll(".time-option")[index]!;

const isSelected = (wrapper: ReturnType<typeof mountPicker>, index: number) =>
  optionAt(wrapper, index).classes().includes("option-selected");

describe("按「1 分鐘前」要收掉展開中的調整面板", () => {
  /*
   * 改動前按下去只寫值、不碰 `adjusting`，於是畫面同時有「已選 1 分鐘前」
   * 與一個攤開的 datetime-local——看起來像還有一步沒做完，而那個輸入框裡
   * 的值也已經不是生效中的選擇了。
   *
   * WaterStartPicker 的 selectDefault 本來就有這一行，只有這一支漏掉。
   */
  it("展開調整面板後再按「1 分鐘前」，面板收起來", async () => {
    const wrapper = mountPicker();

    await optionAt(wrapper, 0).trigger("click");
    await optionAt(wrapper, 1).trigger("click");
    expect(wrapper.find(".time-adjust").exists(), "面板應該是開的").toBe(true);

    await optionAt(wrapper, 0).trigger("click");

    expect(wrapper.find(".time-adjust").exists()).toBe(false);
    wrapper.unmount();
  });

  /*
   * **反向：「調整時間」本身仍然是可以開關的。** 少了這條，把 toggle 改成
   * 「只能開不能關」也會過上面那條。
   */
  it("「調整時間」仍然可以自己開關", async () => {
    const wrapper = mountPicker();

    await optionAt(wrapper, 1).trigger("click");
    expect(wrapper.find(".time-adjust").exists()).toBe(true);

    await optionAt(wrapper, 1).trigger("click");
    expect(wrapper.find(".time-adjust").exists()).toBe(false);
    wrapper.unmount();
  });
});

describe("選取態不會因為時鐘往前走就自己翻面", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00+08:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /*
   * **實機重現的那一半。** 改動前 `usingDefault` 是拿當下的時鐘回推
   * 「這個值像不像一分鐘前」（誤差容許 30 秒），而 `toggleAdjust()` 會呼叫
   * `syncNow()` 把 `referenceNow` 推到現在、`value` 卻沒有跟著動——於是同一
   * 個值在使用者**只是打開面板**的那一刻被判成「不是快選給的」。
   *
   * 瀏覽器實測：按「1 分鐘前」→ 等 36 秒 → 按「調整時間」，選取態跳到
   * 「調整時間」那一顆，下面還冒出「已調整為 2 分鐘前」。
   *
   * 36 秒是刻意的：容許誤差是 30 秒，31 秒就會翻面，36 秒留一點餘裕但仍在
   * 「使用者感覺不到自己過了多久」的範圍。
   */
  it("按「1 分鐘前」後隔 36 秒才打開調整面板，選取態不跳走", async () => {
    const wrapper = mountPicker();

    await optionAt(wrapper, 0).trigger("click");
    expect(isSelected(wrapper, 0), "剛按完，快選要是選取態").toBe(true);

    vi.setSystemTime(new Date("2026-09-04T10:00:36+08:00"));
    await optionAt(wrapper, 1).trigger("click");

    expect(isSelected(wrapper, 0), "使用者沒有改選，快選仍然是選取態").toBe(
      true
    );
    expect(isSelected(wrapper, 1), "只是打開面板，不該變成已調整").toBe(false);
    expect(wrapper.find(".time-picker__result").exists()).toBe(false);
    wrapper.unmount();
  });

  /*
   * **反向：真的套用手動時間時，選取態必須換過去。** 少了這條，把
   * `usingDefault` 寫死成 true 也會過上面那條——那時「調整時間」就永遠亮
   * 不起來，而使用者剛剛才手動選了一個時間。
   */
  it("真的套用手動時間之後，選取態換到「調整時間」", async () => {
    const wrapper = mountPicker();

    await optionAt(wrapper, 0).trigger("click");
    await optionAt(wrapper, 1).trigger("click");
    await wrapper.get(".time-adjust input").setValue("2026-09-04T09:30");
    await wrapper.get(".time-adjust .button--primary").trigger("click");

    expect(isSelected(wrapper, 0)).toBe(false);
    expect(isSelected(wrapper, 1)).toBe(true);
    expect(wrapper.get(".time-picker__result").text()).toContain("30 分鐘前");
    wrapper.unmount();
  });
});

/*
 * 入水時間選擇器是同一個形狀，`usingDefault` 也是同一個寫法——所以是同一個
 * 坑。它的 `selectDefault` 本來就會收面板，這裡守的是時鐘那一半。
 */
describe("入水時間選擇器的選取態也不跟著時鐘翻面", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-04T10:00:00+08:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("按「1 分鐘前」後隔 36 秒才打開調整面板，選取態不跳走", async () => {
    const wrapper = mount(
      {
        components: { WaterStartPicker },
        data: () => ({
          start: null as unknown,
          appliedAt: "2026-09-04T01:30:00.000Z"
        }),
        template: `<WaterStartPicker v-model="start" :applied-at="appliedAt" />`
      },
      { attachTo: document.body }
    );

    const options = () => wrapper.findAll(".time-option");
    await options()[0]!.trigger("click");
    expect(options()[0]!.classes()).toContain("option-selected");

    vi.setSystemTime(new Date("2026-09-04T10:00:36+08:00"));
    await options()[1]!.trigger("click");

    expect(options()[0]!.classes()).toContain("option-selected");
    wrapper.unmount();
  });
});
