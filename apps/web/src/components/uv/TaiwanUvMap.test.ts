// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { NationwideUvForecast } from "@sunshield/contracts";
import TaiwanUvMap from "./TaiwanUvMap.vue";

const forecast: NationwideUvForecast = {
  schemaVersion: "nationwide-uv-v1",
  sourceKind: "forecast",
  sourceDataset: "F-D0047-091",
  sourceDisplayName: "中央氣象署區域預報",
  issuedAt: "2026-08-31T00:00:00.000Z",
  fetchedAt: "2026-08-31T00:00:00.000Z",
  usableUntil: "2026-08-31T06:00:00.000Z",
  localDate: "2026-08-31",
  counties: [
    { countyCode: "63000", displayName: "臺北市", uvi: 9, riskLevel: "very_high" },
    { countyCode: "66000", displayName: "臺中市", uvi: 6, riskLevel: "high" }
  ]
};

function mountMap(highlightCountyCode: string | null = null) {
  return mount(TaiwanUvMap, { props: { forecast, highlightCountyCode } });
}

const source = readFileSync(
  "apps/web/src/components/uv/TaiwanUvMap.vue",
  "utf8"
).replace(/\/\*[\s\S]*?\*\//g, "");

describe("TaiwanUvMap", () => {
  it("畫出每一個縣市，缺資料的用中性色而不是最低 UV 色", () => {
    const wrapper = mountMap();
    const paths = wrapper.findAll(".uv-map__county");

    // 22 個縣市全部都要有形狀，不能因為沒有 UV 就不畫。
    expect(paths).toHaveLength(22);
    expect(wrapper.findAll(".uv-map__county--unknown")).toHaveLength(20);
    expect(wrapper.findAll(".uv-map__county--very_high")).toHaveLength(1);
    expect(wrapper.findAll(".uv-map__county--high")).toHaveLength(1);
  });

  /*
   * 沒有資料時**不能**落回最低的 UV 色——那會讓「查不到」看起來像「很安全」，
   * 在防曬 App 裡是會誤導的方向。
   */
  it("缺資料的縣市不被畫成低風險", () => {
    const wrapper = mountMap();

    expect(wrapper.find(".uv-map__county--low").exists()).toBe(false);
  });

  it("整張圖對輔助技術隱藏，等價內容在旁邊的清單", () => {
    const svg = mountMap().get("svg");

    expect(svg.attributes("aria-hidden")).toBe("true");
    expect(svg.attributes("focusable")).toBe("false");
    // 不可點：不該有任何互動元素或 pointer 事件。
    expect(svg.findAll("button, a")).toHaveLength(0);
  });

  /*
   * 定位標記用一個小圓環，不是描邊整個縣市——資料是鄉鎮環的集合，描邊會
   * 把該縣市內部的鄉鎮界一起畫出來。
   */
  it("有設定地區時畫出定位標記", () => {
    expect(mountMap("63000").find(".uv-map__marker").exists()).toBe(true);
    expect(mountMap(null).find(".uv-map__marker").exists()).toBe(false);
  });

  /*
   * 這兩條守的是「畫出來才看得到」的兩個坑，2026-08-31 各踩過一次：
   *
   * - 描邊用別的顏色 → 368 條鄉鎮界全部跑出來，縣市變成馬賽克
   * - 完全不描邊 → 相鄰鄉鎮各自簡化，共用邊對不上，內部出現白色細縫
   *
   * 所以規則是「描邊顏色必須與填色相同」，兩邊都不能少。分開守，因為
   * 合成一條時把 stroke 改成畫布色仍然會有 stroke 宣告。
   */
  it("每個風險等級的描邊顏色與填色相同", () => {
    for (const level of [
      "unknown",
      "low",
      "moderate",
      "high",
      "very_high",
      "extreme"
    ]) {
      const rule = source.match(
        new RegExp(`\\.uv-map__county--${level} \\{([^}]*)\\}`)
      );
      expect(rule, level).not.toBeNull();
      const fill = rule![1]!.match(/fill:\s*([^;]+);/)?.[1]?.trim();
      const stroke = rule![1]!.match(/stroke:\s*([^;]+);/)?.[1]?.trim();
      expect(stroke, `${level} 的 stroke`).toBe(fill);
    }
  });

  it("有描邊寬度，不是完全不描邊", () => {
    expect(source).toMatch(/\.uv-map__county \{[^}]*stroke-width:/);
  });

  /*
   * 金門在東經 118.3、本島最西的澎湖在 119.5，照實際經度畫的話本島只佔
   * 畫布右邊約六成。inset 是讓地圖在手機上看得清楚的前提。
   */
  it("金門畫成 inset，viewBox 不被它撐寬", () => {
    const wrapper = mountMap();
    const viewBox = wrapper.get("svg").attributes("viewBox") ?? "";
    const [, , width, height] = viewBox.split(" ").map(Number);

    // 本島（含澎湖）約 2.47 度經距 × cos24 ≈ 2.25；含金門會超過 3.4。
    expect(width).toBeLessThan(2.6);
    expect(height).toBeGreaterThan(width!);
  });
});
