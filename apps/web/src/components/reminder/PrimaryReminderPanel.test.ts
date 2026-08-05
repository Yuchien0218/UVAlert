// @vitest-environment happy-dom

import type {
  PrimaryAction,
  ZoneProjection
} from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import PrimaryReminderPanel from "./PrimaryReminderPanel.vue";

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

describe("PrimaryReminderPanel", () => {
  it("renders timed projection and emits its typed action", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-07-29T11:00:00.000Z"));
    const wrapper = mount(PrimaryReminderPanel, {
      props: {
        primaryAction: baseAction,
        zones: [baseZone],
        connectivity: "online"
      }
    });

    expect(
      wrapper.get('[data-testid="primary-reminder"]').attributes(
        "data-presentation"
      )
    ).toBe("timed");
    const panel = wrapper.get('[data-testid="primary-reminder"]');
    expect(panel.classes()).toContain("reminder-panel--tracking");
    expect(panel.classes()).not.toContain("app-card");
    expect(panel.classes()).not.toContain("due-panel");
    expect(wrapper.get(".reminder-panel__eyebrow").text()).toBe(
      "補擦倒數"
    );
    expect(wrapper.find(".reminder-panel__dot").exists()).toBe(false);
    expect(wrapper.find(".countdown-sun").exists()).toBe(true);
    expect(wrapper.get(".countdown-time__value strong").text()).toBe(
      "60"
    );
    expect(
      wrapper.get(".countdown-time__value strong").classes()
    ).toContain("stat-figure");
    expect(
      wrapper
        .findAll(".countdown-sun__ray")
        .filter((ray) => ray.attributes("data-visible") === "true")
    ).toHaveLength(4);
    expect(
      wrapper.get(".countdown-time__estimate .stat-figure").text()
    ).toMatch(/^\d{2}:\d{2}$/);
    expect(wrapper.find(".reminder-panel__time").exists()).toBe(false);
    expect(
      wrapper.get(".countdown-time__copy").element.children
    ).toHaveLength(2);
    expect(
      wrapper.find(".reminder-panel__message .reminder-panel__time").exists()
    ).toBe(false);
    expect(wrapper.get(".reminder-panel__title").text()).toBe(
      "接下來需要檢查"
    );
    expect(wrapper.findAll("button")).toHaveLength(1);
    expect(wrapper.find('a[href="#zone-status"]').exists()).toBe(false);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(wrapper.get(".countdown-time__value strong").text()).toBe(
      "59"
    );
    expect(wrapper.find(".reminder-panel__action svg").exists()).toBe(true);

    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("action")).toEqual([
      ["report_context_event"]
    ]);
  });

  it("clarifies the clock time and simplifies multi-zone copy", () => {
    const secondZone: ZoneProjection = {
      ...baseZone,
      zoneInstanceId: "zone-ears",
      bodyZoneCode: "ears"
    };
    const wrapper = mount(PrimaryReminderPanel, {
      props: {
        primaryAction: {
          ...baseAction,
          affectedZoneInstanceIds: ["zone-face", "zone-ears"]
        },
        zones: [baseZone, secondZone],
        connectivity: "online"
      }
    });

    expect(wrapper.get(".countdown-time__estimate").text()).toContain(
      "預計"
    );
    expect(wrapper.get(".reminder-panel__title").text()).not.toContain(
      "2 個部位"
    );
    expect(wrapper.get(".reminder-panel__title").text()).toBe(
      "接下來需要檢查"
    );
    expect(wrapper.get(".reminder-panel__body").text()).not.toContain(
      "預計時間"
    );
  });

  it("renders due when the local clock reaches actionAt before projection refresh", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2099-07-29T12:00:00.000Z"));

    const wrapper = mount(PrimaryReminderPanel, {
      props: {
        primaryAction: baseAction,
        zones: [baseZone],
        connectivity: "online"
      }
    });

    const panel = wrapper.get('[data-testid="primary-reminder"]');
    expect(panel.attributes("data-presentation")).toBe("due");
    expect(panel.classes()).toContain("reminder-panel--due");
    expect(wrapper.get(".countdown-time__value strong").text()).toBe("0");
    expect(wrapper.find(".countdown-sun").exists()).toBe(true);
    expect(
      wrapper
        .findAll(".countdown-sun__ray")
        .filter((ray) => ray.attributes("data-visible") === "true")
    ).toHaveLength(0);
    expect(wrapper.find(".reminder-panel__action svg").exists()).toBe(true);

    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("action")).toEqual([
      ["report_context_event"]
    ]);
  });

  it("renders soon and due from the committed presentation fields", () => {
    const soon = mount(PrimaryReminderPanel, {
      props: {
        primaryAction: baseAction,
        zones: [{ ...baseZone, timingStatus: "reapply_soon" }],
        connectivity: "online"
      }
    });
    const due = mount(PrimaryReminderPanel, {
      props: {
        primaryAction: {
          ...baseAction,
          presentationType: "due_card",
          actionKind: "record_reapplication",
          reasonCodes: ["GENERAL_INTERVAL_REACHED"]
        },
        zones: [
          {
            ...baseZone,
            timingStatus: "reapply_due",
            reasonCodes: ["GENERAL_INTERVAL_REACHED"]
          }
        ],
        connectivity: "online"
      }
    });

    expect(
      soon.get('[data-testid="primary-reminder"]').attributes(
        "data-presentation"
      )
    ).toBe("soon");
    expect(
      soon.get('[data-testid="primary-reminder"]').classes()
    ).toContain("reminder-panel--soon");
    expect(soon.get(".reminder-panel__eyebrow").text()).toBe(
      "補擦倒數"
    );
    expect(
      due.get('[data-testid="primary-reminder"]').attributes(
        "data-presentation"
      )
    ).toBe("due");
    expect(
      due.get('[data-testid="primary-reminder"]').classes()
    ).toContain("reminder-panel--due");
    expect(due.findAll("button")).toHaveLength(1);
    expect(due.find('a[href="#zone-status"]').exists()).toBe(false);
    expect(due.text()).toContain("建議現在補擦");
    expect(due.get(".countdown-time__value strong").classes()).toContain(
      "stat-figure"
    );
    expect(due.get(".countdown-time__estimate").text()).toBe(
      "現在"
    );
    expect(due.find(".reminder-panel__time").exists()).toBe(false);
    expect(due.find(".reminder-panel__message .reminder-panel__time").exists()).toBe(
      false
    );
  });

  it("renders untimed reason copy without inventing a countdown", () => {
    const wrapper = mount(PrimaryReminderPanel, {
      props: {
        primaryAction: {
          ...baseAction,
          presentationType: "untimed_action_card",
          actionKind: "complete_protection_record",
          actionAt: null,
          reasonCodes: ["METHOD_UNRECORDED"]
        },
        zones: [
          {
            ...baseZone,
            timingStatus: "untimed_action",
            reasonCodes: ["METHOD_UNRECORDED"]
          }
        ],
        connectivity: "online"
      }
    });

    expect(
      wrapper.get('[data-testid="primary-reminder"]').attributes(
        "data-presentation"
      )
    ).toBe("untimed");
    expect(wrapper.text()).toContain("尚未記錄防護方式");
    expect(wrapper.text()).toContain("未計時");
    expect(wrapper.findAll("button")).toHaveLength(1);
    expect(wrapper.find('a[href="#zone-status"]').exists()).toBe(false);
  });
});
