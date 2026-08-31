<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import EducationArticleSummary from "../../components/education/EducationArticleSummary.vue";
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
      <h1 class="page-heading__title" data-typography-role="page-title">
        {{ article.title }}
      </h1>
      <!--
        2026-08-31：拿掉這裡的 summary。

        它與下方的「先說結論」（takeawayHtml）講的是同一件事，只是換句話
        說——使用者回報「文章內重複顯示摘要」。留下 takeaway 而不是 summary，
        因為 takeaway 是**文章自己寫的結論段落**（產生器從 ## 先說結論 抽
        出來的），summary 則是給清單卡片與 <meta description> 用的簡介。

        summary 沒有被刪除，只是不在這一頁重複：educationSeo.ts 仍然用它當
        meta description，分類頁與首頁的卡片也還在顯示。
      -->
      <p class="education-article-meta">
        最後查閱：{{ article.lastReviewed }}
      </p>
    </header>

    <!--
      文章的「先說結論」段落。

      產生器把原文的 ## 先說結論 從 bodyMarkdown 抽進 takeawayHtml
      （tools/education/content-reader.mjs 的 splitLeadTakeaway），所以
      它不在 bodyHtml 裡——2026-08-29 之前沒有任何地方渲染它，48 篇文章
      的結論段落全部沒有顯示。

      位置在正文之前是刻意的：DESIGN.md 第一節語調規定「先給結論再補
      條件」，這段就是那個結論。
    -->
    <EducationArticleSummary :html="article.takeawayHtml" />

    <div class="education-article-body prose-block" v-html="article.bodyHtml" />

    <section
      v-if="relatedArticles.length > 0"
      class="education-related"
      aria-labelledby="related-title"
    >
      <h2 id="related-title" data-typography-role="section-title">
        同主題延伸閱讀
      </h2>
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
/*
 * 長文檔：閱讀為主、區塊少而長，需要較大的呼吸空間。
 * 數值與改動前相同（32px），只是改用具名 token。
 */
.education-page {
  gap: var(--page-stack-gap-prose);
}

.education-article-header {
  display: grid;
  gap: var(--space-3);
  max-width: 44rem;
}

.education-article-header .page-heading__title {
  /* 同樣改用 em——理由見 app.css 的 .page-heading__title。文章標題較長，
     放寬到 24 個全形字；實際仍會先被容器寬度收住。 */
  max-width: 24em;
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
  line-height: var(--line-height-body);
}

.education-article-body {
  max-width: 44rem;
  min-width: 0;
  font-size: var(--font-size-body);
  line-height: var(--line-height-body);
}

.education-article-body :deep(h2) {
  margin: var(--prose-heading-gap-before) 0 var(--prose-heading-gap-after);
  font-size: var(--font-size-section-title);
  line-height: var(--line-height-section-title);
}

.education-article-body :deep(h3) {
  margin: var(--prose-subheading-gap-before) 0 var(--prose-heading-gap-after);
  font-size: var(--font-size-card-title);
  line-height: var(--line-height-card-title);
}

.education-article-body :deep(p) {
  margin: 0 0 var(--prose-paragraph-gap);
}

.education-article-body :deep(ul),
.education-article-body :deep(ol) {
  margin: 0 0 var(--prose-paragraph-gap);
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
  background-color: var(--text-secondary);
  opacity: 0.55;
  mask-image: var(--mask-wave-divider);
  mask-position: center;
  mask-repeat: no-repeat;
  mask-size: 100% 100%;
}

.education-article-body :deep(hr + p) {
  margin-top: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: var(--line-height-body);
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
