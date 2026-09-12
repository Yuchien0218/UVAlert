// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../../app/createWebAppServices";
import { useWebAppServices } from "../../app/injection";
import AccountDataPage from "./AccountDataPage.vue";

vi.mock("../../app/injection", () => ({ useWebAppServices: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
});

function makeServices(signedIn = true) {
  return {
    auth: {
      state: shallowReadonly(
        shallowRef({
          status: signedIn ? ("signed_in" as const) : ("signed_out" as const),
          auth: signedIn
            ? {
                kind: "signed_in" as const,
                userId: "user-1",
                accessTokenExpiresAt: null
              }
            : { kind: "signed_out" as const },
          errorCode: null
        })
      ),
      refresh: vi.fn(async () => undefined),
      signInWithGoogle: vi.fn(async () => true),
      signOut: vi.fn(async () => true),
      dispose: vi.fn()
    },
    cloudSync: { deleteAccount: vi.fn(async () => undefined) },
    sync: {
      state: shallowReadonly(
        shallowRef({
          status: "idle" as const,
          preview: null,
          error: null
        })
      ),
      preparePreview: vi.fn(async () => undefined),
      confirm: vi.fn(async () => undefined),
      cancelPreview: vi.fn()
    }
  };
}

describe("AccountDataPage", () => {
  it("未登入時呈現免登入模式與 Google 登入按鈕", async () => {
    const services = makeServices(false);
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = shallowMount(AccountDataPage);
    expect(wrapper.text()).toContain("目前使用免登入模式");
    expect(wrapper.text()).toContain("使用 Google 登入同步");
  });

  it("停止同步只改本機同步開關，保留雲端操作入口", async () => {
    const services = makeServices();
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = shallowMount(AccountDataPage, {
      global: { stubs: { ConfirmAction: false } }
    });
    const stopButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "停止同步");
    expect(stopButton).toBeDefined();
    await stopButton!.trigger("click");
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
      "清除雲端資料"
    ]);
  });
});

describe("同步狀態預覽與按鈕", () => {
  it("防曬裝備項目優先顯示裝備名稱，且預覽取消按鈕文字為「返回」", async () => {
    const services = makeServices();
    const mockSyncState = shallowRef({
      status: "ready" as const,
      preview: {
        createdAt: "2026-09-12T12:00:00.000Z",
        items: [
          {
            key: { recordKind: "product_catalog" as const, recordId: "prod-1" },
            status: "unchanged" as const,
            localRecord: {
              schemaVersion: "1.0.0" as const,
              recordKind: "product_catalog" as const,
              recordId: "prod-1",
              revision: 1,
              updatedAt: "2026-09-12T12:00:00.000Z",
              payloadFingerprint: "fp-1",
              payload: {
                schemaVersion: "1.1.0" as const,
                productId: "prod-1",
                displayName: "安耐曬金鑽高效防曬露",
                gearCategory: "sunscreen" as const,
                currentSnapshot: {
                  spf: 50,
                  broadSpectrum: true,
                  waterResistanceMinutes: 80
                },
                snapshotFingerprint: "sfp-1"
              }
            },
            localTombstone: null,
            remoteSummary: null,
            remoteTombstone: null,
            defaultAction: null
          },
          {
            key: { recordKind: "region_preference" as const, recordId: "reg-1" },
            status: "unchanged" as const,
            localRecord: null,
            localTombstone: null,
            remoteSummary: null,
            remoteTombstone: null,
            defaultAction: null
          }
        ]
      },
      error: null
    });
    (services.sync as { state: unknown }).state = shallowReadonly(mockSyncState);

    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = shallowMount(AccountDataPage);

    expect(wrapper.text()).toContain("安耐曬金鑽高效防曬露");
    expect(wrapper.text()).toContain("地區設定");

    const returnButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "返回");
    expect(returnButton).toBeDefined();

    const cancelButton = wrapper
      .findAll("button")
      .find((button) => button.text() === "取消");
    expect(cancelButton).toBeUndefined();

    await returnButton!.trigger("click");
    expect(services.sync.cancelPreview).toHaveBeenCalledTimes(1);
  });

  it("若本機無 localRecord 則嘗試從 productSettings 讀取名稱", async () => {
    const services = {
      ...makeServices(),
      productSettings: {
        phase: shallowReadonly(shallowRef("ready")),
        products: shallowReadonly(
          shallowRef([
            {
              productId: "prod-2",
              displayName: "輕量抗UV遮陽傘"
            }
          ])
        ),
        snapshot: shallowReadonly(shallowRef(null)),
        ensureLoaded: vi.fn(async () => undefined),
        save: vi.fn(),
        saveProduct: vi.fn(),
        stopProduct: vi.fn(),
        archiveProduct: vi.fn(),
        restoreProduct: vi.fn(),
        deleteProduct: vi.fn(),
        refresh: vi.fn(),
        dispose: vi.fn()
      }
    };
    const mockSyncState = shallowRef({
      status: "ready" as const,
      preview: {
        createdAt: "2026-09-12T12:00:00.000Z",
        items: [
          {
            key: { recordKind: "product_catalog" as const, recordId: "prod-2" },
            status: "remote_only" as const,
            localRecord: null,
            localTombstone: null,
            remoteSummary: null,
            remoteTombstone: null,
            defaultAction: null
          },
          {
            key: {
              recordKind: "product_catalog" as const,
              recordId: "prod-unknown"
            },
            status: "remote_only" as const,
            localRecord: null,
            localTombstone: null,
            remoteSummary: null,
            remoteTombstone: null,
            defaultAction: null
          }
        ]
      },
      error: null
    });
    (services.sync as { state: unknown }).state = shallowReadonly(mockSyncState);

    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = shallowMount(AccountDataPage);

    expect(wrapper.text()).toContain("輕量抗UV遮陽傘");
    expect(wrapper.text()).toContain("防曬裝備");
  });
});
