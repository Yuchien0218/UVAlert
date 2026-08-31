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

interface MoreEntry {
  to: string;
  icon: IconName;
  label: string;
  /** 選填——重述標題、沒有新資訊的說明一律不寫（B9 分類表）。 */
  description?: string;
}

const allEntries: readonly MoreEntry[] = [
  {
    to: "/settings/notifications",
    icon: "more-notifications",
    label: "通知設定"
    /*
     * 沒有 description 是刻意的：原本的「開啟或管理補擦提醒通知。」
     * 純粹重述標題，沒有帶進任何新資訊（B9 分類表第 1 項）。
     *
     * 若之後要補回文字，不要寫「背景通知」——目前沒有背景通知，用這
     * 個詞會讓使用者以為關掉瀏覽器仍收得到（Sitemap §4.3，2026-08-23
     * 裁決）。
     */
  },
  {
    to: "/education",
    icon: "more-education",
    label: "防曬衛教",
    /*
     * 「六個主題」是會過期的事實——加第七個衛教分類這句就變錯的。
     * MorePage.test.ts 有一條測試把它跟 docs/education/articles 的
     * category frontmatter 綁在一起，改分類數就會紅。裁決與代價見
     * docs/decisions/2026-08-29-b9-pre-decision.md 第八節。
     */
    description: "從 UV 到曬後照護，共六個主題。"
  },
  {
    to: "/help",
    icon: "more-about",
    label: "常見問題",
    description: "防曬乳、提醒時間與使用限制。"
  },
  {
    to: "/special-situation",
    icon: "state-warning",
    label: "特殊狀況",
    description: "醫療邊界與功能限制。"
  },
  {
    to: "/install",
    icon: "more-install",
    label: "安裝到手機桌面",
    description: "可將此頁面安裝至手機主畫面，亦可直接於瀏覽器正常使用。"
  },
  {
    to: "/settings/data",
    icon: "more-data",
    label: "本機資料與隱私",
    /*
     * 2026-08-29：本卡與原「跨裝置同步」卡合併。說明文字經裁決，不是
     * 實作時自行改寫的——三個分句分別承接本機優先的隱私承諾、免登入
     * 的決策條件，以及「同步前會先讓你確認內容」這句不可隱藏的前提。
     * 見 docs/decisions/2026-08-29-settings-data-sync-merge.md 第九節。
     */
    description:
      "資料預設儲存於本機，登入即可跨裝置同步。"
  },
  {
    to: "/feedback",
    icon: "more-feedback",
    label: "問題回報與意見回饋",
    description: "免登入即可回報錯誤或提供建議。"
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
      <p class="page-heading__body">
        系統設定、衛教資訊與問題回報。
      </p>
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
          <small v-if="entry.description">{{ entry.description }}</small>
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

.entry strong,
.entry small {
  display: block;
}

.entry strong {
  font-weight: 500;
  line-height: 1.4;
}

.entry small {
  margin-top: var(--space-1);
  color: var(--text-secondary);
  line-height: var(--line-height-body);
}
</style>
