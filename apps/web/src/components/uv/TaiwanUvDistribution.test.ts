// @vitest-environment happy-dom
import type {
  NationwideUvCounty,
  NationwideUvForecast,
  RegionSelection
} from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import TaiwanUvDistribution from "./TaiwanUvDistribution.vue";

const codes = ["63000", "65000", "10017", "68000", "10018", "10004", "10002", "10005", "66000", "10007", "10008", "10009", "10020", "10010", "67000", "64000", "10013", "10015", "10014", "10016", "09020", "09007"];
const counties: NationwideUvCounty[] = codes.map((countyCode, index) => ({
  countyCode,
  displayName: `縣市 ${index + 1}`,
  uvi: index % 12,
  riskLevel: "low"
}));
const forecast: NationwideUvForecast = {
  schemaVersion: "nationwide-uv-v1", sourceKind: "forecast", sourceDataset: "F-D0047-091",
  sourceDisplayName: "中央氣象署區域預報", issuedAt: "2026-08-31T00:00:00.000Z",
  fetchedAt: "2026-08-31T00:00:00.000Z", usableUntil: "2026-08-31T06:00:00.000Z",
  localDate: "2026-08-31", counties
};

const selectedRegion: RegionSelection = {
  regionCode: "63000010",
  displayName: "臺北市中正區",
  countyCode: "63000",
  countyName: "臺北市",
  townName: "中正區",
  boundaryDataVersion: "test",
  selectionMethod: "manual"
};

function mountDistribution(region: RegionSelection | null) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/region", component: { template: "<div />" } }]
  });
  return mount(TaiwanUvDistribution, { props: { forecast, region }, global: { plugins: [router] } });
}

describe("TaiwanUvDistribution", () => {
  it("把目前地區放在分布內容與分隔線之前", () => {
    const wrapper = mountDistribution(selectedRegion);
    expect(wrapper.find(".uv-distribution__region").element.compareDocumentPosition(wrapper.find(".uv-distribution__content").element)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(wrapper.text()).toContain("目前地區：臺北市中正區");
    expect(wrapper.get(".text-link").text()).toBe("變更地區");
    expect(wrapper.findAll(".uv-map, .uv-risk-legend, .uv-county-groups")).toHaveLength(3);
  });

  it("未設定地區仍顯示完整全臺分布且不畫定位標記", () => {
    const wrapper = mountDistribution(null);
    expect(wrapper.text()).toContain("尚未設定地區");
    expect(wrapper.get(".text-link").text()).toBe("設定地區");
    expect(wrapper.findAll(".uv-county-group__title")).toHaveLength(5);
    expect(wrapper.findAll(".uv-county-item")).toHaveLength(22);
    expect(wrapper.find(".uv-map__marker").exists()).toBe(false);
  });
});
