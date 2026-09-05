// @vitest-environment happy-dom

import { flushPromises, mount } from "@vue/test-utils";
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
      requestPermission: vi.fn(async () => {
        permissionState.value = "granted";
        return "granted" as const;
      }),
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

  function mountWith(options: Parameters<typeof makeServices>[0] = {}) {
    const services = makeServices(options);
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = mount(NotificationSettingsPage, {
      global: {
        plugins: [router],
        stubs: { Icon: true, InlineLoader: true }
      }
    });
    return { services, wrapper };
  }

  it("保留新版頁首、共用卡片標題與狀態圖示", () => {
    const { wrapper } = mountWith({ permission: "granted" });

    expect(
      wrapper.get('button[aria-label="返回更多"] icon-stub').attributes("name")
    ).toBe("tool-arrow-left");
    expect(wrapper.findAll("h2.section-heading")).toHaveLength(3);
    expect(
      wrapper
        .findAll("h2.section-heading icon-stub")
        .map((icon) => [icon.attributes("name"), icon.attributes("size")])
    ).toEqual([
      ["more-notifications", "32"],
      ["more-notifications", "32"],
      ["more-about", "32"]
    ]);
    expect(wrapper.get("h2.section-heading span").text()).toBe(
      "目前狀態：通知已開啟"
    );
  });

  it.each([
    ["default", true, "目前狀態：未開啟", "state-notification-pending"],
    ["granted", true, "目前狀態：通知已開啟", "more-notifications"],
    ["denied", true, "目前狀態：通知已被拒絕", "state-notification-off"],
    [
      "default",
      false,
      "目前狀態：這個瀏覽器不支援通知",
      "state-notification-off"
    ]
  ] as const)(
    "呈現 permission=%s supported=%s 的狀態",
    (permission, isSupported, copy, icon) => {
      const { wrapper } = mountWith({ permission, isSupported });
      expect(wrapper.text()).toContain(copy);
      expect(
        wrapper.get("#permission-heading icon-stub").attributes("name")
      ).toBe(icon);
    }
  );

  it("要求通知權限，並可展開被封鎖時的三步說明", async () => {
    const pending = mountWith({ permission: "default" });
    await pending.wrapper.get("button.button--primary").trigger("click");
    expect(
      pending.services.notifications.requestPermission
    ).toHaveBeenCalledOnce();

    const denied = mountWith({ permission: "denied" });
    expect(denied.wrapper.find("#denied-steps").exists()).toBe(false);
    await denied.wrapper.get("button.button--quiet").trigger("click");
    expect(denied.wrapper.findAll("#denied-steps li")).toHaveLength(3);
    expect(denied.wrapper.text()).toContain("將「通知」改為「允許」");
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
      const { wrapper } = mountWith({ backgroundPushState });
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

  it("說明並執行舊版關閉紀錄的安全復原", async () => {
    const { services, wrapper } = mountWith({
      backgroundPushState: "schedule-error"
    });
    expect(wrapper.text()).toContain("舊版關閉紀錄無法安全確認");
    expect(wrapper.text()).toContain("系統會以目前裝置設定重新完成關閉");
    expect(wrapper.find('[data-testid="retry-background-push"]').exists()).toBe(
      false
    );
    const disable = wrapper.get('[data-testid="disable-background-push"]');
    expect(disable.text()).toBe("完成關閉背景推播");
    await disable.trigger("click");
    expect(services.notifications.disableBackgroundPush).toHaveBeenCalledOnce();
  });

  it("委派開啟背景推播", async () => {
    const { services, wrapper } = mountWith({
      backgroundPushState: "permission-required"
    });
    await wrapper
      .get('[data-testid="enable-background-push"]')
      .trigger("click");
    expect(services.notifications.enableBackgroundPush).toHaveBeenCalledOnce();
  });

  it("同步重試進行時停用所有背景操作", async () => {
    let resolveRetry!: (value: undefined) => void;
    const pendingRetry = new Promise<undefined>((resolve) => {
      resolveRetry = resolve;
    });
    const { services, wrapper } = mountWith({
      backgroundPushState: "pending-sync"
    });
    services.notifications.retryBackgroundSync.mockReturnValueOnce(
      pendingRetry
    );

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

  it("已授權時以 InlineLoader 呈現裝置測試進度與結果", async () => {
    let resolveTest!: (sent: boolean) => void;
    const pendingTest = new Promise<boolean>((resolve) => {
      resolveTest = resolve;
    });
    const { services, wrapper } = mountWith({ permission: "granted" });
    services.notifications.sendTestNotification.mockReturnValueOnce(
      pendingTest
    );

    const button = wrapper.get(".delivery-test button");
    const clicking = button.trigger("click");
    await nextTick();
    expect(button.text()).toContain("傳送中…");
    expect(button.find("inline-loader-stub").exists()).toBe(true);
    resolveTest(true);
    await clicking;
    await flushPromises();
    expect(services.notifications.sendTestNotification).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain("已送出，請查看系統通知");
  });

  it("保留背景送達限制、iOS 與離線真相，且只提醒一次", () => {
    const { wrapper } = mountWith({ backgroundPushState: "pending-sync" });
    const text = wrapper.text();

    expect(text).toContain("恢復連線後會再傳送");
    expect(text).toContain("網路");
    expect(text).toContain("省電模式");
    expect(text).toContain("延遲或無法送達");
    expect(text).toContain("不保證準時");
    expect(text).toContain("iPhone/iPad");
    expect(text).toContain("加入主畫面");
    expect(text).toContain("單一提醒原則");
    expect(text).toContain("下一個最近的補擦到期提醒");
    expect(text).not.toContain("通知皆於本機發出，不經外部伺服器");
    expect(text).not.toContain("再次提醒頻率");
    expect(wrapper.findAll('input[name="reminder-frequency"]')).toHaveLength(0);
  });
});
