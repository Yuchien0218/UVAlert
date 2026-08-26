// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import SessionEndControl from "./SessionEndControl.vue";

const wrappers: ReturnType<typeof mount>[] = [];

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("SessionEndControl", () => {
  it("先顯示影響摘要，取消時不送出結束操作", async () => {
    const wrapper = mountControl({
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

    const confirmation = getElement<HTMLElement>('[role="dialog"]');
    expect(confirmation.getAttribute("aria-modal")).toBe("true");
    expect(
      confirmation
        .querySelector("p.session-end__confirm-title")
        ?.textContent?.trim()
    ).toBe("要結束這次提醒嗎？");
    expect(confirmation.getAttribute("tabindex")).toBe("-1");
    expect(document.activeElement).toBe(getButton("取消"));
    expect(confirmation.textContent).toContain("結束後會停止所有待處理提示");

    getButton("取消").click();
    await nextTick();

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(wrapper.emitted("confirm")).toBeUndefined();
    wrapper.unmount();
  });

  it("限制鍵盤焦點、鎖住背景，Escape 關閉後回到觸發按鈕", async () => {
    const background = document.createElement("main");
    document.body.append(background);
    const wrapper = mountControl({
      attachTo: document.body,
      props: {
        phase: "idle",
        error: null
      }
    });
    const trigger = wrapper.get<HTMLButtonElement>(".icon-button");
    trigger.element.focus();

    await trigger.trigger("click");
    await nextTick();

    const confirm = getButton("結束本次提醒");
    const cancel = getButton("取消");
    expect(document.body.style.overflow).toBe("hidden");
    expect(background.hasAttribute("inert")).toBe(true);
    expect(document.activeElement).toBe(cancel);

    cancel.focus();
    document.dispatchEvent(cancelableKeydown("Tab"));
    expect(document.activeElement).toBe(confirm);

    confirm.focus();
    document.dispatchEvent(cancelableKeydown("Tab", true));
    expect(document.activeElement).toBe(cancel);

    document.dispatchEvent(cancelableKeydown("Escape"));
    await nextTick();
    await nextTick();

    expect(document.body.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(background.hasAttribute("inert")).toBe(false);
    expect(document.activeElement).toBe(trigger.element);
    wrapper.unmount();
  });

  it("只有按下確認才送出一次結束操作", async () => {
    const wrapper = mountControl({
      props: {
        phase: "idle",
        error: null
      }
    });

    await wrapper.get(".icon-button").trigger("click");
    getButton("結束本次提醒").click();
    await nextTick();

    expect(wrapper.emitted("confirm")).toEqual([[]]);
  });

  it("提交期間鎖定重複操作，失敗時說明提醒仍在運作", async () => {
    const wrapper = mountControl({
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

    expect(getButton("正在結束…").hasAttribute("disabled")).toBe(true);
    expect(getButton("取消").hasAttribute("disabled")).toBe(true);

    await wrapper.setProps({
      phase: "error",
      error: "persistence_error"
    });

    expect(getElement('[role="alert"]').textContent).toContain(
      "這次提醒仍在運作"
    );
  });
});

function getButton(label: string): HTMLButtonElement {
  const button = Array.from(document.body.querySelectorAll("button")).find(
    (candidate) => candidate.textContent?.trim() === label
  );
  if (button === undefined) throw new Error(`Button not found: ${label}`);
  return button;
}

function mountControl(options: Parameters<typeof mount>[1]) {
  const wrapper = mount(SessionEndControl, options);
  wrappers.push(wrapper);
  return wrapper;
}

function getElement<T extends Element = Element>(selector: string): T {
  const element = document.body.querySelector<T>(selector);
  if (element === null) throw new Error(`Element not found: ${selector}`);
  return element;
}

function cancelableKeydown(key: string, shiftKey = false): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true
  });
}
