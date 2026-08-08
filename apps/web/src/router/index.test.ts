// @vitest-environment happy-dom

import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import type { AppBootController } from "../app/createAppBootController";
import { createAppRouter } from "./index";

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
    expect(globalThis.document.title).toBe(
      "防曬產品｜防曬晴報員"
    );
  });

  it("提醒網址保留在提醒頁並保留部位錨點", async () => {
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

    expect(router.currentRoute.value.name).toBe("reminder");
    expect(router.currentRoute.value.hash).toBe("#zone-status");
    expect(globalThis.document.title).toBe(
      "目前提醒｜防曬晴報員"
    );
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
    expect(globalThis.document.title).toBe(
      "地區設定｜防曬晴報員"
    );
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
      "/reminder/action/record_reapplication"
    ]) {
      await router.push(path);
      await router.isReady();
      expect(router.currentRoute.value.name).toBe("not-found");
    }
  });

  it("S-08 沒有 active Session 時回到提醒頁", async () => {
    const boot = {
      phase: shallowReadonly(shallowRef("ready")), errorCode: shallowReadonly(shallowRef(null)), connectivity: shallowReadonly(shallowRef("online")), currentSession: shallowReadonly(shallowRef(null)),
      ensureBooted: vi.fn(async () => undefined), refresh: vi.fn(async () => undefined), dispose: vi.fn()
    } as AppBootController;
    const router = createAppRouter(boot, createMemoryHistory());
    await router.push("/reminder/reapply");
    await router.isReady();
    expect(router.currentRoute.value.name).toBe("reminder");
  });
});
