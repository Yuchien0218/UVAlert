// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const indexHtml = readFileSync(
  resolve(process.cwd(), "apps/web/index.html"),
  "utf8"
);
const globalStyles = readFileSync(
  resolve(process.cwd(), "packages/ui/src/styles.css"),
  "utf8"
);

describe("appearance document contract", () => {
  it("advertises support for both app color schemes", () => {
    const parsedDocument = new DOMParser().parseFromString(
      indexHtml,
      "text/html"
    );

    expect(
      parsedDocument
        .querySelector('meta[name="color-scheme"]')
        ?.getAttribute("content")
    ).toBe("light dark");
  });

  it("protects an explicit light choice from automatic darkening", () => {
    const styleSheet = parseStyleSheet(globalStyles);

    expect(
      findRule(styleSheet, ':root[data-theme="light"]').style
        .colorScheme
    ).toBe("only light");
    expect(
      findRule(styleSheet, ':root[data-theme="dark"]').style
        .colorScheme
    ).toBe("dark");
  });
});

function parseStyleSheet(css: string): CSSStyleSheet {
  const style = document.createElement("style");
  style.textContent = css;
  document.head.append(style);

  const styleSheet = style.sheet;
  if (styleSheet === null) {
    throw new Error("Global stylesheet could not be parsed.");
  }

  return styleSheet;
}

function findRule(
  styleSheet: CSSStyleSheet,
  selector: string
): CSSStyleRule {
  const rule = Array.from(styleSheet.cssRules).find(
    (candidate): candidate is CSSStyleRule =>
      candidate instanceof CSSStyleRule &&
      candidate.selectorText === selector
  );

  if (rule === undefined) {
    throw new Error(`Missing appearance rule: ${selector}`);
  }

  return rule;
}
