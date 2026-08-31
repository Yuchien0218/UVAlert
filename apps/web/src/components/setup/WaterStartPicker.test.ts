// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { WaterStartFormValue } from "../../features/setup/createSetupController";
import WaterStartPicker from "./WaterStartPicker.vue";

/**
 * 2026-08-31 這個元件被整個改寫（三顆藥丸＋常駐 datetime-local → 「1 分鐘
 * 前」＋「調整時間」＋「不確定」，並加上 80 分鐘上限），而它**先前沒有
 * 任何測試**。
 */
function mountPicker(modelValue: WaterStartFormValue | null = null) {
  const wrapper = mount(WaterStartPicker, {
    props: {
      modelValue,
      "onUpdate:modelValue": (value: WaterStartFormValue | null) =>
        wrapper.setProps({ modelValue: value })
    }
  });
  return wrapper;
}

function findButton(wrapper: ReturnType<typeof mountPicker>, text: string) {
  const button = wrapper.findAll("button").find((b) => b.text().includes(text));
  expect(button, `找不到按鈕：${text}`).toBeDefined();
  return button!;
}

describe("WaterStartPicker", () => {
  it("採用與塗抹時間相同的兩顆快選", () => {
    const wrapper = mountPicker();

    expect(wrapper.text()).toContain("分鐘前");
    expect(wrapper.text()).toContain("調整時間");
  });

  it("預設快選送出 confirmed 與時間", async () => {
    const wrapper = mountPicker();

    await findButton(wrapper, "分鐘前").trigger("click");

    const value = wrapper.props("modelValue") as WaterStartFormValue;
    expect(value.confidence).toBe("confirmed");
    expect(value.activityStartedAt).not.toBeNull();
  });

  /*
   * 「不確定」是刻意保留的：它對應 confidence: "unknown"，reducer 會走保守
   * 路徑而不猜測入水時間。拿掉它等於逼使用者猜一個時間，那比誠實地說不知道
   * 更糟——所以守的是「選項存在」**與**「送出的是 unknown 且沒有時間」兩件
   * 事，只守其一的話，把它改成送出一個猜測值仍然會綠。
   */
  it("保留「不確定」選項", () => {
    /*
     * 守的是**按鈕存在**，不是頁面上出現「不確定」這三個字——說明文字
     * 「若無法確認，可以選擇不確定」本身就含這三個字，所以
     * `text()).toContain("不確定")` 在按鈕被整個刪掉之後**仍然會綠**
     * （2026-08-31 破壞驗證時實測到，第一版就是這樣寫的）。
     */
    const buttons = mountPicker()
      .findAll("button")
      .map((button) => button.text());

    expect(buttons.some((label) => label.includes("不確定"))).toBe(true);
  });

  it("選不確定時送出 unknown，且不帶時間", async () => {
    const wrapper = mountPicker();

    await findButton(wrapper, "不確定").trigger("click");

    const value = wrapper.props("modelValue") as WaterStartFormValue;
    expect(value.confidence).toBe("unknown");
    expect(value.activityStartedAt).toBeNull();
  });

  /*
   * 超過 80 分鐘**不擋輸入**，改成建議先補擦——那時真正的下一步是補擦，
   * 不是把一個已經失效的時間記進去。硬擋會讓使用者填不出任何值。
   */
  it("入水超過 80 分鐘時提示先補擦，但仍然收下這個值", () => {
    const longAgo = new Date(Date.now() - 100 * 60_000).toISOString();
    const wrapper = mountPicker({
      confidence: "confirmed",
      activityStartedAt: longAgo
    });

    expect(wrapper.text()).toContain("補擦");
    expect(
      (wrapper.props("modelValue") as WaterStartFormValue).activityStartedAt
    ).toBe(longAgo);
  });

  it("80 分鐘以內不提示", () => {
    const wrapper = mountPicker({
      confidence: "confirmed",
      activityStartedAt: new Date(Date.now() - 30 * 60_000).toISOString()
    });

    expect(wrapper.text()).not.toContain("已經失效");
  });

  /* 揭露契約：真的 button ＋ aria-expanded ＋ aria-controls。 */
  it("調整時間是符合揭露契約的展開", async () => {
    const wrapper = mountPicker();
    const toggle = findButton(wrapper, "調整時間");

    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.attributes("aria-controls")).toBeDefined();

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
    expect(wrapper.find('input[type="datetime-local"]').exists()).toBe(true);
  });

  /* min 讓瀏覽器的選擇器先收窄；打字繞過時由提示接住。 */
  it("調整欄位的 min 對齊 80 分鐘上限", async () => {
    const wrapper = mountPicker();
    await findButton(wrapper, "調整時間").trigger("click");

    const input = wrapper.get('input[type="datetime-local"]');
    const min = Date.parse(input.attributes("min") ?? "");
    const expected = Date.now() - 80 * 60_000;

    expect(Math.abs(min - expected)).toBeLessThan(120_000);
  });
});
