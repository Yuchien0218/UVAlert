// @vitest-environment happy-dom

import { mount, shallowMount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../../app/createWebAppServices";
import { useWebAppServices } from "../../app/injection";
import BroadcastLoader from "../../components/feedback/BroadcastLoader.vue";
import DataSettingsPage from "./DataSettingsPage.vue";

vi.mock("../../app/injection", () => ({ useWebAppServices: vi.fn() }));

/**
 * 這個檔案是兩份測試併起來的。
 *
 * PR #4（載入中改用具名 BroadcastLoader）與本分支（把 /settings/sync
 * 併進本頁）各自新建了一份 `DataSettingsPage.test.ts`，合併時 add/add
 * 衝突。兩邊測的是不同的東西，所以全部保留——但 services mock 必須用
 * 同一份：合併後的元件會在 onMounted 呼叫 `auth.refresh()`，只 mock
 * `localData` 的話會在掛載時就爆掉。
 *
 * 同步的那兩條斷言原本在 `SyncSettingsPage.test.ts`，行為一行沒改，
 * 原樣搬過來——用途是證明合併沒有在搬家過程中弄丟同步功能。
 */
function makeServices(
  authState: "signed_out" | "signed_in" = "signed_out",
  phase: "idle" | "loading" = "idle"
) {
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
    phase: shallowReadonly(shallowRef(phase)),
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

function useServices(
  authState: "signed_out" | "signed_in" = "signed_out",
  phase: "idle" | "loading" = "idle"
) {
  const services = makeServices(authState, phase);
  vi.mocked(useWebAppServices).mockReturnValue(
    services as unknown as WebAppServices
  );
  return services;
}

describe("DataSettingsPage 的載入狀態", () => {
  it("讀取本機資料時以具名 BroadcastLoader 傳達進度", () => {
    useServices("signed_out", "loading");

    const wrapper = mount(DataSettingsPage, {
      global: { stubs: { RouterLink: true } }
    });

    const loader = wrapper.getComponent(BroadcastLoader);
    expect(loader.attributes("role")).toBe("status");
    expect(loader.attributes("aria-label")).toBe("正在讀取本機資料概況");
  });
});

/*
 * 本機資料概況刻意維持 null：同步區塊不依賴本機概況是否讀得到，這樣
 * 測試就只在驗同步，也順便守住「本機資料讀取失敗時同步區塊仍要在」
 * 這個性質。
 */
describe("DataSettingsPage 的同步區塊", () => {
  it("未登入先顯示免登入說明與 Google sync CTA", () => {
    useServices();
    const wrapper = shallowMount(DataSettingsPage);
    expect(wrapper.text()).toContain("目前使用免登入模式");
    expect(wrapper.text()).toContain("使用 Google 登入同步");
  });

  it("登入後可先讀取同步預覽，不會在頁面開啟時自動上傳", async () => {
    const services = useServices("signed_in");
    const wrapper = shallowMount(DataSettingsPage);
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
    useServices();
    const wrapper = shallowMount(DataSettingsPage);
    expect(wrapper.text()).not.toContain("雲端資料請到另一頁管理");
    expect(wrapper.text()).not.toContain("本頁只處理這台裝置的本機資料");
  });

  it("同步區塊裡仍進得去登入與雲端資料頁", () => {
    useServices();
    const wrapper = shallowMount(DataSettingsPage);
    expect(wrapper.html()).toContain("/settings/account-data");
  });
});
