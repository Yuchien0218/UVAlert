// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import HomeNightNotice from "./HomeNightNotice.vue";

describe("HomeNightNotice", () => {
  it("夜間逃生出口維持可操作的 body role", async () => {
    const wrapper = mount(HomeNightNotice);
    const button = wrapper.get("button");

    expect(button.attributes("data-typography-role")).toBe("body");
    await button.trigger("click");
    expect(wrapper.emitted("start")).toHaveLength(1);
  });
  /*
   * 2026-08-31：空狀態加上主角圖示（使用者回報「提醒頁太空」）。
   *
   * 夜間狀態下整頁只有一句話加一條底線連結，看起來像載入失敗而不是
   * 「本來就沒事做」。守 56px 而不是「有圖示」——圖示縮回 20px 就等於
   * 沒解決原本的問題。
   */
  it("空狀態有 56px 的主角圖示", () => {
    const wrapper = mount(HomeNightNotice);

    expect(wrapper.get(".icon-lead svg").attributes("width")).toBe("56");
  });
});