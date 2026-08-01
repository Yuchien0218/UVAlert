// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AppearanceSettings from "./AppearanceSettings.vue";

describe("AppearanceSettings", () => {
  it("shows all appearance choices and the resolved appearance", () => {
    const wrapper = mount(AppearanceSettings, {
      props: {
        modelValue: "system",
        resolvedAppearance: "dark"
      }
    });

    expect(wrapper.text()).toContain("淺色");
    expect(wrapper.text()).toContain("深色");
    expect(wrapper.text()).toContain("跟隨系統");
    expect(wrapper.text()).toContain("目前：深色");
    expect(wrapper.findAll('input[type="radio"]')).toHaveLength(3);
  });

  it("emits the selected appearance preference", async () => {
    const wrapper = mount(AppearanceSettings, {
      props: {
        modelValue: "system",
        resolvedAppearance: "light"
      }
    });

    await wrapper.get('input[value="dark"]').setValue();

    expect(wrapper.emitted("update:modelValue")).toEqual([["dark"]]);
  });

  it("guides Samsung Internet users when light mode may be overridden", () => {
    const wrapper = mount(AppearanceSettings, {
      props: {
        modelValue: "light",
        resolvedAppearance: "light",
        isSamsungInternetBrowser: true
      }
    });

    expect(wrapper.get('[role="status"]').text()).toBe(
      "Samsung Internet 可能優先套用網頁深色模式。若畫面仍是深色，請至瀏覽器「設定 → 網頁檢視與捲動 → 深色模式」改為淺色。"
    );
  });

  it.each([
    ["Samsung Internet with system preference", "system", true],
    ["Samsung Internet with dark preference", "dark", true],
    ["another browser with light preference", "light", false]
  ] as const)("does not show guidance for %s", (_label, preference, isSamsung) => {
    const wrapper = mount(AppearanceSettings, {
      props: {
        modelValue: preference,
        resolvedAppearance:
          preference === "dark" ? "dark" : "light",
        isSamsungInternetBrowser: isSamsung
      }
    });

    expect(wrapper.find('[role="status"]').exists()).toBe(false);
  });
});
