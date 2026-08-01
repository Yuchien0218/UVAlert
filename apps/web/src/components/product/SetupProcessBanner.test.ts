// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SetupProcessBanner from "./SetupProcessBanner.vue";

describe("SetupProcessBanner", () => {
  it("說明未完成流程並讓使用者返回設定", async () => {
    const wrapper = mount(SetupProcessBanner);

    expect(wrapper.text()).toContain("提醒設定尚未完成");
    expect(wrapper.text()).toContain("返回提醒設定");

    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("resume")).toHaveLength(1);
  });
});
