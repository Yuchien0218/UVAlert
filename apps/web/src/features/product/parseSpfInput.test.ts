import { describe, expect, it } from "vitest";
import { parseSpfInput } from "./parseSpfInput";

/**
 * `docs/decisions/2026-09-03-setup-gear-form-layout-todo.md` 第四項。
 *
 * 盤點時實測出來的坑：瓶身印「SPF50+」，照著抄會被擋下，而錯誤訊息只說
 * 「例如 50」，沒說不要加加號。
 */
describe("parseSpfInput", () => {
  it("純數字照收", () => {
    expect(parseSpfInput("50")).toBe(50);
    expect(parseSpfInput("100")).toBe(100);
  });

  /* 這條就是這次改動的理由——改動前它是 `"invalid"`。 */
  it("接受瓶身上的結尾加號，取加號前的數字", () => {
    expect(parseSpfInput("50+")).toBe(50);
    expect(parseSpfInput(" 30+ ")).toBe(30);
  });

  it("沒填是 null，不是錯誤", () => {
    expect(parseSpfInput("")).toBeNull();
    expect(parseSpfInput("   ")).toBeNull();
  });

  /*
   * 反向：容錯不能寬到把錯的也吞掉。
   *
   * 只守「50+ 要過」的話，把整個函式改成 `return null` 也是綠的——那時
   * 錯誤輸入會靜悄悄地存成「沒填」。
   */
  it("讀不出正數時是 invalid，不是 null", () => {
    for (const raw of ["abc", "0", "-5", "+", "5+0"]) {
      expect(parseSpfInput(raw), raw).toBe("invalid");
    }
  });

  /*
   * `+50` 走的是 `Number()` 的正號，不是標示寫法那條規則——結果一樣是 50。
   *
   * 這裡不特別擋：它是打錯字，但讀成 50 沒有任何危害，而多寫一條規則去
   * 拒絕它，只會讓一個已經填對數字的人被退回來重打。
   */
  it("開頭的加號被當成正號，仍然讀成同一個數", () => {
    expect(parseSpfInput("+50")).toBe(50);
  });

  /*
   * 已知限制：全形數字讀不出來（`Number("５０")` 是 NaN），會落在 invalid。
   *
   * 目前不處理——欄位是 `inputmode="numeric"`，數字鍵盤打出來的是半形。
   * 記在這裡是為了下次有人回報時知道這是已知的，不是新壞掉的。
   */
  it("全形數字目前讀不出來（已知限制）", () => {
    expect(parseSpfInput("５０")).toBe("invalid");
  });
});
