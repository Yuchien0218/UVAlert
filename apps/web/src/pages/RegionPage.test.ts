// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import {
  createMemoryHistory,
  createRouter
} from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../app/createWebAppServices";
import { useWebAppServices } from "../app/injection";
import RegionPage from "./RegionPage.vue";

vi.mock("../app/injection", () => ({
  useWebAppServices: vi.fn()
}));

function makeRegionService() {
  return {
    phase: shallowReadonly(shallowRef("idle" as const)),
    preference: shallowReadonly(shallowRef(null)),
    candidate: shallowReadonly(shallowRef(null)),
    approximateAccuracyMeters: shallowReadonly(shallowRef(null)),
    directory: [
      {
        regionCode: "63000010",
        countyCode: "63000",
        countyName: "臺北市",
        townName: "松山區",
        displayName: "臺北市松山區"
      }
    ],
    error: shallowReadonly(shallowRef(null)),
    ensureLoaded: vi.fn(async () => undefined),
    useCurrentPosition: vi.fn(async () => undefined),
    confirmCandidate: vi.fn(async () => true),
    saveManualRegion: vi.fn(async () => true),
    skipRegion: vi.fn(async () => true),
    clearError: vi.fn(),
    dispose: vi.fn()
  };
}

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/", component: { template: "<div>首頁</div>" } },
      { path: "/region", component: RegionPage },
      { path: "/more", component: { template: "<div>更多</div>" } }
    ]
  });
  await router.push("/region");
  await router.isReady();
  const wrapper = mount(RegionPage, {
    global: { plugins: [router] }
  });
  return { wrapper, router };
}

describe("RegionPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("navigation and mount do not request device location", async () => {
    const region = makeRegionService();
    vi.mocked(useWebAppServices).mockReturnValue({
      region
    } as unknown as WebAppServices);

    const { wrapper } = await mountPage();

    expect(region.ensureLoaded).toHaveBeenCalledOnce();
    expect(region.useCurrentPosition).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("位置不會被儲存或用於分析");
  });

  it("requests location only after the explicit button press", async () => {
    const region = makeRegionService();
    vi.mocked(useWebAppServices).mockReturnValue({
      region
    } as unknown as WebAppServices);
    const { wrapper } = await mountPage();

    await wrapper.get('[data-testid="use-current-position"]').trigger("click");

    expect(region.useCurrentPosition).toHaveBeenCalledOnce();
  });

  it("manual county and district selection works without network state", async () => {
    const region = makeRegionService();
    vi.mocked(useWebAppServices).mockReturnValue({
      region
    } as unknown as WebAppServices);
    const { wrapper } = await mountPage();

    await wrapper.get("#region-county").setValue("63000");
    await wrapper.get("#region-town").setValue("63000010");
    await wrapper.get('[data-testid="save-manual-region"]').trigger("click");

    expect(region.saveManualRegion).toHaveBeenCalledWith("63000010");
  });

  it("saves an explicit skip", async () => {
    const region = makeRegionService();
    vi.mocked(useWebAppServices).mockReturnValue({
      region
    } as unknown as WebAppServices);
    const { wrapper } = await mountPage();

    await wrapper.get('[data-testid="skip-region"]').trigger("click");

    expect(region.skipRegion).toHaveBeenCalledOnce();
  });
});
