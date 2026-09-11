// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import RegionPreferenceSummary from "./RegionPreferenceSummary.vue";

const source = readFileSync(
  "apps/web/src/components/region/RegionPreferenceSummary.vue",
  "utf-8"
);

describe("RegionPreferenceSummary", () => {
  it("目前地區是摘要卡片標題", () => {
    const wrapper = mount(RegionPreferenceSummary, {
      props: { preference: null },
      global: { stubs: { MapPin: true } }
    });

    expect(
      wrapper.get("#region-summary-title").attributes("data-typography-role")
    ).toBe("card-title");
  });

  it("右側設定值與左側標題字級、粗細與顏色一致", () => {
    // 驗證 .region-summary__title 與 .region-summary__value 共用排版宣告
    expect(source).toMatch(
      /\.region-summary__title,\s*\.region-summary__value\s*\{[^}]*font-size:\s*var\(--font-size-card-title\);/
    );
    expect(source).toMatch(
      /\.region-summary__title,\s*\.region-summary__value\s*\{[^}]*font-weight:\s*var\(--font-weight-card-title\);/
    );
    expect(source).toMatch(
      /\.region-summary__title,\s*\.region-summary__value\s*\{[^}]*color:\s*var\(--text-secondary\);/
    );
  });
});
