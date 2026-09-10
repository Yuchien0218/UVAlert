import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function cssRule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(source);
  expect(match, `找不到 ${selector} 的版面規則`).toBeDefined();
  return match![1]!;
}

const appShell = withoutComments(
  readFileSync("apps/web/src/components/shell/AppShell.vue", "utf8")
);
const bottomNavigation = withoutComments(
  readFileSync("apps/web/src/components/shell/BottomNavigation.vue", "utf8")
);
const productsPage = withoutComments(
  readFileSync("apps/web/src/pages/ProductsPage.vue", "utf8")
);

describe("桌面 App Shell 版面", () => {
  it("以共用殼層上限置中，不讓桌面沿用整個視窗寬度", () => {
    const shell = cssRule(appShell, ".app-shell");

    expect(shell).toContain("width: min(100%, var(--app-shell-max));");
    expect(shell).toContain("margin: 0 auto;");
  });

  it("底部導覽使用相同的殼層上限", () => {
    expect(cssRule(bottomNavigation, ".bottom-nav")).toContain(
      "max-width: var(--app-shell-max);"
    );
  });

  it("裝備頁的新增裝備 CTA 填滿殼層內欄寬", () => {
    expect(productsPage).toContain(
      'class="button button--primary gear-page__cta"'
    );

    const cta = cssRule(productsPage, ".gear-page__cta");
    expect(cta).toContain("width: 100%;");
    expect(cta).toContain("max-width: none;");
  });
});
