// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import SessionEndControl from "./SessionEndControl.vue";

describe("SessionEndControl", () => {
  it("先顯示影響摘要，取消時不送出結束操作", async () => {
    const wrapper = mount(SessionEndControl, {
      attachTo: document.body,
      props: {
        phase: "idle",
        error: null
      }
    });

    /*
     * 2026-08-24：觸發器從「停止本次提醒」文字連結改成右上角的小叉叉
     * （減輕畫面份量），確認從內嵌區塊改成彈窗，role 因此由 region
     * 改成 dialog。確認文案本身沒變。
     */
    const trigger = wrapper.get(".icon-button");
    expect(trigger.attributes("aria-label")).toBe("結束這次提醒");
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);

    await trigger.trigger("click");

    const confirmation = wrapper.get('[role="dialog"]');
    expect(confirmation.attributes("aria-modal")).toBe("true");
    expect(
      confirmation.get("p.session-end__confirm-title").text()
    ).toBe("要結束這次提醒嗎？");
    expect(confirmation.attributes("tabindex")).toBeUndefined();
    expect(document.activeElement).toBe(
      confirmation.get("p.session-end__confirm-title").element
    );
    expect(confirmation.text()).toContain(
      "結束後會停止所有待處理提示"
    );

    await getButton(wrapper, "取消").trigger("click");

    expect(wrapper.find('[role="dialog"]').exists()).toBe(false);
    expect(wrapper.emitted("confirm")).toBeUndefined();
    wrapper.unmount();
  });

  it("只有按下確認才送出一次結束操作", async () => {
    const wrapper = mount(SessionEndControl, {
      props: {
        phase: "idle",
        error: null
      }
    });

    await wrapper.get(".icon-button").trigger("click");
    await getButton(wrapper, "結束本次提醒").trigger("click");

    expect(wrapper.emitted("confirm")).toEqual([[]]);
  });

  it("提交期間鎖定重複操作，失敗時說明提醒仍在運作", async () => {
    const wrapper = mount(SessionEndControl, {
      props: {
        phase: "idle",
        error: null
      }
    });
    await wrapper.get(".icon-button").trigger("click");
    await wrapper.setProps({
      phase: "ending",
      error: null
    });

    expect(getButton(wrapper, "正在結束…").attributes()).toHaveProperty(
      "disabled"
    );
    expect(getButton(wrapper, "取消").attributes()).toHaveProperty(
      "disabled"
    );

    await wrapper.setProps({
      phase: "error",
      error: "persistence_error"
    });

    expect(wrapper.get('[role="alert"]').text()).toContain(
      "這次提醒仍在運作"
    );
  });
});

function getButton(
  wrapper: ReturnType<typeof mount>,
  label: string
) {
  const button = wrapper
    .findAll("button")
    .find((candidate) => candidate.text() === label);
  if (button === undefined) {
    throw new Error(`Button not found: ${label}`);
  }
  return button;
}
