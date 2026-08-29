// @vitest-environment happy-dom

import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { createRouter, createWebHistory } from "vue-router";
import FiveDayUvCard from "./FiveDayUvCard.vue";

/**
 * 「設定地區」是 RouterLink，掛載時需要 router，否則會 warn 並渲染成
 * 沒有 href 的 <a>。只註冊測試會走到的兩條路由。
 */
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", component: { template: "<div />" } },
    { path: "/region", component: { template: "<div />" } }
  ]
});

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
      wrapper
        .findAll(".uv-day__value")
        .every((node) => node.classes().includes("stat-figure"))
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
      },
      global: {
        plugins: [router]
      }
    });

    expect(wrapper.text()).toContain("設定地區");
    expect(wrapper.text()).toContain("才能查看五日 UV 預報");
    expect(wrapper.findAll(".uv-day")).toHaveLength(0);
  });

  /*
   * 這條守著一個真的送過使用者手上的 bug：「設定地區」原本是
   * href="#outdoor-context" 的頁內錨點，而這一頁根本沒有那個 id——
   * 點下去什麼也不會發生。修正記在
   * docs/decisions/2026-08-23-hifi-redesign-round2-closeout.md 第五節，
   * 但那次的修正留在一條沒有合併的分支上，main 一直帶著這個 bug 到
   * 2026-08-29。有測試才不會再掉一次。
   */
  it("沒有地區時的「設定地區」連到 /region，不是頁內錨點", () => {
    const wrapper = mount(FiveDayUvCard, {
      props: {
        phase: "no_region",
        error: null,
        forecast: null
      },
      global: {
        plugins: [router]
      }
    });

    expect(wrapper.get(".text-link").attributes("href")).toBe("/region");
  });
});
