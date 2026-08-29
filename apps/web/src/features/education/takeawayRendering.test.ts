import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { educationArticles } from "./education-content.generated";

/**
 * 守住「先說結論」不會再度從畫面上消失。
 *
 * 2026-08-28 的改版把原文的 `## 先說結論` 從 `bodyMarkdown` 抽進獨立的
 * `takeawayHtml`（`tools/education/content-reader.mjs` 的
 * `splitLeadTakeaway`），但**兩個渲染端都沒有接上**——PWA 的文章頁與
 * 公開靜態頁都只渲染 `bodyHtml`。結果是 48 篇文章的結論段落全部不顯示，
 * 而且沒有任何測試會紅。
 *
 * 內容被搬到新欄位、渲染端卻沒跟上，是這種產生器架構最容易發生的無聲
 * 失誤：產生器測試會過（欄位確實有值），頁面測試也會過（沒人斷言它要
 * 出現）。所以這裡直接斷言「兩個渲染端都必須引用 takeawayHtml」。
 */
describe("每篇文章都有先說結論", () => {
  it("takeawayHtml 是單一段落且不為空", () => {
    for (const article of educationArticles) {
      expect(article.takeawayHtml, `${article.slug} 缺少結論段落`).toMatch(
        /^<p>.+<\/p>$/s
      );
    }
  });

  it("結論不會同時留在正文裡（避免重複顯示）", () => {
    for (const article of educationArticles) {
      expect(
        article.bodyHtml,
        `${article.slug} 的正文仍含「先說結論」`
      ).not.toContain("先說結論");
    }
  });
});

describe("兩個渲染端都要接上 takeawayHtml", () => {
  /*
   * 用原始碼斷言而不是掛載元件：公開靜態頁是 Node 產生器不是 Vue，兩邊
   * 沒辦法用同一種方式測。這裡守的是「有沒有接上」，不是「長什麼樣」。
   */
  const renderers = [
    {
      name: "PWA 文章頁",
      file: "apps/web/src/pages/education/EducationArticlePage.vue"
    },
    {
      name: "公開靜態頁產生器",
      file: "tools/education/generate-public-site.mjs"
    }
  ];

  for (const { name, file } of renderers) {
    it(`${name} 有渲染 takeawayHtml`, () => {
      expect(
        readFileSync(file, "utf8"),
        `${file} 沒有引用 takeawayHtml。產生器把「先說結論」從 bodyHtml ` +
          `抽走了，這一端不接上就會整段消失——2026-08-28 就是這樣掉的。`
      ).toContain("takeawayHtml");
    });
  }
});
