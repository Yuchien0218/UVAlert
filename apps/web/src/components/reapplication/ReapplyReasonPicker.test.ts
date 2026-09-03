// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
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

  /*
   * **階段二（2026-09-03）：「現在還不能補擦」是這條路的出口。**
   *
   * 首頁的「剛才有流汗嗎？」提問卡已移除——`2026-09-02-event-means-reapply.md`
   * 的原則是「遇到了事件＝需要補擦」，所以記錄狀況從並列的目的地降成這裡的岔出。
   */
  it("提供「現在還不能補擦」的出口", () => {
    const exit = mountPicker().get(".reason-picker__exit");

    expect(exit.text()).toContain("現在還不能補擦");
  });

  /*
   * 出口是文字連結，不是 `button--quiet`。
   *
   * 2026-08-31 的裁決：次要動作用文字連結，實心按鈕是主行動的語彙。
   * 這裡的語意是「這條路不適用」，不是一個與補擦並列的選擇。
   */
  it("出口是文字連結，不是按鈕", () => {
    const exit = mountPicker().get(".reason-picker__exit");

    expect(exit.classes()).toContain("text-link");
    expect(exit.classes()).not.toContain("button--quiet");
    expect(exit.classes()).not.toContain("button");
  });

  /* 元件不換頁，只說「使用者想離開」；導航屬於 ReapplyPage。 */
  it("按下出口只發出事件，不自己導航", async () => {
    const wrapper = mountPicker();

    await wrapper.get(".reason-picker__exit").trigger("click");

    expect(wrapper.emitted("exit")).toHaveLength(1);
    expect(wrapper.findComponent({ name: "RouterLink" }).exists()).toBe(false);
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

/*
 * 出口的另一半：`ReapplyPage` 必須把它接到「記錄狀況」。
 *
 * 掛載整頁要造一份很大的 services mock，所以這裡掃原始碼。依 CLAUDE.md
 * 的兩個坑：先剝註解（否則註解裡提到 `reminder-report` 就能讓它假通過），
 * 並比對**完整的屬性與宣告**，不是名字片段（`@exit` 改名就該紅）。
 */
describe("ReapplyPage 接住出口", () => {
  const source = readFileSync("apps/web/src/pages/ReapplyPage.vue", "utf8")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

  it("把 exit 接到 goToReport", () => {
    expect(source).toContain('@exit="goToReport"');
  });

  it("goToReport 導向記錄狀況", () => {
    expect(source).toContain('router.push({ name: "reminder-report" })');
  });
});
