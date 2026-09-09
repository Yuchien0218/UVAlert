// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UvCountyListItem from "./UvCountyListItem.vue";

const county = {
  countyCode: "63000",
  displayName: "臺北市",
  uvi: 8,
  riskLevel: "very_high" as const
};

describe("UvCountyListItem", () => {
  it("用共用規則顯示縣市、數值與等比長條", () => {
    const wrapper = mount(UvCountyListItem, { props: { county } });

    expect(wrapper.text()).toContain("臺北市");
    expect(wrapper.get(".stat-figure").text()).toBe("8");
    expect(wrapper.classes()).toContain("uv-county-item--very-high");
    expect(wrapper.attributes("style")).toContain("--uvi-fill: 73%");
  });

  it("不以分隔線、硬刻色彩或截斷文字製造列表樣式", () => {
    const source = readFileSync(
      "apps/web/src/components/uv/UvCountyListItem.vue",
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\//g, "");

    expect(source).not.toMatch(/border-bottom|<hr|#[0-9a-f]{3,8}/iu);
    expect(source).not.toMatch(/font-size:\s*\d|border-radius:\s*\d|padding:\s*\d/iu);
    expect(source).not.toMatch(/nowrap|ellipsis/iu);
  });
});
