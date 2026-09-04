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
  /*
   * **2026-09-04：說明從按鈕旁邊移到按鈕上。** 放旁邊時讀者仍要自己把
   * 「淡掉的按鈕」與「旁邊那句話」連起來；寫在按鈕上，停用的原因就是按鈕
   * 本身在說。
   */
  it("沒有草稿時按鈕本身說明原因", () => {
    expect(SOURCE).toContain("沒有草稿可以清除");
    expect(SOURCE).toContain("summary.hasSetupDraft ? '清除草稿'");
  });

  /*
   * **反向：不要在按鈕旁邊再留一句一樣的話。** 兩個地方講同一件事，
   * 就是這次要收掉的東西。
   */
  it("按鈕旁邊不再重複同一句", () => {
    expect(SOURCE).not.toContain("目前沒有草稿可以清除。");
  });

  /* 停用條件本身不可以被拿掉——沒有草稿時按下去沒有任何事會發生。 */
  it("停用條件維持", () => {
    expect(SOURCE).toContain(':trigger-disabled="!summary.hasSetupDraft"');
  });
});

/**
 * 概況表：值與標籤同色、時間用短格式（2026-09-04 使用者標註第 6 項）。
 */
describe("概況表的值", () => {
  /*
   * 改動前標籤是 `--text-secondary`、值是繼承來的 `--text-primary`，同一列
   * 兩種深度。這是一張「陳述現況」的表，整列同色讀起來才是一句話的兩半。
   */
  it("顏色寫在 dl 上，dt 不再自己指定", () => {
    expect(SOURCE).toMatch(
      /\.summary-grid \{[^}]*color: var\(--text-secondary\);/
    );
    expect(SOURCE).not.toMatch(
      /\.summary-grid dt \{[^}]*color: var\(--text-secondary\);/
    );
  });

  /*
   * **反向：值不可以自己另外指定顏色。** 只守上面那條的話，在 `dd` 上補
   * 一行 color 又會變回兩種深度。
   */
  it("dd 沒有自己的顏色", () => {
    const dd = /\.summary-grid dd \{([^}]*)\}/.exec(SOURCE)?.[1] ?? "";

    expect(dd).not.toContain("color:");
  });

  /*
   * 時間用「9/4 00:11」的短格式：原本 `formatDateTime` 給的是
   * 「2026/9/4 上午12:11:20」，16 個字擠在右欄實測折成兩行。這一列問的是
   * 「多久以前更新」，年份與秒數不影響答案。
   */
  it("時間用短格式", () => {
    expect(SOURCE).toContain("formatMonthDayTime");
    expect(SOURCE).not.toContain("formatDateTime");
  });
});

