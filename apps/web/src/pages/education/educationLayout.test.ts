import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 2026-09-01 第八批（衛教三頁）。
 *
 * 使用者的三項回饋：返回改成右上角圖示鈕、標題與清單之間加分隔線、
 * 「最後查閱」靠右且上下間距太怪。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const read = (path: string): string => strip(readFileSync(path, "utf8"));

const CATEGORY = "apps/web/src/pages/education/EducationCategoryPage.vue";
const ARTICLE = "apps/web/src/pages/education/EducationArticlePage.vue";
const INDEX = "apps/web/src/pages/education/EducationIndexPage.vue";

describe("返回改成右上角的圖示鈕", () => {
  for (const file of [CATEGORY, ARTICLE]) {
    /*
     * 兩件事分開守。只守「有 IconButton」的話，舊的「← 防曬衛教」文字連結
     * 留著也會過——那時畫面上有兩個返回入口，比改動前更糟。
     */
    it(`${file} 用 IconButton 當返回`, () => {
      const source = read(file);
      expect(source).toContain('icon="tool-arrow-left"');
    });

    it(`${file} 不再有左上角的「←」文字連結`, () => {
      expect(read(file)).not.toContain("←");
    });
  }

  /*
   * 返回鈕必須跟標題同一列——這正是 2026-08-31「叉叉獨佔一列」那三個案例
   * 的根因（`closeButtonLayout.test.ts` 守的是同一件事，只是那裡守的是
   * `<header>` 裡只有 IconButton 的形狀）。
   *
   * **2026-09-03：這條原本寫死「兩欄」，現在改成守意圖。** 分類頁維持兩欄；
   * 文章頁改用 float——兩欄會讓**整個標題區**永遠少掉一個按鈕的寬度，大標
   * 每一行都提早折（使用者回報並圈出右邊那塊空白）。float 讓箭頭留在同一
   * 列、只有被它擋住的那幾行縮短。
   *
   * 兩種做法都滿足原本的意圖：箭頭沒有自己獨佔一列。
   */
  it("分類頁的標題列是兩欄", () => {
    expect(read(CATEGORY)).toMatch(
      /\.education-heading \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) auto;/
    );
  });

  it("文章頁的返回鈕浮動在標題那一列，不獨佔一列", () => {
    const article = read(ARTICLE);

    expect(article).toMatch(
      /\.education-article-header__back \{[^}]*float:\s*inline-end;/
    );
    // 反向：不可以改回「自己一列」——那正是 2026-08-31 的跑版事故。
    expect(article).not.toMatch(
      /\.education-article-header \{[^}]*grid-template-columns:\s*minmax\(0, 1fr\);/
    );
  });

  /* 可及名稱要說出會回到哪裡，不是泛用的「返回」。 */
  it("返回鈕的標籤指出目的地", () => {
    expect(read(CATEGORY)).toContain('label="返回防曬衛教"');
    expect(read(ARTICLE)).toContain("`返回${category?.title ?? '防曬衛教'}`");
  });
});

describe("衛教分類頁的分隔線", () => {
  it("標題區與文章清單之間有一條線", () => {
    const source = read(CATEGORY);
    expect(source).toContain('<hr class="education-heading__rule" />');
    expect(source).toMatch(
      /\.education-heading__rule \{[^}]*border-top:\s*1px solid var\(--border-subtle\);/
    );
  });
});

