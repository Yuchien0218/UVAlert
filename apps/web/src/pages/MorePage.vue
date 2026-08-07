<script setup lang="ts">
import {
  CircleHelp,
  Database,
  Palette,
  Smartphone,
  TriangleAlert
} from "@lucide/vue";

/**
 * 更多設定。
 *
 * 2026-08-06 sitemap 指出本頁「目前只有外觀設定」，而規格要求它承載
 * Q&A、特殊狀況、安裝、顯示與資料管理五類入口——在此之前那六頁
 * 在 App 裡沒有任何進入點。顯示設定已移到 `/settings/display`。
 */

const entries = [
  {
    to: "/help",
    icon: CircleHelp,
    label: "常見問題",
    description: "防曬產品、提醒時間與使用限制的說明。"
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
    label: "安裝到手機",
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
  }
] as const;
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title">更多設定</h1>
      <p class="page-heading__body">
        說明內容與這台裝置上的設定。資料只保存在本機。
      </p>
    </header>

    <nav class="entry-list" aria-label="更多設定項目">
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
