// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../../app/createWebAppServices";
import { useWebAppServices } from "../../app/injection";
import AccountDataPage from "./AccountDataPage.vue";

vi.mock("../../app/injection", () => ({ useWebAppServices: vi.fn() }));

function makeServices() {
  return {
    auth: {
      state: shallowReadonly(
        shallowRef({
          status: "signed_in" as const,
          auth: {
            kind: "signed_in" as const,
            userId: "user-1",
            accessTokenExpiresAt: null
          },
          errorCode: null
        })
      ),
      refresh: vi.fn(async () => undefined),
      signInWithGoogle: vi.fn(async () => true),
      signOut: vi.fn(async () => true),
      dispose: vi.fn()
    },
    cloudSync: { deleteAccount: vi.fn(async () => undefined) }
  };
}

describe("AccountDataPage", () => {
  it("停止同步只改本機同步開關，保留雲端操作入口", async () => {
    const services = makeServices();
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = shallowMount(AccountDataPage, {
      global: { stubs: { ConfirmAction: false } }
    });
    await wrapper.get("button").trigger("click");
    expect(wrapper.text()).toContain("重新開啟同步");
    expect(services.cloudSync.deleteAccount).not.toHaveBeenCalled();
  });

  it("清除雲端需要第二次確認，成功後才登出", async () => {
    const services = makeServices();
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = shallowMount(AccountDataPage, {
      global: { stubs: { ConfirmAction: false } }
    });
    const buttons = wrapper.findAll("button");
    const deleteButton = buttons.find(
      (button) => button.text() === "清除雲端資料"
    );
    expect(deleteButton).toBeDefined();
    await deleteButton!.trigger("click");
    expect(services.cloudSync.deleteAccount).not.toHaveBeenCalled();
    /*
     * 2026-09-04：確認鈕改成「確定清除」，不再與觸發鈕同字。
     *
     * 這條測試原本也是用同一個字去找第二顆按鈕——連測試都分不出兩顆，
     * 使用者當然更分不出（回報「我按清除，資料還在」的正是這件事）。
     */
    const confirmButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "確定清除");
    expect(confirmButton).toBeDefined();
    expect(
      wrapper
        .findAll("button")
        .some((button) => button.text() === "清除雲端資料")
    ).toBe(false);
    await confirmButton!.trigger("click");
    expect(services.cloudSync.deleteAccount).toHaveBeenCalledTimes(1);
    expect(services.auth.signOut).toHaveBeenCalledTimes(1);
  });
});
