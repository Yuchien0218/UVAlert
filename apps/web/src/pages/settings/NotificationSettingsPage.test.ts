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

  it("已授權時顯示再次提醒頻率與裝置測試", async () => {
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

    expect(wrapper.text()).toContain("裝置測試");
    await wrapper.get("button.button--quiet").trigger("click");
    expect(services.notifications.sendTestNotification).toHaveBeenCalledOnce();
    await nextTick();
    expect(wrapper.text()).toContain("已送出");
  });

  it("未授權時不顯示再次提醒頻率與裝置測試", () => {
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
    expect(wrapper.text()).not.toContain("裝置測試");
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
