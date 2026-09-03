<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import IconButton from "../../components/common/IconButton.vue";
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
const router = useRouter();
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

    <!--
      2026-09-01：返回從左上角的文字連結改成右上角的圖示鈕（使用者要求，
      與衛教分類頁同一批）。

      「← 了解今天的 UV」原本自己佔一列，右邊什麼都沒有——跟 2026-08-31
      那三個「叉叉獨佔一列」是同一個版型問題。返回目的地不變（回到這篇
      文章所屬的分類），只是換成圖示並跟標題同列。

      可及名稱帶上分類名（「返回了解今天的 UV」），不是泛用的「返回」——
      螢幕閱讀器讀到時要知道會回到哪裡。
    -->
    <header class="education-article-header">
      <!--
        2026-09-03：拿掉標題上方的 `primaryQuestion`（使用者要求）。

        讀者是從分類頁的卡片點進來的，**那張卡片正面就寫著這個問題**
        （`EducationCategoryPage` 仍然顯示它）——落地後在標題上方再看一次
        是同一句話說兩遍，而且它把大標往下推了一整行。

        資料沒有刪：`primaryQuestion` 仍是 AEO 欄位（`docs/education/README`
        第 121 行），分類頁的卡片與公開靜態站（`generate-public-site.mjs`）
        都還在用——那兩個地方它是「還沒讀過的資訊」，這裡不是。
      -->
      <!--
        返回鈕排在標題**之前**，因為它是浮動的——CSS 的 float 只影響原始碼
        上排在它後面的內容。閱讀順序上也說得通：這顆是這一頁的逃生出口，
        而且可及名稱帶著目的地（「返回了解今天的 UV」）。
      -->
      <IconButton
        class="education-article-header__back"
        icon="tool-arrow-left"
        :label="`返回${category?.title ?? '防曬衛教'}`"
        @click="
          router.push(
            category === undefined
              ? '/education'
              : educationCategoryPath(category.slug)
          )
        "
      />

      <!--
        標題不再包一層 div：那層是 `display: grid`，而 **grid 容器不會與
        float 重疊**——它會整個縮到浮動元素旁邊，於是每一行都被壓窄，等於
        float 白做（2026-09-03 實測：三行都是 280px）。拿掉之後 h1 是普通
        區塊，只有被按鈕擋住的那幾行會縮短。
      -->
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
      <hr class="wave-divider education-related__divider" />

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

/* 標題群組在左、返回鈕在右上角同一列；下方兩列橫跨兩欄。 */
/*
 * 返回鈕改用 float（2026-09-03，使用者回報大標「提早換行」並圈出右邊那塊
 * 空白）。
 *
 * 走過的三個版本，記下來免得有人再繞一次：
 *
 * 1. `minmax(0, 1fr) auto` 兩欄——箭頭只有 44px 高，卻讓**整個標題區**
 *    永遠少掉一個按鈕的寬度，每一行都提早折
 * 2. 重疊（首頁倒數用的那招）——**這裡不行**：首頁第一行是很短的 eyebrow，
 *    這一頁第一行就是大標，而標題最長 33 個字（「SPF 30 和 SPF 50 差多少？
 *    數字越高不代表可以越久不補」），第一行一定壓在按鈕底下
 * 3. 箭頭自成一列——大標每一行都拿得到整個寬度，但**違反 2026-08-31 的
 *    裁決**：`educationLayout.test.ts` 明文守著「返回鈕必須跟標題同一列」，
 *    理由是那次「叉叉獨佔一列」的跑版事故
 *
 * 所以採用 float：箭頭留在標題那一列（不多佔垂直空間），只有被它擋住的
 * 那一兩行會縮短，其餘拿回整個寬度。第一行仍然讓開 56px——那是箭頭實際
 * 佔的位置，除非把它移走，否則消不掉。
 *
 * 注意標題**不能**再包一層 `display: grid` 的 div：grid 容器不會與 float
 * 重疊，會整個縮到旁邊，等於 float 白做（實測三行都變成 280px）。
 */
.education-article-header {
  max-width: 44rem;
}

.education-article-header__back {
  float: inline-end;
  margin-inline-start: var(--space-3);
}

.education-article-header .page-heading__title {
  /* 同樣改用 em——理由見 app.css 的 .page-heading__title。文章標題較長，
     放寬到 24 個全形字；實際仍會先被容器寬度收住。 */
  max-width: 24em;
}

/*
 * 2026-09-01：「最後查閱」靠右（使用者要求）。
 *
 * 它是**這篇文章的後設資料**，不是內文的第一句話。靠左時它緊接在標題
 * 下面，讀起來像副標；靠右之後它退到頁面邊緣，跟返回鈕同一側，讀者的
 * 視線不會把它算進正文。
 */
.education-article-meta {
  grid-column: 1 / -1;
  justify-self: end;
  text-align: end;
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

/*
 * 2026-09-01：正文第一個標題不要再自己加上距（使用者回報「間距距離很奇怪」）。
 *
 * `--prose-heading-gap-before` 是**段落之間**要的呼吸——它假設上面有一段
 * 內文。但正文的第一個元素上面是「先說結論」那張卡，而卡片與正文之間
 * `.page-stack` 已經給了一次間距，兩個疊起來就是實測畫面上那一大塊空白。
 *
 * 同理處理任何「第一個子元素」：段落、清單也一樣不該自己撐開頂端。
 */
.education-article-body :deep(> :first-child) {
  margin-top: 0;
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

/*
 * 引用區塊的外距對齊內文段落節奏。相鄰的 <p>（bottom 為
 * --prose-paragraph-gap）與 blockquote 在一般流裡邊距會折疊，取較大值——
 * 原本 --space-5 讓引用前後比段落間多出一截；改用 --space-4 收斂到接近
 * 內文呼吸（2026-09-02 排版稽核 §7.3）。
 */
.education-article-body :deep(blockquote) {
  margin-block: var(--space-4);
  padding-left: var(--space-4);
  border-left: 0.2rem solid var(--border-subtle);
  color: var(--text-secondary);
}

/* 波浪本體在 app.css 的 .wave-divider；這裡只補內文那條自己的外距。 */
.education-article-body :deep(hr) {
  margin: var(--space-10) auto;
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
}

/*
 * 2026-08-31：橫跨整段的 1px 直線換成置中的波浪，跟內文那條同一種語言。
 * 用真的 <hr class="wave-divider"> 而不是 ::before——共用類別才吃得到，
 * 而且它在語意上確實是一條分隔線。
 */
.education-related__divider {
  margin: 0 auto var(--space-6);
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
