// @vitest-environment happy-dom

import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BrandHeader from "./BrandHeader.vue";

function mountHeader(
  tone: "tracking" | "soon" | "due" | null,
  extra: Record<string, unknown> = {}
) {
  return mount(BrandHeader, {
    props: { tone, ...extra },
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

  /*
   * 2026-08-24 使用者裁決：右上角改顯示紫外線指數（例如「臺中市 低量級」），
   * 顏色跟著風險等級走，點下去到 /forecast。
   */
  describe("UV 指數", () => {
    it("有地區與風險等級時顯示地區＋等級，並連到五日預報", () => {
      const wrapper = mountHeader("tracking", {
        regionName: "臺中市",
        uvRiskLevel: "low"
      });

      const uv = wrapper.get(".brand-header__uv");
      expect(uv.text()).toBe("臺中市 低量級");
      expect(uv.classes()).toContain("brand-header__uv--low");
      // 注意頁首有兩個 RouterLink（品牌 Logo 連到 /），要取 UV 這一個。
      expect(
        wrapper
          .findAllComponents(RouterLinkStub)
          .map((link) => link.props("to"))
      ).toContain("/forecast");
      // UV 取代原本的提醒狀態文字，不並存。
      expect(wrapper.find(".brand-header__context").exists()).toBe(false);
    });

    // 顏色不能是唯一載體——等級名稱本身就是文字，灰階下仍讀得出來。
    it.each([
      ["low", "低量級"],
      ["moderate", "中量級"],
      ["high", "高量級"],
      ["very_high", "過量級"],
      ["extreme", "危險級"]
    ] as const)("%s 顯示對應的等級文字", (riskLevel, label) => {
      const wrapper = mountHeader(null, {
        regionName: "臺中市",
        uvRiskLevel: riskLevel
      });

      expect(wrapper.get(".brand-header__uv").text()).toBe(`臺中市 ${label}`);
      expect(wrapper.get(".brand-header__uv").classes()).toContain(
        `brand-header__uv--${riskLevel}`
      );
    });

    it("沒有地區或預報時退回提醒狀態文字，不留空白", () => {
      const noRegion = mountHeader("due", { uvRiskLevel: "high" });
      expect(noRegion.find(".brand-header__uv").exists()).toBe(false);
      expect(noRegion.get(".brand-header__context").text()).toBe(
        "建議現在補擦"
      );

      const noForecast = mountHeader("due", { regionName: "臺中市" });
      expect(noForecast.find(".brand-header__uv").exists()).toBe(false);
      expect(noForecast.get(".brand-header__context").text()).toBe(
        "建議現在補擦"
      );
    });
  });
});
