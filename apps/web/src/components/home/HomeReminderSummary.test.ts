// @vitest-environment happy-dom

import type {
  SessionProjection,
  ZoneProjection
} from "@sunshield/contracts";
import { mount, RouterLinkStub } from "@vue/test-utils";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from "vitest";
import HomeReminderSummary from "./HomeReminderSummary.vue";
import ReminderEmptyState from "../reminder/ReminderEmptyState.vue";

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
  it("renders the shared empty reminder card when no session exists", () => {
    const wrapper = mount(HomeReminderSummary, {
      props: {
        session: null,
        connectivity: "online"
      },
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        }
      }
    });

    expect(wrapper.findComponent(ReminderEmptyState).exists()).toBe(true);
    expect(wrapper.get('[data-testid="reminder-empty"]').text()).toContain(
      "尚未建立提醒"
    );
    expect(wrapper.get(".empty-state__action").text()).toContain(
      "新增提醒"
    );
  });

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
      wrapper.get(".countdown-time__estimate .stat-figure").text()
    ).toMatch(/^\d{2}:\d{2}$/);
    expect(
      wrapper.get(".countdown-time__estimate").text()
    ).toContain("預計");
    expect(wrapper.find(".home-summary__time").exists()).toBe(false);
    expect(
      wrapper.get(".countdown-time__copy").element.children
    ).toHaveLength(2);
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
    const rays = wrapper.findAll(".countdown-sun__ray");
    expect(rays).toHaveLength(8);
    expect(
      rays.filter((ray) => ray.attributes("data-visible") === "true")
    ).toHaveLength(6);
    expect(wrapper.find(".countdown-sun .stat-figure").exists()).toBe(
      false
    );
    expect(wrapper.get(".countdown-time__value strong").text()).toBe(
      "90"
    );
    expect(wrapper.find(".countdown-clock__ring").exists()).toBe(false);
    expect(wrapper.find(".home-summary__action svg").exists()).toBe(true);

    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("action")).toEqual([
      ["report_context_event"]
    ]);
  });

  it("無可信期限時使用 untimed 色調，不沿用 tracking", () => {
    const untimedSession: SessionProjection = {
      ...session,
      zones: [
        {
          ...baseZone,
          timingStatus: "untimed_action",
          zoneDueAt: null,
          zoneNextActionAt: null
        }
      ],
      primaryAction: {
        ...session.primaryAction,
        presentationType: "untimed_action_card",
        actionAt: null,
        affectedZoneInstanceIds: ["zone-forehead"]
      }
    };
    const wrapper = mount(HomeReminderSummary, {
      props: {
        session: untimedSession,
        connectivity: "online"
      }
    });
    const card = wrapper.get('[data-testid="home-reminder-summary"]');

    expect(card.attributes("data-presentation")).toBe("untimed");
    expect(card.classes()).toContain("home-summary--untimed");
    expect(card.classes()).not.toContain("home-summary--tracking");
    // 圓形打勾標記代表「已完成／安全」，不該出現在需要處理的狀態上
    expect(wrapper.find(".home-summary__mark").exists()).toBe(false);
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

  it.each([
    {
      name: "soon",
      timingStatus: "reapply_soon" as const,
      startedAt: "2026-07-29T10:00:00.000Z",
      dueAt: "2026-07-29T11:00:00.000Z",
      expectedTone: "soon",
      expectedVisibleRays: 4
    },
    {
      name: "due",
      timingStatus: "reapply_due" as const,
      startedAt: "2026-07-29T09:10:00.000Z",
      dueAt: "2026-07-29T10:40:00.000Z",
      expectedTone: "due",
      expectedVisibleRays: 1
    }
  ])(
    "$name 狀態同步切換底色、色調與可見光芒數量",
    ({ timingStatus, startedAt, dueAt, expectedTone, expectedVisibleRays }) => {
      const stateSession: SessionProjection = {
        ...session,
        overallStatus:
          timingStatus === "reapply_due"
            ? "attention_required"
            : "tracking",
        sessionNextDueAt: dueAt,
        zones: [
          {
            ...baseZone,
            timingStatus,
            generalDueAt: dueAt,
            zoneDueAt: dueAt,
            zoneTimerStartedAt: startedAt,
            zoneNextActionAt: dueAt
          }
        ],
        primaryAction: {
          ...session.primaryAction,
          affectedZoneInstanceIds: [baseZone.zoneInstanceId],
          actionAt: dueAt
        }
      };
      const wrapper = mount(HomeReminderSummary, {
        props: {
          session: stateSession,
          connectivity: "online"
        }
      });

      expect(wrapper.get(".home-summary").classes()).toContain(
        `home-summary--${expectedTone}`
      );
      expect(
        wrapper
          .findAll(".countdown-sun__ray")
          .filter((ray) => ray.attributes("data-visible") === "true")
      ).toHaveLength(expectedVisibleRays);
    }
  );
});
