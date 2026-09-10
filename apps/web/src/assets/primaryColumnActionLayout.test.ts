import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function withoutComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "");
}

function cssRule(source: string, selector: string): string {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(source);
  expect(match, `找不到 ${selector} 的局部欄寬規則`).toBeDefined();
  return match![1]!;
}

const appCss = withoutComments(readFileSync("apps/web/src/assets/app.css", "utf8"));
const setupShell = withoutComments(
  readFileSync("apps/web/src/components/setup/SetupStepShell.vue", "utf8")
);
const locationPrompt = withoutComments(
  readFileSync("apps/web/src/components/home/HomeLocationPrompt.vue", "utf8")
);

describe("桌面主流程欄位動作", () => {
  it("送出、設定與無地區入口各自填滿容器欄寬", () => {
    for (const [source, selector] of [
      [appCss, ".submit-actions .button"],
      [setupShell, ".setup-shell__actions > .button"],
      [locationPrompt, ".location-prompt__cta"]
    ] as const) {
      const rule = cssRule(source, selector);
      expect(rule).toContain("width: 100%;");
      expect(rule).toContain("max-width: none;");
    }
  });

  it("共用按鈕與文字取消連結維持各自的非滿寬語意", () => {
    expect(cssRule(appCss, ".button")).toContain(
      "max-width: var(--control-max);"
    );

    const cancel = cssRule(
      appCss,
      ".submit-actions__cancel.submit-actions__cancel"
    );
    expect(cancel).toContain("justify-self: center;");
    expect(cancel).not.toContain("max-width: none;");
  });
});
