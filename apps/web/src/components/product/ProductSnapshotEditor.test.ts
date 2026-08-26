// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ProductSnapshotEditor from "./ProductSnapshotEditor.vue";

describe("ProductSnapshotEditor", () => {
  it("uses tabular numeric typography for product timing values", () => {
    const wrapper = mount(ProductSnapshotEditor, {
      props: {
        waterContext: true,
        modelValue: {
          claimAnswer: "yes",
          waitAnswer: "explicit",
          waitMinutes: 15,
          intervalAnswer: "explicit",
          intervalMinutes: 120,
          waterResistance: "40"
        }
      }
    });

    const numericInputs = wrapper.findAll('input[type="number"]');
    expect(numericInputs).toHaveLength(2);
    expect(
      numericInputs.every((input) => input.classes().includes("stat-figure"))
    ).toBe(true);
    expect(wrapper.get('[data-water-resistance="40"]').classes()).toContain(
      "stat-figure"
    );
    expect(wrapper.get('[data-water-resistance="80"]').classes()).toContain(
      "stat-figure"
    );
  });

  it("keeps every product question as an independent single-select group", async () => {
    const wrapper = mount(ProductSnapshotEditor, {
      props: {
        waterContext: true,
        modelValue: {
          claimAnswer: "yes",
          waitAnswer: "none",
          waitMinutes: null,
          intervalAnswer: "none",
          intervalMinutes: null,
          waterResistance: "unknown"
        }
      }
    });

    const radioInputs = wrapper.findAll<HTMLInputElement>(
      'input[type="radio"]'
    );
    const groupNames = new Set(
      radioInputs.map((input) => input.attributes("name"))
    );

    expect(groupNames.size).toBe(4);
    expect(groupNames.has(undefined)).toBe(false);

    const claimInputs = radioInputs.filter((input) =>
      input.attributes("name")?.endsWith("-claim")
    );
    expect(claimInputs).toHaveLength(3);

    await claimInputs[1]!.setValue(true);

    expect(claimInputs.filter((input) => input.element.checked)).toHaveLength(
      1
    );
    expect(claimInputs[1]!.element.checked).toBe(true);
  });
});
