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
    <h2 data-typography-role="card-title">{{ title }}</h2>
    <p class="under-review__body">{{ body }}</p>
    <div class="under-review__aside">
      <p v-if="requiredReview" class="under-review__meta">
        需要完成的審查：{{ requiredReview }}
      </p>
      <p class="under-review__note">這不影響提醒功能。</p>
    </div>
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
}

.under-review p {
  margin: 0;
  color: var(--text-body);
  line-height: var(--line-height-body);
}

/*
 * 次要資訊（審查要求＋「不影響提醒」）自成一組、貼緊排列，與上方主說明
 * 之間保留卡片的 var(--space-3) 呼吸。原本三段等距（12px）排在同一個
 * grid 裡，讀起來像互不相干的零散句子（2026-09-02 排版稽核 §7.2）。
 */
.under-review__aside {
  display: grid;
  gap: var(--space-1);
}

.under-review__meta,
.under-review__note {
  color: var(--text-secondary);
  font-size: var(--font-size-supporting);
  line-height: var(--line-height-supporting);
}
</style>
