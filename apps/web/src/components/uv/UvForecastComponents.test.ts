// @vitest-environment happy-dom

import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import FiveDayUvCard from "./FiveDayUvCard.vue";

describe("FiveDayUvCard", () => {
  it("顯示五個白日時段、來源與地區預報限制", () => {
    const forecast = makeFiveDayUvForecast();
    const wrapper = mount(FiveDayUvCard, {
      props: {
        phase: "ready",
        error: null,
        forecast
      }
    });

    expect(wrapper.findAll(".uv-day")).toHaveLength(5);
    expect(
      wrapper.findAll(".uv-day__value").every((node) =>
        node.classes().includes("stat-figure")
      )
    ).toBe(true);
    expect(wrapper.get(".uv-forecast__updated-at").classes()).toContain(
      "stat-figure"
    );
    expect(wrapper.text()).toContain("臺北市中正區");
    expect(wrapper.text()).toContain("過量級");
    expect(wrapper.text()).toContain("F-D0047-091");
    expect(wrapper.text()).toContain("不是即時測站觀測");
    expect(wrapper.text()).toContain("不會延長或縮短");
  });

  it("沒有地區時不顯示任何 UV 數字", () => {
    const wrapper = mount(FiveDayUvCard, {
      props: {
        phase: "no_region",
        error: null,
        forecast: null
      }
    });

    expect(wrapper.text()).toContain("設定地區");
    expect(wrapper.text()).toContain("才能查看五日 UV 預報");
    expect(wrapper.findAll(".uv-day")).toHaveLength(0);
  });
});
