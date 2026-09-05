// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { nextTick, shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../../app/createWebAppServices";
import { useWebAppServices } from "../../app/injection";
import NotificationSettingsPage from "./NotificationSettingsPage.vue";

vi.mock("../../app/injection", () => ({ useWebAppServices: vi.fn() }));

function makeServices(
  options: {
    permission?: "default" | "granted" | "denied";
    isSupported?: boolean;
    canDeliverInBackground?: boolean;
    reminderFrequencyMinutes?: number | null;
  } = {}
) {
  const permissionState = shallowRef(options.permission ?? "default");
  const requestPermission = vi.fn(async () => {
    permissionState.value = "granted";
    return "granted" as const;
  });
  const reminderFrequencyMinutesState = shallowRef(
    options.reminderFrequencyMinutes ?? null
  );
  const setReminderFrequencyMinutes = vi.fn(async (minutes: number | null) => {
    reminderFrequencyMinutesState.value = minutes;
  });
  const sendTestNotification = vi.fn(async () => true);

  return {
    notifications: {
      permission: shallowReadonly(permissionState),
      isSupported: options.isSupported ?? true,
      canDeliverInBackground: options.canDeliverInBackground ?? false,
      reminderFrequencyMinutes: shallowReadonly(reminderFrequencyMinutesState),
      requestPermission,
      setReminderFrequencyMinutes,
      sendTestNotification,
      dispose: vi.fn()
    }
  };
}

