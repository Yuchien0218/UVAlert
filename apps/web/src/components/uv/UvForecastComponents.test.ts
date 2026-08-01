// @vitest-environment happy-dom

import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EveningUvPrompt from "./EveningUvPrompt.vue";
import FiveDayUvCard from "./FiveDayUvCard.vue";

describe("FiveDayUvCard", () => {
  it("顯示五個白日時段、來源與區域預報限制", () => {
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

    expect(wrapper.text()).toContain("設定地區後即可查看");
    expect(wrapper.text()).toContain("不顯示假數值");
    expect(wrapper.findAll(".uv-day")).toHaveLength(0);
  });
});

describe("EveningUvPrompt", () => {
  it("摘要最高預報並提供查看與本晚關閉操作", async () => {
    const wrapper = mount(EveningUvPrompt, {
      props: {
        forecast: makeFiveDayUvForecast()
      }
    });

    expect(wrapper.text()).toContain("晚上先看接下來 5 天 UV");
    expect(wrapper.text()).toContain("UVI 11（危險級）");

    const buttons = wrapper.findAll("button");
    await buttons[0]!.trigger("click");
    await buttons[1]!.trigger("click");

    expect(wrapper.emitted("view")).toHaveLength(1);
    expect(wrapper.emitted("dismiss")).toHaveLength(1);
  });
});
