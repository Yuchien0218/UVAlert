// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ReminderEmptyState from "./ReminderEmptyState.vue";

describe("ReminderEmptyState", () => {
  it("shows the approved empty copy and setup action", () => {
    const wrapper = mount(ReminderEmptyState, {
      global: {
        stubs: {
          RouterLink: RouterLinkStub
        }
      }
    });

    expect(wrapper.get('[data-testid="reminder-empty"]').text()).toContain(
      "目前沒有進行中的防曬提醒"
    );
    expect(wrapper.text()).toContain("開始防曬提醒");
    expect(
      wrapper.getComponent(RouterLinkStub).props("to")
    ).toBe("/setup");
  });
});
