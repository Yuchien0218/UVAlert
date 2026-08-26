import {
  educationArticles,
  educationCategories
} from "./education-content.generated";

export type EducationArticle = (typeof educationArticles)[number];
export type EducationCategory = (typeof educationCategories)[number];

export { educationArticles, educationCategories };

export function findEducationArticle(
  slug: string
): EducationArticle | undefined {
  return educationArticles.find((article) => article.slug === slug);
}

export function findEducationCategory(
  slug: string
): EducationCategory | undefined {
  return educationCategories.find((category) => category.slug === slug);
}

export function listArticlesForCategory(
  categorySlug: string
): EducationArticle[] {
  return educationArticles.filter(
    (article) => article.category === categorySlug
  );
}

export function isEducationArticlePublishable(
  article: EducationArticle
): boolean {
  return article.publishable;
}

export function educationCategoryPath(categorySlug: string): string {
  return `/education/${encodeURIComponent(categorySlug)}`;
}

export function educationArticlePath(articleSlug: string): string {
  return `/education/articles/${encodeURIComponent(articleSlug)}`;
}
