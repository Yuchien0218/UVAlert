// @vitest-environment happy-dom

import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import type { AppBootController } from "../app/createAppBootController";
import { createAppRouter } from "./index";

function makeReadyBoot(): AppBootController {
  return {
    phase: shallowReadonly(shallowRef("ready")),
    errorCode: shallowReadonly(shallowRef(null)),
    connectivity: shallowReadonly(shallowRef("online")),
    currentSession: shallowReadonly(shallowRef(null)),
    ensureBooted: vi.fn(async () => undefined),
    refresh: vi.fn(async () => undefined),
    dispose: vi.fn()
  } as AppBootController;
}

/**
 * 應用程式導向的每個 route name 都必須真的存在於路由表。
 *
 * 2026-08-08 踩過一次：刪掉 placeholder 路由後，提醒頁的
 * 「更新防護方式」次要 CTA 仍 push 到 `reminder-action`，
 * 但 ReminderPage.test.ts 自己註冊了同名 stub，整套測試照樣是綠的。
 * 這裡直接對**真實**路由表解析，避免測試 router 與正式 router 分歧。
 */
describe("route name 完整性", () => {
  const referencedNames = [
    // resolveActionRoute 的所有落點
    "reminder-reapply",
    "reminder-report",
    "products",
    "help-how-it-works",
    // 首頁次要 CTA 的落點（原 ReminderPage，2026-08-24 併入首頁）
    "special-situation",
    // 其他頁面 push 的目的地
    "reminder-event-correct",
    "product-new",
    "product-edit",
    "product-detail",
    "settings-data",
    "settings-notifications",
    "install",
    "region",
    "help",
    "help-beach",
    "more",
    "education",
    "education-category",
    "education-article",
    "home",
    "setup",
    "not-found"
  ];

  it.each(referencedNames)("%s 存在於路由表", (name) => {
    const router = createAppRouter(makeReadyBoot(), createMemoryHistory());
    expect(router.hasRoute(name)).toBe(true);
  });

  it("已移除的 placeholder 路由不得復活", () => {
    const router = createAppRouter(makeReadyBoot(), createMemoryHistory());
    for (const name of [
      "reminder-action",
      "setup-protection",
      "setup-review",
      // 2026-08-24：兩步流程合併成 /setup 單頁後移除，同樣不留轉址。
      "setup-context",
      "setup-timing"
    ]) {
      expect(router.hasRoute(name)).toBe(false);
    }
  });
});

describe("createAppRouter", () => {
  it("awaits App Boot before completing navigation", async () => {
    const ensureBooted = vi.fn(async () => undefined);
    const boot: AppBootController = {
      phase: shallowReadonly(shallowRef("ready")),
      errorCode: shallowReadonly(shallowRef(null)),
      connectivity: shallowReadonly(shallowRef("online")),
      currentSession: shallowReadonly(shallowRef(null)),
      ensureBooted,
      refresh: vi.fn(async () => undefined),
      dispose: vi.fn()
    };
    const router = createAppRouter(boot, createMemoryHistory());

    await router.push("/products");
    await router.isReady();

    expect(ensureBooted).toHaveBeenCalledTimes(1);
    expect(router.currentRoute.value.name).toBe("products");
    expect(globalThis.document.title).toBe("防曬裝備｜防曬晴報員");
  });

  // 2026-08-24：/reminder 已移除、內容併入首頁。原本斷言該網址停在提醒頁；
  // 現在它不存在，因此改為斷言 404，錨點行為改由首頁承接。
  it("已移除的 /reminder 網址落到 not-found", async () => {
    const boot: AppBootController = {
      phase: shallowReadonly(shallowRef("ready")),
      errorCode: shallowReadonly(shallowRef(null)),
      connectivity: shallowReadonly(shallowRef("online")),
      currentSession: shallowReadonly(shallowRef(null)),
      ensureBooted: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      dispose: vi.fn()
    };
    const router = createAppRouter(boot, createMemoryHistory());

    await router.push("/reminder#zone-status");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe("not-found");

    // 錨點行為改由首頁承接——部位清單現在在首頁下半部。
    await router.push("/#zone-status");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe("home");
    expect(router.currentRoute.value.hash).toBe("#zone-status");
  });

  it("地區設定有直接路由且不會在導航時要求定位", async () => {
    const boot: AppBootController = {
      phase: shallowReadonly(shallowRef("ready")),
      errorCode: shallowReadonly(shallowRef(null)),
      connectivity: shallowReadonly(shallowRef("online")),
      currentSession: shallowReadonly(shallowRef(null)),
      ensureBooted: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      dispose: vi.fn()
    };
    const router = createAppRouter(boot, createMemoryHistory());

    await router.push("/region");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe("region");
    expect(globalThis.document.title).toBe("地區設定｜防曬晴報員");
  });

  it("兩步流程的殘留路徑已移除，落到 404 而不是白畫面", async () => {
    const boot = {
      phase: shallowReadonly(shallowRef("ready")),
      errorCode: shallowReadonly(shallowRef(null)),
      connectivity: shallowReadonly(shallowRef("online")),
      currentSession: shallowReadonly(shallowRef(null)),
      ensureBooted: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      dispose: vi.fn()
    } as AppBootController;
    const router = createAppRouter(boot, createMemoryHistory());

    // 2026-08-08：兩條轉址與 placeholder 路由一併移除。P0 尚未上線、
    // 沒有外部連結要相容，留著只是讓路由表更難讀。
    for (const path of [
      "/setup/review",
      "/setup/protection",
      "/setup/context",
      "/setup/timing",
      "/reminder/action/record_reapplication"
    ]) {
      await router.push(path);
      await router.isReady();
      expect(router.currentRoute.value.name).toBe("not-found");
    }
  });

  // 2026-08-24：落點從 /reminder 改成首頁。首頁是底部導覽「提醒」的
  // 去處，也負責顯示「還沒有開始防曬提醒」的空狀態與開始 CTA；
  // /reminder 是首頁連過去的「查看完整狀態」詳細頁，不適合當守衛落點。
  it("S-08 沒有 active Session 時回到首頁", async () => {
    const boot = {
      phase: shallowReadonly(shallowRef("ready")),
      errorCode: shallowReadonly(shallowRef(null)),
      connectivity: shallowReadonly(shallowRef("online")),
      currentSession: shallowReadonly(shallowRef(null)),
      ensureBooted: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      dispose: vi.fn()
    } as AppBootController;
    const router = createAppRouter(boot, createMemoryHistory());
    await router.push("/reminder/reapply");
    await router.isReady();
    expect(router.currentRoute.value.name).toBe("home");
  });
});
