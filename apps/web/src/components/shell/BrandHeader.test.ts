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
  /* 2026-09-13：狀態資訊移回 UV 區塊，頁首改成明確的預報入口。 */
  describe("天氣與預報入口", () => {
    it("有地區時顯示地區、氣溫與降雨機率，並連到預報頁", () => {
      const wrapper = mountHeader({
        regionName: "臺中市西區",
        temperatureCelsius: 28.4,
        precipitationProbabilityPercent: 30
      });

      const uv = wrapper.get(".brand-header__uv");
      expect(uv.text()).toBe("臺中市西區 28°・降雨 30%");
      expect(
        wrapper
          .findAllComponents(RouterLinkStub)
          .map((link) => link.props("to"))
      ).toContain("/forecast");
    });

    it("無氣溫或降雨時優雅降級顯示", () => {
      const withTempOnly = mountHeader({
        regionName: "臺南市中西區",
        temperatureCelsius: 32
      });
      expect(withTempOnly.get(".brand-header__uv").text()).toBe("臺南市中西區 32°");

      const withRegionOnly = mountHeader({
        regionName: "高雄市左營區"
      });
      expect(withRegionOnly.get(".brand-header__uv").text()).toBe("高雄市左營區");
    });

    /*
     * 沒有地區可顯示時改為顯示「今日全臺UV分布」，連到 /forecast。
     */
    it("沒有地區時顯示今日全臺UV分布的出口", () => {
      for (const props of [
        { uvRiskLevel: "high" },
        {}
      ]) {
        const wrapper = mountHeader(props);
        expect(wrapper.find(".brand-header__uv").exists()).toBe(false);
        expect(wrapper.get(".brand-header__set-region").text()).toBe(
          "今日全臺UV分布"
        );
        expect(
          wrapper
            .findAllComponents(RouterLinkStub)
            .map((link) => link.props("to"))
        ).toContain("/forecast");
      }
    });

    it("hideUvEntrance 為 true 時不顯示預報入口", () => {
      for (const props of [
        { regionName: "臺中市西區", uvRiskLevel: "low", hideUvEntrance: true },
        { hideUvEntrance: true }
      ]) {
        const wrapper = mountHeader(props);
        expect(wrapper.find(".brand-header__uv").exists()).toBe(false);
        expect(wrapper.find(".brand-header__set-region").exists()).toBe(false);
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

