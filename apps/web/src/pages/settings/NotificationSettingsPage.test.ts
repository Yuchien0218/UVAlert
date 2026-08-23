// @vitest-environment happy-dom

import { mount, shallowMount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../../app/createWebAppServices";
import { useWebAppServices } from "../../app/injection";
import NotificationSettingsPage from "./NotificationSettingsPage.vue";

vi.mock("../../app/injection", () => ({ useWebAppServices: vi.fn() }));

function makeServices(options: {
  permission?: "default" | "granted" | "denied";
  isSupported?: boolean;
  canDeliverInBackground?: boolean;
} = {}) {
  const permissionState = shallowRef(options.permission ?? "default");
  const requestPermission = vi.fn(async () => {
    permissionState.value = "granted";
    return "granted" as const;
  });

  return {
    notifications: {
      permission: shallowReadonly(permissionState),
      isSupported: options.isSupported ?? true,
      canDeliverInBackground: options.canDeliverInBackground ?? false,
      requestPermission,
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

    expect(wrapper.text()).toContain("目前狀態：已開啟");
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

    expect(wrapper.text()).toContain("目前狀態：已被封鎖");
    expect(wrapper.text()).toContain("通知權限已被瀏覽器封鎖");
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

    expect(wrapper.text()).toContain("目前狀態：此裝置不支援");
  });

  /**
   * 2026-08-23 校正：canDeliverInBackground 恆為 false，畫面必須明確告知
   * 使用者仍需自己回來查看，不能只說「可能會延遲或無法發出」——那種措辭
   * 讓「一定不會送達」聽起來像邊緣情況，跟 Sitemap §4.3 的規則衝突。
   */
  it("無法背景送達時明確告知使用者仍需自己回來查看", () => {
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

    expect(wrapper.text()).toContain("你仍需");
    expect(wrapper.text()).toContain("自己回來查看");
    expect(wrapper.text()).not.toContain("可能會延遲或無法發出");
    expect(wrapper.text()).not.toContain("背景通知");
  });
});
