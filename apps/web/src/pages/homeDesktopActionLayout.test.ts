import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("apps/web/src/pages/HomePage.vue", "utf8");
const ctaRule = /\.home__cta\s*\{([^}]*)\}/.exec(source)?.[1];

describe("提醒頁桌面主行動", () => {
  it("填滿內容欄而不受一般按鈕寬度上限截斷", () => {
    expect(ctaRule).toContain("width: 100%;");
    expect(ctaRule).toContain("max-width: none;");
  });
});
