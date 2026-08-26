import { describe, expect, it } from "vitest";
import {
  educationArticles,
  educationCategories
} from "../../apps/web/src/features/education/education-content.generated";

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
});
