// @vitest-environment happy-dom

import { mount, RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BrandHeader from "./BrandHeader.vue";

function mountHeader(props: Record<string, unknown> = {}) {
  return mount(BrandHeader, {
    props,
    global: {
      stubs: {
        RouterLink: RouterLinkStub
      }
    }
  });
}

describe("BrandHeader", () => {
  /*
   * 2026-08-24 使用者裁決：右上角改顯示紫外線指數（例如「臺中市 低量級」），
   * 顏色跟著風險等級走，點下去到 /forecast。
   */
  describe("UV 指數", () => {
    it("有地區與風險等級時顯示地區＋等級，並連到五日預報", () => {
      const wrapper = mountHeader({
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
      const wrapper = mountHeader({
        regionName: "臺中市",
        uvRiskLevel: riskLevel
      });

      expect(wrapper.get(".brand-header__uv").text()).toBe(`臺中市 ${label}`);
      expect(wrapper.get(".brand-header__uv").classes()).toContain(
        `brand-header__uv--${riskLevel}`
      );
    });

    /*
     * 2026-08-24：沒有 UV 可顯示時改為給出口「前往地區設定」，取代原本
     * 退回顯示提醒狀態文字的做法——提醒狀態現在整份都在首頁看得到，
     * 頁首再放一次只是重複；而地區設定是使用者唯一能自己解決的動作。
     */
    it("沒有地區或預報時顯示前往地區設定的出口", () => {
      for (const props of [
        { uvRiskLevel: "high" },
        { regionName: "臺中市" },
        {}
      ]) {
        const wrapper = mountHeader(props);
        expect(wrapper.find(".brand-header__uv").exists()).toBe(false);
        expect(wrapper.get(".brand-header__set-region").text()).toBe(
          "前往地區設定"
        );
        expect(
          wrapper
            .findAllComponents(RouterLinkStub)
            .map((link) => link.props("to"))
        ).toContain("/region");
      }
    });
  });
});
