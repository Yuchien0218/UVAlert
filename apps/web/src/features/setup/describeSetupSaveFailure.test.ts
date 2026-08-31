import { describe, expect, it, vi } from "vitest";
import { SetupValidationError } from "./createSetupController";
import { describeSetupSaveFailure } from "./describeSetupSaveFailure";

/**
 * 2026-08-31：這條路徑原本是空的 `catch {}`，例外整個被丟掉。使用者問
 * 「為什麼無法儲存」時程式碼答不出來——同一句文案至少涵蓋三種狀況。
 *
 * 三件事分開守，合成一條的話少掉任何一項都可能被另外兩項掩護。
 */
describe("describeSetupSaveFailure", () => {
  it("草稿不存在時，給的是「重新開始」而不是「再試一次」", () => {
    const message = describeSetupSaveFailure(
      new SetupValidationError({ draft: ["找不到目前設定草稿，請重新開始。"] }),
      () => undefined
    );

    expect(message).toContain("從頭開始");
    // 重試對這一種沒有用，不該叫使用者再試。
    expect(message).not.toContain("再試一次");
  });

  /*
   * 其他驗證錯誤（欄位層級）不屬於「草稿不見了」，重試通常會成功，
   * 所以維持原本的文案。只用 `instanceof` 判斷會把這一種也誤判成草稿
   * 遺失——所以判斷條件是「是 SetupValidationError **而且** 帶 draft
   * 欄位」，這條測試就是守那個 and。
   */
  it("其他驗證錯誤維持「再試一次」", () => {
    const message = describeSetupSaveFailure(
      new SetupValidationError({ appliedAt: ["時間格式不正確。"] }),
      () => undefined
    );

    expect(message).toContain("再試一次");
    expect(message).not.toContain("從頭開始");
  });

  it("非驗證錯誤（例如 IndexedDB 寫入失敗）維持「再試一次」", () => {
    const message = describeSetupSaveFailure(
      new Error("QuotaExceededError"),
      () => undefined
    );

    expect(message).toContain("再試一次");
  });

  /*
   * 診斷痕跡本身就是這次要修的東西——2026-08-24 的修法「接住並顯示訊息」
   * 沒有留下痕跡，所以 2026-08-31 重現時仍然只能猜。少了這一條，
   * 把 log 拿掉會靜默通過，這次的修正等於白做。
   */
  it("一定會把原始例外送進 log", () => {
    const log = vi.fn();
    const cause = new Error("boom");

    describeSetupSaveFailure(cause, log);

    expect(log).toHaveBeenCalledWith("[setup] 儲存情境失敗", cause);
  });
});
