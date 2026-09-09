// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import type { NationwideUvCounty } from "@sunshield/contracts";
import type { WebAppServices } from "../app/createWebAppServices";
import { useWebAppServices } from "../app/injection";
import ForecastPage from "./ForecastPage.vue";

vi.mock("../app/injection", () => ({ useWebAppServices: vi.fn() }));

const codes = ["63000", "65000", "10017", "68000", "10018", "10004", "10002", "10005", "66000", "10007", "10008", "10009", "10020", "10010", "67000", "64000", "10013", "10015", "10014", "10016", "09020", "09007"];
const nationwide = {
  schemaVersion: "nationwide-uv-v1" as const, sourceKind: "forecast" as const,
  sourceDataset: "F-D0047-091" as const, sourceDisplayName: "中央氣象署區域預報",
  issuedAt: "2026-08-31T00:00:00.000Z", fetchedAt: "2026-08-31T00:00:00.000Z",
  usableUntil: "2026-08-31T06:00:00.000Z", localDate: "2026-08-31",
  counties: codes.map((countyCode, index) => ({ countyCode, displayName: `縣市 ${index + 1}`, uvi: index % 12, riskLevel: "low" })) as NationwideUvCounty[]
};

async function mountForecast(region: { regionCode: string; displayName: string } | null) {
  const router = createRouter({ history: createMemoryHistory(), routes: [
    { path: "/forecast", component: ForecastPage }, { path: "/region", component: { template: "<div />" } }
  ] });
  const ensureLoaded = vi.fn(async () => undefined);
  const ensureNationwideLoaded = vi.fn(async () => undefined);
  vi.mocked(useWebAppServices).mockReturnValue({ uvForecast: {
    phase: shallowReadonly(shallowRef(region === null ? "no_region" : "ready")),
    error: shallowReadonly(shallowRef(null)), forecast: shallowReadonly(shallowRef(region === null ? null : makeFiveDayUvForecast())),
    region: shallowReadonly(shallowRef(region)), nationwide: shallowReadonly(shallowRef(nationwide)),
    ensureLoaded, ensureNationwideLoaded, refresh: vi.fn(async () => undefined)
  }} as unknown as WebAppServices);
  await router.push("/forecast"); await router.isReady();
  const wrapper = mount(ForecastPage, { global: { plugins: [router], stubs: { Icon: true } } });
  await flushPromises();
  return { wrapper, ensureLoaded, ensureNationwideLoaded };
}

describe("ForecastPage", () => {
  it("未設定地區仍載入並顯示完整全臺分布", async () => {
    const { wrapper, ensureLoaded, ensureNationwideLoaded } = await mountForecast(null);
    expect(ensureLoaded).toHaveBeenCalledOnce();
    expect(ensureNationwideLoaded).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain("尚未設定地區");
    expect(wrapper.findAll(".uv-county-group__title")).toHaveLength(5);
    expect(wrapper.findAll(".uv-county-item")).toHaveLength(22);
    expect(wrapper.find(".uv-map__marker").exists()).toBe(false);
  });

  it("保留一次安全說明", async () => {
    const { wrapper } = await mountForecast({ regionCode: "63000010", displayName: "臺北市中正區" });
    expect(wrapper.text().split("不影響補擦倒數").length - 1).toBe(1);
  });
});