describe("NotificationSettingsPage", () => {
  let router: ReturnType<typeof createRouter>;

  beforeEach(() => {
    router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/settings/notifications",
          name: "settings-notifications",
          component: NotificationSettingsPage
        },
        {
          path: "/more",
          name: "more",
          component: { template: "<div />" }
        }
      ]
    });
  });

  it("未開啟時顯示未開啟狀態與開啟按鈕，點擊觸發要求權限", async () => {
    const services = makeServices({ permission: "default" });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );

    const wrapper = mount(NotificationSettingsPage, {
      global: {
        plugins: [router],
        stubs: { Icon: true }
      }
    });

    expect(wrapper.text()).toContain("目前狀態：未開啟");
    const button = wrapper.find("button.button--primary");
    expect(button.exists()).toBe(true);

    await button.trigger("click");
    expect(services.notifications.requestPermission).toHaveBeenCalledTimes(1);
  });

  it("已授權時顯示已開啟狀態", () => {
    const services = makeServices({ permission: "granted" });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );

    const wrapper = mount(NotificationSettingsPage, {
      global: {
        plugins: [router],
        stubs: { Icon: true }
      }
    });

    expect(wrapper.text()).toContain("目前狀態：通知已開啟");
  });

  it("已授權時顯示再次提醒頻率與測試通知按鈕", async () => {
    const services = makeServices({
      permission: "granted",
      reminderFrequencyMinutes: 5
    });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );

    const wrapper = mount(NotificationSettingsPage, {
      global: {
        plugins: [router],
        stubs: { Icon: true }
      }
    });

    expect(wrapper.text()).toContain("再次提醒頻率");
    const options = wrapper.findAll('input[name="reminder-frequency"]');
    expect(options).toHaveLength(3);
    expect((options[1]!.element as HTMLInputElement).checked).toBe(true);

    await options[2]!.setValue(true);
    expect(
      services.notifications.setReminderFrequencyMinutes
    ).toHaveBeenCalledWith(15);

    /*
     * 選項文案（2026-09-04 使用者裁決）：三個選項精簡成「提醒一次／
     * 每 5 分鐘／每 15 分鐘」。原本是「只提醒一次／每 5 分鐘再提醒一次／
     * 每 15 分鐘再提醒一次」——「再提醒一次」在區塊標題「再次提醒頻率」
     * 底下重複了三次。
     */
    expect(
      options.map((option) => option.element.parentElement?.textContent?.trim())
    ).toEqual(["提醒一次", "每 5 分鐘", "每 15 分鐘"]);

    /*
     * 底部那句「此限制與單次提醒相同：需保持瀏覽器分頁開啟才會送達。」
     * 刪掉——同一頁上方的「通知限制」框已經說過同一件事。
     */
    expect(wrapper.text()).not.toContain("此限制與單次提醒相同");

    expect(wrapper.text()).toContain("送出測試通知");
    await wrapper.get("button.button--quiet").trigger("click");
    expect(services.notifications.sendTestNotification).toHaveBeenCalledOnce();
    await nextTick();
    expect(wrapper.text()).toContain("已送出");
  });

  it("未授權時不顯示再次提醒頻率與測試通知按鈕", () => {
    const services = makeServices({ permission: "default" });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );

    const wrapper = mount(NotificationSettingsPage, {
      global: {
        plugins: [router],
        stubs: { Icon: true }
      }
    });

    expect(wrapper.text()).not.toContain("再次提醒頻率");
    expect(wrapper.text()).not.toContain("送出測試通知");
  });

  it("被封鎖時顯示已被封鎖警示", () => {
    const services = makeServices({ permission: "denied" });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );

    const wrapper = mount(NotificationSettingsPage, {
      global: {
        plugins: [router],
        stubs: { Icon: true }
      }
    });

    expect(wrapper.text()).toContain("目前狀態：通知已被拒絕");
    expect(wrapper.text()).toContain("通知權限已被瀏覽器封鎖");
  });

  it("被封鎖時可以展開「如何開啟」的步驟說明", async () => {
    const services = makeServices({ permission: "denied" });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );

    const wrapper = mount(NotificationSettingsPage, {
      global: {
        plugins: [router],
        stubs: { Icon: true }
      }
    });

    expect(wrapper.find("#denied-steps").exists()).toBe(false);
    await wrapper.get("button.button--quiet").trigger("click");
    expect(wrapper.find("#denied-steps").exists()).toBe(true);
    expect(wrapper.findAll("#denied-steps li").length).toBe(3);
    expect(wrapper.text()).toContain("將「通知」改為「允許」");
  });

  it("裝置不支援時顯示不支援提示", () => {
    const services = makeServices({ isSupported: false });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );

    const wrapper = mount(NotificationSettingsPage, {
      global: {
        plugins: [router],
        stubs: { Icon: true }
      }
    });

    expect(wrapper.text()).toContain("目前狀態：這個瀏覽器不支援通知");
  });

  /**
   * 2026-08-23 校正：canDeliverInBackground 恆為 false，畫面必須明確告知
   * 使用者仍需自己回來查看，不能只說「可能會延遲或無法發出」——那種措辭
   * 讓「一定不會送達」聽起來像邊緣情況，跟 Sitemap §4.3 的規則衝突。
   */
  it("無法背景送達時明確告知不會送達、要自己回來查看", () => {
    const services = makeServices({ canDeliverInBackground: false });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );

    const wrapper = mount(NotificationSettingsPage, {
      global: {
        plugins: [router],
        stubs: { Icon: true }
      }
    });

    /*
     * 2026-08-31 文案潤飾（使用者提供）：「你仍需自己回來查看目前的補擦
     * 狀態」改成「若關閉或遭系統清理將無法送達，請適時確認補擦狀態」。
     *
     * **守的是語意不是字面**，兩件事都必須在：
     *   1. 明說「無法送達」（不是「可能延遲」）
     *   2. 明說要自己確認補擦狀態
     *
     * 下面兩條 not.toContain 一併保留——2026-08-23 校正的重點就是不准把
     * 「一定不會送達」寫成聽起來像邊緣情況（Sitemap §4.3）。
     */
    expect(wrapper.text()).toContain("將無法送達");
    expect(wrapper.text()).toContain("確認補擦狀態");
    expect(wrapper.text()).not.toContain("可能會延遲或無法發出");
    expect(wrapper.text()).not.toContain("背景通知");
  });
});

