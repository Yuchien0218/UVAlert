import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function readsJwtVerificationFor(config: string, functionName: string) {
  const header = `[functions.${functionName}]`;
  const sectionStart = config.indexOf(header);
  if (sectionStart === -1) return undefined;

  const nextSection = config.indexOf("\n[", sectionStart + header.length);
  const section = config.slice(
    sectionStart,
    nextSection === -1 ? undefined : nextSection
  );
  const match = /^verify_jwt\s*=\s*(true|false)\s*$/m.exec(section);
  return match?.[1] === "true";
}

describe("feedback deployment boundary", () => {
  it("允許未登入使用者送出回報", () => {
    const config = readFileSync(
      new URL("../../config.toml", import.meta.url),
      "utf8"
    );

    expect(readsJwtVerificationFor(config, "feedback")).toBe(false);
  });
});
