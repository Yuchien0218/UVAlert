import { describe, expect, it } from "vitest";
import { readConfiguredEnvironmentValue } from "./configuredEnvironment";

describe("readConfiguredEnvironmentValue", () => {
  it.each([
    { input: undefined, expected: undefined },
    { input: "", expected: undefined },
    { input: "   ", expected: undefined },
    { input: " value ", expected: "value" }
  ])("normalizes $input to $expected", ({ input, expected }) => {
    expect(readConfiguredEnvironmentValue(input)).toBe(expected);
  });
});
