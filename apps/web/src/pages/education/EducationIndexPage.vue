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

/**
 * 「了解今天的 UV」是 hero 卡，其餘五張是一般分類卡。
 *
 * 2026-08-09 訪談裁決、2026-08-14 再確認，並寫進 2026-08-15 的現行
 * sitemap §4.5——它是新使用者的起點，所以放大並標「先從這裡開始」。
 *
 * **刻意只做層級，不做雜誌式不對稱網格。** 原始裁決自己就要求「手機版
 * 需將不對稱版面轉為可理解的順序，不依賴卡片大小傳達唯一資訊意義」，
 * 而 390px 單欄是這個 PWA 的主要視窗——單欄下卡片本來就一樣寬，寬度差
 * 傳達不了任何東西。層級改由底色（cream-strong）、襯線標題與 eyebrow
 * 表達，這三者在單欄與雙欄下都成立。
 */
const HERO_CATEGORY_SLUG = "uv-basics";

const heroCard = computed(
  () =>
    categoryCards.value.find(
      (category) => category.slug === HERO_CATEGORY_SLUG
    ) ?? null
);

const secondaryCards = computed(() =>
  categoryCards.value.filter((category) => category.slug !== HERO_CATEGORY_SLUG)
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
          v-if="heroCard !== null"
          :key="heroCard.slug"
          class="app-card education-category-card education-hero-card"
          :to="educationCategoryPath(heroCard.slug)"
        >
          <Icon :name="heroCard.icon" :size="32" />
          <span class="education-category-card__body">
            <span class="education-card-kicker">先從這裡開始</span>
            <strong>{{ heroCard.title }}</strong>
            <small>{{ heroCard.description }}</small>
            <span
              v-if="heroCard.publishableCount > 0"
              class="education-card-status"
            >
              {{ heroCard.publishableCount }} 篇已發布
            </span>
            <span v-else class="education-card-status">內容審閱中</span>
          </span>
        </RouterLink>

        <RouterLink
          v-for="category in secondaryCards"
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
  padding: var(--card-padding);
  color: inherit;
  text-decoration: none;
}

.education-category-card__body {
  display: grid;
  gap: var(--space-2);
}

/*
 * 2026-08-30：hero 卡。規格見 DESIGN.md 第五節 education-hero-card——
 * cream-strong 底、襯線 page-title、內距 24px。
 *
 * kicker 用「先從這裡開始」取代其他五張卡的「N 篇文章」，是刻意的取捨：
 * hero 的任務是當新使用者的起點（2026-08-09 訪談裁決、2026-08-14 再確認），
 * 不是報告內容量；同一格塞兩種資訊會讓引導標籤失去引導作用。
 *
 * 沒有做雜誌式不對稱網格——理由見 script 區塊 HERO_CATEGORY_SLUG 的註解。
 */
.education-hero-card {
  padding: var(--space-6);
  background: var(--color-surface-cream-strong);
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
/*
 * 放在 .education-category-card strong 之後，不是跟其他 hero 規則放一起：
 * 兩者特異性相同（0,1,1），後出現的贏。放在前面的話 hero 標題會被一般
 * 卡的 card-title 蓋掉——實測就是 28px 變成 18px。
 */
.education-hero-card strong {
  font-family: var(--font-family-page-title);
  font-size: var(--font-size-page-title);
  line-height: var(--line-height-page-title);
  letter-spacing: var(--letter-spacing-page-title);
}

/*
 * cream-strong 底比一般卡深，--text-secondary 在它上面撐不住 WCAG AA。
 * 實測（390×844，實際渲染色）：
 *
 *   --text-secondary  rgb(111,90,84)  在 #EFD0BC 上 4.41:1  ✗（小字要 4.5）
 *   --text-body       rgb(90,69,64)   在 #EFD0BC 上 6.11:1  ✓
 *
 * 同一個 --text-secondary 在一般卡的 #F7EDE1 上是 5.56:1，是過的——所以
 * 這不是 token 的問題，是「同一個文字角色換到更深的底色上」造成的。只在
 * hero 卡內提一階，不動全域 token，也不新增 token。
 *
 * 標題與狀態徽章不用改：標題 9.88:1、狀態徽章有自己的底色 4.63:1。
 */
.education-hero-card .education-card-kicker,
.education-hero-card small {
  color: var(--text-body);
}
</style>
