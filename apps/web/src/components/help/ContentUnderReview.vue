<script setup lang="ts">
/**
 * 未通過審查的內容狀態。
 *
 * PRD §13 與 AC-15／AC-63：缺少有效審查者、審查日期或再審日期的衛教內容
 * 一律阻擋發布。此時**不得**顯示未核准版本，也不得暗示內容即將出現時間。
 */

interface Props {
  title: string;
  body: string;
  requiredReview?: string | null;
}

withDefaults(defineProps<Props>(), { requiredReview: null });
</script>

<template>
  <section class="under-review app-card" role="status">
    <h2>{{ title }}</h2>
    <p>{{ body }}</p>
    <p v-if="requiredReview" class="under-review__meta">
      需要完成的審查：{{ requiredReview }}
    </p>
    <p class="under-review__note">這不影響提醒功能。</p>
  </section>
</template>

<style scoped>
.under-review {
  display: grid;
  justify-items: start;
  gap: var(--space-3);
  padding: clamp(1.25rem, 5vw, 2rem);
}

.under-review h2 {
  margin: 0;
  font-size: var(--font-size-section-title);
}

.under-review p {
  margin: 0;
  color: var(--text-body);
  line-height: 1.6;
}

.under-review__meta {
  color: var(--text-secondary);
  font-size: var(--font-size-body);
}

.under-review__note {
  color: var(--text-secondary);
  font-size: var(--font-size-body);
}
</style>
