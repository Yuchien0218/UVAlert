// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AppSplashScreen from "./AppSplashScreen.vue";

describe("AppSplashScreen", () => {
  it("在 opening_database 階段正常顯示", () => {
    const wrapper = mount(AppSplashScreen, {
      props: {
        phase: "opening_database"
      }
    });

    expect(wrapper.find(".app-splash-screen").exists()).toBe(true);
    expect(wrapper.text()).toContain("紫外線即時與防護提醒");
  });

  it("在 ready 階段自動隱藏", async () => {
    const wrapper = mount(AppSplashScreen, {
      props: {
        phase: "ready"
      }
    });

    expect(wrapper.find(".app-splash-screen").exists()).toBe(false);
  });

  it("在 error 階段立即隱藏，不阻擋錯誤訊息", async () => {
    const wrapper = mount(AppSplashScreen, {
      props: {
        phase: "error"
      }
    });

    expect(wrapper.find(".app-splash-screen").exists()).toBe(false);
  });
});
