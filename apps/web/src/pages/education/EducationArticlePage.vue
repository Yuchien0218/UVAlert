<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import EducationSeoHead from "../../components/education/EducationSeoHead.vue";
import EducationNotFoundPage from "./EducationNotFoundPage.vue";
import {
  educationArticlePath,
  educationCategoryPath,
  findEducationArticle,
  findEducationCategory,
  listArticlesForCategory
} from "../../features/education/educationContent";

const route = useRoute();
const slug = computed(() => String(route.params.slug ?? ""));
const article = computed(() => findEducationArticle(slug.value));
const category = computed(() =>
  article.value === undefined
    ? undefined
    : findEducationCategory(article.value.category)
);
const relatedArticles = computed(() =>
  article.value === undefined
    ? []
    : listArticlesForCategory(article.value.category)
        .filter((candidate) => candidate.slug !== article.value?.slug)
        .slice(0, 3)
);
</script>

<template>
  <EducationNotFoundPage v-if="article === undefined" />

  <article v-else class="page-stack education-page education-article-page">
    <EducationSeoHead
      :title="article.title"
      :description="article.summary"
      :canonical-path="`/education/articles/${article.slug}`"
      :robots="article.publishable ? 'index,follow' : 'noindex,follow'"
      :article="article"
      :breadcrumbs="[
        { name: '防曬衛教', path: '/education' },
        ...(category === undefined
          ? []
          : [
              {
                name: category.title,
                path: educationCategoryPath(category.slug)
              }
            ]),
        { name: article.title, path: `/education/articles/${article.slug}` }
      ]"
    />

    <header class="education-article-header">
      <RouterLink
        class="text-link"
        :to="
          category === undefined
            ? '/education'
            : educationCategoryPath(category.slug)
        "
      >
        ← {{ category?.title ?? "防曬衛教" }}
      </RouterLink>
      <p class="page-heading__eyebrow">{{ article.primaryQuestion }}</p>
      <h1 class="page-heading__title">{{ article.title }}</h1>
      <p class="education-article-summary">{{ article.summary }}</p>
      <p class="education-article-meta">
        最後查閱：{{ article.lastReviewed }} ·
        {{ article.publishable ? "已發布" : "專業審閱中" }}
      </p>
    </header>

    <aside
      v-if="!article.publishable"
      class="education-review-note"
      role="note"
    >
      這篇文章目前是整理中的衛教草稿，尚未完成 UVAlert
      專業審閱；內容僅供閱讀，不代表個人化醫療建議。
    </aside>

    <div class="education-article-body" v-html="article.bodyHtml" />

    <section
      v-if="relatedArticles.length > 0"
      class="education-related"
      aria-labelledby="related-title"
    >
      <h2 id="related-title">同主題延伸閱讀</h2>
      <nav class="education-related-list" aria-label="同主題文章">
        <RouterLink
          v-for="related in relatedArticles"
          :key="related.slug"
          class="text-link"
          :to="educationArticlePath(related.slug)"
        >
          {{ related.title }}
        </RouterLink>
      </nav>
    </section>
  </article>
</template>

<style scoped>
.education-page {
  gap: var(--space-8);
}

.education-article-header {
  display: grid;
  gap: var(--space-3);
  max-width: 44rem;
}

.education-article-header .page-heading__title {
  max-width: 24ch;
}

.education-article-summary {
  margin: 0;
  color: var(--text-body);
  font-size: var(--font-size-body);
  line-height: 1.6;
}

.education-article-meta,
.education-card-kicker {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.education-review-note {
  max-width: 44rem;
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  color: var(--text-secondary);
  line-height: 1.6;
}

.education-article-body {
  max-width: 44rem;
  min-width: 0;
  font-size: var(--font-size-body);
  line-height: 1.85;
}

.education-article-body :deep(h2) {
  margin: var(--space-10) 0 var(--space-3);
  font-size: var(--font-size-section-title);
  line-height: 1.35;
}

.education-article-body :deep(h3) {
  margin: var(--space-8) 0 var(--space-2);
  font-size: var(--font-size-card-title);
  line-height: 1.45;
}

.education-article-body :deep(p) {
  margin: 0 0 var(--space-4);
}

.education-article-body :deep(ul),
.education-article-body :deep(ol) {
  margin: 0 0 var(--space-5);
  padding-left: var(--space-6);
}

.education-article-body :deep(li + li) {
  margin-top: var(--space-2);
}

.education-article-body :deep(a) {
  color: var(--color-primary);
  text-underline-offset: 0.2em;
}

.education-article-body :deep(blockquote) {
  margin: var(--space-5) 0;
  padding-left: var(--space-4);
  border-left: 0.2rem solid var(--border-subtle);
  color: var(--text-secondary);
}

.education-article-body :deep(hr) {
  width: 7.5rem;
  height: 0.5rem;
  margin: var(--space-10) auto;
  border: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 8'%3E%3Cpath d='M1 4C11 0 19 8 29 4S47 0 57 4s18 4 28 0 18-4 34 0' fill='none' stroke='%236F5A54' stroke-opacity='.55' stroke-linecap='round' stroke-width='2'/%3E%3C/svg%3E");
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.education-article-body :deep(hr + p) {
  margin-top: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: 1.6;
}

.education-article-body :deep(code) {
  padding: 0.1rem 0.3rem;
  border-radius: var(--radius-sm);
  background: var(--border-subtle);
  font-family: var(--font-mono);
  font-size: 0.9em;
}

.education-article-body :deep(.education-table-wrap) {
  overflow-x: auto;
  margin: var(--space-5) 0;
}

.education-article-body :deep(table) {
  width: 100%;
  min-width: 32rem;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.education-article-body :deep(th),
.education-article-body :deep(td) {
  padding: var(--space-3);
  border: 1px solid var(--border-subtle);
  text-align: left;
  vertical-align: top;
}

.education-article-body :deep(th) {
  background: var(--surface-primary);
  font-weight: 600;
}

.education-related {
  max-width: 44rem;
  padding-top: var(--space-6);
  border-top: 1px solid var(--border-subtle);
}

.education-related h2 {
  margin: 0 0 var(--space-3);
  font-size: var(--font-size-section-title);
}

.education-related-list {
  display: grid;
  gap: var(--space-3);
}
</style>
