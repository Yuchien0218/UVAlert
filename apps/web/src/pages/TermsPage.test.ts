import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("TermsPage", () => {
  it("說明 UV 與補擦提醒不是醫療建議或效果保證", () => {
    expect(readFileSync("apps/web/src/pages/TermsPage.vue", "utf8")).toContain(
      "UV、天氣與補擦提醒僅供輔助參考，不構成醫療建議或防曬效果保證。"
    );
  });

  it("提供隱私權與隱私請求入口", () => {
    const source = readFileSync("apps/web/src/pages/TermsPage.vue", "utf8");

    expect(source).toContain('to="/privacy"');
    expect(source).toContain('to="/feedback"');
  });
});
