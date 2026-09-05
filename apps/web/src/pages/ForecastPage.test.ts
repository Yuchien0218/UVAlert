// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { flushPromises, mount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import type { WebAppServices } from "../app/createWebAppServices";
import { useWebAppServices } from "../app/injection";
import type { NationwideUvCounty } from "@sunshield/contracts";
import TaiwanUvMap from "../components/uv/TaiwanUvMap.vue";
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
    { countyCode: "63000", displayName: "臺北市", uvi: 8, riskLevel: "very_high" },
    { countyCode: "66000", displayName: "臺中市", uvi: 6, riskLevel: "high" }
  ] as NationwideUvCounty[]
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

/**
 * 縣市色條（2026-09-05）。
 *
 * 改動前這份清單是 22 個等重的數字——要知道「今天哪裡最曬」得逐一比大小。
 * 地圖已經在上面用顏色講了同一件事，但它 `aria-hidden`（色塊地圖對色覺
 * 障礙與螢幕閱讀器都傳達不了東西），清單是它的**等價內容**，卻完全沒有
 * 視覺編碼。
 */
describe("縣市清單的色條", () => {
  const withCounties = (counties: NationwideUvCounty[]): typeof NATIONWIDE => ({
    ...NATIONWIDE,
    counties
  });

  const SOURCE = readFileSync("apps/web/src/pages/ForecastPage.vue", "utf8");

  it("每一列帶等級 class 與寬度變數", async () => {
    const wrapper = await mountForecast();
    const items = wrapper.findAll(".uv-map-list__item");

    expect(items).toHaveLength(2);
    expect(items[0]!.classes()).toContain("uv-map-list__item--very_high");
    expect(items[1]!.classes()).toContain("uv-map-list__item--high");
    // 8/11 = 72.7% → 73%；6/11 = 54.5% → 55%
    expect(items[0]!.attributes("style")).toContain("--uvi-fill: 73%");
    expect(items[1]!.attributes("style")).toContain("--uvi-fill: 55%");
  });

  /*
   * 滿格門檻是**危險級的起點**（11），不是資料裡的最大值——用最大值的話
   * 每天的比例尺都不同，昨天的「滿格」與今天的不是同一件事。11 以上一律
   * 夾在 100%，它們的差異由右邊的數字承載。
   */
  it("滿格門檻是 11，超過一律夾住", async () => {
    const wrapper = await mountForecast(
      withCounties([
        { countyCode: "63000", displayName: "臺北市", uvi: 11, riskLevel: "extreme" },
        { countyCode: "64000", displayName: "高雄市", uvi: 15, riskLevel: "extreme" }
      ])
    );
    const items = wrapper.findAll(".uv-map-list__item");

    expect(items[0]!.attributes("style")).toContain("--uvi-fill: 100%");
    expect(items[1]!.attributes("style")).toContain("--uvi-fill: 100%");
  });

  /*
   * **反向：數字不可以被顏色取代。**
   *
   * 實測五個 UV 色在畫布上的對比是 low 4.12、moderate 2.97、high 3.43、
   * very_high 4.74、extreme 5.48——三個過不了小字 AA 的 4.5，moderate 連
   * 圖形物件的 3.0 都不到。所以顏色**只能是冗餘編碼**，資訊必須由數字承載。
   * 少了這條，把數字換成純色塊也會過上面兩條。
   */
  it("數字仍然印在每一列上", async () => {
    const wrapper = await mountForecast();

    expect(
      wrapper.findAll(".uv-map-list__item .stat-figure").map((n) => n.text())
    ).toEqual(["8", "6"]);
  });

  /*
   * **`position: relative` 是必要的，不是保險。**
   *
   * 少了它，`::before` 這個後生成的定位元素會蓋在文字上（同一個 stacking
   * context 裡，定位元素依 DOM 順序疊放）。這與 2026-09-04 底部導覽藥丸蓋住
   * 圖示是同一個坑——那次所有數值斷言都過，只有截圖看得出來，所以這裡補一
   * 條原始碼守門。
   */
  it("文字疊在色條之上", () => {
    expect(SOURCE).toMatch(
      /\.uv-map-list__item > span \{[^}]*position: relative;/
    );
  });

  /*
   * 五個等級都要有色，缺一個那一級就變透明、看起來像沒資料。
   *
   * 刻意用 `indexOf` ＋ `slice` 而不是 `new RegExp`：RegExp 的**字串**參數
   * 需要雙反斜線（`\\.`），而這個檔案要經過工具鏈好幾層跳脫，寫錯就會變成
   * `.` 這個「匹配任意字元」的萬用字元——測試照樣綠，但守的範圍被悄悄放寬
   * （CLAUDE.md 坑二的變體）。字串比對沒有這個風險。
   */
  it("五個等級都有色條顏色", () => {
    for (const level of ["low", "moderate", "high", "very_high", "extreme"]) {
      const start = SOURCE.indexOf(`.uv-map-list__item--${level} {`);

      expect(start, `${level} 沒有色條規則`).toBeGreaterThan(-1);
      expect(
        SOURCE.slice(start, SOURCE.indexOf("}", start)),
        `${level} 沒有色條顏色`
      ).toContain("--uvi-fill-tint:");
    }
  });

  /*
   * **反向：台灣地圖必須還在。**
   *
   * 清單是地圖的**等價內容**，不是它的替代品。少了這條，把地圖整個拿掉、
   * 只留色條清單也會過上面每一條——而那會讓「一眼看出全臺分布」這件事
   * 從一張圖退回成一份表。
   */
  it("地圖沒有被清單取代", async () => {
    const wrapper = await mountForecast();

    expect(wrapper.findComponent(TaiwanUvMap).exists()).toBe(true);
    expect(wrapper.find(".uv-map-list").exists()).toBe(true);
  });
});
