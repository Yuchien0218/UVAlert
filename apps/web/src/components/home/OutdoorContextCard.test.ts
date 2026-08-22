// @vitest-environment happy-dom

import { shallowMount } from "@vue/test-utils";
import { RouterLinkStub } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import OutdoorContextCard from "./OutdoorContextCard.vue";
import source from "./OutdoorContextCard.vue?raw";

describe("OutdoorContextCard", () => {
  it("offers region setup when no region is selected", () => {
    const wrapper = shallowMount(OutdoorContextCard, {
      props: { regionName: null },
      global: { stubs: { RouterLink: RouterLinkStub } }
    });

    expect(wrapper.text()).toContain("設定地區");
    expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe(
      "/region"
    );
  });

  it("keeps a change-region entry when a region is selected", () => {
    const wrapper = shallowMount(OutdoorContextCard, {
      props: { regionName: "臺北市松山區" },
      global: { stubs: { RouterLink: RouterLinkStub } }
    });

    expect(wrapper.text()).toContain("變更地區");
    expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe(
      "/region"
    );
  });

  it("keeps the CTA from claiming the whole flex row on narrow screens", () => {
    // app.css 在 max-width: 31rem 讓 .button 滿版；少了這條覆寫，CTA 會吃光
    // .context-card__row，把說明文字壓成 0 寬、一字一行。
    const css = source.replace(/\s+/g, " ");

    expect(css).toMatch(/\.context-card__cta[^{]*\{[^}]*width:\s*auto/);
  });

  it("leaves the CTA tap target at the shared 44px minimum", () => {
    // DESIGN.md：所有按鈕最小 44 × 44px。區域覆寫不得把 .button 的
    // min-height: var(--tap-target) 壓低（先前是 2.5rem = 40px）。
    const css = source.replace(/\s+/g, " ");
    const cta = css.match(/\.context-card__cta[^{]*\{([^}]*)\}/)?.[1] ?? "";

    expect(cta).not.toMatch(/min-height/);
  });
});
