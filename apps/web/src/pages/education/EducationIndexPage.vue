<script setup lang="ts">
import { computed } from "vue";
import EducationSeoHead from "../../components/education/EducationSeoHead.vue";
import Icon from "../../components/icons/Icon.vue";
import type { IconName } from "../../generated/icons.generated";
import {
  educationCategories,
  listArticlesForCategory,
  isEducationArticlePublishable,
  educationCategoryPath,
  type EducationCategory
} from "../../features/education/educationContent";

/**
 * 分類卡的圖示。這六個圖示 2026-08-29 就已經畫好並進了註冊表，`label`
 * 與分類 `title` 逐字相同——它們本來就是為這六張卡畫的，只是一直沒接上。
 *
 * 寫成顯式對應表而不是 `education-${slug}` 拼字串，有兩個理由：
 * 一是 `reapply-sunscreen` 對應的圖示叫 `education-reapply`，六個裡有一個
 * 對不上；二是 `educationCategories` 是產生出來的，將來新增第七個分類時
 * 拼字串會在執行期才炸，而 `satisfies` 會在 typecheck 就紅。
 */
const CATEGORY_ICONS = {
  "uv-basics": "education-uv-basics",
  "before-going-out": "education-before-going-out",
  "reapply-sunscreen": "education-reapply",
  "sweat-and-water": "education-sweat-and-water",
  "after-sun-care": "education-after-sun-care",
  "special-situations": "education-special-situations"
} satisfies Record<EducationCategory["slug"], IconName>;

const categoryCards = computed(() =>
  educationCategories.map((category) => {
    const articles = listArticlesForCategory(category.slug);
    return {
      ...category,
      icon: CATEGORY_ICONS[category.slug],
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
          <Icon :name="category.icon" :size="32" />
          <span class="education-category-card__body">
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
          </span>
        </RouterLink>
      </nav>
    </section>
  </div>
</template>

<style scoped>
/*
 * 長文檔：閱讀為主、區塊少而長，需要較大的呼吸空間。
 * 數值與改動前相同（32px），只是改用具名 token。
 */
.education-page {
  gap: var(--page-stack-gap-prose);
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
  line-height: var(--line-height-body);
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

/*
 * 2026-08-30：改成 icon-first 的左圖右文，版型與 `.entry`（更多頁）相同
 * ——同樣是「功能入口卡」，B9 裁決 1 把 32px 定義為卡片主視覺的檔位，
 * 這裡沿用，不另立一套。稽核第三節記錄的問題是 icon-first 只做了更多頁
 * 一頁，衛教首頁一個圖示都沒有。
 *
 * 對齊方式與更多頁**刻意不同**：DESIGN.md 第五節 `more-entry-card` 寫的是
 * `align-items: center`，理由是那七張卡有的只有標題、有的標題加雙行說明，
 * 高度不一，start 對齊會讓純標題的卡看起來歪掉。這裡不適用——六張分類卡
 * 的結構完全相同（篇數、標題、說明、審閱狀態四行），實測高度都是 175px，
 * 而 center 會把圖示推到說明文字旁邊，讀起來不像標題的圖示。
 */
.education-category-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: start;
  gap: var(--space-4);
  padding: var(--space-5);
  color: inherit;
  text-decoration: none;
}

.education-category-card__body {
  display: grid;
  gap: var(--space-2);
}

.education-category-card strong {
  font-size: var(--font-size-card-title);
  font-weight: 500;
  line-height: var(--line-height-card-title);
}

.education-category-card small {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}
</style>