describe("文章頁的「最後查閱」", () => {
  /*
   * **2026-09-03：改回靠左（推翻 2026-09-01 的「靠右」）。**
   *
   * 當時靠右的理由是「它是後設資料，靠左會讀起來像副標」。但標題上方的
   * 問句拿掉之後，靠右變成整個標題區唯一一個靠右的東西，比副標更突兀。
   *
   * `justify-self`／`grid-column` 也一併刪掉——標題列改用 float 之後這個
   * header 已經不是 grid，那兩行是失效的殘留。
   */
  it("靠左，而且不再留 grid 的殘留宣告", () => {
    const article = read(ARTICLE);

    expect(article).not.toMatch(
      /\.education-article-meta \{[^}]*justify-self:\s*end;/
    );
    expect(article).not.toMatch(
      /\.education-article-meta \{[^}]*text-align:\s*end;/
    );
  });

  /*
   * 正文第一個元素不再自己加上距。`--prose-heading-gap-before` 假設上面
   * 有一段內文，但正文之上是「先說結論」那張卡，而 `.page-stack` 已經給過
   * 一次間距——兩個疊起來就是使用者圈出來的那一大塊空白。
   *
   * 實測：改動前約 72px，改動後 32px，與其他區塊同一個節奏。
   */
  it("正文第一個元素不重複加上距", () => {
    expect(read(ARTICLE)).toMatch(
      /\.education-article-body :deep\(> :first-child\) \{\s*margin-top:\s*0;/
    );
  });
});

describe("衛教首頁的分類卡說明", () => {
  /*
   * 使用者回報「右邊間距比較空」。實測左右內距其實對稱（20／20）——空的是
   * **斷行**：第一行擠滿、第二行只有「好。」兩個字。balance 把兩行拉平。
   */
  it("說明文字用 text-wrap: balance 平衡斷行", () => {
    expect(read(INDEX)).toMatch(
      /\.education-category-card small \{[^}]*text-wrap:\s*balance;/
    );
  });
});

/**
 * 2026-09-03（使用者要求）：延伸閱讀與資料來源「小一個字級、前面加圓點」。
 *
 * 兩者都是文章讀完之後的附錄——一個是「還可以看什麼」，一個是「這些說法
 * 出自哪裡」。與正文同一個字級會讓它們讀起來跟內文一樣重要。
 */
describe("附錄的字級與項目符號", () => {
  it("延伸閱讀是真的清單，有圓點且小一階", () => {
    const article = read(ARTICLE);

    // 真的 <ul>，不是一堆並排的連結——螢幕閱讀器才報得出項目數。
    expect(article).toContain('<ul class="education-related-list">');
    expect(article).toMatch(
      /\.education-related-list \{[^}]*font-size: var\(--font-size-supporting\);/
    );
    expect(article).toMatch(/\.education-related-list \{[^}]*list-style: disc;/);
  });

  /*
   * 不要粗體（2026-09-03 使用者要求）。
   *
   * `.text-link` 的 500 是給**行動**用的（「改為填寫完整的包裝標示」那種）；
   * 這裡是一份可以瀏覽的清單，不是要你現在按的東西。
   */
  it("延伸閱讀的連結不是粗體", () => {
    expect(read(ARTICLE)).toMatch(
      /\.education-related-list \.text-link \{[^}]*font-weight: var\(--font-weight-supporting\);/
    );
  });

  /*
   * **反向：只改這一份清單，不要把 `.text-link` 全站的字重也改掉。**
   * 那顆 500 在別處是有意義的。
   */
  it("共用的 text-link 仍然是 500", () => {
    const appCss = read("apps/web/src/assets/app.css");

    expect(appCss).toMatch(/\.text-link \{[^}]*font-weight: 500;/);
  });

  /*
   * 資料來源靠「這是一份外部參考連結」來認，不是靠位置——產生器沒有給它
   * class，而全文 67 個 `<ul>` 裡帶 `target="_blank"` 的正好 48 個，等於
   * 48 篇文章各一份（2026-09-03 實測）。
   */
  it("資料來源小一階", () => {
    expect(read(ARTICLE)).toMatch(
      /:deep\(ul:has\(a\[target="_blank"\]\)\) \{[^}]*font-size: var\(--font-size-supporting\);/
    );
  });

  /*
   * **反向：正文的清單維持內文字級。** 只守上面那條的話，把整個
   * `.education-article-body` 的字級調小也是綠的——那時整篇文章都變小了。
   */
  it("正文維持內文字級", () => {
    expect(read(ARTICLE)).toMatch(
      /\.education-article-body \{[^}]*font-size: var\(--font-size-body\);/
    );
  });
});
