// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../../app/createWebAppServices";
import { useWebAppServices } from "../../app/injection";
import BroadcastLoader from "../../components/feedback/BroadcastLoader.vue";
import DataSettingsPage from "./DataSettingsPage.vue";

vi.mock("../../app/injection", () => ({ useWebAppServices: vi.fn() }));

describe("DataSettingsPage", () => {
  it("讀取本機資料時以具名 BroadcastLoader 傳達進度", () => {
    const services = {
      localData: {
        phase: shallowReadonly(shallowRef("loading" as const)),
        summary: shallowReadonly(shallowRef(null)),
        error: shallowReadonly(shallowRef(null)),
        notice: shallowReadonly(shallowRef(null)),
        hasExportedThisVisit: shallowReadonly(shallowRef(false)),
        load: vi.fn(async () => undefined)
      }
    };
    vi.mocked(useWebAppServices).mockReturnValue(
      services as unknown as WebAppServices
    );

    const wrapper = mount(DataSettingsPage, {
      global: { stubs: { RouterLink: true } }
    });

    const loader = wrapper.getComponent(BroadcastLoader);
    expect(loader.attributes("role")).toBe("status");
    expect(loader.attributes("aria-label")).toBe("正在讀取本機資料概況");
  });
});
