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
const appCss = withoutComments(
  readFileSync("apps/web/src/assets/app.css", "utf8")
);
const router = withoutComments(
  readFileSync("apps/web/src/router/index.ts", "utf8")
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

  it("桌面斷點讓所有頁面統一使用閱讀外框寬度", () => {
    expect(appShell).toMatch(
      /@media \(min-width: 48rem\) \{[\s\S]*?\.app-shell\s*\{[^}]*width:\s*min\(100%, var\(--reading-shell-max\)\);/
    );
  });

  it("底部導覽在桌面跟隨同一個外框寬度", () => {
    expect(bottomNavigation).toMatch(
      /@media \(min-width: 48rem\) \{[\s\S]*?\.bottom-nav\s*\{[^}]*max-width:\s*var\(--reading-shell-max\);/
    );
  });

  it("內層頁面內容限制為中等寬度並置中", () => {
    const pageStack = cssRule(appCss, ".page-stack");

    expect(pageStack).toContain("max-width: var(--page-content-max);");
    expect(pageStack).toContain("margin-inline: auto;");
  });

  it("路由不再各自決定桌面外框寬度", () => {
    expect(router).not.toContain("wideLayout");
  });

  it("裝備頁的新增裝備 CTA 使用置中的共用頁面主要動作", () => {
    expect(productsPage).toContain(
      'class="button button--primary page-primary-action"'
    );
  });
});
