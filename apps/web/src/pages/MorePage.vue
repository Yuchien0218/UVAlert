<script setup lang="ts">
import { computed } from "vue";
import Icon from "../components/icons/Icon.vue";
import type { IconName } from "../generated/icons.generated";
import {
  isSpecialSituationPublishable,
  listPublishableTopics
} from "../features/help/helpTopics";

/**
 * 更多設定。
 *
 * 2026-08-06 sitemap 指出本頁「目前只有外觀設定」，而規格要求它承載
 * Q&A、特殊狀況、安裝、顯示與資料管理五類入口——在此之前那六頁
 * 在 App 裡沒有任何進入點。顯示設定已移到 `/settings/display`。
 */

/**
 * 這一頁的列**只有標題**（2026-09-03，使用者裁決「去掉所有的說明」）。
 *
 * 前情：2026-08-29 的 B9 裁決是「重述標題、沒有新資訊的說明一律不寫」，
 * 結果七列裡六列有說明、一列沒有——那一列因此比其他矮一截，圖示的垂直
 * 位置也和別人對不上（稽核 §E）。稽核當時提的解法是「補一句」，使用者選了
 * 相反的方向。
 *
 * 一併收掉兩個包袱：`description` 這個選填欄位，以及「共六個主題」那個
 * **會過期的事實**——加第七個衛教分類就會讓那句話變錯，原本得靠一條專門
 * 綁著 `docs/education/articles` 的測試才擋得住。
 */
interface MoreEntry {
  to: string;
  icon: IconName;
  label: string;
}

const allEntries: readonly MoreEntry[] = [
  {
    to: "/settings/notifications",
    icon: "more-notifications",
    label: "通知設定"
  },
  {
    to: "/education",
    icon: "more-education",
    label: "防曬衛教"
  },
  {
    to: "/help",
    icon: "more-about",
    label: "常見問題"
  },
  {
    to: "/special-situation",
    icon: "state-warning",
    label: "特殊狀況"
  },
  {
    to: "/install",
    icon: "more-install",
    label: "安裝到手機桌面"
  },
  {
    to: "/settings/data",
    icon: "more-data",
    label: "本機資料與隱私"
  },
  {
    to: "/feedback",
    icon: "more-feedback",
    label: "問題回報與意見回饋"
  }
];

/**
 * 內容未過審的入口不列出。
 *
 * 三個說明頁與特殊狀況目前全部被審查閘門擋住，列出來只會讓使用者
 * 連撞空門。閘門是資料驅動的——核准後入口會自動回來，不必改這裡。
 * /help 總覽本身仍可直接到達，顯示「目前沒有可查看的內容」是
 * S-15 明文要求的行為。
 */
const entries = computed(() =>
  allEntries.filter((entry) => {
    if (entry.to === "/help") return listPublishableTopics().length > 0;
    if (entry.to === "/special-situation") {
      return isSpecialSituationPublishable();
    }
    return true;
  })
);
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title" data-typography-role="page-title">
        更多
      </h1>
      <p class="page-heading__body">系統設定、衛教資訊與問題回報。</p>
    </header>

    <nav class="entry-list" aria-label="更多項目">
      <RouterLink
        v-for="entry in entries"
        :key="entry.to"
        class="entry"
        :to="entry.to"
      >
        <Icon :name="entry.icon" :size="32" />
        <span>
          <strong>{{ entry.label }}</strong>
        </span>
      </RouterLink>
    </nav>
  </div>
</template>

<style scoped>
.entry-list {
  display: grid;
  gap: var(--space-3);
}

.entry {
  display: grid;
  min-height: var(--tap-target);
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  background: var(--surface-primary);
  color: inherit;
  text-decoration: none;
}

@media (min-width: 48rem) {
  .entry-list {
    grid-template-columns: 1fr 1fr;
  }
}

.entry strong {
  display: block;
  font-weight: 500;
  line-height: 1.4;
}
</style>
