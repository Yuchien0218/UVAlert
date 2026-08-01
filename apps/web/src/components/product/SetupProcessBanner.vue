<script setup lang="ts">
import { ArrowRight, ClipboardList } from "@lucide/vue";

defineEmits<{
  resume: [];
}>();
</script>

<template>
  <aside class="process-banner" aria-labelledby="setup-process-title">
    <ClipboardList
      class="process-banner__icon"
      :size="24"
      :stroke-width="1.6"
      aria-hidden="true"
    />
    <div class="process-banner__content">
      <p class="process-banner__eyebrow">Setup in progress</p>
      <h2 id="setup-process-title">提醒設定尚未完成</h2>
      <p>完成產品設定後，可以返回繼續確認實際塗抹時間。</p>
    </div>
    <button
      class="button button--primary process-banner__action"
      type="button"
      @click="$emit('resume')"
    >
      返回提醒設定
      <ArrowRight :size="18" aria-hidden="true" />
    </button>
  </aside>
</template>

<style scoped>
.process-banner {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--space-3) var(--space-4);
  padding: var(--space-5);
  border: 1px solid var(--color-soon);
  border-radius: var(--radius-lg);
  background: var(--color-soon-soft);
}

.process-banner__icon {
  margin-top: var(--space-1);
  color: var(--color-soon);
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
  font-size: 0.8rem;
  font-weight: 500;
}

.process-banner h2 {
  margin-top: var(--space-2);
  font-size: 1.15rem;
  font-weight: 500;
}

.process-banner__content > p:last-child {
  margin-top: var(--space-2);
  color: var(--text-secondary);
  font-size: 0.875rem;
  line-height: 1.7;
}

.process-banner__action {
  grid-column: 1 / -1;
  width: 100%;
}
</style>
