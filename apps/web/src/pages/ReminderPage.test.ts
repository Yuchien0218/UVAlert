// @vitest-environment happy-dom

import type { SessionProjection, ZoneProjection } from "@sunshield/contracts";
import { shallowMount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../app/createWebAppServices";
import { useWebAppServices } from "../app/injection";
import PrimaryReminderPanel from "../components/reminder/PrimaryReminderPanel.vue";
import ReminderEmptyState from "../components/reminder/ReminderEmptyState.vue";
import ZoneStatusList from "../components/reminder/ZoneStatusList.vue";
import SessionEndControl from "../components/session/SessionEndControl.vue";
import ReminderPage from "./ReminderPage.vue";

vi.mock("../app/injection", () => ({
  useWebAppServices: vi.fn()
}));

const zone: ZoneProjection = {
  sessionId: "session-1",
  zoneInstanceId: "zone-1",
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
  timingStatus: "tracking",
  activeLabelReadyAt: null,
  generalDueAt: "2026-08-01T08:00:00.000Z",
  activeWaterDeadline: null,
  eventTriggeredDeadline: null,
  zoneDueAt: "2026-08-01T08:00:00.000Z",
  zoneTimerStartedAt: "2026-08-01T06:00:00.000Z",
  zoneNextActionAt: "2026-08-01T08:00:00.000Z",
  activeCauseRefs: [],
  activeRuleIds: ["RR-P0-GENERAL-001"],
  reasonCodes: [],
  derivedFromEventRefs: ["application-1"]
};

const session: SessionProjection = {
  sessionId: "session-1",
  rulesetVersion: "p0-v1",
  revision: 1,
  overallStatus: "tracking",
  sessionNextDueAt: zone.zoneDueAt,
  zones: [zone],
  primaryAction: {
    presentationType: "timed_ring",
    variant: null,
    actionKind: "report_context_event",
    affectedZoneInstanceIds: [zone.zoneInstanceId],
    actionAt: zone.zoneDueAt,
    reasonCodes: [],
    derivedFromEventRefs: ["application-1"]
  },
  derivedFromEventRefs: ["application-1"]
};

function mockServices(currentSession: SessionProjection | null): void {
  vi.mocked(useWebAppServices).mockReturnValue({
    boot: {
      phase: shallowReadonly(shallowRef("ready")),
      errorCode: shallowReadonly(shallowRef(null)),
      connectivity: shallowReadonly(shallowRef("online")),
      currentSession: shallowReadonly(shallowRef(currentSession)),
      ensureBooted: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      dispose: vi.fn()
    },
    sessionControl: {
      endPhase: shallowReadonly(shallowRef("idle")),
      endError: shallowReadonly(shallowRef(null)),
      endCurrentSession: vi.fn(async () => true),
      clearEndError: vi.fn(),
      dispose: vi.fn()
    }
  } as unknown as WebAppServices);
}

async function mountPage() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/reminder", component: ReminderPage }]
  });
  await router.push("/reminder");
  await router.isReady();
  return {
    router,
    wrapper: shallowMount(ReminderPage, {
      global: { plugins: [router] }
    })
  };
}

describe("ReminderPage", () => {
  it("有進行中提醒時呈現主要狀態、部位與結束控制", async () => {
    mockServices(session);
    const { wrapper } = await mountPage();

    expect(wrapper.findComponent(PrimaryReminderPanel).exists()).toBe(true);
    expect(wrapper.findComponent(ZoneStatusList).exists()).toBe(true);
    expect(wrapper.findComponent(SessionEndControl).exists()).toBe(true);
    expect(wrapper.text()).toContain("不代表安全曝曬時間");
    expect(wrapper.text()).not.toContain("Session projection");
    expect(wrapper.text()).not.toContain("Vue 元件內重新推算");
  });

  it("沒有進行中提醒時留在提醒頁呈現空白狀態", async () => {
    mockServices(null);
    const { router, wrapper } = await mountPage();

    expect(wrapper.findComponent(ReminderEmptyState).exists()).toBe(true);
    expect(router.currentRoute.value.path).toBe("/reminder");
  });
});
