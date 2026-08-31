// @vitest-environment happy-dom
import { flushPromises, mount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import type { WebAppServices } from "../app/createWebAppServices";
import { useWebAppServices } from "../app/injection";
import ForecastPage from "./ForecastPage.vue";

vi.mock("../app/injection", () => ({
  useWebAppServices: vi.fn()
}));

/**
 * 2026-08-31 新增。
 *
 * 在此之前這一頁**沒有任何測試**，而安全文案（「不是即時測站觀測」「UV 高低
 * 不會延長或縮短補擦計時」）只被 `FiveDayUvCard` 的測試守著。那句文案這次
 * 從卡片移到頁面（卡片與頁面各有一份幾乎一樣的，使用者回饋重複），所以守門
 * 也要跟著搬——**不能只是把卡片那條斷言刪掉**，那會讓安全文案變成沒人守。
 */
const NATIONWIDE = {
  schemaVersion: "nationwide-uv-v1" as const,
  sourceKind: "forecast" as const,
  sourceDataset: "F-D0047-091" as const,
  sourceDisplayName: "中央氣象署區域預報",
  issuedAt: "2026-08-31T00:00:00.000Z",
  fetchedAt: "2026-08-31T00:00:00.000Z",
  usableUntil: "2026-08-31T06:00:00.000Z",
  localDate: "2026-08-31",
  counties: [
    { countyCode: "63000", displayName: "臺北市", uvi: 8, riskLevel: "very_high" as const },
    { countyCode: "66000", displayName: "臺中市", uvi: 6, riskLevel: "high" as const }
  ]
};

async function mountForecast(nationwide: typeof NATIONWIDE | null = NATIONWIDE) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/forecast", name: "forecast", component: ForecastPage },
      { path: "/region", name: "region", component: { template: "<div />" } }
    ]
  });

  vi.mocked(useWebAppServices).mockReturnValue({
    uvForecast: {
      phase: shallowReadonly(shallowRef("ready")),
      error: shallowReadonly(shallowRef(null)),
      forecast: shallowReadonly(shallowRef(makeFiveDayUvForecast())),
      region: shallowReadonly(
        shallowRef({ regionCode: "63000010", displayName: "臺北市中正區" })
      ),
      nationwide: shallowReadonly(shallowRef(nationwide)),
      ensureLoaded: vi.fn(async () => undefined),
      ensureNationwideLoaded: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined)
    }
  } as unknown as WebAppServices);

  await router.push("/forecast");
  await router.isReady();

  const wrapper = mount(ForecastPage, {
    global: { plugins: [router], stubs: { Icon: true } }
  });
  await flushPromises();
  return wrapper;
}

describe("ForecastPage", () => {
  /*
   * 三件事分開守。合成一條的話，改壞任何一項都可能被另外兩項掩護——
   * 尤其「今天只算剩餘時段」那句，它是這次才補上的**正確性**修正，不是
   * 潤飾：cwa.ts 會跳過已結束的時段，所以今天那一格不是整日最高。
   */
  it("說明數值是當日預測最高值", async () => {
    const wrapper = await mountForecast();

    expect(wrapper.text()).toContain("最高預測");
  });

  it("說明今天那一格只算剩餘時段", async () => {
    const wrapper = await mountForecast();

    expect(wrapper.text()).toContain("當前至日落");
  });

  it("保留原本的兩句安全限制", async () => {
    const wrapper = await mountForecast();

    expect(wrapper.text()).toContain("預測");
    expect(wrapper.text()).toContain("不影響補擦倒數");
  });

  /*
   * 使用者回饋「重複性文字太多」。頁面 h1 已經是「五日 UV 預報」，卡片
   * 先前還有一個 h2「未來 5 天 UV 預報」；同一句免責也各有一份。
   *
   * 守的是「整頁只出現一次」而不是「卡片裡沒有」——後者在有人把它加回
   * 頁面別處時仍然會綠。
   */
  it("免責說明整頁只出現一次", async () => {
    const wrapper = await mountForecast();
    const occurrences = wrapper.text().split("不影響補擦倒數").length - 1;

    expect(occurrences).toBe(1);
  });

  it("標題整頁只出現一次", async () => {
    const wrapper = await mountForecast();
    const text = wrapper.text();

    expect(text.split("五日 UV 預報").length - 1).toBe(1);
    expect(text).not.toContain("未來 5 天 UV 預報");
  });
  /*
   * 地圖：三件事分開守。
   *
   * 只守「地圖有渲染」→ 等價清單可以不存在（那是它的無障礙依據）；
   * 只守「清單有」→ aria-hidden 可以掉，變成螢幕閱讀器唸一張空圖；
   * 只守「沒資料不渲染」→ 有資料時可能根本沒接上。
   */
  it("有資料時渲染地圖，並對輔助技術隱藏", async () => {
    const wrapper = await mountForecast();
    const svg = wrapper.find(".uv-map");

    expect(svg.exists()).toBe(true);
    expect(svg.attributes("aria-hidden")).toBe("true");
  });

  it("地圖旁提供等價的縣市數字清單", async () => {
    const wrapper = await mountForecast();
    const items = wrapper.findAll(".uv-map-list__item");

    expect(items).toHaveLength(2);
    expect(items[0]!.text()).toContain("臺北市");
    expect(items[0]!.text()).toContain("8");
  });

  /*
   * 地圖是附加的視覺化，五日預報才是這頁的主體。地圖資料失敗時整塊不
   * 渲染——不要在畫面上留一個壞掉的空位。
   */
  it("沒有地圖資料時整塊不渲染，其餘內容不受影響", async () => {
    const wrapper = await mountForecast(null);

    expect(wrapper.find(".uv-map").exists()).toBe(false);
    expect(wrapper.find(".uv-map-list__item").exists()).toBe(false);
    expect(wrapper.text()).toContain("最高預測");
  });
});
