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
    },
    // 2026-08-24：/reminder 併入首頁後，首頁也要讀事件流與產品 snapshot
    // （最近紀錄清單與「展開包裝標示」原地行為）。
    sessionEvents: {
      stream: shallowReadonly(shallowRef([])),
      ensureLoaded: vi.fn(async () => undefined),
      refresh: vi.fn(async () => undefined),
      dispose: vi.fn()
    },
    productSettings: {
      snapshot: shallowReadonly(shallowRef(null)),
      ensureLoaded: vi.fn(async () => undefined),
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
    /**
     * 2026-08-24 反轉：原本斷言首頁**不內嵌**部位清單、只放「查看完整狀態」
     * 入口（2026-08-08 裁決）。使用者裁決把 `/reminder` 併入首頁——那頁沒有
     * 任何導覽歸屬，三個下排 tab 都不對應它，是懸空的頁面。現在首頁是
     * 「摘要在上、完整狀態在下」的單頁，首屏仍維持倒數＋主 CTA 不捲動就
     * 看得完，部位與最近紀錄在下方。
     */
    it("白天顯示倒數，並在下方內嵌部位清單與最近紀錄", async () => {
      mockServices({ session, region: { displayName: "臺北市 大安區" } });

      const wrapper = await mountHome();

      expect(wrapper.findComponent(HomeCountdown).exists()).toBe(true);
      expect(wrapper.findComponent(ZoneStatusList).exists()).toBe(true);
      // /reminder 已移除，不該再有指向它的連結。
      expect(wrapper.find('[to="/reminder"]').exists()).toBe(false);
    });

    /**
     * 夜間版面的反覆：2026-08-23 裁決夜間走「收工版面」（不顯示倒數與進度
     * 條，主要行動是結束提醒）；2026-08-24 一度推翻改為日夜共用（commit
     * 47f44c6）；2026-08-26 使用者確認**改回收工版面**，理由是「不讓倒數
     * 跨夜」。見 docs/decisions/2026-08-26-night-session-layout-revert.md。
     */
    it("夜間走收工版面：不顯示倒數，改由 HomeNightSession 顯示已進行多久", async () => {
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
      // 部位清單不放進夜間分支，維持「收工版面」的設計。
      expect(wrapper.findComponent(ZoneStatusList).exists()).toBe(false);
    });

    it("白天不走收工版面", async () => {
      mockServices({ session, region: { displayName: "臺北市 大安區" } });

      const wrapper = await mountHome();

      expect(wrapper.findComponent(HomeNightSession).exists()).toBe(false);
      expect(wrapper.findComponent(HomeCountdown).exists()).toBe(true);
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
