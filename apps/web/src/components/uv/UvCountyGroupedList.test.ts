// @vitest-environment happy-dom
import type { NationwideUvCounty } from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UvCountyListItem from "./UvCountyListItem.vue";
import UvCountyGroupedList from "./UvCountyGroupedList.vue";

const COUNTY_CODES = [
  "63000", "65000", "10017", "68000", "10018", "10004", "10002", "10005",
  "66000", "10007", "10008", "10009", "10020", "10010", "67000", "64000",
  "10013", "10015", "10014", "10016", "09020", "09007"
];

const counties: NationwideUvCounty[] = COUNTY_CODES.map((countyCode, index) => ({
  countyCode,
  displayName: countyCode === "63000" ? "臺北市" : countyCode === "09020" ? "金門縣" : `縣市 ${index + 1}`,
  uvi: index % 12,
  riskLevel: "low"
}));

describe("UvCountyGroupedList", () => {
  it("以五個可見分組標題和巢狀清單語意呈現所有縣市", () => {
    const wrapper = mount(UvCountyGroupedList, { props: { counties: [...counties].reverse() } });

    expect(wrapper.findAll(".uv-county-group__title").map((node) => node.text())).toEqual([
      "北部", "中部", "南部", "東部", "外島"
    ]);
    expect(wrapper.findAllComponents(UvCountyListItem)).toHaveLength(22);
    expect(wrapper.text()).toContain("臺北市");
    expect(wrapper.text()).toContain("金門縣");
    expect(wrapper.get("ul").findAll("li").length).toBeGreaterThan(0);
  });
});
