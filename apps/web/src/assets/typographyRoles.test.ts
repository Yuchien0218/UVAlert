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

const typographyRoles = [
  "page-title",
  "section-title",
  "card-title",
  "body",
  "supporting",
  "caption",
  "nav-label"
] as const;

const typographyProperties = [
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing"
] as const;

const allowedHeadingRolesByTag = {
  h1: ["page-title"],
  h2: ["section-title", "card-title"],
  h3: ["card-title"]
} as const;

const allowedComponentExceptions = new Set([
  "apps/web/src/components/setup/ZoneProtectionForm.vue:setup-preset-headline",
  "apps/web/src/pages/setup/SetupPage.vue:setup-recovery-headline"
]);

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

  it("將通知設定的可換行說明維持在 supporting role", () => {
    const source = readFileSync(
      "apps/web/src/pages/settings/NotificationSettingsPage.vue",
      "utf8"
    );

    for (const selector of ["note-box", "delivery-note"]) {
      expect(source, selector).toMatch(
        new RegExp(
          `\\.${selector}\\s*\\{[^}]*font-size:\\s*var\\(--font-size-supporting\\);`
        )
      );
    }
  });

  it("允許衛教文章本文在窄版 grid track 內收縮", () => {
    expect(
      readFileSync(
        "apps/web/src/pages/education/EducationArticlePage.vue",
        "utf8"
      )
    ).toMatch(/\.education-article-body\s*\{[^}]*min-width:\s*0;/);
  });

  it("讓流程完成狀態維持 section-title，不被一般卡片規則覆蓋", () => {
    expect(readFileSync("apps/web/src/assets/app.css", "utf8")).toMatch(
      /\.success-panel h2\s*\{[^}]*font-size:\s*var\(--font-size-section-title\);/
    );

    for (const file of [
      "apps/web/src/pages/EventCorrectionPage.vue",
      "apps/web/src/pages/ReportContextEventPage.vue"
    ]) {
      expect(readFileSync(file, "utf8"), file).toMatch(
        /\.app-card:not\(\.success-panel\) > h2\s*\{[^}]*font-size:\s*var\(--font-size-card-title\);/
      );
    }
  });

  it("讓每個 runtime raw heading 明確宣告合法的 typography role", () => {
    const discoveredExceptions = new Set<string>();

    for (const file of migratedFiles.filter((path) => path.endsWith(".vue"))) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(/<(h[1-3])\b[^>]*>/g)) {
        const tagName = match[1] as keyof typeof allowedHeadingRolesByTag;
        const openingTag = match[0];
        const role = openingTag.match(
          /\bdata-typography-role="([a-z-]+)"/
        )?.[1];

        expect(role, `${file}: ${openingTag}`).toBeDefined();
        expect(
          allowedHeadingRolesByTag[tagName],
          `${file}: ${openingTag}`
        ).toContain(role);

        const exceptionName = openingTag.match(
          /\bdata-typography-exception="([a-z-]+)"/
        )?.[1];
        if (exceptionName !== undefined) {
          discoveredExceptions.add(
            `${file.replaceAll("\\", "/")}:${exceptionName}`
          );
        }
      }
    }

    expect(discoveredExceptions).toEqual(allowedComponentExceptions);
  });

  it("將七個 role annotation 的完整 contract 直接連到 canonical token", () => {
    const appCss = readFileSync("apps/web/src/assets/app.css", "utf8");

    for (const role of typographyRoles) {
      const declarations = [
        ...appCss.matchAll(
          new RegExp(
            `[^{}]*\\[data-typography-role="${role}"\\][^{}]*\\{([\\s\\S]*?)\\}`,
            "g"
          )
        )
      ]
        .map((match) => match[1])
        .join("\n");
      expect(declarations, role).not.toBe("");

      for (const property of typographyProperties) {
        expect(declarations, `${role}.${property}`).toMatch(
          new RegExp(
            `${property}:\\s*var\\(--${property}-${role.replaceAll("_", "-")}\\);`
          )
        );
      }
    }
  });
});
