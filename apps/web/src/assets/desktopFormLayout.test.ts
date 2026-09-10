import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

const appCss = withoutComments(readFileSync("apps/web/src/assets/app.css", "utf8"));
const feedbackPage = readFileSync("apps/web/src/pages/FeedbackPage.vue", "utf8");
const gearForm = readFileSync("apps/web/src/components/product/GearForm.vue", "utf8");
const regionLocationPanel = readFileSync(
  "apps/web/src/components/region/RegionLocationPanel.vue",
  "utf8"
);
const regionManualSelector = readFileSync(
  "apps/web/src/components/region/RegionManualSelector.vue",
  "utf8"
);

function cssRule(selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(appCss);
  expect(match, `找不到 ${selector} 的共用規則`).toBeDefined();
  return match![1]!;
}

describe("桌面表單欄寬", () => {
  it("表單頁明確採用共用的欄寬契約", () => {
    expect(feedbackPage).toContain("feedback-form form-control-stack");
    expect(gearForm).toContain('class="gear-form form-control-stack"');
  });

  it("地區定位與手動選擇採用共用的欄寬契約", () => {
    expect(regionLocationPanel).toMatch(
      /class="location-panel app-card form-control-stack"/
    );
    expect(regionManualSelector).toMatch(
      /class="manual-region form-control-stack"/
    );
  });

  it("表單的文字控制項與主要送出動作填滿欄位，不受一般控制項上限截斷", () => {
    const textControls = cssRule(".form-control-stack :is(input:not([type=\"radio\"], [type=\"checkbox\"]), select, textarea)");
    const primaryAction = cssRule(".form-control-stack .button--primary");

    expect(textControls).toContain("width: 100%;");
    expect(textControls).toContain("max-width: none;");
    expect(primaryAction).toContain("width: 100%;");
    expect(primaryAction).toContain("max-width: none;");
  });

  it("一般按鈕仍保留共用上限，避免把非表單動作無差別拉滿", () => {
    expect(cssRule(".button")).toContain("max-width: var(--control-max);");
  });
});
