// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../../app/createWebAppServices";
import { useWebAppServices } from "../../app/injection";
import DataSettingsPage from "./DataSettingsPage.vue";

vi.mock("../../app/injection", () => ({ useWebAppServices: vi.fn() }));

/**
 * 這些斷言原本在 `SyncSettingsPage.test.ts`。
 *
 * 2026-08-29 把 `/settings/sync` 併進本頁（見
 * `docs/decisions/2026-08-29-settings-data-sync-merge.md`），同步的行為
 * 一行都沒改，所以斷言原樣搬過來——它們的用途是證明「合併沒有在搬家
 * 過程中弄丟同步功能」。
 *
 * 本機資料區塊刻意讓 `summary` 維持 null：同步區塊不依賴本機概況是否
 * 讀得到，這樣測試就只在驗同步，也順便守住「本機資料讀取失敗時同步
 * 區塊仍要在」這個性質。
 */
function makeServices(authState: "signed_out" | "signed_in" = "signed_out") {
  const auth = {
    state: shallowReadonly(
      shallowRef({
        status: authState,
        auth:
          authState === "signed_in"
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
  };
  const sync = {
    state: shallowReadonly(
      shallowRef({ status: "idle" as const, preview: null, error: null })
    ),
    preparePreview: vi.fn(async () => null),
    confirm: vi.fn(async () => true),
    cancelPreview: vi.fn(),
    reset: vi.fn(),
    dispose: vi.fn()
  };
  const localData = {
    phase: shallowReadonly(shallowRef("idle" as const)),
    summary: shallowReadonly(shallowRef(null)),
    notice: shallowReadonly(shallowRef(null)),
    error: shallowReadonly(shallowRef(null)),
    hasExportedThisVisit: shallowReadonly(shallowRef(false)),
    load: vi.fn(async () => undefined),
    exportData: vi.fn(async () => true),
    clearSetupDrafts: vi.fn(async () => true),
    clearProductsAndHistory: vi.fn(async () => true),
    clearAll: vi.fn(async () => true),
    dismissNotice: vi.fn(),
    dispose: vi.fn()
  };
  return { auth, sync, localData };
}

function mount(authState: "signed_out" | "signed_in" = "signed_out") {
  const services = makeServices(authState);
  vi.mocked(useWebAppServices).mockReturnValue(
    services as unknown as WebAppServices
  );
  return { services, wrapper: shallowMount(DataSettingsPage) };
}

describe("DataSettingsPage 的同步區塊", () => {
  it("未登入先顯示免登入說明與 Google sync CTA", () => {
    const { wrapper } = mount();
    expect(wrapper.text()).toContain("目前使用免登入模式");
    expect(wrapper.text()).toContain("使用 Google 登入同步");
  });

  it("登入後可先讀取同步預覽，不會在頁面開啟時自動上傳", async () => {
    const { services, wrapper } = mount("signed_in");
    expect(services.sync.preparePreview).not.toHaveBeenCalled();
    await wrapper.get("button").trigger("click");
    expect(services.sync.preparePreview).toHaveBeenCalledTimes(1);
  });
});

describe("DataSettingsPage 的合併結果", () => {
  /*
   * 這張卡（「雲端資料請到另一頁管理」）是拆成兩頁製造出來的純導覽
   * 補救，合併的整個理由就是消掉它。守著它別以別的形式復活。
   */
  it("不再出現「請到另一頁」的導覽補救文字", () => {
    const { wrapper } = mount();
    expect(wrapper.text()).not.toContain("雲端資料請到另一頁管理");
    expect(wrapper.text()).not.toContain("本頁只處理這台裝置的本機資料");
  });

  it("同步區塊裡仍進得去登入與雲端資料頁", () => {
    const { wrapper } = mount();
    expect(wrapper.html()).toContain("/settings/account-data");
  });
});
