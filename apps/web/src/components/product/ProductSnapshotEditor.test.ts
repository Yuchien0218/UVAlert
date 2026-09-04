// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ProductSnapshotEditor from "./ProductSnapshotEditor.vue";
import type { ProductSnapshotFormValue } from "../../features/setup/productSnapshot";

/*
 * 2026-09-01：四題改成 accordion（一次只開一題）之後，這兩條原本「一次
 * 掛載就看得到全部」的斷言必須先把該題打開。
 *
 * **意圖沒有變，所以沒有刪掉任何一條。** 收合是呈現方式，「數字用等寬
 * 字」與「每題是獨立的單選群組」仍然是要守的性質——只是現在要多按一下
 * 才看得到。
 */

function mountEditor(modelValue: ProductSnapshotFormValue) {
  return mount(ProductSnapshotEditor, {
    props: { waterContext: true, modelValue }
  });
}

/**
 * 確保指定題目是開著的。
 *
 * **不是無條件 click。** `/setup` 模式（collapsible 預設 false）第一題本來
 * 就開著，直接點會把它關掉——寫這條測試時實測到，group name 少收了一組。
 */
async function openQuestion(
  wrapper: ReturnType<typeof mountEditor>,
  name: string
) {
  const row = wrapper
    .findAll("button")
    .find((button) => button.text().includes(name))!;
  if (row.attributes("aria-expanded") !== "true") await row.trigger("click");
  return row;
}

describe("ProductSnapshotEditor", () => {
  it("uses tabular numeric typography for product timing values", async () => {
    const wrapper = mountEditor({
      claimAnswer: "yes",
      waitAnswer: "explicit",
      waitMinutes: 15,
      intervalAnswer: "explicit",
      intervalMinutes: 120,
      waterResistance: "40"
    });

    for (const question of ["擦上後等待", "補擦間隔"]) {
      await openQuestion(wrapper, question);
      const input = wrapper.get('input[type="number"]');
      expect(input.classes(), question).toContain("stat-figure");
    }

    await openQuestion(wrapper, "耐水標示");
    expect(wrapper.get('[data-water-resistance="40"]').classes()).toContain(
      "stat-figure"
    );
    expect(wrapper.get('[data-water-resistance="80"]').classes()).toContain(
      "stat-figure"
    );
  });

  it("keeps every product question as an independent single-select group", async () => {
    const wrapper = mountEditor({
      claimAnswer: "yes",
      waitAnswer: "none",
      waitMinutes: null,
      intervalAnswer: "none",
      intervalMinutes: null,
      waterResistance: "unknown"
    });

    /*
     * 逐題打開並收集 group name。一次只開一題，所以不能像收斂前那樣一次
     * 抓完——但「每題各有自己的 name」這個性質不變，抓不到重複的 name 才
     * 是這條測試真正要守的事。
     */
    const groupNames = new Set<string | undefined>();
    for (const question of ["防曬標示", "擦上後等待", "補擦間隔", "耐水標示"]) {
      await openQuestion(wrapper, question);
      for (const input of wrapper.findAll('input[type="radio"]')) {
        groupNames.add(input.attributes("name"));
      }
    }

    /*
     * 第二層的 40／80 要選了「有耐水標示」才出現。
     *
     * 2026-09-04：必須先鎖定耐水面板再找 input——四個面板改用 DisclosurePanel
     * 之後一直都在 DOM 裡（收合是高度動畫不是 v-if），裸的
     * `input[value="yes"]` 會抓到第一題的「有」，測試會默默失去意義。
     */
    await openQuestion(wrapper, "耐水標示");
    await wrapper
      .get('[id$="-water-panel"] input[value="yes"]')
      .setValue(true);
    for (const input of wrapper.findAll('input[type="radio"]')) {
      groupNames.add(input.attributes("name"));
    }

    /*
     * 五組而不是四組：耐水拆成兩層之後，「有沒有耐水標示」與「40／80」
     * 各自是一個單選群組（2026-09-01 裁決丙）。共用同一個 name 的話，
     * 選了 40 會把第一層的選擇清掉。
     */
    expect(groupNames.size).toBe(5);
    expect(groupNames.has(undefined)).toBe(false);

    await openQuestion(wrapper, "防曬標示");
    const claimInputs = wrapper
      .findAll<HTMLInputElement>('input[type="radio"]')
      .filter((input) => input.attributes("name")?.endsWith("-claim"));
    expect(claimInputs).toHaveLength(3);

    await claimInputs[1]!.setValue(true);

    expect(claimInputs.filter((input) => input.element.checked)).toHaveLength(1);
    expect(claimInputs[1]!.element.checked).toBe(true);
  });
});
