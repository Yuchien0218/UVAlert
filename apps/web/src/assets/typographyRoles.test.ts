import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const sourceRoot = "apps/web/src";
const currentTestFile = join(sourceRoot, "assets", "typographyRoles.test.ts");

function discoverSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverSourceFiles(entryPath);
    if (entryPath === currentTestFile) return [];
    return /\.(?:vue|css)$/.test(entry.name) ? [entryPath] : [];
  });
}

const migratedFiles = discoverSourceFiles(sourceRoot).sort();

const legacyToken = /--font-size-(?:label|title-sm|title-md|title)\b/;

const headingRoleRules = [
  {
    file: "apps/web/src/components/common/EmptyStateCard.vue",
    selector: ".empty-state :is(h1, h2)",
    role: "section-title"
  },
  {
    file: "apps/web/src/assets/app.css",
    selector: ".success-panel h2",
    role: "card-title"
  },
  {
    file: "apps/web/src/pages/ProductsPage.vue",
    selector: ".gear-section-heading h2",
    role: "section-title"
  },
  {
    file: "apps/web/src/pages/ProductDetailPage.vue",
    selector: ".spec-section h2",
    role: "card-title"
  },
  {
    file: "apps/web/src/components/product/GearForm.vue",
    selector: ".danger-zone h2",
    role: "card-title"
  },
  {
    file: "apps/web/src/pages/setup/SetupPage.vue",
    selector: ".load-error h2",
    role: "card-title"
  },
  {
    file: "apps/web/src/pages/ReportContextEventPage.vue",
    selector: ".app-card > h2",
    role: "card-title"
  },
  {
    file: "apps/web/src/pages/EventCorrectionPage.vue",
    selector: ".app-card > h2",
    role: "card-title"
  },
  {
    file: "apps/web/src/pages/settings/DataSettingsPage.vue",
    selector: ".app-card > h2",
    role: "card-title"
  },
  {
    file: "apps/web/src/pages/settings/NotificationSettingsPage.vue",
    selector: ".settings-card-heading",
    role: "card-title"
  },
  {
    file: "apps/web/src/pages/settings/AccountDataPage.vue",
    selector: ".account-card h2",
    role: "card-title"
  },
  {
    file: "apps/web/src/pages/settings/SyncSettingsPage.vue",
    selector: ".sync-card h2",
    role: "card-title"
  },
  {
    file: "apps/web/src/components/reapplication/ReapplicationProductAssignments.vue",
    selector: ".assignment-section h2",
    role: "card-title"
  },
  {
    file: "apps/web/src/components/reapplication/ReapplicationReview.vue",
    selector: ".review h2",
    role: "section-title"
  },
  {
    file: "apps/web/src/components/common/QuickTimePicker.vue",
    selector: ".time-section h2",
    role: "card-title"
  }
] as const;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("B8 typography role migration", () => {
  for (const file of migratedFiles) {
    it(`${file} 不再使用舊字級桶`, () => {
      expect(readFileSync(file, "utf8")).not.toMatch(legacyToken);
    });
  }

  it("將可換行的安全說明維持在 supporting role", () => {
    expect(readFileSync("apps/web/src/assets/app.css", "utf8")).toMatch(
      /\.safety-note\s*\{[^}]*font-size:\s*var\(--font-size-supporting\);/
    );
  });

  it("將裝備表單的可換行暱稱說明維持在 supporting role", () => {
    expect(
      readFileSync("apps/web/src/components/product/GearForm.vue", "utf8")
    ).toMatch(
      /\.field-helper\s*\{[^}]*font-size:\s*var\(--font-size-supporting\);/
    );
  });

  it("允許衛教文章本文在窄版 grid track 內收縮", () => {
    expect(
      readFileSync(
        "apps/web/src/pages/education/EducationArticlePage.vue",
        "utf8"
      )
    ).toMatch(/\.education-article-body\s*\{[^}]*min-width:\s*0;/);
  });

  it("為 runtime 可見標題指定語意字級，不落回瀏覽器預設值", () => {
    for (const { file, selector, role } of headingRoleRules) {
      expect(readFileSync(file, "utf8"), `${file}: ${selector}`).toMatch(
        new RegExp(
          `${escapeRegex(selector)}\\s*\\{[^}]*font-size:\\s*var\\(--font-size-${role}\\);`
        )
      );
    }
  });

  it("讓裝備新增與編輯頁使用 page-title role", () => {
    expect(readFileSync("apps/web/src/pages/GearFormPage.vue", "utf8")).toMatch(
      /<h1\s+class="page-heading__title">/
    );
  });
});
