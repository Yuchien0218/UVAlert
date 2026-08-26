// @vitest-environment happy-dom

import type { PrimaryAction, ZoneProjection } from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ZoneStatusList from "./ZoneStatusList.vue";

const baseZone: ZoneProjection = {
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
  derivedFromEventRefs: ["event-1"]
};

const baseAction: PrimaryAction = {
  presentationType: "timed_ring",
  variant: null,
  actionKind: "report_context_event",
  affectedZoneInstanceIds: ["zone-face"],
  actionAt: "2099-07-29T12:00:00.000Z",
  reasonCodes: [],
  derivedFromEventRefs: ["event-1"]
};

afterEach(() => {
  vi.useRealTimers();
});

describe("ZoneStatusList status boundaries", () => {
  it("相同狀態的部位會歸類在同一個 group", () => {
    const wrapper = mount(ZoneStatusList, {
      props: {
        primaryAction: baseAction,
        zones: [
          makeZone("zone-forehead", "face_forehead", "tracking"),
          makeZone("zone-ears", "ears", "tracking"),
          makeZone("zone-arms", "arms", "tracking")
        ]
      }
    });

    expect(wrapper.findAll(".zone-group")).toHaveLength(1);
    expect(wrapper.findAll(".zone-chip")).toHaveLength(3);
    expect(wrapper.find(".zone-group__status").text()).toBe("提醒進行中");
  });

  it("不同狀態的部位會依狀態分組", () => {
    const wrapper = mount(ZoneStatusList, {
      props: {
        primaryAction: baseAction,
        zones: [
          makeZone("zone-forehead", "face_forehead", "tracking"),
          makeZone("zone-ears", "ears", "tracking"),
          makeZone("zone-arms", "arms", "reapply_due"),
          makeZone("zone-hands", "hand_backs", "reapply_due"),
          makeZone("zone-neck", "neck_front", "reapply_soon")
        ]
      }
    });
    const groups = wrapper.findAll(".zone-group");

    expect(groups).toHaveLength(3);

    expect(groups[0]!.find(".zone-group__status").text()).toBe("提醒進行中");
    expect(groups[0]!.findAll(".zone-chip")).toHaveLength(2);

    expect(groups[1]!.find(".zone-group__status").text()).toBe("建議現在補擦");
    expect(groups[1]!.findAll(".zone-chip")).toHaveLength(2);

    expect(groups[2]!.find(".zone-group__status").text()).toBe("快到補擦時間");
    expect(groups[2]!.findAll(".zone-chip")).toHaveLength(1);
  });

  it("synchronizes only affected zones with the local due state", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-07-29T12:00:00.000Z"));

    const wrapper = mount(ZoneStatusList, {
      props: {
        primaryAction: {
          ...baseAction,
          affectedZoneInstanceIds: ["zone-forehead", "zone-ears"]
        },
        zones: [
          makeZone("zone-forehead", "face_forehead", "tracking"),
          makeZone("zone-ears", "ears", "tracking"),
          makeZone("zone-arms", "arms", "tracking")
        ]
      }
    });

    const groups = wrapper.findAll(".zone-group");
    expect(groups).toHaveLength(2);
    expect(groups[0]!.classes()).toContain("zone-group--due");
    expect(groups[0]!.find(".zone-group__status").text()).toBe("建議現在補擦");
    expect(groups[0]!.findAll(".zone-chip")).toHaveLength(2);
    expect(groups[1]!.classes()).toContain("zone-group--tracking");
    expect(groups[1]!.findAll(".zone-chip")).toHaveLength(1);
  });
});

function makeZone(
  zoneInstanceId: string,
  bodyZoneCode: ZoneProjection["bodyZoneCode"],
  timingStatus: ZoneProjection["timingStatus"]
): ZoneProjection {
  return {
    ...baseZone,
    zoneInstanceId,
    bodyZoneCode,
    timingStatus
  };
}
