// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../../app/createWebAppServices";
import { useWebAppServices } from "../../app/injection";
import SyncSettingsPage from "./SyncSettingsPage.vue";

vi.mock("../../app/injection", () => ({ useWebAppServices: vi.fn() }));

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
  return { auth, sync };
}

describe("SyncSettingsPage", () => {
  it("未登入先顯示免登入說明與 Google sync CTA", () => {
    const services = makeServices();
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = shallowMount(SyncSettingsPage);
    expect(wrapper.text()).toContain("目前使用免登入模式");
    expect(wrapper.text()).toContain("使用 Google 登入同步");
  });

  it("登入後可先讀取同步預覽，不會在頁面開啟時自動上傳", async () => {
    const services = makeServices("signed_in");
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );
    const wrapper = shallowMount(SyncSettingsPage);
    expect(services.sync.preparePreview).not.toHaveBeenCalled();
    await wrapper.get("button").trigger("click");
    expect(services.sync.preparePreview).toHaveBeenCalledTimes(1);
  });
});
