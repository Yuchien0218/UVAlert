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

  it("防曬晴報員字標（wordmark）不帶有任何動畫，僅太陽標記（mark）動效", () => {
    const fs = require("node:fs");
    const source = fs.readFileSync("apps/web/src/components/shell/AppSplashScreen.vue", "utf8");
    // 確保 path 動畫只針對 g[data-part="mark"]
    expect(source).toContain('g[data-part="mark"] path');
    expect(source).not.toMatch(/:deep\(path:nth-of-type/);
    expect(source).toContain('g[data-part="wordmark"] path');
    expect(source).toContain("animation: none !important");
  });
});
