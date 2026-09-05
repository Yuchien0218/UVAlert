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
  inWater: false,
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

/*
 * 2026-08-31：狀態圖示搬到讀數旁邊，並從 20px 放大到 32px。
 *
 * 使用者回報「提醒頁太空」「圖示都太小了」。20px 的圖示夾在 16px 的說明
 * 文字裡讀起來是標點符號，而狀態切換（時間跨過補擦門檻）是這個 App 最
 * 重要的一刻。
 *
 * 三件事分開守，因為它們可以互相掩護：只守尺寸 → 圖示可以留在說明那行
 * 變大；只守位置 → 可以搬過去卻還是 20px；只守「說明沒有圖示」→ 讀數
 * 那邊也可以沒有，變成整個消失。
 */
describe("HomeCountdown 的狀態圖示", () => {
  function mountCountdown() {
    return mount(HomeCountdown, {
      props: { presentation: basePresentation },
      global: { stubs: { Transition: false } }
    });
  }

  it("圖示在讀數那一列", () => {
    const wrapper = mountCountdown();

    expect(wrapper.get(".countdown__value").find("svg").exists()).toBe(true);
  });

  it("圖示是 32px", () => {
    const wrapper = mountCountdown();

    expect(
      wrapper.get(".countdown__value svg").attributes("width")
    ).toBe("32");
  });

  /*
   * 同一件事只講一次。原本說明那一行也有一顆，兩個位置各放一顆會稀釋掉
   * 狀態的份量——而且兩顆的尺寸遲早會各走各的。
   */
  it("說明那一行不再重複放一顆", () => {
    const wrapper = mountCountdown();

    expect(wrapper.get(".countdown__detail").find("svg").exists()).toBe(false);
  });
});

/*
 * 2026-08-31：水上活動進行中時，倒數底下多一道波浪與一句說明。
 *
 * 兩件事分開守：波浪是**條件性**出現的（不在水裡就不該有），而說明文字
 * 必須跟著波浪一起出現——DESIGN.md 第十一節「不要單靠顏色／圖形傳達
 * 狀態」，波浪自己不能是唯一的線索。
 */
describe("HomeCountdown 的水上活動提示", () => {
  function mountWith(inWater: boolean) {
    return mount(HomeCountdown, {
      props: { presentation: { ...basePresentation, inWater } },
      global: { stubs: { Transition: false } }
    });
  }

  it("水上活動進行中時顯示波浪與說明", () => {
    const wrapper = mountWith(true);

    expect(wrapper.find(".countdown__water .wave-divider").exists()).toBe(true);
    expect(wrapper.text()).toContain("補擦時間改依耐水規則計算");
  });

  it("不在水裡時完全不顯示", () => {
    const wrapper = mountWith(false);

    expect(wrapper.find(".countdown__water").exists()).toBe(false);
  });

  /* 波浪是裝飾，說明文字才是無障礙的內容。 */
  it("波浪對螢幕閱讀器隱藏", () => {
    const wrapper = mountWith(true);

    expect(
      wrapper.get(".countdown__water .wave-divider").attributes("aria-hidden")
    ).toBe("true");
  });
});

/**
 * 到期時進度條填滿（2026-09-04 使用者裁決）。
 *
 * `progressPercent` 是**剩餘**比例，到期剛好 0——實測那一刻 fill 寬度是
 * 0px，整條變成空的軌道，看起來像「還沒開始」而不是「時間到了」。到期是
 * 這個 App 存在的理由，最大的那條顏色訊號不該在那一刻消失。
 */
describe("到期時的進度條", () => {
  const duePresentation: HomeReminderClockPresentation = {
    ...basePresentation,
    tone: "due",
    title: "建議全面補擦",
    remainingMinutes: 0,
    progress: 0,
    progressPercent: 0,
    ariaLabel: "距離補擦還有 0 分鐘。"
  };

  function mountWith(presentation: HomeReminderClockPresentation) {
    return mount(HomeCountdown, {
      props: { presentation },
      global: { stubs: { Icon: true, Transition: false } }
    });
  }

  it("填滿而不是歸零", () => {
    const fill = mountWith(duePresentation).get(".countdown__fill");

    expect(fill.attributes("style")).toContain("width: 100%");
  });

  /*
   * **反向：其他狀態仍然照剩餘比例畫。** 只守上面那條的話，把寬度寫死
   * 100% 也是綠的——那時進度條永遠是滿的，等於沒有進度條。
   */
  it("未到期時仍照剩餘比例", () => {
    const fill = mountWith(basePresentation).get(".countdown__fill");

    expect(fill.attributes("style")).toContain("width: 40%");
  });

  /*
   * 滿的條配上 `aria-valuenow="0"` 對螢幕閱讀器是矛盾的——畫面說滿、
   * 語意說零。到期時它不再是進度條，改由下面那句「建議全面補擦」承擔。
   */
  it("到期時不再宣告成 progressbar", () => {
    const track = mountWith(duePresentation).get(".countdown__track");

    expect(track.attributes("role")).toBeUndefined();
    expect(track.attributes("aria-hidden")).toBe("true");
  });

  it("未到期時仍然是 progressbar 且報得出數值", () => {
    const track = mountWith(basePresentation).get(".countdown__track");

    expect(track.attributes("role")).toBe("progressbar");
    expect(track.attributes("aria-valuenow")).toBe("40");
    expect(track.attributes("aria-label")).toContain("82 分鐘");
  });
});
