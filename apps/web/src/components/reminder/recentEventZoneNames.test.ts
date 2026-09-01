// @vitest-environment happy-dom
import type { ZoneProjection } from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RecentEventsList from "./RecentEventsList.vue";

/**
 * 最近事件右欄顯示的部位。
 *
 * 2026-08-31 使用者要求：涵蓋全部追蹤中的部位時寫「全部位」，不要寫
 * 「8 個部位」——「開始提醒」本來就是全部位，報一個數字沒有告訴讀者任何
 * 事；而部分部位的事件顯示的是實際名稱，同一欄一個數量一個名稱也不一致。
 */

function zone(id: string, bodyZoneCode: string): ZoneProjection {
  return {
    zoneInstanceId: id,
    bodyZoneCode,
    customLabel: null,
    trackingStatus: "active"
  } as ZoneProjection;
}

const ZONES = [
  zone("z1", "face_forehead"),
  zone("z2", "ears"),
  zone("z3", "arms")
];

function mountList(zoneInstanceIds: string[]) {
  return mount(RecentEventsList, {
    props: {
      zones: ZONES,
      events: {
        contextEvents: [
          {
            id: "e1",
            eventType: "context_event",
            contextType: "heavy_sweat",
            occurredAt: "2026-08-31T10:00:00.000Z",
            effectiveOccurredAt: "2026-08-31T10:00:00.000Z",
            zoneInstanceIds
          }
        ],
        applicationEvents: [],
        applicationConfirmationGroups: [],
        productSafetyEvents: [],
        sessionEndedEvents: []
      },
      clockTrusted: true
    } as never,
    global: { stubs: { Icon: true } }
  });
}

describe("最近事件的部位欄", () => {
  /*
   * 兩件事分開守：全部位要寫「全部位」，部分部位要寫實際名稱。只守前者的
   * 話，全部都寫「全部位」也會過——那時就看不出哪次只影響手臂了。
   */
  it("涵蓋全部追蹤中的部位時寫「全部位」", () => {
    const text = mountList(["z1", "z2", "z3"]).text();

    expect(text).toContain("全部位");
    expect(text, "不該再報數字").not.toContain("3 個部位");
  });

  it("只有部分部位時列出實際名稱", () => {
    const text = mountList(["z2", "z3"]).text();

    expect(text).toContain("耳朵");
    expect(text).toContain("手臂");
    expect(text).not.toContain("全部位");
  });
});
