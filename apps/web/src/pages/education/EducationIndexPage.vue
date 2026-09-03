<script setup lang="ts">
import { computed } from "vue";
import EducationSeoHead from "../../components/education/EducationSeoHead.vue";
import IconLead from "../../components/common/IconLead.vue";
import {
  educationCategories,
  listArticlesForCategory,
  isEducationArticlePublishable,
  educationCategoryPath
} from "../../features/education/educationContent";
import { educationCategoryIcon } from "../../features/education/educationCategoryIcons";

const categoryCards = computed(() =>
  educationCategories.map((category) => {
    const articles = listArticlesForCategory(category.slug);
    return {
      ...category,
      icon: educationCategoryIcon(category.slug),
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
        提供實用情境與官方指引。本專區為一般衛教資訊，不能取代專業醫療診斷。
      </p>
    </header>

    <!--
      2026-08-31：hero 從卡片列表裡搬出來，改成標題上方的滿寬橫幅
      （使用者裁決「丁，不加 CTA」）。

      **原因不是字級，是形式與份量互相矛盾。** 實測 hero 標題 28px 襯線、
      其餘五張 18px 無襯線，差 1.56 倍且換了字體——但兩者的**結構完全
      相同**（膠囊、圖示＋標題、說明、圓角卡片）。形式在說「我們是同一
      類」，字級在說「我比你們高一階」。甲乙丙（調字級）是把矛盾縮小，
      丁是把它解掉：hero 不再是列表的成員，就沒有可比性。

      連帶「6 個主題」變成「5 個主題」——那更誠實，hero 本來就不該一邊
      佔著列表一格、一邊聲稱自己不一樣。

      **刻意不加「開始閱讀 →」CTA**（使用者裁決）：整張橫幅本來就可點，
      多一顆按鈕是重複的可點區域，也多一個沒必要的鍵盤焦點；而且會把
      橫幅撐到約 200px，比原本的卡片還高，吃掉第一屏。

      **仍然刻意不做雜誌式不對稱網格**，理由見下方 HERO_CATEGORY_SLUG。
    -->
    <RouterLink
      v-if="heroCard !== null"
      class="app-card education-hero-banner"
      :to="educationCategoryPath(heroCard.slug)"
    >
      <span class="education-card-kicker">先從這裡開始</span>
      <IconLead :icon="heroCard.icon">
        <strong>{{ heroCard.title }}</strong>
      </IconLead>
      <small>{{ heroCard.description }}</small>
    </RouterLink>

    <section aria-labelledby="education-categories-title">
      <div class="education-section-heading">
        <h2
          id="education-categories-title"
          data-typography-role="section-title"
        >
          依一天的使用流程找答案
        </h2>
        <span>{{ secondaryCards.length }} 個主題</span>
      </div>

      <nav class="education-category-grid" aria-label="衛教分類">
        <RouterLink
          v-for="category in secondaryCards"
          :key="category.slug"
          class="app-card education-category-card"
          :to="educationCategoryPath(category.slug)"
        >
          <IconLead :icon="category.icon">
            <span class="education-category-card__titles">
              <span class="education-card-kicker"
                >{{ category.articleCount }} 篇文章</span
              >
              <strong>{{ category.title }}</strong>
            </span>
          </IconLead>
          <small>{{ category.description }}</small>
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

.education-section-heading span {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

/*
 * 2026-08-31：kicker 改成膠囊（使用者要求「8 篇文章套用內容審閱中的樣式」）。
 *
 * 同一天把審閱狀態徽章整批抽掉之後，卡片上就沒有任何帶底色的元素了；
 * kicker 接手那個角色剛好——它本來就是「這張卡的一個量化屬性」，跟原本
 * 那顆徽章是同一種東西。直接沿用 .education-card-status，不另造一套：
 * 那個 class 的樣式在 app.css，兩邊指同一份就不會漂移。
 */
.education-card-kicker {
  justify-self: start;
  padding: 0.15rem 0.5rem;
  border-radius: var(--radius-pill);
  background: var(--border-subtle);
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
/*
 * 2026-08-31：圖示從左側獨立欄搬進標題那一列，卡片改成單欄。
 *
 * 原本是 `grid-template-columns: auto minmax(0, 1fr)`，圖示 32px 靠上
 * 對齊。實測（使用者回報「icon 下方空白太多」，我量了「流汗或碰水後」
 * 那張卡）：卡高 175px、圖示 32px、**圖示下方是一根 122px 的空柱子**。
 * 那根柱子沒有承載任何東西，卻在每一張卡上重複六次。
 *
 * 改成單欄之後：柱子整根消失、說明文字拿回約 40px 寬度、圖示與標題並排
 * 因此可以放大到 40px（見 IconLead.vue）——同時處理掉使用者反映的另一件
 * 事「圖示都太小了，很難注意到」。
 *
 * kicker（「8 篇文章」）跟標題疊在圖示右邊，不是自己佔一列：兩行文字
 * 加起來 47px，正好把 40px 的圖示那一列填滿。中途試過讓 kicker 獨佔
 * 一列，卡片反而從 175px 長到 189px——空柱子沒了，卻換來一整列空行。
 */
.education-category-card {
  display: grid;
  gap: var(--space-2);
  padding: var(--card-padding);
  color: inherit;
  text-decoration: none;
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
 *
 * 2026-08-31：class 從 .education-hero-card 改名成 .education-hero-banner，
 * 因為它不再是卡片列表的成員（見模板的註解）。名字要跟著角色走，否則
 * 下一個人會以為它還在 .education-category-grid 裡。
 */
.education-hero-banner {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-6);
  background: var(--color-surface-cream-strong);
  color: inherit;
  text-decoration: none;
}

.education-category-card strong {
  font-size: var(--font-size-card-title);
  font-weight: 500;
  line-height: var(--line-height-card-title);
}

.education-category-card__titles {
  display: grid;
  gap: var(--space-1);
}

/*
 * `text-wrap: balance`——但**它不是主要的解法**。
 *
 * 這件事來回過兩次，兩次都是同一句抱怨「右邊很空」：
 *
 * - 2026-09-01：預設斷行把「挑選防曬乳、衣物與配件，出門前一次準備」擠滿
 *   第一行，只丟「好。」兩個字到第二行 → 加上 balance
 * - 2026-09-03：balance 把 21 個字平分成兩行各約 11 字，**兩行都只用掉一半
 *   寬度**（實測 142／156，可用 294）→ 看起來更空
 *
 * 兩種斷行都醜，因為真正的問題是**字數剛好超過一行**。2026-09-03 改成把
 * 分類說明縮到 18 字以內（`content-reader.mjs` 的 `CATEGORY_DEFINITIONS`，
 * 由 `education-content.test.ts` 守著），375px 上六張卡全部一行。
 *
 * balance 留著是給更窄的手機：320px 時最長那一則仍會折行，那時兩行平均分配
 * 比孤字行好看（實測 127／127）。長文正文不要用 balance，會拖慢排版。
 */
.education-category-card small {
  color: var(--text-secondary);
  line-height: var(--line-height-body);
  text-wrap: balance;
}
/*
 * 2026-08-31：搬出列表之後就沒有特異性相爭的問題了（`.education-hero-banner`
 * 與 `.education-category-card` 不再套在同一個元素上），但規則留在原地
 * ——移動它沒有好處，而 2026-08-30 那次「放在前面 28px 會變 18px」的
 * 實測仍然是這個檔案裡值得記住的一課。
 */
.education-hero-banner strong {
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
.education-hero-banner .education-card-kicker,
.education-hero-banner small {
  color: var(--text-body);
}

/*
 * 橫幅的 kicker 保持膠囊（跟五張卡一致），但底色要換：一般卡的膠囊底是
 * --border-subtle，疊在更深的 cream-strong 上幾乎看不出來。用畫布色當底，
 * 在深底上反而是最清楚的做法。
 */
.education-hero-banner .education-card-kicker {
  background: var(--color-canvas);
}
</style>
