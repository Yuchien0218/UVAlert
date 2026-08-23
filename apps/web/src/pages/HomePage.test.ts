// @vitest-environment happy-dom

import type {
  FiveDayUvForecast,
  SessionProjection,
  ZoneProjection
} from "@sunshield/contracts";
import { shallowMount } from "@vue/test-utils";
import { shallowReadonly, shallowRef } from "vue";
import { createMemoryHistory, createRouter } from "vue-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WebAppServices } from "../app/createWebAppServices";
import { useWebAppServices } from "../app/injection";
import HomeCountdown from "../components/home/HomeCountdown.vue";
import HomeLocationPrompt from "../components/home/HomeLocationPrompt.vue";
import HomeNightNotice from "../components/home/HomeNightNotice.vue";
import HomeNightSession from "../components/home/HomeNightSession.vue";
import HomeUvHeadline from "../components/home/HomeUvHeadline.vue";
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

const forecast = {
  schemaVersion: "five-day-uv-v2",
  region: { regionCode: "TW-TPE-DAN", displayName: "臺北市 大安區" },
  sourceKind: "forecast",
  sourceDataset: "F-D0047-091",
  sourceDisplayName: "中央氣象署",
  issuedAt: "2026-08-01T00:00:00.000Z",
  fetchedAt: "2026-08-01T00:00:00.000Z",
  usableUntil: "2026-08-05T00:00:00.000Z",
  days: []
} as unknown as FiveDayUvForecast;

interface Options {
  session?: SessionProjection | null;
  isEvening?: boolean;
  region?: { displayName: string } | null;
}

function mockServices(options: Options = {}): void {
  const {
    session: currentSession = null,
    isEvening = false,
    region = null
  } = options;

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
    uvForecast: {
      phase: shallowReadonly(shallowRef(region === null ? "no_region" : "ready")),
      error: shallowReadonly(shallowRef(null)),
      region: shallowReadonly(shallowRef(region)),
      forecast: shallowReadonly(shallowRef(region === null ? null : forecast)),
      isEvening: shallowReadonly(shallowRef(isEvening)),
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
}

async function mountHome() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: "/", component: HomePage }]
  });
  await router.push("/");
  await router.isReady();

  return shallowMount(HomePage, { global: { plugins: [router] } });
}

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("有提醒進行中", () => {
    it("白天顯示倒數與完整狀態入口，不內嵌部位清單", async () => {
      mockServices({ session, region: { displayName: "臺北市 大安區" } });

      const wrapper = await mountHome();

      expect(wrapper.findComponent(HomeCountdown).exists()).toBe(true);
      // 各部位狀態已移到提醒頁；首頁只留前往完整狀態的入口（2026-08-08 裁決）。
      expect(wrapper.findComponent(ZoneStatusList).exists()).toBe(false);
      expect(wrapper.find('[to="/reminder"]').exists()).toBe(true);
    });

    /**
     * 結束控制屬於 `/reminder`，不屬於首頁。
     *
     * Sitemap §4.2：「`/reminder` 顯示完整部位狀態、補擦操作、最近事件與
     * 結束控制」。首頁白天的主要行動只有一個——記錄補擦——把結束提醒也
     * 放上來會變成兩個競爭的行動（DESIGN.md 第六節）。使用者仍可經由
     * 「查看完整狀態」到達。
     */
    it("白天不在首頁放結束控制", async () => {
      mockServices({ session, region: { displayName: "臺北市 大安區" } });

      const wrapper = await mountHome();

      expect(wrapper.findComponent(SessionEndControl).exists()).toBe(false);
    });

    it("夜間改成收工版面，主要行動是結束提醒", async () => {
      mockServices({
        session,
        isEvening: true,
        region: { displayName: "臺北市 大安區" }
      });

      const wrapper = await mountHome();

      expect(wrapper.findComponent(HomeNightSession).exists()).toBe(true);
      expect(wrapper.findComponent(SessionEndControl).exists()).toBe(true);
      // 夜間不顯示補擦倒數——UV 是 0，繼續倒數沒有行動價值。
      expect(wrapper.findComponent(HomeCountdown).exists()).toBe(false);
    });
  });

  describe("沒有提醒進行中", () => {
    it("白天有地區時提供開始提醒的主 CTA", async () => {
      mockServices({ region: { displayName: "臺北市 大安區" } });

      const wrapper = await mountHome();

      expect(wrapper.findComponent(HomeUvHeadline).exists()).toBe(true);
      expect(wrapper.find(".button--primary").text()).toBe("開始防曬提醒");
      expect(wrapper.findComponent(HomeNightNotice).exists()).toBe(false);
    });

    /**
     * 夜間刻意沒有主 CTA（2026-08-23 裁決）。UV 是 0，不需要防曬，
     * 沒有倒數可開始；改用說明加逃生出口，見 HomeNightNotice。
     */
    it("夜間不放主 CTA，改用說明與逃生出口", async () => {
      mockServices({
        isEvening: true,
        region: { displayName: "臺北市 大安區" }
      });

      const wrapper = await mountHome();

      expect(wrapper.findComponent(HomeNightNotice).exists()).toBe(true);
      expect(wrapper.find(".button--primary").exists()).toBe(false);
    });

    it("沒有地區時先要求設定地區", async () => {
      mockServices({ region: null });

      const wrapper = await mountHome();

      expect(wrapper.findComponent(HomeLocationPrompt).exists()).toBe(true);
      // 沒有地區就沒有 UV 可看，不該同時出現開始提醒的主 CTA 分散注意。
      expect(wrapper.find(".button--primary").exists()).toBe(false);
    });
  });
});
