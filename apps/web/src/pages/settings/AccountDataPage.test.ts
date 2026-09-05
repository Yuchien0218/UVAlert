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

/**
 * 2026-09-05：登入後的三張卡補上標題圖示。
 *
 * 判準是 DESIGN.md 第八節 32 檔位的用法規則——「這張卡要不要被掃讀」。
 * 這一頁登入後有三張並列的卡（同步狀態／登出／清除雲端資料），符合。
 *
 * 這一頁先前卡在**沒有適合「登出」的圖示**：最通用的「箭頭出框」在這個
 * repo 已經是 `tool-download`（匯出），而兩者會出現在相鄰的設定頁。
 * 新繪的 `tool-sign-out` 用電源符號避開，見 signOutIcon.test.ts。
 */
describe("帳號頁的卡片標題圖示", () => {
  const mountSignedIn = () => {
    vi.mocked(useWebAppServices).mockReturnValue(
      makeServices() as unknown as WebAppServices
    );
    return shallowMount(AccountDataPage, {
      global: { stubs: { ConfirmAction: false } }
    });
  };

  it("三張卡各帶一顆 32px 圖示", () => {
    const headings = mountSignedIn().findAll("h2.section-heading");

    expect(headings).toHaveLength(3);
    expect(
      headings.map((heading) => heading.find("icon-stub").attributes("name"))
    ).toEqual(["tool-refresh", "tool-sign-out", "tool-delete"]);
    expect(
      headings.map((heading) => heading.find("icon-stub").attributes("size"))
    ).toEqual(["32", "32", "32"]);
  });

  /*
   * **標題文字要包在 <span> 裡。** `.section-heading` 是 flex，不包的話
   * 多個文字節點會被 gap 撐開——與 NotificationSettingsPage 同一個理由。
   */
  it("標題文字包在 span 裡", () => {
    const headings = mountSignedIn().findAll("h2.section-heading");

    expect(headings.map((heading) => heading.get("span").text())).toEqual([
      "同步狀態",
      "登出",
      "清除 UVAlert 雲端資料"
    ]);
  });
});
