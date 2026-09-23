// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BackToTopButton from "./BackToTopButton.vue";

const SOURCE = readFileSync(
  "apps/web/src/components/common/BackToTopButton.vue",
  "utf8"
);

describe("BackToTopButton", () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, "scrollY", {
      writable: true,
      configurable: true,
      value: 0
    });
    vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("在頂部時不顯示（scrollY <= 320）", () => {
    const wrapper = mount(BackToTopButton);
    expect(wrapper.find("button").exists()).toBe(false);
  });

  it("滾動超過 320px 後顯示按鈕", async () => {
    const wrapper = mount(BackToTopButton);
    expect(wrapper.find("button").exists()).toBe(false);

    globalThis.scrollY = 400;
    globalThis.dispatchEvent(new Event("scroll"));
    await wrapper.vm.$nextTick();

    const button = wrapper.find("button");
    expect(button.exists()).toBe(true);
    expect(button.attributes("aria-label")).toBe("回到頁面頂部");
    expect(button.attributes("type")).toBe("button");
  });

  it("點擊按鈕時觸發平滑回到頂部", async () => {
    globalThis.scrollY = 500;
    const wrapper = mount(BackToTopButton);
    await wrapper.vm.$nextTick();

    const button = wrapper.get("button");
    await button.trigger("click");

    expect(globalThis.scrollTo).toHaveBeenCalledWith({
      top: 0,
      behavior: "smooth"
    });
  });

  it("當 hasNavigation 為 true 時帶有相應的位移樣式類別", async () => {
    globalThis.scrollY = 500;
    const wrapper = mount(BackToTopButton, {
      props: { hasNavigation: true }
    });
    await wrapper.vm.$nextTick();

    const button = wrapper.get("button");
    expect(button.classes()).toContain("back-to-top--with-navigation");
  });

  it("桌面版使用全站閱讀殼層計算水平位置", () => {
    expect(SOURCE).toMatch(
      /@media \(min-width: 48rem\)[\s\S]*?\.back-to-top\s*\{[^}]*var\(--reading-shell-max\)/
    );
  });

  it("卸載時清除 scroll 事件監聽", () => {
    const removeSpy = vi.spyOn(globalThis, "removeEventListener");
    const wrapper = mount(BackToTopButton);
    wrapper.unmount();

    expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
  });
});
