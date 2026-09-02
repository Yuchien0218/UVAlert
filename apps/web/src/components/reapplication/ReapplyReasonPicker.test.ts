// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ReapplyReason } from "../../features/reapplication/createReapplicationController";
import ReapplyReasonPicker from "./ReapplyReasonPicker.vue";

/**
 * 「為什麼補擦？」（`2026-09-02-event-means-reapply.md` 階段一）。
 */
function mountPicker(modelValue: ReapplyReason | null = null) {
  return mount(ReapplyReasonPicker, {
    props: {
      modelValue,
      "onUpdate:modelValue": () => undefined
    }
  });
}

describe("ReapplyReasonPicker", () => {
  /*
   * 五個選項：時間到了 ＋ 四種損耗。**離水刻意不在裡面**——它還會關閉一段
   * 水中區間，是狀態轉換不是註記，留在「記錄狀況」流程。
   */
  it("提供時間到了與四種損耗，不含離水與下水", () => {
    const text = mountPicker().text();

    for (const label of ["時間到了", "大量流汗", "擦毛巾", "明顯摩擦", "洗手"]) {
      expect(text, label).toContain(label);
    }
    expect(text).not.toContain("離水");
    expect(text).not.toContain("下水");
  });

  /* 預設是「時間到了」——例行補擦最常見，不該強迫每次挑一個原因。 */
  it("預設選中時間到了", () => {
    const checked = mountPicker()
      .findAll("input[type=radio]")
      .filter((input) => (input.element as HTMLInputElement).checked);

    expect(checked).toHaveLength(1);
    expect(checked[0]!.element.closest("label")?.textContent?.trim()).toBe(
      "時間到了"
    );
  });

  /*
   * 用共用的 `.choice-grid`，不自刻選取色——那組顏色 2026-08-24 才從 5 個
   * 各自實作的地方收斂成一份。
   */
  it("沿用共用的 choice-grid", () => {
    expect(mountPicker().find(".choice-grid").exists()).toBe(true);
  });

  it("選了原因會送出對應的值", async () => {
    const wrapper = mountPicker();
    const sweat = wrapper
      .findAll("input[type=radio]")
      .find(
        (input) =>
          input.element.closest("label")?.textContent?.includes("大量流汗") ===
          true
      )!;

    await sweat.setValue();

    const emitted = wrapper.emitted("update:modelValue") as unknown[][];
    expect(emitted.at(-1)?.[0]).toBe("heavy_sweat");
  });
});
