import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 下鑽頁一律有頂端箭頭；頁尾連結留給長頁面（2026-09-03，稽核 §G）。
 *
 * `2026-09-02-secondary-page-exit-rule.md` 定了「叉叉還是箭頭」，但明講
 * **「哪些頁面該有頂端出口」不在該次範圍**，於是三個設定頁維持三種組合。
 * 這次補上那一半。
 *
 * 判準是**頁高**，實測 375×812：問題回報 831、安裝 812、常見問題 812、
 * 特殊狀況 812、帳號資料 812（都在一屏內），本機資料與隱私 2064。所以只有
 * 最後那一頁兩種出口都留。
 */

const strip = (source: string): string =>
  source.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

const read = (path: string): string => strip(readFileSync(path, "utf8"));

/** 從「更多」下鑽的頁面，加上常見問題底下的主題頁。 */
const DRILL_DOWN = [
  "apps/web/src/pages/FeedbackPage.vue",
  "apps/web/src/pages/InstallPage.vue",
  "apps/web/src/pages/SpecialSituationPage.vue",
  "apps/web/src/pages/help/HelpIndexPage.vue",
  "apps/web/src/pages/help/HelpTopicPage.vue",
  "apps/web/src/pages/settings/AccountDataPage.vue",
  "apps/web/src/pages/settings/DataSettingsPage.vue",
  "apps/web/src/pages/settings/NotificationSettingsPage.vue"
];

describe("下鑽頁都有頂端返回箭頭", () => {
  it.each(DRILL_DOWN)("%s", (page) => {
    const source = read(page);

    /*
     * 比對完整屬性，不是 "tool-arrow-left" 這個片段——它也可能出現在別的
     * 地方（例如一顆長得像返回、實際做別的事的按鈕）。
     */
    expect(source).toContain('icon="tool-arrow-left"');
    expect(source).toMatch(/<IconButton[\s>]/);
  });

  /*
   * 箭頭要在標題那一列，不能自己獨佔一列——那正是 2026-08-31 的跑版事故
   * （`closeButtonLayout.test.ts` 守的是同一件事）。`.page-heading` 這一族
   * 靠 `--with-exit` 這個 modifier 拿到兩欄版型。
   */
  it.each(
    DRILL_DOWN.filter(
      (page) => !page.endsWith("NotificationSettingsPage.vue")
    )
  )("%s 的標題列是兩欄", (page) => {
    expect(read(page)).toContain("page-heading page-heading--with-exit");
  });

  it("兩欄版型真的存在，而且箭頭釘在第一列", () => {
    const css = read("apps/web/src/assets/app.css");

    expect(css).toMatch(
      /\.page-heading--with-exit \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/
    );
    expect(css).toMatch(
      /\.page-heading--with-exit > \.icon-button \{[^}]*grid-row: 1;/
    );
  });

  /*
   * **只有標題讓位，說明橫跨兩欄。** 這是 2026-09-03 `.flow-heading` 修過的
   * 同一個坑：說明在箭頭下方，不必為它讓出寬度。實測 375px 上讓位的話
   * 「免登入即可回報，僅會收到此表單的內容。」會多折一行，只為第二行留兩
   * 個字（276 對 336）。
   */
  it("說明橫跨兩欄，只有標題讓位", () => {
    const css = read("apps/web/src/assets/app.css");

    expect(css).toMatch(
      /\.page-heading--with-exit > \* \{[^}]*grid-column: 1 \/ -1;/
    );
    expect(css).toMatch(
      /\.page-heading--with-exit > \.page-heading__title \{[^}]*grid-column: 1;/
    );
  });
});

describe("頁尾的「返回更多」只留給長頁面", () => {
  /*
   * **反向：不是把頁尾連結全刪。** 只守「下鑽頁有箭頭」的話，把
   * `BackToMoreLink` 整個元件刪掉也是綠的——那時本機資料頁捲到底（2064px）
   * 就沒有出口了。
   */
  it("本機資料與隱私兩種出口都有", () => {
    const page = read("apps/web/src/pages/settings/DataSettingsPage.vue");

    expect(page).toContain("BackToMoreLink");
    expect(page).toContain('icon="tool-arrow-left"');
  });

  it.each(
    DRILL_DOWN.filter(
      (page) => !page.endsWith("DataSettingsPage.vue")
    )
  )("%s 沒有頁尾連結", (page) => {
    expect(read(page)).not.toContain("BackToMoreLink");
  });
});
