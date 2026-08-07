// @vitest-environment happy-dom

import type { SessionProjection, ZoneProjection } from "@sunshield/contracts";
import { flushPromises, shallowMount } from "@vue/test-utils";
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
    },
    sessionEvents: {
      phase: shallowReadonly(shallowRef("ready")),
      stream: shallowReadonly(shallowRef(null)),
      ensureLoaded: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      dispose: vi.fn()
    },
    productSettings: {
      phase: shallowReadonly(shallowRef("ready")),
      snapshot: shallowReadonly(shallowRef(null)),
      products: shallowReadonly(shallowRef([])),
      ensureLoaded: vi.fn(async () => undefined),
      save: vi.fn(async () => true),
      saveProduct: vi.fn(async () => true),
      stopProduct: vi.fn(async () => true),
      dispose: vi.fn()
    }
  } as unknown as WebAppServices);
}

async function mountPage() {
  const stub = { template: "<div />" };
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: "/reminder", component: ReminderPage },
      // 次要 CTA 與原地行為的目的地；解析不到會讓導向靜默失敗。
      {
        path: "/reminder/reapply",
        name: "reminder-reapply",
        component: stub
      },
      {
        path: "/special-situation",
        name: "special-situation",
        component: stub
      },
      {
        path: "/reminder/action/:kind",
        name: "reminder-action",
        component: stub
      },
      { path: "/products", name: "products", component: stub }
    ]
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

  // S-07 原地行為（2026-08-06 裁決：13 個 ActionKind 不新增畫面）。
  // 離開頁面會讓使用者失去狀態脈絡，所以「不換頁」本身就是規格要求。
  it("review_required_zones 就地錨點，不離開提醒頁", async () => {
    mockServices(session);
    const { router, wrapper } = await mountPage();

    wrapper
      .findComponent(PrimaryReminderPanel)
      .vm.$emit("action", "review_required_zones");
    await router.isReady();

    expect(router.currentRoute.value.path).toBe("/reminder");
  });

  it("view_product_label 就地展開產品標示，不離開提醒頁", async () => {
    mockServices(session);
    const { router, wrapper } = await mountPage();

    wrapper
      .findComponent(PrimaryReminderPanel)
      .vm.$emit("action", "view_product_label");
    await wrapper.vm.$nextTick();

    expect(router.currentRoute.value.path).toBe("/reminder");
  });

  it("查看處理說明導向 S-17，不預先帶入任何使用者輸入", async () => {
    mockServices(session);
    const { router, wrapper } = await mountPage();

    wrapper
      .findComponent(PrimaryReminderPanel)
      .vm.$emit("secondaryAction", "view_handling_guidance");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("special-situation");
    expect(router.currentRoute.value.query).toEqual({});
  });

  it("更新防護紀錄導向 S-08", async () => {
    mockServices(session);
    const { router, wrapper } = await mountPage();

    wrapper
      .findComponent(PrimaryReminderPanel)
      .vm.$emit("secondaryAction", "update_protection_record");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("reminder-reapply");
  });

  it("查看已保存紀錄就地展開，不離開提醒頁", async () => {
    mockServices(session);
    const { router, wrapper } = await mountPage();

    wrapper
      .findComponent(PrimaryReminderPanel)
      .vm.$emit("secondaryAction", "view_saved_records");
    await wrapper.vm.$nextTick();

    expect(router.currentRoute.value.path).toBe("/reminder");
  });

  it("recalibrate_clock 在校準子系統未實作時明講現況，不假裝已校準", async () => {
    mockServices(session);
    const { router, wrapper } = await mountPage();

    wrapper
      .findComponent(PrimaryReminderPanel)
      .vm.$emit("action", "recalibrate_clock");
    await wrapper.vm.$nextTick();

    expect(router.currentRoute.value.path).toBe("/reminder");
    expect(wrapper.text()).toContain("目前無法自動校準");
  });
});
