// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { describe, expect, it } from "vitest";
import BottomNavigation from "./BottomNavigation.vue";

const bottomNavigationSource = readFileSync(
  "apps/web/src/components/shell/BottomNavigation.vue",
  "utf8"
);

describe("BottomNavigation", () => {
  it("提供首頁、提醒、產品與更多四個主要入口", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: { template: "<div />" } },
        { path: "/reminder", component: { template: "<div />" } },
        { path: "/products", component: { template: "<div />" } },
        { path: "/more", component: { template: "<div />" } }
      ]
    });
    await router.push("/");
    await router.isReady();

    const wrapper = mount(BottomNavigation, {
      global: { plugins: [router] }
    });
    const links = wrapper.findAll("a");

    expect(
      links.map((link) => [link.text(), link.attributes("href")])
    ).toEqual([
      ["首頁", "/"],
      ["提醒", "/reminder"],
      ["產品", "/products"],
      ["更多", "/more"]
    ]);
  });

  it("固定在視窗底部並處理安全區與遮蓋層級", () => {
    expect(bottomNavigationSource).toContain("position: fixed;");
    expect(bottomNavigationSource).toContain("bottom: 0;");
    expect(bottomNavigationSource).toContain("left: 0;");
    expect(bottomNavigationSource).toContain("right: 0;");
    expect(bottomNavigationSource).toContain(
      "var(--bottom-nav-height)"
    );
    expect(bottomNavigationSource).toContain(
      "env(safe-area-inset-bottom)"
    );
    expect(bottomNavigationSource).toMatch(/z-index:\s*\d+/);
    expect(bottomNavigationSource).toContain(
      "background: var(--page-background);"
    );
  });
});
