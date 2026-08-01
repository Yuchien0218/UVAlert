// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RegionManualSelector from "./RegionManualSelector.vue";

const directory = [
  {
    regionCode: "63000010",
    countyCode: "63000",
    countyName: "臺北市",
    townName: "松山區",
    displayName: "臺北市松山區"
  },
  {
    regionCode: "63000020",
    countyCode: "63000",
    countyName: "臺北市",
    townName: "信義區",
    displayName: "臺北市信義區"
  },
  {
    regionCode: "10002010",
    countyCode: "10002",
    countyName: "宜蘭縣",
    townName: "宜蘭市",
    displayName: "宜蘭縣宜蘭市"
  }
] as const;

function mountSelector() {
  return mount(RegionManualSelector, {
    props: {
      directory,
      phase: "idle"
    }
  });
}

describe("RegionManualSelector", () => {
  it("uses two cascading selects without a search field", () => {
    const wrapper = mountSelector();

    expect(wrapper.find('input[type="search"]').exists()).toBe(false);
    expect(wrapper.get("#region-town").attributes("disabled")).toBeDefined();
    expect(wrapper.get("#region-town").text()).toContain("請先選擇縣市");
  });

  it("shows a field error instead of silently ignoring incomplete saves", async () => {
    const wrapper = mountSelector();
    const save = wrapper.get('[data-testid="save-manual-region"]');

    await save.trigger("click");
    const countyError = wrapper.get("#region-county-error");
    expect(countyError.text()).toBe("請先選擇縣市");
    expect(
      wrapper.get("#region-county").element.parentElement?.contains(
        countyError.element
      )
    ).toBe(true);
    expect(wrapper.emitted("save")).toBeUndefined();

    await wrapper.get("#region-county").setValue("63000");
    await save.trigger("click");
    const townError = wrapper.get("#region-town-error");
    expect(townError.text()).toBe("請選擇鄉鎮市區");
    expect(
      wrapper.get("#region-town").element.parentElement?.contains(
        townError.element
      )
    ).toBe(true);
    expect(wrapper.get("#region-town").attributes("aria-invalid")).toBe(
      "true"
    );
    expect(wrapper.emitted("save")).toBeUndefined();
  });

  it("emits only the selected district code", async () => {
    const wrapper = mountSelector();

    await wrapper.get("#region-county").setValue("63000");
    const town = wrapper.get("#region-town");
    expect(town.attributes("disabled")).toBeUndefined();
    expect(town.text()).toContain("松山區");
    expect(town.text()).not.toContain("宜蘭市");

    await town.setValue("63000010");
    await wrapper
      .get('[data-testid="save-manual-region"]')
      .trigger("click");

    expect(wrapper.emitted("save")).toEqual([["63000010"]]);
  });
});
