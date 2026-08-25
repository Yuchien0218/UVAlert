// @vitest-environment happy-dom

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
    expect(wrapper.get("input[type=checkbox]").attributes("disabled")).toBeDefined();
    expect(wrapper.get("label").classes()).toContain("zone-chip--locked");
  });
});
