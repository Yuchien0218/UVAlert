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

    const card = wrapper.get('[data-testid="reminder-empty"]');
    expect(card.classes()).toContain("empty-state--tracking");
    expect(card.classes()).not.toContain("app-card");
    expect(wrapper.get(".empty-state__action").classes()).toContain(
      "empty-state__action--compact"
    );
    expect(wrapper.get(".empty-state__title").text()).toBe(
      "還沒有開始防曬提醒"
    );
    expect(wrapper.get(".empty-state__body").text()).toBe(
      "開始提醒後，就能追蹤各部位的補擦時間。"
    );
    expect(wrapper.get(".empty-state__title").classes()).toContain(
      "empty-state__title--single-line"
    );
    expect(wrapper.text()).toContain("開始防曬提醒");
    expect(
      wrapper.getComponent(RouterLinkStub).props("to")
    ).toBe("/setup");
  });
});
