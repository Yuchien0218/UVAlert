// @vitest-environment happy-dom

import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BrandHeader from "./BrandHeader.vue";

function mountHeader(tone: "tracking" | "soon" | "due" | null) {
  return mount(BrandHeader, {
    props: { tone },
    global: {
      stubs: {
        RouterLink: RouterLinkStub
      }
    }
  });
}

describe("BrandHeader", () => {
  it("沒有進行中提醒時顯示中性說明", () => {
    const wrapper = mountHeader(null);

    expect(wrapper.get(".brand-header__context").text()).toBe("本機提醒");
  });

  // 狀態點只有顏色會變，色覺障礙或強光下看不出色差的使用者
  // 等於收不到這個資訊，所以文字必須跟著 tone 走。
  it.each([
    ["tracking", "提醒進行中"],
    ["soon", "快到補擦時間"],
    ["due", "建議現在補擦"]
  ] as const)("tone 為 %s 時文字也跟著改變", (tone, expected) => {
    const wrapper = mountHeader(tone);
    const context = wrapper.get(".brand-header__context");
    const brand = wrapper.get(".brand-header__brand");

    expect(context.text()).toBe(expected);
    expect(context.classes()).toContain(`brand-header__context--${tone}`);
    expect(brand.classes()).not.toContain(`brand-header__brand--${tone}`);
    expect(
      wrapper.get(".brand-header__status-dot").attributes("aria-hidden")
    ).toBe("true");
  });
});
