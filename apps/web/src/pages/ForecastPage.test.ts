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
async function mountForecast() {
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
      ensureLoaded: vi.fn(async () => undefined),
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

    expect(wrapper.text()).toContain("當日預測的最高值");
  });

  it("說明今天那一格只算剩餘時段", async () => {
    const wrapper = await mountForecast();

    expect(wrapper.text()).toContain("今天只算剩餘時段");
  });

  it("保留原本的兩句安全限制", async () => {
    const wrapper = await mountForecast();

    expect(wrapper.text()).toContain("不是即時測站觀測");
    expect(wrapper.text()).toContain("不會延長或縮短");
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
    const occurrences = wrapper.text().split("不是即時測站觀測").length - 1;

    expect(occurrences).toBe(1);
  });

  it("標題整頁只出現一次", async () => {
    const wrapper = await mountForecast();
    const text = wrapper.text();

    expect(text.split("五日 UV 預報").length - 1).toBe(1);
    expect(text).not.toContain("未來 5 天 UV 預報");
  });
});
