// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import HomeCountdown from "./HomeCountdown.vue";
import type { HomeReminderClockPresentation } from "../../features/reminder/homeReminderClockPresentation";

const basePresentation: HomeReminderClockPresentation = {
  tone: "tracking",
  scope: "all",
  title: "接下來需要全面補擦",
  timeLabel: "預計 19:15",
  remainingMinutes: 82,
  progress: 0.4,
  progressPercent: 40,
  ariaLabel: "距離補擦還有 82 分鐘。"
};

describe("HomeCountdown", () => {
  /*
   * 2026-08-30：進度條移到讀數正下方，排在說明文字之前。
   *
   * 原本順序是 讀數 → 說明 → 進度條 →（頁面的）主行動按鈕，進度條夾在
   * 說明與按鈕之間，視覺上讀起來像按鈕的裝飾條。它描述的是倒數，要貼著
   * 它描述的那個數字。
   *
   * 這條守 DOM 順序而不是視覺：happy-dom 不做排版，量不到位置；但只要
   * 有人把兩個區塊調回去，`compareDocumentPosition` 就會反轉。
   */
  it("進度條排在說明文字之前，緊貼讀數", () => {
    const wrapper = mount(HomeCountdown, {
      props: { presentation: basePresentation },
      global: { stubs: { Icon: true, Transition: false } }
    });

    const track = wrapper.get(".countdown__track").element;
    const detail = wrapper.get(".countdown__detail").element;

    // DOCUMENT_POSITION_FOLLOWING = 4：detail 出現在 track 之後。
    expect(track.compareDocumentPosition(detail) & 4).toBeTruthy();
  });

  it("沒有進度時不渲染進度條", () => {
    const wrapper = mount(HomeCountdown, {
      props: {
        presentation: {
          ...basePresentation,
          progress: null,
          progressPercent: null
        }
      },
      global: { stubs: { Icon: true, Transition: false } }
    });

    expect(wrapper.find(".countdown__track").exists()).toBe(false);
    expect(wrapper.find(".countdown__detail").exists()).toBe(true);
  });
});
