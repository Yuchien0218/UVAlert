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

/*
 * 2026-08-30，裁決見 docs/decisions/2026-08-30-pending-decisions.md 第三節。
 *
 * 原本每個 pill 後面掛「・N 個原因」。實測 8 個部位全部只有
 * PRODUCT_IDENTITY_UNKNOWN，畫面上就是同一句話重複八次，而那個數字不告訴
 * 使用者任何事。改成：共有的原因提到群組層級講一次。
 */
describe("ZoneStatusList 共有原因", () => {
  it("每個部位都有同一個原因時，只在群組層級說明一次", () => {
    const wrapper = mount(ZoneStatusList, {
      props: {
        primaryAction: baseAction,
        zones: [
          withReasons(
            makeZone("zone-forehead", "face_forehead", "tracking"),
            ["PRODUCT_IDENTITY_UNKNOWN"]
          ),
          withReasons(makeZone("zone-ears", "ears", "tracking"), [
            "PRODUCT_IDENTITY_UNKNOWN"
          ])
        ]
      }
    });

    expect(wrapper.findAll(".zone-group__notice")).toHaveLength(1);
    expect(wrapper.get(".zone-group__notice").text()).toContain(
      "尚未確認防曬乳標示"
    );
    // 舊的逐部位計數不得復活。
    expect(wrapper.find(".zone-chip__reason").exists()).toBe(false);
    expect(wrapper.text()).not.toContain("個原因");
  });

  it("只有部分部位有那個原因時不顯示群組說明", () => {
    const wrapper = mount(ZoneStatusList, {
      props: {
        primaryAction: baseAction,
        zones: [
          withReasons(
            makeZone("zone-forehead", "face_forehead", "tracking"),
            ["PRODUCT_IDENTITY_UNKNOWN"]
          ),
          makeZone("zone-ears", "ears", "tracking")
        ]
      }
    });

    expect(wrapper.find(".zone-group__notice").exists()).toBe(false);
  });
});

describe("ZoneStatusList 收合", () => {
  it("提醒進行中可以收合，預設收起且符合 disclosure 契約", async () => {
    const wrapper = mount(ZoneStatusList, {
      props: {
        primaryAction: baseAction,
        zones: [
          makeZone("zone-forehead", "face_forehead", "tracking"),
          makeZone("zone-ears", "ears", "tracking")
        ]
      }
    });

    const toggle = wrapper.get(".zone-group__toggle");
    // DESIGN.md 第五節硬性要求：真實 button、aria-expanded、aria-controls，
    // 而且 aria-controls 要指得到實際存在的元素。
    expect(toggle.element.tagName).toBe("BUTTON");
    expect(toggle.attributes("aria-expanded")).toBe("false");
    expect(toggle.attributes("aria-controls")).toBe("zone-group-tracking");
    expect(wrapper.get(".zone-group__chips").attributes("id")).toBe(
      "zone-group-tracking"
    );

    await toggle.trigger("click");
    expect(toggle.attributes("aria-expanded")).toBe("true");
  });

  it("需要行動的狀態不可收合", () => {
    const wrapper = mount(ZoneStatusList, {
      props: {
        primaryAction: baseAction,
        zones: [
          makeZone("zone-forehead", "face_forehead", "reapply_due"),
          makeZone("zone-ears", "ears", "reapply_due")
        ]
      }
    });

    // 把「建議現在補擦」藏進 disclosure，正是展開收合契約要避免的事。
    expect(wrapper.find(".zone-group__toggle").exists()).toBe(false);
    expect(wrapper.findAll(".zone-chip")).toHaveLength(2);
  });

  it("只有一個部位時不做成可收合", () => {
    const wrapper = mount(ZoneStatusList, {
      props: {
        primaryAction: baseAction,
        zones: [makeZone("zone-forehead", "face_forehead", "tracking")]
      }
    });

    expect(wrapper.find(".zone-group__toggle").exists()).toBe(false);
    expect(wrapper.findAll(".zone-chip")).toHaveLength(1);
  });
});

function withReasons(
  zone: ZoneProjection,
  reasonCodes: ZoneProjection["reasonCodes"]
): ZoneProjection {
  return { ...zone, reasonCodes };
}

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
