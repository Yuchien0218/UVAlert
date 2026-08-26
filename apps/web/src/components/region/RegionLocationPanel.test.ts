// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RegionLocationPanel from "./RegionLocationPanel.vue";

const candidate = {
  regionCode: "63000010",
  countyCode: "63000",
  countyName: "臺北市",
  townName: "松山區",
  displayName: "臺北市松山區",
  boundaryDataVersion: "2025-03-18",
  selectionMethod: "device_location" as const
};

describe("RegionLocationPanel", () => {
  it("shows one primary location action before resolving a candidate", () => {
    const wrapper = mount(RegionLocationPanel, {
      props: {
        phase: "idle",
        error: null,
        candidate: null,
        approximateAccuracyMeters: null
      }
    });

    expect(wrapper.findAll(".button--primary")).toHaveLength(1);
    expect(wrapper.get(".button--primary").text()).toBe("使用目前位置");
    expect(wrapper.find('[data-testid="relocate"]').exists()).toBe(false);
  });

  it("shows one primary confirm action after resolving a candidate", async () => {
    const wrapper = mount(RegionLocationPanel, {
      props: {
        phase: "confirming",
        error: null,
        candidate,
        approximateAccuracyMeters: 25
      }
    });

    expect(wrapper.findAll(".button--primary")).toHaveLength(1);
    expect(wrapper.get(".button--primary").text()).toBe("確認並使用此地區");
    const relocate = wrapper.get('[data-testid="relocate"]');
    expect(relocate.text()).toBe("重新定位");
    expect(relocate.classes()).toContain("location-panel__relocate--centered");

    await relocate.trigger("click");
    expect(wrapper.emitted("locate")).toEqual([[]]);
  });

  it("uses a non-misleading timeout message", () => {
    const wrapper = mount(RegionLocationPanel, {
      props: {
        phase: "error",
        error: "timeout",
        candidate: null,
        approximateAccuracyMeters: null
      }
    });

    const message = wrapper.get('[role="alert"]').text();
    expect(message).toContain("確認定位權限");
    expect(message).toContain("手動選擇地區");
  });
});
