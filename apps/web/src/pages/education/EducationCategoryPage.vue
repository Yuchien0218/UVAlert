<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import EducationSeoHead from "../../components/education/EducationSeoHead.vue";
import EducationNotFoundPage from "./EducationNotFoundPage.vue";
import {
  educationArticlePath,
  findEducationCategory,
  isEducationArticlePublishable,
  listArticlesForCategory
} from "../../features/education/educationContent";

const route = useRoute();
const categorySlug = computed(() => String(route.params.category ?? ""));
const category = computed(() => findEducationCategory(categorySlug.value));
const articles = computed(() => listArticlesForCategory(categorySlug.value));
const publishableCount = computed(() => articles.value.filter(isEducationArticlePublishable).length);
const robots = computed(() => (publishableCount.value > 0 ? "index,follow" : "noindex,follow" as const));
</script>

<template>
  <EducationNotFoundPage v-if="category === undefined" />

  <div v-else class="page-stack education-page">
    <EducationSeoHead
      :title="category.title"
      :description="category.description"
      :canonical-path="`/education/${category.slug}`"
      :robots="robots"
      :breadcrumbs="[
        { name: '防曬衛教', path: '/education' },
        { name: category.title, path: `/education/${category.slug}` }
      ]"
      page-type="CollectionPage"
    />

    <header class="page-heading">
      <RouterLink class="text-link" to="/education">← 防曬衛教</RouterLink>
      <p class="page-heading__eyebrow">衛教分類</p>
      <h1 class="page-heading__title">{{ category.title }}</h1>
      <p class="page-heading__body">{{ category.description }}</p>
    </header>

    <aside v-if="publishableCount === 0" class="education-review-note" role="note">
      這個主題的文章正在進行專業審閱，暫不列入搜尋索引；你可以先閱讀整理中的版本。
    </aside>

    <section aria-labelledby="category-articles-title">
      <div class="education-section-heading">
        <h2 id="category-articles-title">文章</h2>
        <span>{{ articles.length }} 篇</span>
      </div>
      <div class="education-article-list">
        <RouterLink
          v-for="article in articles"
          :key="article.slug"
          class="app-card education-article-card"
          :to="educationArticlePath(article.slug)"
        >
          <span class="education-card-kicker">{{ article.primaryQuestion }}</span>
          <strong>{{ article.title }}</strong>
          <small>{{ article.summary }}</small>
          <span class="education-card-status">
            {{ article.publishable ? "已發布" : "專業審閱中" }}
          </span>
        </RouterLink>
      </div>
    </section>
  </div>
</template>

<style scoped>
.education-page {
  gap: var(--space-8);
}

.education-review-note {
  padding: var(--space-4) var(--space-5);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  color: var(--text-secondary);
  line-height: 1.7;
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
.education-card-kicker,
.education-card-status {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.education-article-list {
  display: grid;
  gap: var(--space-3);
}

.education-article-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-5);
  color: inherit;
  text-decoration: none;
}

.education-article-card strong {
  font-size: var(--font-size-title-sm);
  font-weight: 500;
}

.education-article-card small {
  color: var(--text-secondary);
  line-height: 1.7;
}

.education-card-status {
  justify-self: start;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-pill);
  background: var(--border-subtle);
}
</style>
