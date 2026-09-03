// @vitest-environment happy-dom

import type {
  FiveDayUvForecast,
  SessionProjection,
  ZoneProjection
} from "@sunshield/contracts";
import { flushPromises, shallowMount } from "@vue/test-utils";
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
      phase: shallowReadonly(
        shallowRef(region === null ? "no_region" : "ready")
      ),
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
    routes: [
      { path: "/", component: HomePage },
      /*
       * 記錄狀況只是個落點，不掛真元件——這裡要驗的是「首頁把人帶去哪、
       * 帶了什麼 query」，不是那一頁長什麼樣。沒有這條路由的話 router.push
       * 會丟 "No match"，而那個錯誤跟本次斷言無關。
       */
      {
        path: "/reminder/report",
        name: "reminder-report",
        component: { template: "<div />" }
      }
    ]
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

    /*
     * 2026-08-30：結束鈕與倒數併成同一列，把首屏頂端讓出來。
     *
     * 實測（390×844）改前後：倒數區塊 y=160 → 100、主行動 y=315 → 258、
     * 部位狀態 y=489 → 422，「最近事件」從被底部導覽切掉變成完整可見。
     *
     * 這條守的是**兩者必須在同一個容器裡**。拆回兩列的話 CSS 不會報錯、
     * 測試也不會紅，就只是默默地把 60px 還回去。
     */
    /*
     * **階段二（2026-09-03）：首頁不再有「剛才有流汗嗎？」提問卡。**
     *
     * `2026-09-02-event-means-reapply.md` 的原則是「遇到了事件＝需要補擦」，
     * 所以記錄狀況從一個與補擦並列的目的地，降成補擦流程裡的出口
     * （`ReapplyReasonPicker` 的「現在還不能補擦，先記錄狀況」）。
     *
     * 這條守的是提問卡真的不在了——留著它等於同一件事有兩個入口，
     * 而且其中一個把使用者導離主線。
     */
    it("倒數進行中時首頁沒有記錄狀況的提問卡", async () => {
      // 共用的 session fixture 其實已經到期（zoneDueAt 是 2026-08-01），
      // 這裡要的是「還在倒數」，所以把 actionAt 推到未來。
      mockServices({
        session: {
          ...session,
          primaryAction: {
            ...session.primaryAction,
            actionKind: "record_reapplication",
            actionAt: "2099-01-01T00:00:00.000Z"
          }
        },
        region: { displayName: "臺北市 大安區" }
      });

      const wrapper = await mountHome();

      expect(wrapper.find(".home__prompt").exists()).toBe(false);
      expect(wrapper.text()).not.toContain("剛才有流汗");
      // 主 CTA 補上來，畫面不會變成沒有東西可按。
      expect(wrapper.get(".home__cta").text()).toContain("記錄補擦");
    });

    /*
     * 反向：到了補擦時間時它就是當下最主要的任務，降級反而有害。
     * 這是為什麼不能一刀切、必須看 tone。
     */
    it("到了補擦時間仍是主 CTA，不降級成提示卡", async () => {
      mockServices({
        session: {
          ...session,
          primaryAction: {
            ...session.primaryAction,
            actionKind: "record_reapplication",
            presentationType: "due_card",
            actionAt: "2020-01-01T00:00:00.000Z"
          }
        },
        region: { displayName: "臺北市 大安區" }
      });

      const wrapper = await mountHome();

      expect(wrapper.find(".home__prompt").exists()).toBe(false);
      expect(wrapper.find(".home__cta").exists()).toBe(true);
      expect(wrapper.get(".home__cta").classes()).toContain("button--primary");
    });

    /*
     * 上面兩條各自只守住一個條件——它們的 actionKind 與 tone 剛好同時
     * 變動，所以拿掉任一個條件都還是綠的（2026-08-30 實測確認過）。
     * 下面兩條把兩個變因拆開，才真的守得住。
     */

    /*
     * **反向：記錄狀況沒有被刪掉，只是不再有自己的入口。**
     *
     * 它在**真的是主行動時**仍然是主 CTA——例如遮蔽狀態下補擦不適用，
     * 記錄狀況就是唯一能做的事。這條擋的是「降級做過頭，變成拿掉」。
     */
    it("記錄狀況真的是主行動時仍然是主 CTA", async () => {
      mockServices({
        session: {
          ...session,
          primaryAction: {
            ...session.primaryAction,
            actionKind: "report_context_event",
            actionAt: "2099-01-01T00:00:00.000Z"
          }
        },
        region: { displayName: "臺北市 大安區" }
      });

      const wrapper = await mountHome();

      expect(wrapper.get(".home__cta").text()).toContain("記錄狀況");
    });

    /*
     * **不變式：畫面上永遠恰好有一個可按的行動。**
     *
     * 第一版的 showPrimaryCta 寫成「actionKind 是 report_context_event 就
     * 隱藏」，在「到期又是記錄狀況」時會讓提問卡與 CTA 同時消失。既有的
     * 「記錄狀況到期時回到主 CTA」接住了那次，這條把不變式本身講明白。
     */
    it("任何狀態下都至少有一個可按的行動", async () => {
      for (const [actionKind, actionAt] of [
        ["record_reapplication", "2099-01-01T00:00:00.000Z"],
        ["record_reapplication", "2020-01-01T00:00:00.000Z"],
        ["report_context_event", "2099-01-01T00:00:00.000Z"],
        ["report_context_event", "2020-01-01T00:00:00.000Z"],
        ["complete_protection_record", "2099-01-01T00:00:00.000Z"]
      ] as const) {
        mockServices({
          session: {
            ...session,
            primaryAction: { ...session.primaryAction, actionKind, actionAt }
          },
          region: { displayName: "臺北市 大安區" }
        });

        const wrapper = await mountHome();
        const hasPrompt = wrapper.find(".home__prompt").exists();
        const hasCta = wrapper.find(".home__cta").exists();

        expect(
          hasPrompt || hasCta,
          `${actionKind} / ${actionAt} 沒有任何可按的行動`
        ).toBe(true);
      }
    });

    // 守 tone：同樣是「記錄狀況」，到期時就不該再降級。
    it("記錄狀況到期時回到主 CTA", async () => {
      mockServices({
        session: {
          ...session,
          primaryAction: {
            ...session.primaryAction,
            actionKind: "report_context_event",
            actionAt: "2020-01-01T00:00:00.000Z"
          }
        },
        region: { displayName: "臺北市 大安區" }
      });

      const wrapper = await mountHome();

      expect(wrapper.find(".home__prompt").exists()).toBe(false);
      expect(wrapper.find(".home__cta").exists()).toBe(true);
    });

    // 守 actionKind：同樣未到期，但這是真的要使用者去做的事，
    // 配上「剛才有流汗嗎？」會變成明明要求動作卻寫得像可有可無。
    it("未到期的其他動作不套用提問式提示卡", async () => {
      mockServices({
        session: {
          ...session,
          primaryAction: {
            ...session.primaryAction,
            actionKind: "confirm_protection_method",
            actionAt: "2099-01-01T00:00:00.000Z"
          }
        },
        region: { displayName: "臺北市 大安區" }
      });

      const wrapper = await mountHome();

      expect(wrapper.find(".home__prompt").exists()).toBe(false);
      expect(wrapper.find(".home__cta").exists()).toBe(true);
    });

    /*
     * **時鐘不可信又離線時，說明必須在原地給。**（2026-09-03）
     *
     * 改動前這顆 CTA 會跳到 `/help/how-it-works`，而那頁的主題仍是
     * `MULTI_REVIEW`，畫面上只有「內容正在審查」——在最需要說明的狀態下
     * 把人送去一頁空白。
     *
     * 兩件事分開守，避免互相掩護：這條守「說明出現」，下一條守「沒有換頁」。
     */
    it("查詢間隔為何變短時就地展開說明", async () => {
      mockServices({
        session: {
          ...session,
          primaryAction: {
            ...session.primaryAction,
            presentationType: "untimed_action_card",
            actionKind: "view_conservative_reminder",
            actionAt: null,
            reasonCodes: ["CLOCK_UNTRUSTED"]
          }
        },
        region: { displayName: "臺北市 大安區" }
      });

      const wrapper = await mountHome();
      expect(wrapper.find(".shortened-interval").exists()).toBe(false);

      await wrapper.find(".home__cta").trigger("click");

      expect(wrapper.find(".shortened-interval").exists()).toBe(true);
    });

    it("查詢間隔為何變短時不離開首頁", async () => {
      mockServices({
        session: {
          ...session,
          primaryAction: {
            ...session.primaryAction,
            presentationType: "untimed_action_card",
            actionKind: "view_conservative_reminder",
            actionAt: null,
            reasonCodes: ["CLOCK_UNTRUSTED"]
          }
        },
        region: { displayName: "臺北市 大安區" }
      });

      const wrapper = await mountHome();
      await wrapper.find(".home__cta").trigger("click");
      await wrapper.vm.$nextTick();

      expect(wrapper.vm.$route.path).toBe("/");
    });

    /*
     * **階段三（2026-09-03）：水上活動的入口在首頁，不在記錄狀況的選單裡。**
     *
     * 那張清單原本混著兩種東西：四種損耗把期限拉到事件發生的那一刻，
     * 下水／離水則是開關一段水中區間、改由耐水標示決定期限。階段二把記錄
     * 狀況降成補擦流程的出口之後更明顯——想記一筆下水得先走「記錄補擦 →
     * 現在還不能補擦 → 從清單挑下水」，而下水根本不是補擦流程的一部分。
     *
     * 三條分開守：入口在、文字跟著狀態走、按下去帶對 kind。
     */
    it("首頁有水上活動的入口", async () => {
      mockServices({ session, region: { displayName: "臺北市 大安區" } });

      const wrapper = await mountHome();

      expect(wrapper.find(".home__water").exists()).toBe(true);
    });

    /*
     * **首頁刻意不判斷「現在在不在水裡」。**
     *
     * 第一版讓按鈕跟著投影算出的 inWater 換文字（開始水上活動／已離水），
     * 實機一測就壞了：預設路徑（沒填包裝標示）的 eligibility 是
     * `identity_unconfirmed`，reducer 的水上區間分支要求 `eligible`，所以
     * **投影裡完全沒有這段區間的痕跡**。按鈕會一直寫「開始水上活動」，
     * 帶著 `water_start` 進去又因為已有區間而找不到選項——離水永遠按不到。
     *
     * 現在只送出「要處理水上活動」，由記錄狀況那一頁（拿得到
     * `openWaterInterval`）決定給下水還是離水。
     */
    it("入口文字不跟著狀態變", async () => {
      mockServices({
        session: {
          ...session,
          zones: [{ ...zone, reasonCodes: ["WATER_RESISTANCE_UNKNOWN"] }]
        },
        region: { displayName: "臺北市 大安區" }
      });

      const wrapper = await mountHome();

      expect(wrapper.get(".home__water").text()).toContain("水上活動");
      expect(wrapper.get(".home__water").text()).not.toContain("已離水");
    });

    it("按下去帶著 kind 進記錄狀況", async () => {
      mockServices({ session, region: { displayName: "臺北市 大安區" } });

      const wrapper = await mountHome();
      await wrapper.get(".home__water").trigger("click");
      // router.push 是非同步的；只等一個 tick 會拿到還沒換過的 route。
      await flushPromises();

      expect(wrapper.vm.$route.query.kind).toBe("water");
    });

    it("結束鈕與倒數在同一列，不各佔一列", async () => {
      mockServices({ session, region: { displayName: "臺北市 大安區" } });

      const wrapper = await mountHome();

      const head = wrapper.find(".home__session-head");
      expect(head.exists()).toBe(true);
      expect(head.findComponent(HomeCountdown).exists()).toBe(true);
      expect(head.findComponent(SessionEndControl).exists()).toBe(true);
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

    /**
     * 2026-08-31 反轉。這條原本斷言「沒有地區時**不該**出現主 CTA」，理由
     * 寫「不該分散注意」——但那跟另外兩份規格相反：
     *
     * - Sitemap §一：定位或網路不足時「仍不得阻擋本機倒數與手動操作」
     * - `HomeLocationPrompt` 自己的 docblock：「刻意不阻擋任何其他操作」
     *
     * 實際後果是沒設定地區的人根本看不到「開始防曬提醒」，地區變成開始
     * 倒數的前置條件。地區只影響看不看得到 UV，不影響倒數長度。使用者
     * 2026-08-31 裁決放行。
     */
    it("沒有地區時仍然可以開始提醒，提示卡與主 CTA 同時出現", async () => {
      mockServices({ region: null });

      const wrapper = await mountHome();

      expect(wrapper.findComponent(HomeLocationPrompt).exists()).toBe(true);
      expect(wrapper.find(".button--primary").text()).toBe("開始防曬提醒");
    });

    /**
     * 夜間那一支**仍然**替換主 CTA，即使同時沒有地區——把兩件事分開守，
     * 否則「地區不擋」很容易連帶把夜間的裁決也一起拆掉。
     */
    it("沒有地區又是夜間時，維持夜間的說明與逃生出口", async () => {
      mockServices({ region: null, isEvening: true });

      const wrapper = await mountHome();

      expect(wrapper.findComponent(HomeLocationPrompt).exists()).toBe(true);
      expect(wrapper.findComponent(HomeNightNotice).exists()).toBe(true);
      expect(wrapper.find(".button--primary").exists()).toBe(false);
    });
  });
});
