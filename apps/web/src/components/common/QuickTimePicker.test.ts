// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import QuickTimePicker from "./QuickTimePicker.vue";

/**
 * 2026-08-31：從「四顆快捷鈕 ＋ 常駐日期欄位」改成「預設值 ＋ 調整時間」
 * 兩顆（使用者裁決：取消「剛剛」那顆快捷、另一顆改成時間調整器）。
 *
 * 形狀跟 ApplicationTimePicker／WaterStartPicker 一致——這個 App 現在只有
 * 一種時間選擇器的樣子。日期欄位改成展開才出現。
 */

const AT = "2026-08-25T10:00:00.000Z";

function mountPicker(props: Record<string, unknown> = {}) {
  return mount(QuickTimePicker, {
    props: {
      appliedAt: AT,
      referenceNow: AT,
      error: undefined,
      ...props
    }
  });
}

/** 展開「調整時間」，回傳那顆按鈕以便後續斷言。 */
async function openAdjust(wrapper: ReturnType<typeof mountPicker>) {
  const adjust = wrapper
    .findAll("button")
    .find((button) => button.text().includes("調整時間"))!;
  await adjust.trigger("click");
  return adjust;
}

describe("QuickTimePicker", () => {
  it("預設 heading／idPrefix 維持 ReapplyPage 原本的文字與 id", async () => {
    const wrapper = mountPicker();

    expect(wrapper.get("h2").text()).toBe("實際何時補擦？");
    expect(wrapper.get("h2").attributes("id")).toBe("reapply-time-title");

    await openAdjust(wrapper);
    expect(wrapper.get("input").attributes("id")).toBe("reapply-time");
  });

  it("可傳入 heading／idPrefix 覆寫", async () => {
    const wrapper = mountPicker({
      heading: "實際什麼時候發生？",
      idPrefix: "report-time"
    });

    expect(wrapper.get("h2").text()).toBe("實際什麼時候發生？");
    expect(wrapper.get("h2").attributes("id")).toBe("report-time-title");

    await openAdjust(wrapper);
    expect(wrapper.get("input").attributes("id")).toBe("report-time");
  });

  /*
   * **日期欄位不再常駐。** 它是少數情況才用得到的東西，收合前佔掉約
   * 120px，直接把下方的主要行動推出畫面——那正是使用者說「CTA 怪怪的」
   * 的成因之一。
   */
  it("日期欄位預設收起來，按了調整時間才出現", async () => {
    const wrapper = mountPicker();

    expect(wrapper.find("input").exists()).toBe(false);

    await openAdjust(wrapper);
    expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(true);
  });

  it("展開的按鈕帶著 aria-expanded 與 aria-controls", async () => {
    const wrapper = mountPicker();
    const adjust = await openAdjust(wrapper);

    expect(adjust.attributes("aria-expanded")).toBe("true");
    // aria-controls 必須真的指到存在的面板，否則那個屬性是騙人的。
    expect(
      wrapper.find("#" + adjust.attributes("aria-controls")!).exists()
    ).toBe(true);
  });

  /*
   * 預設那一顆的文字可以改（記錄狀況是「剛剛」，補擦頁沿用同一個預設）。
   * 點它 emit quick(0)——回到「就是現在」。
   */
  it("點預設那一顆 emit quick(0)", async () => {
    const wrapper = mountPicker({ defaultLabel: "剛剛" });
    const first = wrapper.findAll("button")[0]!;

    expect(first.text()).toBe("剛剛");
    await first.trigger("click");

    expect(wrapper.emitted("quick")).toEqual([[0]]);
  });

  /*
   * 調整完要按「套用」才送出，不是每敲一個字就 emit——datetime-local 在
   * 輸入過程中會產生一連串不完整的值。
   */
  it("套用之後 emit change 帶 ISO 字串", async () => {
    const wrapper = mountPicker();
    await openAdjust(wrapper);

    const input = wrapper.get('input[type="datetime-local"]');
    await input.setValue("2026-08-25T12:30");
    const apply = wrapper
      .findAll("button")
      .find((button) => button.text() === "套用")!;
    await apply.trigger("click");

    const emitted = wrapper.emitted("change");
    expect(emitted).toHaveLength(1);
    expect(new Date(emitted![0]![0] as string).toISOString()).toBe(
      new Date("2026-08-25T12:30").toISOString()
    );
  });

  /*
   * 按鈕上只寫「調整時間」的話，調完看不出目前選了什麼。沿用
   * ApplicationTimePicker 的處理：調整後才顯示摘要那一行。
   */
  it("沒調整時不顯示確認時間，調整後才顯示", async () => {
    const untouched = mountPicker();
    expect(untouched.text()).not.toContain("確認時間：");

    const adjusted = mountPicker({
      appliedAt: "2026-08-25T09:30:00.000Z",
      summaryLabel: "更正後："
    });
    expect(adjusted.text()).toContain("更正後：");
  });

  it("有 error 時顯示錯誤文字並用 aria-describedby 連結輸入框", async () => {
    const wrapper = mountPicker({ error: "時間格式不正確" });
    await openAdjust(wrapper);

    const errorParagraph = wrapper.get('[role="alert"]');
    expect(errorParagraph.text()).toBe("時間格式不正確");
    expect(wrapper.get("input").attributes("aria-describedby")).toBe(
      errorParagraph.attributes("id")
    );
  });
});
