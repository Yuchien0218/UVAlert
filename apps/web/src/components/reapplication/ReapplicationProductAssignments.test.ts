// @vitest-environment happy-dom

import type { ZoneProjection } from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ReapplicationProductChoice } from "../../features/reapplication/createReapplicationController";
import ReapplicationProductAssignments from "./ReapplicationProductAssignments.vue";

function zone(
  id: string,
  code: ZoneProjection["bodyZoneCode"]
): ZoneProjection {
  return {
    zoneInstanceId: id,
    bodyZoneCode: code,
    customLabel: null,
    trackingStatus: "active"
  } as ZoneProjection;
}

const zones = [
  zone("z-forehead", "face_forehead"),
  zone("z-arms", "arms"),
  zone("z-hands", "hand_backs")
];

const choices: ReapplicationProductChoice[] = [
  {
    choiceId: "product:a",
    displayName: "日常防曬",
    sourceProductId: "a",
    snapshotFingerprint: "fp-a",
    snapshot: {} as ReapplicationProductChoice["snapshot"],
    selectable: true,
    restriction: null
  },
  {
    choiceId: "product:b",
    displayName: "海邊防曬",
    sourceProductId: "b",
    snapshotFingerprint: "fp-b",
    snapshot: {} as ReapplicationProductChoice["snapshot"],
    selectable: true,
    restriction: null
  }
];

function mountWith(assignments: Record<string, string>) {
  return mount(ReapplicationProductAssignments, {
    props: {
      zones,
      selectedZoneIds: zones.map((item) => item.zoneInstanceId),
      choices,
      assignments,
      errors: {}
    }
  });
}

describe("ReapplicationProductAssignments", () => {
  it("預設收成單一選單，不是每個部位一個", () => {
    const wrapper = mountWith({});
    // 改版前八個部位就八個選單，整頁 3000px 以上。
    expect(wrapper.findAll("select")).toHaveLength(1);
  });

  it("收合模式選一次產品就指派給所有選取的部位", async () => {
    const wrapper = mountWith({});

    await wrapper.get("select").setValue("product:a");

    const emitted = wrapper.emitted("assign") ?? [];
    expect(emitted).toHaveLength(zones.length);
    expect(emitted.map((call) => call[0])).toEqual([
      "z-forehead",
      "z-arms",
      "z-hands"
    ]);
    expect(emitted.every((call) => call[1] === "product:a")).toBe(true);
  });

  it("既有紀錄本來就分開指派時直接展開，不把差異藏起來", () => {
    const wrapper = mountWith({
      "z-forehead": "product:a",
      "z-arms": "product:b",
      "z-hands": "product:a"
    });

    expect(wrapper.findAll("select")).toHaveLength(zones.length);
  });

  it("可以手動展開成逐部位", async () => {
    const wrapper = mountWith({
      "z-forehead": "product:a",
      "z-arms": "product:a",
      "z-hands": "product:a"
    });
    expect(wrapper.findAll("select")).toHaveLength(1);

    await wrapper.get("button").trigger("click");

    expect(wrapper.findAll("select")).toHaveLength(zones.length);
  });
});
