<script setup lang="ts">
import Icon from "../icons/Icon.vue";

defineEmits<{
  resume: [];
}>();
</script>

<template>
  <aside class="process-banner" aria-labelledby="setup-process-title">
    <Icon name="feature-setup-steps" :size="24" class="process-banner__icon" />
    <div class="process-banner__content">
      <p class="process-banner__eyebrow">提醒設定進行中</p>
      <h2 id="setup-process-title" data-typography-role="section-title">
        提醒設定尚未完成
      </h2>
      <p>完成防曬乳設定後，可以返回繼續確認實際塗抹時間。</p>
    </div>
    <button
      class="button button--primary process-banner__action"
      type="button"
      @click="$emit('resume')"
    >
      返回提醒設定
      <Icon name="tool-arrow-right" :size="20" />
    </button>
  </aside>
</template>

<style scoped>
/*
 * 2026-08-23 修正：原本用 --color-soon／--color-soon-soft（即將到期的
 * 琥珀色），但這個橫幅講的是「提醒設定還沒完成，要不要繼續」，跟部位
 * 即將到期是完全不同的語意——同一個顏色會讓使用者把「該去完成設定」
 * 跟「該去補擦」搞混。改用 --color-surface-cream-strong ＋
 * --color-primary，跟 context-option-selected 同一組配色：「需要你
 * 採取行動」而不是「警示」。2026-08-29 圖示已換成自訂的
 * feature-setup-steps，不再使用 @lucide/vue。
 */
.process-banner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-3) var(--space-4);
  padding: var(--card-padding);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-lg);
  background: var(--color-surface-cream-strong);
}

.process-banner__icon {
  margin-top: var(--space-1);
  color: var(--color-primary);
}

.process-banner__content {
  min-width: 0;
}

.process-banner__eyebrow,
.process-banner h2,
.process-banner p {
  margin: 0;
}

.process-banner__eyebrow {
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  font-weight: 500;
}

.process-banner h2 {
  margin-top: var(--space-2);
  font-size: var(--font-size-section-title);
}

.process-banner__content > p:last-child {
  margin-top: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-body);
}

.process-banner__action {
  grid-column: 1 / -1;
  width: 100%;
}
</style>
