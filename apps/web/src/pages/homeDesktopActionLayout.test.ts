import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("apps/web/src/pages/HomePage.vue", "utf8");
const appCss = readFileSync("apps/web/src/assets/app.css", "utf8");
const primaryActionRule = /\.page-primary-action\s*\{([^}]*)\}/.exec(
  appCss
)?.[1];

describe("提醒頁桌面主行動", () => {
  it("使用置中的共用頁面主要動作寬度", () => {
    expect(source).toContain("button--primary home__cta page-primary-action");
    expect(primaryActionRule).toContain("width: 100%;");
    expect(primaryActionRule).toContain("max-width: var(--control-max);");
    expect(primaryActionRule).toContain("justify-self: center;");
  });
});
