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
/*
 * 2026-08-30：`summary` 原本寫死成 null，於是「這台裝置儲存了什麼」那張
 * 卡在所有測試裡都不渲染——要斷言卡片內容就得能餵資料進去。加成可選
 * 參數而不是改預設值，既有測試的行為一行沒變。
 */
const SUMMARY_FIXTURE = {
  productCount: 3,
  hasActiveSession: true,
  endedSessionCount: 12,
  hasSetupDraft: false,
  lastWeatherSnapshotAt: null,
  lastClockCalibrationAt: null
};

function makeServices(
  authState: "signed_out" | "signed_in" = "signed_out",
  phase: "idle" | "loading" = "idle",
  summary: typeof SUMMARY_FIXTURE | null = null
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
    summary: shallowReadonly(shallowRef(summary)),
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
  phase: "idle" | "loading" = "idle",
  summary: typeof SUMMARY_FIXTURE | null = null
) {
  const services = makeServices(authState, phase, summary);
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

  /*
   * 2026-08-30：資料概況的範圍說明是常駐條件，不是可有可無的補充。
   *
   * 這些數字只數得到本機 IndexedDB；登入同步後雲端可能還有其他裝置上傳
   * 的紀錄，這張卡看不到也數不到。少了這句，「防曬裝備 0 筆」會被讀成
   * 「我的資料都不見了」——而這正是 2026-08-29 那次合併要解決的
   * 「本機 vs 雲端」混淆。DESIGN.md 第五節把這類前提列為不可隱藏。
   */
  it("資料概況說明數字只涵蓋本機，不含雲端", () => {
    useServices("signed_out", "idle", SUMMARY_FIXTURE);
    const wrapper = shallowMount(DataSettingsPage);
    const scope = wrapper.find(".summary-scope");

    expect(scope.exists()).toBe(true);
    expect(scope.text()).toContain("這台裝置");
    expect(scope.text()).toContain("雲端");
  });
});

/*
 * 2026-09-04 使用者截圖標註：清除區的警示框排版跑掉、「清除全部」那一列
 * 把同一件事講三次。
 */
describe("清除區的警示框", () => {
  const mountPage = () => {
    useServices("signed_out", "idle", SUMMARY_FIXTURE);
    return mount(DataSettingsPage, { global: { stubs: { RouterLink: true } } });
  };

  const triggerFor = (
    wrapper: ReturnType<typeof mountPage>,
    label: string
  ) => {
    const button = wrapper.findAll("button").find((it) => it.text() === label);
    expect(button, `找不到「${label}」按鈕`).toBeDefined();
    return button!;
  };

  /*
   * **根因是排版不是文案。** `.confirm-note` 是 grid，所以 slot 傳進來的每
   * 一段裸文字都會被包成一個匿名 grid item，item 之間再吃一次 12px 的 gap。
   * 實機上「…都會消失且／無法復原／，之後建立提醒…」被切成三塊，逗號掉到
   * 行首。
   *
   * 這條只能掛載之後檢查 DOM——問題出在 slot 內容的**節點型別**，掃原始碼
   * 字串看不到。
   */
  it("警示內容不會被 grid 切成好幾塊", async () => {
    const wrapper = mountPage();

    for (const label of ["清除裝備與提醒紀錄", "清除全部本機資料"]) {
      await triggerFor(wrapper, label).trigger("click");

      const note = wrapper.get(".confirm-note").element;
      const bare = [...note.childNodes].filter(
        (node) => node.nodeType === 3 && (node.textContent ?? "").trim() !== ""
      );

      expect(
        bare.map((node) => node.textContent?.trim()),
        `「${label}」的警示框有裸文字節點`
      ).toEqual([]);
    }
  });

  /* 那一句仍然要說完「無法復原」——精簡掉的只有結尾的「確定嗎？」。 */
  it("裝備與提醒的警示是完整的一段", async () => {
    const wrapper = mountPage();
    await triggerFor(wrapper, "清除裝備與提醒紀錄").trigger("click");

    const note = wrapper.get(".confirm-note");
    expect(note.findAll("p")).toHaveLength(1);
    expect(note.get("p").text()).toContain("無法復原");
  });

  /*
   * 「清除全部」那一列原本是紅色標題＋說明＋按鈕，三個地方講同一件事。
   * 併進按鈕之後，說明句不可以再出現，按鈕要講完整的動作名稱。
   */
  it("清除全部只剩一顆講完整名稱的按鈕", () => {
    const wrapper = mountPage();

    expect(wrapper.text()).not.toContain("清除本機資料，重置為初始狀態。");
    expect(wrapper.findAll("button").map((it) => it.text())).toContain(
      "清除全部本機資料"
    );
  });
});
