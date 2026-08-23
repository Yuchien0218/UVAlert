<script setup lang="ts">
/**
 * 首頁的分隔連結列——「五日 UV 預報」「查看最近紀錄」「查看完整狀態」。
 *
 * 用細分隔線而不是卡片，是刻意的：DESIGN.md 第六節「使用留白、分隔線與
 * 文字層級建立秩序，避免每一塊內容都變成同重量的卡片」。首頁已經有一個
 * 主 CTA，這些次要入口不該跟它競爭視覺重量。
 */

defineProps<{
  label: string;
  /** 右側補充，例如「3 個追蹤部位」。沒有就只顯示箭號。 */
  detail?: string | null;
  to: string;
}>();
</script>

<template>
  <RouterLink class="link-row" :to="to">
    <span class="link-row__label">{{ label }}</span>
    <span class="link-row__detail">
      <span v-if="detail">{{ detail }}</span>
      <span class="link-row__chevron" aria-hidden="true">›</span>
    </span>
  </RouterLink>
</template>

<style scoped>
.link-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: var(--space-3);
  /*
   * 不寫 min-height——.button 那組的教訓（DESIGN.md 第十節 2026-08-22
   * 更正）：元件 scoped CSS 覆寫尺寸會蓋掉共用 token。這裡用 padding
   * 撐出 44px 觸控目標。
   */
  padding: var(--space-4) 0;
  border-bottom: 1px solid var(--border-subtle);
  color: var(--text-primary);
  text-decoration: none;
}

.link-row__label {
  font-size: 0.9375rem;
}

.link-row__detail {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-2);
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
}

.link-row__chevron {
  font-size: 1rem;
}
</style>
