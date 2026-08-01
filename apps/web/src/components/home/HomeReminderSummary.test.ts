// @vitest-environment happy-dom

import type {
  SessionProjection,
  ZoneProjection
} from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import HomeReminderSummary from "./HomeReminderSummary.vue";

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
  timingStatus: "tracking",
  activeLabelReadyAt: null,
  generalDueAt: "2026-07-29T12:00:00.000Z",
  activeWaterDeadline: null,
  eventTriggeredDeadline: null,
  zoneDueAt: "2026-07-29T12:00:00.000Z",
  zoneTimerStartedAt: "2026-07-29T10:00:00.000Z",
  zoneNextActionAt: "2026-07-29T12:00:00.000Z",
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
  sessionNextDueAt: "2026-07-29T12:00:00.000Z",
  zones: [
    baseZone,
    {
      ...baseZone,
      zoneInstanceId: "zone-ears",
      bodyZoneCode: "ears"
    }
  ],
  primaryAction: {
    presentationType: "timed_ring",
    variant: null,
    actionKind: "report_context_event",
    affectedZoneInstanceIds: ["zone-forehead", "zone-ears"],
    actionAt: "2026-07-29T12:00:00.000Z",
    reasonCodes: [],
    derivedFromEventRefs: ["application-1"]
  },
  derivedFromEventRefs: ["application-1"]
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-07-29T10:30:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("HomeReminderSummary", () => {
  it("全部位時間一致時顯示全面補擦提醒", async () => {
    const wrapper = mount(HomeReminderSummary, {
      props: {
        session,
        connectivity: "online"
      }
    });

    expect(
      wrapper.get('[data-testid="home-reminder-summary"]').attributes(
        "data-presentation"
      )
    ).toBe("countdown");
    expect(
      wrapper.get('[data-testid="home-reminder-summary"]').attributes(
        "data-reminder-scope"
      )
    ).toBe("all");
    expect(wrapper.get(".home-summary__title").text()).toBe(
      "建議進行全面補擦"
    );
    expect(wrapper.get(".stat-figure").text()).toBe("90");
    expect(
      wrapper.get(".home-summary__time-group .home-summary__time .stat-figure").text()
    ).toMatch(/^\d{2}:\d{2}$/);
    expect(
      wrapper.get(".home-summary__time-group .home-summary__time").text()
    ).toContain("預計");
    expect(
      wrapper.find(".home-summary__message .home-summary__time").exists()
    ).toBe(false);
    expect(
      wrapper.get(".home-summary__message .home-summary__body").text()
    ).not.toHaveLength(0);
    expect(wrapper.text()).toContain("預計");
    expect(wrapper.text()).not.toContain("2 個部位");
    expect(wrapper.text()).not.toContain("查看目前提醒");
    expect(wrapper.get('[role="progressbar"]').attributes("aria-valuenow"))
      .toBe("75");

    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("action")).toEqual([
      ["report_context_event"]
    ]);
  });

  it("部位時間不同時顯示最快到期的優先部位", () => {
    const prioritySession: SessionProjection = {
      ...session,
      zones: [
        {
          ...baseZone,
          zoneInstanceId: "zone-nose-cheeks",
          bodyZoneCode: "face_nose_cheeks"
        },
        {
          ...baseZone,
          zoneInstanceId: "zone-ears",
          bodyZoneCode: "ears",
          generalDueAt: "2026-07-29T12:30:00.000Z",
          zoneDueAt: "2026-07-29T12:30:00.000Z",
          zoneNextActionAt: "2026-07-29T12:30:00.000Z"
        }
      ],
      primaryAction: {
        ...session.primaryAction,
        affectedZoneInstanceIds: ["zone-nose-cheeks"],
        actionAt: "2026-07-29T12:00:00.000Z"
      }
    };
    const wrapper = mount(HomeReminderSummary, {
      props: {
        session: prioritySession,
        connectivity: "online"
      }
    });

    expect(
      wrapper.get('[data-testid="home-reminder-summary"]').attributes(
        "data-reminder-scope"
      )
    ).toBe("priority");
    expect(wrapper.text()).toContain(
      "建議優先補擦：鼻部與雙頰"
    );
    expect(wrapper.text()).toContain("預計");
  });
});
