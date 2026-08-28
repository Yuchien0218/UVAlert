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

  it("允許衛教文章本文在窄版 grid track 內收縮", () => {
    expect(
      readFileSync(
        "apps/web/src/pages/education/EducationArticlePage.vue",
        "utf8"
      )
    ).toMatch(/\.education-article-body\s*\{[^}]*min-width:\s*0;/);
  });
});
