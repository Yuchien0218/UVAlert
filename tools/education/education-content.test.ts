import { describe, expect, it } from "vitest";
import {
  educationArticles,
  educationCategories
} from "../../apps/web/src/features/education/education-content.generated";
import { readEducationContent } from "./content-reader.mjs";

describe("generated education content", () => {
  it("保留六個固定分類與文章索引順序", () => {
    expect(educationCategories.map((category) => category.slug)).toEqual([
      "uv-basics",
      "before-going-out",
      "reapply-sunscreen",
      "sweat-and-water",
      "after-sun-care",
      "special-situations"
    ]);
    expect(educationArticles).toHaveLength(48);
    expect(new Set(educationArticles.map((article) => article.slug)).size).toBe(
      48
    );
  });

  it("每篇文章都有答案型 metadata、可讀 HTML 與安全發布閘門", () => {
    for (const article of educationArticles) {
      expect(article.title.length).toBeGreaterThan(0);
      expect(article.summary.length).toBeGreaterThan(0);
      expect(article.primaryQuestion.length).toBeGreaterThan(0);
      expect(article.bodyHtml).toContain("<h2>");
      expect(article.bodyHtml).not.toMatch(/<script\b/i);
      expect(article.publishable).toBe(false);
      expect(article.status).toBe("draft");
      expect(article.reviewStatus).toBe("needs-professional-review");
    }
  });

  it("保存來源查閱日期，讓公開頁能呈現內容新鮮度", () => {
    expect(
      educationArticles.every((article) =>
        /^2026-08-\d{2}$/.test(article.lastReviewed)
      )
    ).toBe(true);
  });

  it("extracts the lead conclusion from rendered article body", async () => {
    const content = await readEducationContent();
    const article = content.articles.find(
      (candidate) => candidate.slug === "what-is-uv-index"
    );

    expect(article?.takeawayHtml).toContain("UV 指數（UVI）");
    expect(article?.takeawayHtml).toMatch(/^<p>.*<\/p>$/s);
    expect(article?.bodyHtml).not.toContain("先說結論");
    expect(article?.bodyHtml).toContain("<h2>台灣常見的五級分法</h2>");
  });

  it("requires every article to start with one conclusion paragraph", async () => {
    const content = await readEducationContent();

    for (const article of content.articles) {
      expect(article.takeawayHtml, article.slug).toMatch(/^<p>.+<\/p>$/s);
      expect(article.bodyHtml, article.slug).not.toContain("先說結論");
    }
  });
});

/**
 * 分類卡的說明要能在 375px 上排成一行（2026-09-03，使用者回報「文字太快
 * 換行、右邊很空」）。
 *
 * 這件事來回過兩次，兩次都是同一句抱怨：
 *
 * - 2026-09-01：`text-wrap` 是預設值，第一行擠滿、只把「好。」兩個字丟到
 *   第二行 → 加上 `text-wrap: balance`
 * - 2026-09-03：balance 把 21 個字平分成兩行各約 11 字，**兩行都只用掉一半
 *   寬度**（實測 142／156，可用 294）→ 看起來更空
 *
 * 兩種斷行都醜，因為真正的問題是**字數剛好超過一行**。所以規則訂在字數上：
 * 實測 375px 的卡片內寬 294px、字級 16px，18 個中文字約 255px，是安全的
 * 上限；`balance` 留著給更窄的手機（那時平均分配仍比孤字行好看）。
 */
describe("分類卡說明的長度", () => {
  const MAX_CHARS = 18;

  it.each(educationCategories.map((category) => [category.slug, category]))(
    "%s 的說明不超過 18 個字",
    (_slug, category) => {
      expect(category.description.length).toBeLessThanOrEqual(MAX_CHARS);
    }
  );

  /*
   * 反向：不可以為了過這條測試把說明砍成沒有內容。太短的話卡片標題底下
   * 那一行就不再提供任何新資訊。
   */
  it.each(educationCategories.map((category) => [category.slug, category]))(
    "%s 的說明仍然講得出內容",
    (_slug, category) => {
      expect(category.description.length).toBeGreaterThanOrEqual(10);
    }
  );
});
