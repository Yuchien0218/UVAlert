// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../app/createWebAppServices";
import { useWebAppServices } from "../app/injection";
import RegionLocationPanel from "../components/region/RegionLocationPanel.vue";
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

function findButton(
  wrapper: { findAll: (selector: string) => { text: () => string; trigger: (event: string) => Promise<void> }[] },
  label: string
) {
  const button = wrapper.findAll("button").find((b) => b.text().includes(label));
  if (button === undefined) throw new Error(`找不到按鈕：${label}`);
  return button;
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
    expect(wrapper.text()).toContain("不儲存或分析位置資訊");
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

    /*
     * 2026-08-31：手動選擇預設收起來（使用者裁決，「使用目前位置」才是
     * 主要路徑）。這條測試因此多一步展開——**不是把它改成不驗證**，
     * 收合之後手動選擇仍然必須完整可用，那是定位被拒絕時唯一的出路。
     */
    await findButton(wrapper, "改為手動選擇地區").trigger("click");

    await wrapper.get("#region-county").setValue("63000");
    await wrapper.get("#region-town").setValue("63000010");
    await wrapper.get('[data-testid="save-manual-region"]').trigger("click");

    expect(region.saveManualRegion).toHaveBeenCalledWith("63000010");
  });

  /*
   * 2026-08-31 收斂：三條互斥的路原本平鋪成三張等重的區塊（實測 1428px）。
   *
   * 三件事分開守。合成一條的話少掉任何一項都可能被另外兩項掩護：
   * 只守「手動收起來」→ 略過的說明可以一起消失；只守「說明還在」→ 手動
   * 可以照樣攤開；只守「定位常駐」→ 另外兩條可以變回卡片。
   */
  it("手動選擇預設收起來", async () => {
    vi.mocked(useWebAppServices).mockReturnValue({
      region: makeRegionService()
    } as unknown as WebAppServices);
    const { wrapper } = await mountPage();

    expect(wrapper.find("#region-county").exists()).toBe(false);
  });

  it("使用目前位置維持常駐，不收合", async () => {
    vi.mocked(useWebAppServices).mockReturnValue({
      region: makeRegionService()
    } as unknown as WebAppServices);
    const { wrapper } = await mountPage();

    expect(wrapper.findComponent(RegionLocationPanel).exists()).toBe(true);
  });

  /*
   * 那句說明告訴使用者略過之後補擦提醒仍然正常——那正是讓略過變成安全
   * 選擇的理由，也是 Sitemap §一「定位不足時仍不得阻擋本機倒數與手動
   * 操作」在畫面上的體現。收合版面時不可以連它一起收掉。
   */
  it("略過的說明沒有跟著收掉", async () => {
    vi.mocked(useWebAppServices).mockReturnValue({
      region: makeRegionService()
    } as unknown as WebAppServices);
    const { wrapper } = await mountPage();

    expect(wrapper.text()).toContain("提醒功能仍可正常運作");
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
