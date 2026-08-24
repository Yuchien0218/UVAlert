// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ReminderEmptyState from "./ReminderEmptyState.vue";

describe("ReminderEmptyState", () => {
  it("shows the approved empty copy and setup action", () => {
    const wrapper = mount(ReminderEmptyState, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        }
      }
    });

    const card = wrapper.get('[data-testid="reminder-empty"]');
    /*
     * 2026-08-24 反轉：原本斷言 empty-state--tracking 且**不可**是
     * app-card，那是 9f7eebe（2026-08-05）把它從 app-card 改成藍色 tint
     * 時定下的。該決定早於 2026-08-22 的配色套用與 DESIGN.md 第二節
     * 「狀態色不得與裝飾用法混淆」；--color-tracking 是「追蹤中」的狀態
     * 色，用在**還沒有**任何追蹤的空狀態語意剛好相反。改回 app-card。
     */
    expect(card.classes()).toContain("app-card");
    expect(card.classes()).not.toContain("empty-state--tracking");
    // 手刻的 inline SVG 太陽裝飾一併移除（Icon.vue 規定不得手刻 SVG）。
    // 注意不能斷言「完全沒有 svg」——按鈕上的箭頭圖示本身也是 svg。
    expect(wrapper.find(".empty-state__sun-decor").exists()).toBe(false);
    expect(wrapper.get(".empty-state__action").classes()).toContain(
      "empty-state__action--compact"
    );
    expect(wrapper.get(".empty-state__title").text()).toBe(
      "還沒有開始防曬提醒"
    );
    expect(wrapper.get(".empty-state__body").text()).toBe(
      "開始提醒後，就能追蹤各部位的補擦時間。"
    );
    expect(wrapper.get(".empty-state__title").classes()).toContain(
      "empty-state__title--single-line"
    );
    expect(wrapper.text()).toContain("開始防曬提醒");
    expect(
      wrapper.getComponent(RouterLinkStub).props("to")
    ).toBe("/setup");
  });
});
