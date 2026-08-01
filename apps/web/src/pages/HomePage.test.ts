// @vitest-environment happy-dom

import type { SessionProjection, ZoneProjection } from "@sunshield/contracts";
import { shallowMount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../app/createWebAppServices";
import { useWebAppServices } from "../app/injection";
import HomeReminderSummary from "../components/home/HomeReminderSummary.vue";
import ZoneStatusList from "../components/reminder/ZoneStatusList.vue";
import SessionEndControl from "../components/session/SessionEndControl.vue";
import HomePage from "./HomePage.vue";

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

describe("HomePage", () => {
  it("只呈現提醒摘要，不承載完整部位與結束提醒控制", async () => {
    vi.mocked(useWebAppServices).mockReturnValue({
      boot: {
        phase: shallowReadonly(shallowRef("ready")),
        errorCode: shallowReadonly(shallowRef(null)),
        connectivity: shallowReadonly(shallowRef("online")),
        currentSession: shallowReadonly(shallowRef(session)),
        ensureBooted: vi.fn(async () => undefined),
        refresh: vi.fn(async () => undefined),
        dispose: vi.fn()
      },
      uvForecast: {
        phase: shallowReadonly(shallowRef("no_region")),
        error: shallowReadonly(shallowRef(null)),
        region: shallowReadonly(shallowRef(null)),
        forecast: shallowReadonly(shallowRef(null)),
        isEvening: shallowReadonly(shallowRef(false)),
        showEveningPrompt: shallowReadonly(shallowRef(false)),
        ensureLoaded: vi.fn(async () => undefined),
        refresh: vi.fn(async () => undefined),
        dismissEveningPrompt: vi.fn(),
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
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [{ path: "/", component: HomePage }]
    });
    await router.push("/");
    await router.isReady();

    const wrapper = shallowMount(HomePage, {
      global: { plugins: [router] }
    });

    expect(wrapper.findComponent(HomeReminderSummary).exists()).toBe(true);
    expect(wrapper.findComponent(ZoneStatusList).exists()).toBe(false);
    expect(wrapper.findComponent(SessionEndControl).exists()).toBe(false);
  });
});
