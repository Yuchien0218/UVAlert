import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migratedFiles = [
  "apps/web/src/assets/app.css",
  "apps/web/src/components/shell/BottomNavigation.vue",
  "apps/web/src/components/common/BottomSheet.vue",
  "apps/web/src/components/common/EmptyStateCard.vue",
  "apps/web/src/components/session/SessionEndControl.vue"
];

const legacyToken = /--font-size-(?:label|title-sm|title-md|title)\b/;

describe("B8 typography role migration", () => {
  for (const file of migratedFiles) {
    it(`${file} 不再使用舊字級桶`, () => {
      expect(readFileSync(file, "utf8")).not.toMatch(legacyToken);
    });
  }
});
