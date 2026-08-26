// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import AppNotice from "./AppNotice.vue";

describe("AppNotice", () => {
  it("kind=ok 輸出 notice--ok 與 role=status", () => {
    const wrapper = mount(AppNotice, {
      props: { kind: "ok" },
      slots: { default: "已完成" }
    });
    expect(wrapper.classes()).toContain("notice");
    expect(wrapper.classes()).toContain("notice--ok");
    expect(wrapper.attributes("role")).toBe("status");
    expect(wrapper.text()).toBe("已完成");
  });

  it("kind=error 輸出 notice--error 與 role=alert", () => {
    const wrapper = mount(AppNotice, {
      props: { kind: "error" },
      slots: { default: "發生錯誤" }
    });
    expect(wrapper.classes()).toContain("notice--error");
    expect(wrapper.attributes("role")).toBe("alert");
    expect(wrapper.text()).toBe("發生錯誤");
  });
});
