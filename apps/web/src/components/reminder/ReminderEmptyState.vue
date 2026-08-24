<script setup lang="ts">
import Icon from "../icons/Icon.vue";
</script>

<template>
  <section
    class="empty-state app-card"
    data-testid="reminder-empty"
  >
    <div>
      <h2 class="empty-state__title empty-state__title--single-line">
        還沒有開始防曬提醒
      </h2>
      <p class="empty-state__body">
        開始提醒後，就能追蹤各部位的補擦時間。
      </p>
    </div>
    <RouterLink
      class="button button--primary empty-state__action empty-state__action--compact"
      to="/setup"
    >
      開始防曬提醒
      <Icon name="tool-arrow-right" :size="20" />
    </RouterLink>
  </section>
</template>

<style scoped>
/*
 * 2026-08-24：移除兩項舊實作。
 *
 * 1. 手刻的 inline SVG 大太陽背景裝飾——Icon.vue 明文規定「不要手刻
 *    inline SVG」，圖示一律走圖示系統；而且它只是裝飾，沒有承載資訊。
 * 2. background: --color-tracking-soft（「追蹤中」狀態色）。狀態色不得
 *    當裝飾用（DESIGN.md 第二節），這裡語意還剛好相反——這是**還沒有**
 *    任何追蹤的空狀態，卻套用了「追蹤中」的顏色。
 *
 * 改用共用的 .app-card，跟其他頁面的卡片一致。
 */
.empty-state {
  display: grid;
  justify-items: start;
  gap: var(--space-5);
  padding: clamp(1.5rem, 7vw, 2.5rem) clamp(1.25rem, 5vw, 2rem);
}

.empty-state__title {
  margin: 0;
  font-size: clamp(1.75rem, 7vw, 2.75rem);
  line-height: 1.12;
  letter-spacing: var(--letter-spacing-headline);
}

.empty-state__title--single-line {
  white-space: nowrap;
}

.empty-state__body {
  max-width: 36rem;
  margin: var(--space-4) 0 0;
  color: var(--text-secondary);
  line-height: 1.7;
}

.empty-state__action--compact {
  width: fit-content;
  max-width: 100%;
}
</style>
