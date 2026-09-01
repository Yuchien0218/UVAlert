import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 2026-09-01 第八批（本機資料與隱私）。
 *
 * 使用者三項：同步區兩個標題字級要統一、「管理登入與雲端資料」靠右加箭頭
 * 與底線、頁面上有一顆按鈕顏色比較淡要查。
 */

const SOURCE = readFileSync(
  "apps/web/src/pages/settings/DataSettingsPage.vue",
  "utf8"
)
  .replace(/<!--[\s\S]*?-->/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "");

describe("同步區的標題字級", () => {
  /*
   * 改動前「跨裝置同步」18px、「目前使用免登入模式」16px——差一階，剛好
   * 落在「看得出不一樣、但看不出為什麼」的區間。
   *
   * 兩件事分開守：三塊狀態都要是 h3，而且都要標成 card-title。只守其中
   * 一件的話，改成 h3 但忘了標 role（字級掉回 body）也會過。
   */
  it("三個同步狀態都是 h3", () => {
    const titles = [...SOURCE.matchAll(/<h3 class="sync-block__title"/g)];
    expect(titles).toHaveLength(3);
  });

  it("三個同步狀態都走 card-title，與「跨裝置同步」同級", () => {
    const titles = [
      ...SOURCE.matchAll(
        /<h3 class="sync-block__title" data-typography-role="card-title">/g
      )
    ];
    expect(titles).toHaveLength(3);
    expect(SOURCE).toContain(
      '<h2 id="sync-group-title" data-typography-role="card-title">'
    );
  });

  it("不再用 <strong> 當同步狀態的標題", () => {
    expect(SOURCE).not.toContain("<strong>目前使用免登入模式</strong>");
  });
});

describe("管理登入與雲端資料", () => {
  /*
   * 靠右、有箭頭、有底線。底線與箭頭來自 ChevronLink（渲染成 `<a>` 時保留
   * 瀏覽器預設底線，2026-08-31 的裁決），這裡只需要守「用了那個元件」與
   * 「靠右」——樣式本身由 chevronLink.test.ts 守。
   */
  it("用 ChevronLink 並靠右", () => {
    expect(SOURCE).toContain(
      '<ChevronLink class="sync-group__more" to="/settings/account-data">'
    );
    expect(SOURCE).toMatch(/\.sync-group__more \{[^}]*justify-self:\s*end;/);
  });
});

describe("停用的「清除草稿」要說明原因", () => {
  /*
   * **這一項查證的結果是「不是 bug」**：按鈕在沒有草稿時是 disabled，淡色
   * 來自 `.button:disabled` 的 opacity，行為正確。
   *
   * 但沒說原因的停用按鈕看起來就是壞掉的按鈕。上面那張概況卡雖然寫著
   * 「未儲存草稿：無」，那是另一張卡的一列，讀者不會自己連起來。
   */
  it("沒有草稿時改寫說明文字", () => {
    expect(SOURCE).toContain("目前沒有草稿可以清除。");
    expect(SOURCE).toContain("summary.hasSetupDraft");
  });

  /* 停用條件本身不可以被拿掉——沒有草稿時按下去沒有任何事會發生。 */
  it("停用條件維持", () => {
    expect(SOURCE).toContain(':trigger-disabled="!summary.hasSetupDraft"');
  });
});
