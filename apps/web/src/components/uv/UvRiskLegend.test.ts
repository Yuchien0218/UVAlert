// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UvRiskLegend from "./UvRiskLegend.vue";

describe("UvRiskLegend", () => {
  it("依共用風險字典順序顯示五個可讀圖例", () => {
    const wrapper = mount(UvRiskLegend);
    const items = wrapper.findAll(".uv-risk-legend__item");

    expect(items).toHaveLength(5);
    expect(items.map((item) => item.text())).toEqual([
      "0–2 低量級",
      "3–5 中量級",
      "6–7 高量級",
      "8–10 過量級",
      "11+ 危險級"
    ]);
    expect(items[3]!.classes()).toContain("uv-risk-legend__item--very-high");
    expect(items.every((item) => item.attributes("data-typography-role") === "supporting")).toBe(true);
  });
});
