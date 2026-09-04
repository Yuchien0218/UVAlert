// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { nextTick, shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { BackgroundPushState } from "@sunshield/platform";
import type { WebAppServices } from "../../app/createWebAppServices";
import { useWebAppServices } from "../../app/injection";
import NotificationSettingsPage from "./NotificationSettingsPage.vue";

vi.mock("../../app/injection", () => ({ useWebAppServices: vi.fn() }));

function makeServices(
  options: {
    permission?: "default" | "granted" | "denied";
    isSupported?: boolean;
    backgroundPushState?: BackgroundPushState;
  } = {}
) {
  const permissionState = shallowRef(options.permission ?? "default");
  const backgroundPushState = shallowRef<BackgroundPushState>(
    options.backgroundPushState ?? "permission-required"
  );
  return {
    backgroundPushState,
    notifications: {
      permission: shallowReadonly(permissionState),
      isSupported: options.isSupported ?? true,
      canDeliverInBackground: true,
      backgroundPushState: shallowReadonly(backgroundPushState),
      requestPermission: vi.fn(async () => "granted" as const),
      enableBackgroundPush: vi.fn(async () => undefined),
      disableBackgroundPush: vi.fn(async () => undefined),
      retryBackgroundSync: vi.fn(async () => undefined),
      sendTestNotification: vi.fn(async () => true),
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
        { path: "/more", name: "more", component: { template: "<div />" } }
      ]
    });
  });

  it.each<readonly [BackgroundPushState, string, boolean, boolean, boolean]>([
    ["unsupported", "無法使用背景推播", false, false, false],
    ["permission-required", "開啟背景推播", true, false, false],
    ["subscribing", "設定中", false, false, false],
    ["enabled", "已啟用背景推播", false, true, false],
    ["scheduled", "已同步下一個補擦提醒", false, true, false],
    ["pending-sync", "等待同步", false, true, true],
    ["schedule-error", "無法依賴背景推播", false, true, false]
  ])(
    "renders the %s state with its exact action matrix",
    (backgroundPushState, copy, canEnable, canDisable, canRetry) => {
      const services = makeServices({ backgroundPushState });
      vi.mocked(useWebAppServices).mockReturnValue(
        services as unknown as WebAppServices
      );
      const wrapper = mount(NotificationSettingsPage, {
        global: { plugins: [router], stubs: { Icon: true } }
      });
      expect(wrapper.text()).toContain(copy);
      expect(
        wrapper.find('[data-testid="enable-background-push"]').exists()
      ).toBe(canEnable);
      expect(
        wrapper.find('[data-testid="disable-background-push"]').exists()
      ).toBe(canDisable);
      expect(
        wrapper.find('[data-testid="retry-background-push"]').exists()
      ).toBe(canRetry);
    }
  );

  it("explains the informed action that safely completes an unresolved legacy opt-out", () => {
    const services = makeServices({ backgroundPushState: "schedule-error" });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = mount(NotificationSettingsPage, {
      global: { plugins: [router], stubs: { Icon: true } }
    });

    expect(wrapper.text()).toContain("舊版關閉紀錄無法安全確認");
    expect(wrapper.text()).toContain("系統會以目前裝置設定重新完成關閉");
    expect(wrapper.find('[data-testid="retry-background-push"]').exists()).toBe(
      false
    );
    expect(wrapper.get('[data-testid="disable-background-push"]').text()).toBe(
      "完成關閉背景推播"
    );
  });

  it("delegates background enable, retry, and successful recovery controls", async () => {
    const services = makeServices({
      backgroundPushState: "permission-required"
    });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = mount(NotificationSettingsPage, {
      global: { plugins: [router], stubs: { Icon: true } }
    });

    await wrapper
      .get('[data-testid="enable-background-push"]')
      .trigger("click");
    expect(services.notifications.enableBackgroundPush).toHaveBeenCalledOnce();

    services.backgroundPushState.value = "schedule-error";
    await nextTick();
    await wrapper
      .get('[data-testid="disable-background-push"]')
      .trigger("click");
    expect(services.notifications.disableBackgroundPush).toHaveBeenCalledOnce();
  });

  it("delegates retry and disables all background actions while it is pending", async () => {
    let resolveRetry!: (value: undefined) => void;
    const pendingRetry = new Promise<undefined>((resolve) => {
      resolveRetry = resolve;
    });
    const services = makeServices({ backgroundPushState: "pending-sync" });
    services.notifications.retryBackgroundSync.mockReturnValueOnce(
      pendingRetry
    );
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = mount(NotificationSettingsPage, {
      global: { plugins: [router], stubs: { Icon: true } }
    });

    const retry = wrapper.get('[data-testid="retry-background-push"]');
    const disable = wrapper.get('[data-testid="disable-background-push"]');
    const clicking = retry.trigger("click");
    await nextTick();
    expect(retry.attributes("disabled")).toBeDefined();
    expect(disable.attributes("disabled")).toBeDefined();
    resolveRetry(undefined);
    await clicking;
    expect(services.notifications.retryBackgroundSync).toHaveBeenCalledOnce();
  });

  it("retains local permission requests and device-test feedback", async () => {
    const pendingServices = makeServices({ permission: "default" });
    vi.mocked(useWebAppServices).mockReturnValue(
      pendingServices as unknown as WebAppServices
    );
    const pendingWrapper = mount(NotificationSettingsPage, {
      global: { plugins: [router], stubs: { Icon: true } }
    });

    await pendingWrapper
      .get('section[aria-labelledby="permission-heading"] button')
      .trigger("click");
    expect(
      pendingServices.notifications.requestPermission
    ).toHaveBeenCalledOnce();

    const grantedServices = makeServices({ permission: "granted" });
    vi.mocked(useWebAppServices).mockReturnValue(
      grantedServices as unknown as WebAppServices
    );
    const grantedWrapper = mount(NotificationSettingsPage, {
      global: { plugins: [router], stubs: { Icon: true } }
    });

    await grantedWrapper
      .get('section[aria-labelledby="test-heading"] button')
      .trigger("click");
    await nextTick();
    expect(
      grantedServices.notifications.sendTestNotification
    ).toHaveBeenCalledOnce();
    expect(grantedWrapper.text()).toContain("已送出");
  });

  it("retains local permission, denied disclosure, device test, close icon, and truthful delivery caveats", async () => {
    const services = makeServices({
      permission: "denied",
      backgroundPushState: "pending-sync"
    });
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = mount(NotificationSettingsPage, {
      global: { plugins: [router], stubs: { Icon: true } }
    });

    expect(wrapper.find('icon-stub[name="tool-close"]').exists()).toBe(true);
    expect(wrapper.text()).toContain("通知權限已被瀏覽器封鎖");
    await wrapper.get("button.button--quiet").trigger("click");
    expect(wrapper.find("#denied-steps").exists()).toBe(true);
    expect(wrapper.text()).toContain("輔助");
    expect(wrapper.text()).toContain("iPhone/iPad");
    expect(wrapper.text()).toContain("加入主畫面");
    expect(wrapper.text()).toContain("網路");
    expect(wrapper.text()).not.toContain("再次提醒頻率");
    expect(wrapper.findAll('input[name="reminder-frequency"]')).toHaveLength(0);
    expect(wrapper.text()).not.toContain("每 5 分鐘再提醒一次");
    expect(wrapper.text()).not.toContain("每 15 分鐘再提醒一次");
  });
});
