// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
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

/**
 * 頁首的左右留白要與內容區逐字相同（2026-09-04，使用者回報「Logo 太靠左，
 * 要跟底下元件對齊」）。
 *
 * 兩邊原本是**兩個不同的 clamp**：頁首 `clamp(1rem, 4vw, 2.25rem)`、
 * `AppShell` 的 main `clamp(1rem, 5vw, 2.75rem)`。於是在每一種寬度下都差
 * 一點——375px 實測頁首 16、內容 18.75。
 *
 * 比對字串而不是比對某個寬度下的數值：兩邊都是隨寬度變的 clamp，只驗一種
 * 視窗寬度的話，換一個寬度又會錯開。
 */
describe("頁首與內容的左右留白一致", () => {
  const strip = (source: string): string =>
    source.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

  /* 傳進來的都是單純的 class 選擇器，切字串就夠，不必動態組正規式。 */
  function inlinePadding(file: string, selector: string): string {
    const css = strip(readFileSync(file, "utf8"));
    const start = css.indexOf(`${selector} {`);
    expect(start, `找不到 ${selector}`).toBeGreaterThanOrEqual(0);

    const block = css.slice(start, css.indexOf("}", start));

    const padding = /padding:\s*([^;]+);/.exec(block)?.[1];
    expect(padding, `${selector} 沒有 padding`).toBeDefined();

    /* `padding: 上 左右` 或 `padding: 上 左右 下`——取第二段。 */
    return padding!.trim().split(/\s+(?![^(]*\))/)[1]!;
  }

  it("頁首用的是內容區那一個 clamp", () => {
    expect(
      inlinePadding(
        "apps/web/src/components/shell/BrandHeader.vue",
        ".brand-header"
      )
    ).toBe(
      inlinePadding(
        "apps/web/src/components/shell/AppShell.vue",
        ".app-shell__main"
      )
    );
  });

  /*
   * **反向：不是把兩邊都改成寫死的數字。** 那樣兩條字串也會相等，但版面
   * 在窄螢幕會太擠、在寬螢幕會太貼邊——clamp 存在就是為了這件事。
   */
  it("兩邊都仍然是 clamp", () => {
    expect(
      inlinePadding(
        "apps/web/src/components/shell/BrandHeader.vue",
        ".brand-header"
      )
    ).toMatch(/^clamp\(/);
  });
});

