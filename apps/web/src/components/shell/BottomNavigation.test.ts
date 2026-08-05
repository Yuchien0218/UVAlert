// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { shallowReadonly, shallowRef } from "vue";
import { useWebAppServices } from "../../app/injection";
import type { WebAppServices } from "../../app/createWebAppServices";
import type { SessionProjection, ZoneProjection } from "@sunshield/contracts";
import BottomNavigation from "./BottomNavigation.vue";

const bottomNavigationSource = readFileSync(
  "apps/web/src/components/shell/BottomNavigation.vue",
  "utf8"
);

vi.mock("../../app/injection", () => ({
  useWebAppServices: vi.fn()
}));

describe("BottomNavigation", () => {
  beforeEach(() => {
    vi.mocked(useWebAppServices).mockReturnValue({
      boot: {
        currentSession: shallowReadonly(shallowRef(null))
      }
    } as unknown as WebAppServices);
  });
  it("提供首頁、提醒、產品與更多四個主要入口", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/reminder", component: { template: "<div />" } },
        { path: "/products", component: { template: "<div />" } },
        { path: "/more", component: { template: "<div />" } }
      ]
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(BottomNavigation, {
      global: { plugins: [router] }
    });
    const links = wrapper.findAll("a");

    expect(
      links.map((link) => [link.text(), link.attributes("href")])
    ).toEqual([
      ["首頁", "/"],
      ["提醒", "/reminder"],
      ["產品", "/products"],
      ["更多", "/more"]
    ]);
  });

  it("固定在視窗底部並處理安全區與遮蓋層級", () => {
    expect(bottomNavigationSource).toContain("position: fixed;");
    expect(bottomNavigationSource).toContain("bottom: 0;");
    expect(bottomNavigationSource).toContain("left: 0;");
    expect(bottomNavigationSource).toContain("right: 0;");
    expect(bottomNavigationSource).toContain(
      "var(--bottom-nav-height)"
    );
    expect(bottomNavigationSource).toContain(
      "env(safe-area-inset-bottom)"
    );
    expect(bottomNavigationSource).toMatch(/z-index:\s*\d+/);
    expect(bottomNavigationSource).toContain(
      "background: var(--page-background);"
    );
  });

  it("當沒有 active session 時，提醒分頁圖示右上角不顯示小紅點", async () => {
    vi.mocked(useWebAppServices).mockReturnValue({
      boot: {
        currentSession: shallowReadonly(shallowRef(null))
      }
    } as unknown as WebAppServices);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/reminder", component: { template: "<div />" } },
        { path: "/products", component: { template: "<div />" } },
        { path: "/more", component: { template: "<div />" } }
      ]
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(BottomNavigation, {
      global: { plugins: [router] }
    });

    expect(wrapper.find('[data-testid="bottom-nav-badge"]').exists()).toBe(false);
  });

  it("當 active session 中有部位處於 due 狀態時，提醒分頁圖示右上角顯示同色小紅點", async () => {
    const baseZone: ZoneProjection = {
      sessionId: "session-1",
      zoneInstanceId: "zone-forehead",
      bodyZoneCode: "face_forehead",
      customLabel: null,
      trackingStatus: "active",
      skinExposureStatus: "exposed",
      methodCertainty: "confirmed",
      methodComponents: ["sunscreen"],
      currentActivationSequence: 1,
      currentApplicationId: "application-1",
      currentApplicationEligibility: "eligible",
      activeProductSafetyBlock: false,
      recordStatus: "sunscreen_recorded",
      timingStatus: "reapply_due",
      activeLabelReadyAt: null,
      generalDueAt: "2026-07-29T11:00:00.000Z",
      activeWaterDeadline: null,
      eventTriggeredDeadline: null,
      zoneDueAt: "2026-07-29T11:00:00.000Z",
      zoneTimerStartedAt: "2026-07-29T10:00:00.000Z",
      zoneNextActionAt: "2026-07-29T11:00:00.000Z",
      activeCauseRefs: [],
      activeRuleIds: ["RR-P0-GENERAL-001"],
      reasonCodes: [],
      derivedFromEventRefs: ["application-1"]
    };

    const sessionWithDue: SessionProjection = {
      sessionId: "session-1",
      rulesetVersion: "p0-v1",
      revision: 1,
      overallStatus: "attention_required",
      sessionNextDueAt: "2026-07-29T11:00:00.000Z",
      zones: [baseZone],
      primaryAction: {
        presentationType: "timed_ring",
        variant: null,
        actionKind: "report_context_event",
        affectedZoneInstanceIds: ["zone-forehead"],
        actionAt: "2026-07-29T11:00:00.000Z",
        reasonCodes: [],
        derivedFromEventRefs: ["application-1"]
      },
      derivedFromEventRefs: ["application-1"]
    };

    vi.mocked(useWebAppServices).mockReturnValue({
      boot: {
        currentSession: shallowReadonly(shallowRef(sessionWithDue))
      }
    } as unknown as WebAppServices);

    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/reminder", component: { template: "<div />" } },
        { path: "/products", component: { template: "<div />" } },
        { path: "/more", component: { template: "<div />" } }
      ]
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(BottomNavigation, {
      global: { plugins: [router] }
    });

    const badge = wrapper.find('[data-testid="bottom-nav-badge"]');
    expect(badge.exists()).toBe(true);
  });
});
