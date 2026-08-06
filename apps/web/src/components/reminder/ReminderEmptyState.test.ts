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
      "尚未建立提醒"
    );
    expect(wrapper.get(".empty-state__body").text()).toBe(
      "建立提醒以追蹤各部位狀態與補擦時機。"
    );
    expect(wrapper.get(".empty-state__title").classes()).toContain(
      "empty-state__title--single-line"
    );
    expect(wrapper.text()).toContain("新增提醒");
    expect(
      wrapper.getComponent(RouterLinkStub).props("to")
    ).toBe("/setup");
  });
});
