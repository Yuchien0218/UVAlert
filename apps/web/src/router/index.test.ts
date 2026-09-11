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
    "not-found",
    "reminder",
    "forecast"
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
  it.each([
    ["/privacy", "privacy"],
    ["/terms", "terms"]
  ])("resolves %s as %s without session guards", async (path, name) => {
    const router = createAppRouter(makeReadyBoot(), createMemoryHistory());

    await router.push(path);
    await router.isReady();

    expect(router.currentRoute.value.name).toBe(name);
  });

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

  it("智慧入口分流：無 active Session 時根路徑導向 /forecast", async () => {
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

    await router.push("/");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe("forecast");
  });

  it("智慧入口分流：有 active Session 時根路徑導向 /reminder", async () => {
    const fakeSession = { sessionId: "session-1" } as any;
    const boot: AppBootController = {
      phase: shallowReadonly(shallowRef("ready")),
      errorCode: shallowReadonly(shallowRef(null)),
      connectivity: shallowReadonly(shallowRef("online")),
      currentSession: shallowReadonly(shallowRef(fakeSession)),
      ensureBooted: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      dispose: vi.fn()
    };
    const router = createAppRouter(boot, createMemoryHistory());

    await router.push("/#zone-status");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe("reminder");
    expect(router.currentRoute.value.hash).toBe("#zone-status");
  });

  it("/reminder 有獨立路由且顯示防曬提醒", async () => {
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

    await router.push("/reminder");
    await router.isReady();

    expect(router.currentRoute.value.name).toBe("reminder");
    expect(globalThis.document.title).toBe("防曬提醒｜防曬晴報員");
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

  it("S-08 沒有 active Session 時回到提醒頁", async () => {
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
    expect(router.currentRoute.value.name).toBe("reminder");
  });
});

/**
 * 換頁方向寫進 <html data-nav-direction>（2026-09-04）。
 *
 * CSS 靠它決定要不要跑 page-stack 的階梯淡入——返回時重跑階梯會讀成
 * 「重新載入」而不是「回來了」。判斷邏輯放在 router 裡，所以這裡守的是
 * 邏輯本身，不是樣式。
 */
describe("換頁方向", () => {
  const direction = (): string | undefined =>
    globalThis.document.documentElement.dataset.navDirection;

  async function makeRouter() {
    const router = createAppRouter(makeReadyBoot(), createMemoryHistory());
    await router.push("/");
    await router.isReady();
    return router;
  }

  it("往前推進標成 forward", async () => {
    const router = await makeRouter();

    await router.push("/more");
    expect(direction()).toBe("forward");

    await router.push("/install");
    expect(direction()).toBe("forward");
  });

  it("返回標成 back", async () => {
    const router = await makeRouter();
    await router.push("/more");
    await router.push("/install");

    router.back();
    await vi.waitUntil(() => direction() === "back", { timeout: 1000 });
    expect(direction()).toBe("back");
  });

  /*
   * **返回之後再往前推進，要回到 forward。** 只守「返回會變 back」的話，
   * 一個永遠寫 back 的實作也會過——那會讓返回之後的每一次換頁都失去階梯
   * 淡入。方向是雙向的，兩邊都要守。
   */
  it("返回之後再往前推進，回到 forward", async () => {
    const router = await makeRouter();
    await router.push("/more");
    await router.push("/install");

    router.back();
    await vi.waitUntil(() => direction() === "back", { timeout: 1000 });

    await router.push("/feedback");
    expect(direction()).toBe("forward");
  });
});
