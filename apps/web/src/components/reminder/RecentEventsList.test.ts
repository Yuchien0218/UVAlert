// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import type {
  SessionEventStreamV1,
  ZoneProjection
} from "@sunshield/contracts";
import { describe, expect, it } from "vitest";
import RecentEventsList from "./RecentEventsList.vue";

/**
 * S-07 最近事件清單（PRD v3.11 §5.7.2）。
 *
 * 這是 S-10 `/reminder/event/:id/correct` 取得事件 id 的唯一入口，
 * 所以「每列可點」與「有事件時不得不顯示」都是硬要求。
 */

function makeZone(
  zoneInstanceId: string,
  bodyZoneCode: ZoneProjection["bodyZoneCode"]
): ZoneProjection {
  return {
    zoneInstanceId,
    bodyZoneCode,
    customLabel: null,
    trackingStatus: "active"
  } as ZoneProjection;
}

const zones = [
  makeZone("z-face", "face_forehead"),
  makeZone("z-hands", "hand_backs")
];

function makeStream(
  overrides: Partial<SessionEventStreamV1> = {}
): SessionEventStreamV1 {
  return {
    sessionStarted: {
      id: "evt-start",
      sessionId: "s-1",
      effectiveStartedAt: "2026-08-07T09:00:00.000Z",
      zoneInstanceIds: ["z-face", "z-hands"]
    },
    zoneTrackingEvents: [],
    zoneMethodEvents: [],
    applicationConfirmationGroups: [],
    applicationEvents: [],
    productSafetyEvents: [],
    contextEvents: [],
    sessionEndedEvents: [],
    ...overrides
  } as unknown as SessionEventStreamV1;
}

describe("S-07 RecentEventsList", () => {
  it("沒有事件流時不顯示空殼", () => {
    const wrapper = mount(RecentEventsList, {
      props: { zones, events: null }
    });

    expect(wrapper.find(".events-section").exists()).toBe(false);
  });

  it("預設只顯示最新一筆，其餘收合可展開", async () => {
    const wrapper = mount(RecentEventsList, {
      props: {
        zones,
        events: makeStream({
          // 補擦紀錄以 confirmation group 為單位列出，不是個別 application。
          applicationConfirmationGroups: [
            {
              id: "group-a",
              sessionId: "s-1",
              appliedAt: "2026-08-07T10:00:00.000Z",
              confirmedZoneInstanceIds: ["z-face"]
            },
            {
              id: "group-b",
              sessionId: "s-1",
              appliedAt: "2026-08-07T11:00:00.000Z",
              confirmedZoneInstanceIds: ["z-hands"]
            }
          ]
        } as unknown as Partial<SessionEventStreamV1>)
      }
    });

    // 開始提醒 + 兩筆補擦 = 3 筆，預設只露最新一筆
    expect(wrapper.findAll(".event-row")).toHaveLength(1);

    const toggle = wrapper.get('[aria-expanded="false"]');
    await toggle.trigger("click");

    expect(wrapper.findAll(".event-row").length).toBeGreaterThan(1);
  });

  it("可更正的事件列是按鈕，點擊送出事件 id", async () => {
    const wrapper = mount(RecentEventsList, {
      props: {
        zones,
        events: makeStream({
          applicationConfirmationGroups: [
            {
              id: "group-a",
              sessionId: "s-1",
              appliedAt: "2026-08-07T10:00:00.000Z",
              confirmedZoneInstanceIds: ["z-face"]
            }
          ]
        } as unknown as Partial<SessionEventStreamV1>)
      }
    });

    const row = wrapper.get("button.event-row");
    await row.trigger("click");

    // 帶出的必須是 group id：個別 application 在契約上不可更正。
    expect(wrapper.emitted("correct")?.[0]).toEqual(["group-a"]);
  });

  it("開始提醒不可更正，該列不是按鈕", () => {
    const wrapper = mount(RecentEventsList, {
      props: { zones, events: makeStream() }
    });

    expect(wrapper.findAll(".event-row")).toHaveLength(1);
    expect(wrapper.find("button.event-row").exists()).toBe(false);
  });

  it("最近事件是頁面區段標題", () => {
    const wrapper = mount(RecentEventsList, {
      props: { zones, events: makeStream() }
    });

    expect(
      wrapper.get("#events-title").attributes("data-typography-role")
    ).toBe("section-title");
  });

  it("時鐘不可信時顯示警告，但仍列出已儲存的事件", () => {
    const wrapper = mount(RecentEventsList, {
      props: { zones, events: makeStream(), clockTrusted: false }
    });

    const alert = wrapper.get('[role="alert"]');
    expect(alert.text()).toContain("時間可能不準");
    expect(wrapper.findAll(".event-row").length).toBeGreaterThan(0);
  });
});
