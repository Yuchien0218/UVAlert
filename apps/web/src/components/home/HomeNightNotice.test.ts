// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import HomeNightNotice from "./HomeNightNotice.vue";

describe("HomeNightNotice", () => {
  it("夜間逃生出口維持可操作的 body role", async () => {
    const wrapper = mount(HomeNightNotice);
    const button = wrapper.get("button");

    expect(button.attributes("data-typography-role")).toBe("body");
    await button.trigger("click");
    expect(wrapper.emitted("start")).toHaveLength(1);
  });
});
