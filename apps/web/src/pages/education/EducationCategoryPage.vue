<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import IconButton from "../../components/common/IconButton.vue";
import IconLead from "../../components/common/IconLead.vue";
import { educationCategoryIcon } from "../../features/education/educationCategoryIcons";
import EducationSeoHead from "../../components/education/EducationSeoHead.vue";
import EducationNotFoundPage from "./EducationNotFoundPage.vue";
import {
  educationArticlePath,
  findEducationCategory,
  isEducationArticlePublishable,
  listArticlesForCategory
} from "../../features/education/educationContent";

const route = useRoute();
const router = useRouter();
const categorySlug = computed(() => String(route.params.category ?? ""));
const category = computed(() => findEducationCategory(categorySlug.value));
const articles = computed(() => listArticlesForCategory(categorySlug.value));
const publishableCount = computed(
  () => articles.value.filter(isEducationArticlePublishable).length
);
const robots = computed(() =>
  publishableCount.value > 0 ? "index,follow" : ("noindex,follow" as const)
);
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

    <!--
      2026-09-01：返回從左上角的文字連結改成右上角的圖示鈕（使用者要求）。

      「← 防曬衛教」原本自己佔一列，而那一列**右邊什麼都沒有**——跟
      2026-08-31 那三個「叉叉獨佔一列」的案例是同一個版型問題，只是方向
      相反。改成跟裝備詳情、設定流程一致的形狀：標題群組在左、離開的
      出口在右上角同一列。

      圖示用 `tool-arrow-left`（返回）而不是 `tool-close`（關閉）：這裡是
      往上一層走，不是關掉一個流程。
    -->
    <header class="page-heading education-heading">
      <div class="education-heading__main">
        <p class="page-heading__eyebrow">衛教分類</p>
        <!--
          2026-08-31：主題頁標題也帶上分類圖示（使用者要求）。

          用的是**同一個 category.icon**，跟衛教首頁那張分類卡一樣——從卡片
          點進來之後，圖示還在原地，讀者知道自己進了哪一個主題。首頁與這裡
          都走 IconLead，所以尺寸只有一個地方在管。
        -->
        <IconLead :icon="educationCategoryIcon(category.slug)">
          <h1 class="page-heading__title" data-typography-role="page-title">
            {{ category.title }}
          </h1>
        </IconLead>
      </div>

      <IconButton
        icon="tool-arrow-left"
        label="返回防曬衛教"
        @click="router.push('/education')"
      />

      <p class="page-heading__body">{{ category.description }}</p>
    </header>

    <section aria-labelledby="category-articles-title">
      <div class="education-section-heading">
        <h2 id="category-articles-title" data-typography-role="section-title">
          文章
        </h2>
        <span>{{ articles.length }} 篇</span>
      </div>
      <div class="education-article-list">
        <RouterLink
          v-for="article in articles"
          :key="article.slug"
          class="app-card education-article-card"
          :to="educationArticlePath(article.slug)"
        >
          <span class="education-card-kicker">{{
            article.primaryQuestion
          }}</span>
          <strong>{{ article.title }}</strong>
          <small>{{ article.summary }}</small>
        </RouterLink>
      </div>
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

/*
 * 標題群組在左、返回鈕在右上角同一列，說明橫跨兩欄拿回整頁的寬度。
 * 與 `.flow-heading`（裝備詳情、三個流程頁）同一套版型，只是這裡的左欄
 * 是 eyebrow ＋ IconLead 兩層，所以自己包一個 div。
 */
/*
 * 2026-09-01：這一頁上半是「你在哪一個主題」、下半是「這個主題有哪些
 * 文章」，中間沒有任何分界，讀起來像同一段——所以有一條線。線的用法跟
 * 首頁 UV 帶狀區一致：只在真正的轉折處畫，不是每個區塊各畫一條。
 */
/*
 * **2026-09-04：從獨立的 `<hr>` 改成上一段的下緣。**
 *
 * `<hr>` 是 `.page-stack` 的子元素，所以它上下**各吃一整份 stack gap**——
 * 實測衛教分類頁是 32 ＋ 1 ＋ 32 ＝ **65px 的帶裡只有 1px 是內容**，而且
 * 上下相等：那條線不屬於上面也不屬於下面，讀起來就是一條浮在空中的線
 * （使用者：「加了水平線之後這一區很空」）。
 *
 * 改成標題區自己的 `border-bottom` 之後，線與它所結束的那一段綁在一起，
 * 上緣的間距縮成 `--space-4`、下緣仍是 stack gap——**不對稱正是重點**。
 * 這也回到 repo 既有的做法：`.clear-row`、`.identity-fields` 都是
 * `border-top`，不是 `<hr>`。
 */
.education-heading {
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: start;
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.education-heading__main {
  display: grid;
  gap: var(--space-3);
}

.education-heading__body,
.education-heading .page-heading__body {
  grid-column: 1 / -1;
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

.education-article-list {
  display: grid;
  gap: var(--space-3);
}

.education-article-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--card-padding);
  color: inherit;
  text-decoration: none;
}

.education-article-card strong {
  font-size: var(--font-size-card-title);
  font-weight: 500;
  line-height: var(--line-height-card-title);
}

.education-article-card small {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}
</style>
