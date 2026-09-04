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
  it("提供提醒、裝備與更多三個主要入口", async () => {
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

    expect(links.map((link) => [link.text(), link.attributes("href")])).toEqual(
      [
        ["提醒", "/"],
        ["裝備", "/products"],
        ["更多", "/more"]
      ]
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

    expect(wrapper.find('[data-testid="bottom-nav-badge"]').exists()).toBe(
      false
    );
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

    // 紅點是 aria-hidden 的純視覺標記，狀態必須另外進到可及名稱，
    // 否則顏色與形狀就是唯一載體。
    expect(badge.attributes("aria-hidden")).toBe("true");
    expect(wrapper.get('a[href="/"]').attributes("aria-label")).toBe(
      "提醒（有部位建議現在補擦）"
    );
  });
});

/*
 * 選取態的外觀守門（2026-09-04）。
 *
 * 這個裁決已經翻過兩次——2026-08-23 從「換色」改成「藥丸＋粗體、不換色」，
 * 2026-09-04 又改成「藥丸＋標籤換色、不用字重」。翻兩次的東西最容易被下一
 * 個人「順手改回去」，所以把現行結論釘住。
 *
 * 掃原始碼前先剝註解——否則上面那段解釋文字裡的 `font-weight` 會讓測試
 * 自己判自己違規（CLAUDE.md 坑一）。
 */
describe("下排導覽的選取態", () => {
  const source = readFileSync(
    "apps/web/src/components/shell/BottomNavigation.vue",
    "utf8"
  )
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("不用字重承載選取狀態", () => {
    expect(source).not.toMatch(/font-weight/);
  });

  /*
   * **比對完整宣告而不是找 token 名字**（CLAUDE.md 坑二）：只找
   * `--text-primary` 的話，同檔案別處合法地用到它就會誤判成通過。
   */
  it("標籤兩態走明暗階，不借用行動色", () => {
    expect(source).toContain("color: var(--text-secondary);");
    expect(source).toContain("color: var(--text-primary);");
    expect(source).not.toContain("var(--color-primary)");
  });

  /*
   * 藥丸必須畫在 ::before 上：scaleX 直接加在 wrapper 會連圖示一起縮。
   * 而圖示必須是已定位元素，否則藥丸的背景會蓋掉它——實測過，那個 bug
   * 任何數值斷言都抓不到（svg 仍是 24×24、visible、opacity 1），只有截圖
   * 看得出來。所以這裡守的是「當初怎麼修好的」。
   */
  it("藥丸在 ::before 上，且圖示疊在藥丸之上", () => {
    expect(source).toMatch(
      /\.bottom-nav__icon-wrapper::before\s*\{[^}]*transform:\s*scaleX\(/
    );
    expect(source).toMatch(
      /\.bottom-nav__icon-wrapper\s*>\s*\*\s*\{[^}]*position:\s*relative;/
    );
  });
});
