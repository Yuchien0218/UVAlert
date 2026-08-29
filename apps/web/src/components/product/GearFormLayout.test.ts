import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./GearForm.vue", import.meta.url), "utf8");

describe("GearForm narrow layout", () => {
  it("allows both native date fields to shrink inside a 320px grid track", () => {
    expect(source).toMatch(
      /\.field-pair\s*\{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/
    );
  });
});
