// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils";
import { RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import OutdoorContextCard from "./OutdoorContextCard.vue";

describe("OutdoorContextCard", () => {
  it("offers region setup when no region is selected", () => {
    const wrapper = shallowMount(OutdoorContextCard, {
      props: { regionName: null },
      global: { stubs: { RouterLink: RouterLinkStub } }
    });

    expect(wrapper.text()).toContain("設定地區");
    expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe(
      "/region"
    );
  });

  it("keeps a change-region entry when a region is selected", () => {
    const wrapper = shallowMount(OutdoorContextCard, {
      props: { regionName: "臺北市松山區" },
      global: { stubs: { RouterLink: RouterLinkStub } }
    });

    expect(wrapper.text()).toContain("變更地區");
    expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe(
      "/region"
    );
  });
});
