// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RegionPreferenceSummary from "./RegionPreferenceSummary.vue";

describe("RegionPreferenceSummary", () => {
  it("目前設定是摘要卡片標題", () => {
    const wrapper = mount(RegionPreferenceSummary, {
      props: { preference: null },
      global: { stubs: { MapPin: true } }
    });

    expect(
      wrapper.get("#region-summary-title").attributes("data-typography-role")
    ).toBe("card-title");
  });
});
