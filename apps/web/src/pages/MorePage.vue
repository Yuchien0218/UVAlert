<script setup lang="ts">
import {
  CircleHelp,
  Cloud,
  Database,
  BookOpen,
  MessageSquare,
  Palette,
  Smartphone,
  TriangleAlert
} from "@lucide/vue";
import { computed } from "vue";
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

const allEntries = [
  {
    to: "/education",
    icon: BookOpen,
    label: "防曬衛教",
    description: "用白話讀懂 UV、防曬乳、補擦與曬後照護。"
  },
  {
    to: "/help",
    icon: CircleHelp,
    label: "常見問題",
    description: "防曬乳、提醒時間與使用限制的說明。"
  },
  {
    to: "/special-situation",
    icon: TriangleAlert,
    label: "特殊狀況",
    description: "醫療邊界與功能限制。"
  },
  {
    to: "/install",
    icon: Smartphone,
    label: "安裝到手機桌面",
    description: "安裝後資料較不易遺失；不安裝也可正常使用。"
  },
  {
    to: "/settings/display",
    icon: Palette,
    label: "顯示設定",
    description: "亮色、暗色與跟隨系統。"
  },
  {
    to: "/settings/data",
    icon: Database,
    label: "本機資料管理",
    description: "查看、匯出與清除這台裝置上的資料。"
  },
  {
    to: "/settings/sync",
    icon: Cloud,
    label: "跨裝置同步",
    description: "選擇性登入；同步前會先讓你確認內容。"
  },
  {
    to: "/feedback",
    icon: MessageSquare,
    label: "問題回報與意見回饋",
    description: "不用登入也可以回報錯誤或提供建議。"
  }
] as const;

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
      <h1 class="page-heading__title">更多</h1>
      <p class="page-heading__body">
        說明內容、問題回報與這台裝置上的設定都在這裡。
      </p>
    </header>

    <nav class="entry-list" aria-label="更多項目">
      <RouterLink
        v-for="entry in entries"
        :key="entry.to"
        class="entry app-card"
        :to="entry.to"
      >
        <component :is="entry.icon" :size="20" aria-hidden="true" />
        <span>
          <strong>{{ entry.label }}</strong>
          <small>{{ entry.description }}</small>
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
  padding: var(--space-5);
  color: inherit;
  text-decoration: none;
}

.entry strong,
.entry small {
  display: block;
}

.entry strong {
  font-weight: 500;
}

.entry small {
  margin-top: var(--space-1);
  color: var(--text-secondary);
  line-height: 1.6;
}
</style>
