<script setup lang="ts">
import { computed } from "vue";
import EducationSeoHead from "../../components/education/EducationSeoHead.vue";
import {
  educationCategories,
  listArticlesForCategory,
  isEducationArticlePublishable,
  educationCategoryPath
} from "../../features/education/educationContent";

const categoryCards = computed(() =>
  educationCategories.map((category) => {
    const articles = listArticlesForCategory(category.slug);
    return {
      ...category,
      articleCount: articles.length,
      publishableCount: articles.filter(isEducationArticlePublishable).length
    };
  })
);

const publishableCount = computed(() =>
  categoryCards.value.reduce(
    (total, category) => total + category.publishableCount,
    0
  )
);
const robots = computed(() =>
  publishableCount.value > 0 ? "index,follow" : ("noindex,follow" as const)
);
</script>

<template>
  <div class="page-stack education-page">
    <EducationSeoHead
      title="防曬衛教"
      description="用白話讀懂 UV、防曬乳、補擦、碰水與曬後照護；每篇文章列出官方來源與使用界線。"
      canonical-path="/education"
      :robots="robots"
      :breadcrumbs="[{ name: '防曬衛教', path: '/education' }]"
      page-type="CollectionPage"
    />

    <header class="page-heading education-hero">
      <p class="page-heading__eyebrow">防曬生活編輯部</p>
      <h1 class="page-heading__title" data-typography-role="page-title">
        防曬衛教
      </h1>
      <p class="page-heading__body">
        先回答你正在搜尋的問題，再補上適用情境、限制與官方來源。這裡是一般衛教，不取代診斷或個人醫療建議。
      </p>
    </header>

    <aside
      v-if="publishableCount === 0"
      class="education-review-note"
      role="note"
    >
      文章目前正在進行專業審閱，暫不列入搜尋索引。你仍可先閱讀整理中的內容，正式發布後這裡會同步更新。
    </aside>

    <section aria-labelledby="education-categories-title">
      <div class="education-section-heading">
        <h2
          id="education-categories-title"
          data-typography-role="section-title"
        >
          依一天中的使用流程找答案
        </h2>
        <span>{{ categoryCards.length }} 個主題</span>
      </div>

      <nav class="education-category-grid" aria-label="衛教分類">
        <RouterLink
          v-for="category in categoryCards"
          :key="category.slug"
          class="app-card education-category-card"
          :to="educationCategoryPath(category.slug)"
        >
          <span class="education-card-kicker"
            >{{ category.articleCount }} 篇文章</span
          >
          <strong>{{ category.title }}</strong>
          <small>{{ category.description }}</small>
          <span
            v-if="category.publishableCount > 0"
            class="education-card-status"
          >
            {{ category.publishableCount }} 篇已發布
          </span>
          <span v-else class="education-card-status">內容審閱中</span>
        </RouterLink>
      </nav>
    </section>
  </div>
</template>

<style scoped>
.education-page {
  gap: var(--space-8);
}

.education-hero {
  max-width: 42rem;
}

.education-review-note {
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  color: var(--text-secondary);
  line-height: 1.6;
}

.education-section-heading {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.education-section-heading h2 {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.education-section-heading span,
.education-card-kicker {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.education-category-grid {
  display: grid;
  gap: var(--space-3);
}

.education-category-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-5);
  color: inherit;
  text-decoration: none;
}

.education-category-card strong {
  font-size: var(--font-size-card-title);
  font-weight: 500;
  line-height: 1.45;
}

.education-category-card small {
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
