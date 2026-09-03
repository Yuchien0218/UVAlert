// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import type { ZoneProjection } from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ZoneSelectorGrid from "./ZoneSelectorGrid.vue";

function makeZone(overrides: Partial<ZoneProjection> = {}): ZoneProjection {
  return {
    sessionId: "session-1",
    zoneInstanceId: "zone-face",
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
    generalDueAt: "2099-07-29T12:00:00.000Z",
    activeWaterDeadline: null,
    eventTriggeredDeadline: null,
    zoneDueAt: "2099-07-29T12:00:00.000Z",
    zoneTimerStartedAt: "2099-07-29T10:00:00.000Z",
    zoneNextActionAt: "2099-07-29T12:00:00.000Z",
    activeCauseRefs: [],
    activeRuleIds: ["GENERAL_INTERVAL"],
    reasonCodes: [],
    derivedFromEventRefs: ["event-1"],
    ...overrides
  };
}

describe("ZoneSelectorGrid", () => {
  it("每個部位一個勾選項，已選取的會勾上", () => {
    const zones = [
      makeZone({ zoneInstanceId: "zone-face" }),
      makeZone({ zoneInstanceId: "zone-neck", bodyZoneCode: "neck_front" })
    ];
    const wrapper = mount(ZoneSelectorGrid, {
      props: { zones, selectedZoneIds: ["zone-neck"] }
    });
    const checkboxes = wrapper.findAll("input[type=checkbox]");
    expect(checkboxes).toHaveLength(2);
    expect((checkboxes[0]!.element as HTMLInputElement).checked).toBe(false);
    expect((checkboxes[1]!.element as HTMLInputElement).checked).toBe(true);
  });

  it("點擊勾選會 emit toggle 帶上 zoneInstanceId", async () => {
    const wrapper = mount(ZoneSelectorGrid, {
      props: { zones: [makeZone()], selectedZoneIds: [] }
    });
    await wrapper.get("input[type=checkbox]").trigger("change");
    expect(wrapper.emitted("toggle")).toEqual([["zone-face"]]);
  });

  it("locked 時 checkbox 停用並套用 zone-chip--locked", () => {
    const wrapper = mount(ZoneSelectorGrid, {
      props: { zones: [makeZone()], selectedZoneIds: [], locked: true }
    });
    expect(
      wrapper.get("input[type=checkbox]").attributes("disabled")
    ).toBeDefined();
    expect(wrapper.get("label").classes()).toContain("zone-chip--locked");
  });
});

/**
 * 2026-09-03（使用者：「前面不要有勾勾符號」）。
 *
 * 原生的方塊藏起來，選取狀態改由藥丸本身呈現。**藏起來不是刪掉**——控制項
 * 還在 DOM 裡，上面三條測試（勾選狀態、change 事件、locked）守的就是這件事。
 */
describe("藥丸不再顯示原生的核取方塊", () => {
  const strip = (source: string): string =>
    source
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

  const SOURCE = strip(
    readFileSync("apps/web/src/components/reminder/ZoneSelectorGrid.vue", "utf8")
  );

  /* 比對完整屬性，不是 class 名的片段——`screen-reader-only-x` 也含得下。 */
  it("控制項用共用的 screen-reader-only 藏起來", () => {
    expect(SOURCE).toContain('class="screen-reader-only"');
  });

  /*
   * **反向一：選取狀態要有別的出口。** 只藏掉方塊的話，勾了哪幾顆完全看
   * 不出來。
   */
  it("選取狀態改由藥丸本身呈現", () => {
    expect(SOURCE).toMatch(
      /\.zone-chip:has\(input:checked\) \{[^}]*background: var\(--color-hairline\);/
    );
  });

  /*
   * **反向二：焦點框要自己接回來。** 焦點原本畫在那個方塊上；方塊不見了，
   * 鍵盤使用者就看不出停在哪一顆（WCAG SC 2.4.7）。
   */
  it("焦點框畫在藥丸上", () => {
    expect(SOURCE).toMatch(
      /\.zone-chip:has\(input:focus-visible\) \{[^}]*outline: 0\.15rem solid var\(--focus-ring\);/
    );
  });
});
