import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("PrivacyPolicyPage", () => {
  it("說明 Google 登入僅用於登入與跨裝置同步", () => {
    const text = readFileSync(
      "apps/web/src/pages/PrivacyPolicyPage.vue",
      "utf8"
    ).replace(/\s+/g, " ");

    expect(text).toContain(
      "Google 登入僅用於建立登入工作階段與跨裝置同步；UVAlert 不會讀取 Gmail、Google Drive、聯絡人或其他 Google 服務資料。"
    );
  });

  it("提供條款與隱私請求入口", () => {
    const source = readFileSync(
      "apps/web/src/pages/PrivacyPolicyPage.vue",
      "utf8"
    );

    expect(source).toContain('to="/terms"');
    expect(source).toContain('to="/feedback"');
  });
});
