import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 記錄狀況那一頁的送出區。
 *
 * 使用者 2026-08-31 回報「CTA 怪怪的」。實測下來有三個成因，這裡守其中兩個
 * 已修的：
 *
 *   1. 「取消」原本是 336×45 的按鈕，跟「確認記錄」上下堆疊同寬——次要
 *      動作拿到跟主要動作一樣的視覺份量（裁決乙：降成文字連結）
 *   2. 時間選擇器的日期欄位常駐，佔約 120px 把主要行動推出畫面
 *      （QuickTimePicker 已改，守門在該元件的測試裡）
 *
 * 這裡讀原始碼而不是掛載：這一頁需要一整組 controller 才掛得起來，而要守的
 * 就是那一個 class 有沒有被改回去。
 *
 * vitest 的 cwd 是 repo 根目錄。
 */

const SOURCE = readFileSync(
  "apps/web/src/pages/ReportContextEventPage.vue",
  "utf8"
)
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

describe("記錄狀況的送出區", () => {
  /*
   * 兩件事分開守：主要行動要維持 primary 按鈕，取消要是文字連結。只守後者
   * 的話，兩顆一起變成文字連結也會過——那時就沒有主要行動了。
   */
  it("確認記錄維持 primary 按鈕", () => {
    expect(SOURCE).toContain('class="button button--primary"');
  });

  /*
   * 比對完整的 class 屬性，不是只找「text-link」片段——理由見 CLAUDE.md
   * 「守門測試：坑二」。
   */
  it("取消是文字連結，不是等寬按鈕", () => {
    expect(SOURCE).toContain('class="text-link submit-actions__cancel"');
    expect(
      SOURCE,
      "送出區不該再有第二顆 quiet 按鈕"
    ).not.toContain('class="button button--quiet"');
  });

  /*
   * 離開的出口不可以消失——這頁是從首頁主 CTA 進來的，沒有出口就困住了。
   * 降低份量與拿掉是兩件事。
   *
   * **比對整段按鈕，不是只找 `@click="cancel"`。** 這一頁有兩個地方掛著
   * 同一個 handler（送出成功後的「返回目前提醒」也是），所以單找那個字串
   * 的話，把送出區的取消整顆刪掉仍然會綠——寫這條時實測過。
   */
  it("取消仍然會回到提醒頁", () => {
    const cancelButton = /<button\s+class="text-link submit-actions__cancel"[\s\S]*?<\/button>/.exec(
      SOURCE
    )?.[0];

    expect(cancelButton, "找不到送出區的取消按鈕").toBeDefined();
    expect(cancelButton).toContain('@click="cancel"');
    expect(cancelButton).toContain("取消");
  });
});
