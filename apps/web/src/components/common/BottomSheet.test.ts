// @vitest-environment happy-dom

import { mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it } from "vitest";
import { nextTick } from "vue";
import BottomSheet from "./BottomSheet.vue";

const wrappers: VueWrapper[] = [];

afterEach(() => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  document.body.innerHTML = "";
  document.body.style.overflow = "";
});

describe("BottomSheet", () => {
  it("renders a named modal dialog with optional content and footer", async () => {
    mountSheet();
    await settleOverlay();

    const dialog = getElement<HTMLElement>('[role="dialog"]');
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-labelledby")).toBe("test-sheet-title");
    expect(getElement("#test-sheet-title").textContent).toBe("測試面板");
    expect(dialog.textContent).toContain("主要內容");
    expect(dialog.textContent).toContain("完成");
    expect(document.activeElement).toBe(
      getElement('button[aria-label="關閉"]')
    );
  });

  it("emits close from Escape and the close button", async () => {
    const wrapper = mountSheet();
    await settleOverlay();

    document.dispatchEvent(cancelableKeydown("Escape"));
    getElement<HTMLButtonElement>('button[aria-label="關閉"]').click();
    await nextTick();

    expect(wrapper.emitted("close")).toEqual([[], []]);
  });

  it("closes only when the backdrop itself is clicked", async () => {
    const wrapper = mountSheet();
    await settleOverlay();

    getElement<HTMLElement>('[role="dialog"]').click();
    await nextTick();
    expect(wrapper.emitted("close")).toBeUndefined();

    getElement<HTMLElement>(".bottom-sheet__layer").click();
    await nextTick();
    expect(wrapper.emitted("close")).toEqual([[]]);
  });

  it("wraps Tab and Shift+Tab within the dialog", async () => {
    mountSheet();
    await settleOverlay();

    const close = getElement<HTMLButtonElement>('button[aria-label="關閉"]');
    const last = getElement<HTMLButtonElement>('[data-testid="last-action"]');

    last.focus();
    document.dispatchEvent(cancelableKeydown("Tab"));
    expect(document.activeElement).toBe(close);

    close.focus();
    document.dispatchEvent(cancelableKeydown("Tab", true));
    expect(document.activeElement).toBe(last);
  });

  it("locks page scroll, makes the background inert, then restores both", async () => {
    const background = document.createElement("main");
    document.body.append(background);
    document.body.style.overflow = "clip";
    const wrapper = mountSheet();
    await settleOverlay();

    expect(document.body.style.overflow).toBe("hidden");
    expect(background.hasAttribute("inert")).toBe(true);

    await wrapper.setProps({ open: false });
    await settleOverlay();

    expect(document.body.style.overflow).toBe("clip");
    expect(background.hasAttribute("inert")).toBe(false);
  });

  it("returns focus to the element active before opening", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const wrapper = mountSheet();
    await settleOverlay();

    await wrapper.setProps({ open: false });
    await settleOverlay();

    expect(document.activeElement).toBe(trigger);
  });

  it("does not change page overflow when initially closed", async () => {
    document.body.style.overflow = "clip";
    mountSheet({ open: false });
    await settleOverlay();

    expect(document.body.style.overflow).toBe("clip");
  });

  it("restores page state and focus when unmounted while open", async () => {
    const trigger = document.createElement("button");
    document.body.append(trigger);
    trigger.focus();
    const wrapper = mountSheet();
    await settleOverlay();

    wrapper.unmount();

    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps global locks until the final stacked overlay closes", async () => {
    const first = mountSheet({ title: "第一層", labelledById: "first-title" });
    const second = mountSheet({
      title: "第二層",
      labelledById: "second-title"
    });
    await settleOverlay();

    document.dispatchEvent(cancelableKeydown("Escape"));
    expect(first.emitted("close")).toBeUndefined();
    expect(second.emitted("close")).toEqual([[]]);

    await second.setProps({ open: false });
    await settleOverlay();
    expect(document.body.style.overflow).toBe("hidden");

    await first.setProps({ open: false });
    await settleOverlay();
    expect(document.body.style.overflow).toBe("");
  });
});

function mountSheet(
  props: { open?: boolean; title?: string; labelledById?: string } = {}
): VueWrapper {
  const wrapper = mount(BottomSheet, {
    attachTo: document.body,
    props: {
      open: props.open ?? true,
      title: props.title ?? "測試面板",
      labelledById: props.labelledById ?? "test-sheet-title"
    },
    slots: {
      default: '<button type="button">主要內容</button>',
      footer: '<button type="button" data-testid="last-action">完成</button>'
    }
  });
  wrappers.push(wrapper);
  return wrapper;
}

function cancelableKeydown(key: string, shiftKey = false): KeyboardEvent {
  return new KeyboardEvent("keydown", {
    key,
    shiftKey,
    bubbles: true,
    cancelable: true
  });
}

async function settleOverlay(): Promise<void> {
  await nextTick();
  await nextTick();
}

function getElement<T extends Element = Element>(selector: string): T {
  const element = document.body.querySelector<T>(selector);
  if (element === null) throw new Error(`Element not found: ${selector}`);
  return element;
}
