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

describe("跨裝置同步已獨立成專屬頁面", () => {
  it("本機資料與匯出頁不再包含重複的跨裝置同步卡片", () => {
    expect(SOURCE).not.toContain('id="sync-group-title"');
    expect(SOURCE).not.toContain("sync-group");
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
    expect(SOURCE).toContain("summary.hasSetupDraft ? '清除設定草稿'");
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

/**
 * 2026-09-04：「清除全部本機資料」的標題併進按鈕（使用者裁決）。
 */
describe("清除全部的紅字", () => {
  /*
   * 標題併進按鈕之後，紅字必須跟著搬——否則全站最危險的那顆按鈕會跟
   * 「清除草稿」長得一模一樣。
   */
  it("紅字落在觸發按鈕上", () => {
    expect(SOURCE).toMatch(
      /\.clear-row--danger > \.button \{[^}]*color: var\(--color-due\);/
    );
  });

  /*
   * **反向：不是整顆紅按鈕。** 只守上面那條的話，改成紅底白字也會過，而
   * 那與 GearDetailSheet 的既有裁決（「這個 App 不用整顆紅按鈕」）相反。
   */
  it("不是整顆紅按鈕", () => {
    const rule = /\.clear-row--danger > \.button \{([^}]*)\}/.exec(SOURCE)?.[1] ?? "";

    expect(rule).not.toContain("background");
  });
});

/**
 * 2026-09-12：清除卡內部水平線已移除。
 */
describe("清除卡的排版", () => {
  it("清除列之間沒有上緣水平線", () => {
    expect(SOURCE).not.toMatch(/\.clear-row\s*\{[^}]*border-top:\s*1px/);
  });
});
