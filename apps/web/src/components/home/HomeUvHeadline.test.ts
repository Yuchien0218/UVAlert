// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import HomeUvHeadline from "./HomeUvHeadline.vue";

const source = readFileSync(
  "apps/web/src/components/home/HomeUvHeadline.vue",
  "utf8"
).replace(/\/\*[\s\S]*?\*\//g, "");

function mountHeadline(riskLevel: string | null, uvi: number | null) {
  return mount(HomeUvHeadline, {
    props: {
      eyebrow: "今日 UV",
      uvi,
      riskLevel,
      locationLine: "臺中市西區",
      note: null
    } as never
  });
}

describe("HomeUvHeadline 風險色", () => {
  it("讀數與等級都帶上風險等級的修飾類別", () => {
    const value = mountHeadline("moderate", 5).get(".uv-headline__value");

    expect(value.classes()).toContain("uv-headline__value--moderate");
  });

  /*
   * 沒有資料時不上色，也不顯示 0——0 是合法的 UV 值，拿它當「沒資料」會讓
   * 使用者以為紫外線很低。
   */
  it("沒有資料時不套用任何風險色", () => {
    const wrapper = mountHeadline(null, null);

    expect(wrapper.find(".uv-headline__value").exists()).toBe(false);
    expect(wrapper.text()).toContain("無資料");
    expect(wrapper.text()).not.toContain("0");
  });

  /*
   * **等級標籤不能直接用 UV 色當文字色。**
   *
   * UV 五色在暖象牙底上的對比：low 4.12、moderate 2.97、high 3.43、
   * very-high 4.74、extreme 5.48——一般字級要 4.5:1，只有後兩個及格。
   * 所以標籤走「淡色底 ＋ 深咖文字」，讀數（大字，門檻 3:1）才直接上色。
   *
   * 這條守的是那個區分不被「順手統一」掉。
   */
  it("等級標籤用淡色底而不是彩色文字", () => {
    for (const level of ["low", "moderate", "high", "very_high", "extreme"]) {
      const rule = source.match(
        new RegExp(
          `\\.uv-headline__value--${level} \\.uv-headline__level \\{([^}]*)\\}`
        )
      );
      expect(rule, level).not.toBeNull();
      expect(rule![1], level).toContain("color-mix");
      expect(rule![1], `${level} 不該自己指定文字色`).not.toMatch(
        /(^|\s)color:/
      );
    }
  });

  it("讀數直接上色", () => {
    for (const [level, token] of [
      ["low", "--color-uvi-low"],
      ["moderate", "--color-uvi-moderate"],
      ["high", "--color-uvi-high"],
      ["very_high", "--color-uvi-very-high"],
      ["extreme", "--color-uvi-extreme"]
    ]) {
      const rule = source.match(
        new RegExp(
          `\\.uv-headline__value--${level} \\.uv-headline__figure \\{([^}]*)\\}`
        )
      );
      expect(rule, level).not.toBeNull();
      expect(rule![1], level).toContain(`color: var(${token})`);
    }
  });
});
