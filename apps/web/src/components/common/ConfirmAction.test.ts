// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ConfirmAction from "./ConfirmAction.vue";

describe("ConfirmAction", () => {
  it("未確認時只顯示觸發按鈕，點擊 emit trigger", async () => {
    const wrapper = mount(ConfirmAction, {
      props: {
        confirming: false,
        triggerLabel: "清除",
        confirmLabel: "確定清除"
      }
    });
    expect(wrapper.text()).toBe("清除");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("trigger")).toHaveLength(1);
  });

  it("triggerDisabled 或 pending 會停用觸發按鈕", () => {
    const wrapper = mount(ConfirmAction, {
      props: {
        confirming: false,
        triggerLabel: "清除",
        confirmLabel: "確定清除",
        triggerDisabled: true
      }
    });
    expect(wrapper.get("button").attributes("disabled")).toBeDefined();
  });

  it("有 warning slot 時會呈現警示，並 emit confirm／cancel", async () => {
    const wrapper = mount(ConfirmAction, {
      props: {
        confirming: true,
        triggerLabel: "清除",
        confirmLabel: "確定清除"
      },
      slots: { warning: "確定要清除嗎？" }
    });
    const warning = wrapper.get('[role="alert"]');
    expect(warning.text()).toContain("確定要清除嗎？");
    const buttons = warning.findAll("button");
    await buttons
      .find((button) => button.text() === "確定清除")!
      .trigger("click");
    expect(wrapper.emitted("confirm")).toHaveLength(1);
    await buttons.find((button) => button.text() === "取消")!.trigger("click");
    expect(wrapper.emitted("cancel")).toHaveLength(1);
  });

  it("沒有 warning slot 時，確認態只顯示按鈕列", () => {
    const wrapper = mount(ConfirmAction, {
      props: {
        confirming: true,
        triggerLabel: "清除",
        confirmLabel: "確定清除"
      }
    });
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(wrapper.findAll("button")).toHaveLength(2);
  });

  it("cancelLabel 預設為「取消」，可覆寫", () => {
    const wrapper = mount(ConfirmAction, {
      props: {
        confirming: true,
        triggerLabel: "清除",
        confirmLabel: "確定清除"
      }
    });
    expect(wrapper.text()).toContain("取消");
  });

  it("pending 時確認與取消按鈕都會停用", () => {
    const wrapper = mount(ConfirmAction, {
      props: {
        confirming: true,
        pending: true,
        triggerLabel: "清除",
        confirmLabel: "確定清除"
      }
    });
    const buttons = wrapper.findAll("button");
    expect(buttons).toHaveLength(2);
    for (const button of buttons) {
      expect(button.attributes("disabled")).toBeDefined();
    }
  });
});