/**
 * 2026-09-05：三張並列的卡補上標題圖示。
 *
 * 判準是 DESIGN.md 第八節 32 檔位的用法規則——「這張卡要不要被掃讀」。
 * 這一頁三張卡彼此並列（狀態／傳送說明／再次提醒頻率），符合。
 */
describe("卡片標題的圖示", () => {
  const mountWith = (
    permission: "default" | "granted" | "denied",
    isSupported = true
  ) => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: "/settings/notifications",
          name: "settings-notifications",
          component: NotificationSettingsPage
        },
        { path: "/more", name: "more", component: { template: "<div />" } }
      ]
    });
    vi.mocked(useWebAppServices).mockReturnValue(
      makeServices({ permission, isSupported }) as unknown as WebAppServices
    );
    return mount(NotificationSettingsPage, {
      global: { plugins: [router], stubs: { Icon: true } }
    });
  };

  const headingIcons = (wrapper: ReturnType<typeof mountWith>) =>
    wrapper
      .findAll("h2.section-heading icon-stub")
      .map((icon) => icon.attributes("name"));

  /*
   * 三張都要有，而且都走共用的 `.section-heading`——這一頁原本自己刻了
   * `.status-summary` 與 `.settings-card-heading` 兩個類別，兩個都是死宣告
   * （margin 由 h1,h2,h3 提供、font-size 由 typography role 提供）。
   *
   * `.status-summary` 更糟：它宣告的是 section-title（20px）而不是卡片標題
   * 的 18px，**讀檔案的人會以為這張卡的標題比另外兩張大**，實測三個都是
   * 18px。宣告與畫面不一致的死碼比單純的死碼更糟。
   */
  it("三張卡的標題都是 .section-heading，各帶一顆 32px 圖示", () => {
    const wrapper = mountWith("granted");

    expect(wrapper.findAll("h2.section-heading")).toHaveLength(3);
    expect(headingIcons(wrapper)).toHaveLength(3);
    expect(
      wrapper
        .findAll("h2.section-heading icon-stub")
        .map((icon) => icon.attributes("size"))
    ).toEqual(["32", "32", "32"]);
  });

  /*
   * **狀態卡那一顆刻意跟著狀態變。** 加圖示的理由是幫忙掃讀，而這張卡回答
   * 的就是「現在是哪一種狀態」——固定一顆鈴鐺只是在標題前面多一個裝飾。
   */
  it("狀態卡的圖示跟著權限狀態換", () => {
    expect(headingIcons(mountWith("granted"))[0]).toBe("more-notifications");
    expect(headingIcons(mountWith("denied"))[0]).toBe("state-notification-off");
    expect(headingIcons(mountWith("default"))[0]).toBe(
      "state-notification-pending"
    );
    expect(headingIcons(mountWith("default", false))[0]).toBe(
      "state-notification-off"
    );
  });

  /*
   * **反向：另外兩張是固定的。** 少了這條，「三顆都跟著狀態變」也會過上面
   * 那條——那時「通知傳送說明」的圖示會隨權限跳來跳去，而它跟權限無關。
   */
  it("另外兩張的圖示與狀態無關", () => {
    for (const permission of ["granted", "default"] as const) {
      const icons = headingIcons(mountWith(permission));
      expect(icons.slice(1)).toEqual(
        permission === "granted"
          ? ["more-about", "tool-refresh"]
          : ["more-about"]
      );
    }
  });

  /*
   * 標題文字要包在 <span> 裡：`.section-heading` 是 flex，不包的話
   * 「目前狀態：」與 `<strong>` 會變成兩個 flex item，中間被 gap 撐開
   * 12px——一句話被切成兩半。
   */
  it("狀態那一句沒有被 flex gap 切開", () => {
    const heading = mountWith("granted").get("h2.section-heading");

    expect(heading.get("span").text()).toBe("目前狀態：通知已開啟");
  });
});
