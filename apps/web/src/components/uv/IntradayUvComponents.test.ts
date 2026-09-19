// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { buildIntradayUvCurve } from "../../features/uv/solarUvCurve";
import IntradayUvCurve from "./IntradayUvCurve.vue";
import IntradayUvSheet from "./IntradayUvSheet.vue";
import UvSparkline from "./UvSparkline.vue";

describe("Intraday UV Components", () => {
  const curve = buildIntradayUvCurve({
    date: new Date("2026-07-15T00:00:00+08:00"),
    now: new Date("2026-07-15T12:00:00+08:00"),
    officialMaxUv: 9.0,
    latitude: 25.04,
    longitude: 121.56
  });

  describe("UvSparkline", () => {
    it("正常渲染 SVG 與路徑", () => {
      const wrapper = mount(UvSparkline, {
        props: { curve }
      });

      expect(wrapper.find("svg").exists()).toBe(true);
      expect(wrapper.find(".uv-sparkline__line").exists()).toBe(true);
      expect(wrapper.find(".uv-sparkline__dot").exists()).toBe(true);
      expect(wrapper.attributes("aria-label")).toContain("今日紫外線");
    });

    it("點擊時發送 open 事件", async () => {
      const wrapper = mount(UvSparkline, {
        props: { curve }
      });

      await wrapper.trigger("click");
      expect(wrapper.emitted("open")).toHaveLength(1);
    });

    it("非可互動模式下渲染 div 且無點擊事件", () => {
      const wrapper = mount(UvSparkline, {
        props: { curve, interactive: false }
      });

      expect(wrapper.element.tagName).toBe("DIV");
      expect(wrapper.classes()).not.toContain("uv-sparkline--interactive");
    });
  });

  describe("IntradayUvCurve", () => {
    it("完整渲染時間軸、曲線與等距參考線", () => {
      const wrapper = mount(IntradayUvCurve, {
        props: { curve }
      });

      expect(wrapper.find("svg").exists()).toBe(true);
      expect(wrapper.find(".intraday-uv__curve-line").exists()).toBe(true);
      expect(wrapper.find(".intraday-uv__current").exists()).toBe(true);
      expect(wrapper.find(".intraday-uv__current-dot").exists()).toBe(true);
      expect(wrapper.find(".intraday-uv__current-halo").exists()).toBe(true);
      expect(wrapper.findAll(".intraday-uv__threshold-line").length).toBeGreaterThan(0);
      expect(wrapper.findAll(".intraday-uv__tick-label").length).toBeGreaterThan(0);
      expect(wrapper.text()).toContain("晴空強度趨勢示意");
      expect(wrapper.text()).not.toContain("尖峰時段紫外線累積快速");
    });

    it("支援渲染補擦紀錄標記點", () => {
      const wrapper = mount(IntradayUvCurve, {
        props: {
          curve,
          reapplyHours: [10.5, 13.0]
        }
      });

      const dots = wrapper.findAll(".intraday-uv__reapply-dot");
      expect(dots).toHaveLength(2);
    });
  });

  describe("IntradayUvSheet", () => {
    it("呈現日間逐小時預測與補擦紀錄", () => {
      document.body.innerHTML = "";
      const wrapper = mount(IntradayUvSheet, {
        attachTo: document.body,
        props: {
          open: true,
          curve,
          regionName: "臺北市",
          reapplyHours: [10.5]
        }
      });

      const bodyText = document.body.textContent ?? "";
      expect(bodyText).toContain("臺北市・今日 UV 走勢");
      expect(bodyText).toContain("日間逐時指數");
      expect(bodyText).toContain("今日補擦紀錄");
      expect(bodyText).toContain("10:30");
      expect(document.body.querySelectorAll(".intraday-uv-sheet__hour-chip").length).toBeGreaterThan(5);

      wrapper.unmount();
    });
  });
});
