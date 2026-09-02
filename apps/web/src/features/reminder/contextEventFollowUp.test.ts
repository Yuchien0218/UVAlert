import { describe, expect, it } from "vitest";
import {
  suggestsReapplyAfter,
  type ContextEventKind
} from "./createContextEventController";

/**
 * 記錄完狀況之後要不要提示補擦（2026-09-02 使用者回報）。
 *
 * 使用者的原話是「大家不會只記錄流汗，也會補擦」——現實裡那是同一件事的
 * 兩半，但成功頁原本只給「返回目前提醒」。
 *
 * 這條規則跟 reducer 綁在一起：只有 `water_start` 不會讓部位立刻到期，因為
 * 它開啟的是一段水中區間而不是一個到期原因。所以這裡逐一列舉全部 kind ——
 * 新增第七種事件時，`ALL_KINDS` 的型別檢查會逼人回來選邊，而不是靜靜沿用
 * 「不是 water_start 就提示」。
 */

/**
 * 列出全部 kind。**用 Record 而不是陣列**：陣列漏一個不會有人發現，
 * `Record<ContextEventKind, ...>` 少一個 key 直接 typecheck 失敗。
 */
const EXPECTED: Record<ContextEventKind, boolean> = {
  heavy_sweat: true,
  towel: true,
  friction: true,
  hand_wash: true,
  water_end: true,
  // 唯一的 false：剛下水的人在水裡，補擦既做不到也還沒到期。
  water_start: false
};

describe("記錄狀況之後要不要提示補擦", () => {
  for (const [kind, expected] of Object.entries(EXPECTED) as [
    ContextEventKind,
    boolean
  ][]) {
    it(`${kind} → ${expected ? "提示補擦" : "不提示"}`, () => {
      expect(suggestsReapplyAfter(kind)).toBe(expected);
    });
  }

  /*
   * **這條防的是「全部回傳 true」也會過。**
   *
   * 上面那組逐項測試裡只有一個 false，把函式寫成 `() => true` 會讓五條綠、
   * 一條紅——紅得很明確。但反過來寫成 `() => false` 就是一條綠五條紅。
   * 這條把「必須同時存在兩種答案」講清楚，避免有人為了讓測試變綠而把
   * 規則整個拿掉。
   */
  it("答案不是常數：至少一種提示、至少一種不提示", () => {
    const answers = Object.keys(EXPECTED).map((kind) =>
      suggestsReapplyAfter(kind as ContextEventKind)
    );

    expect(answers).toContain(true);
    expect(answers).toContain(false);
  });
});
