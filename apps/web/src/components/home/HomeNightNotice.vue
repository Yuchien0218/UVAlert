<script setup lang="ts">
/**
 * 夜間說明（沒有進行中的提醒時）。
 *
 * 這一段存在的理由是「解釋為什麼現在沒有事情要做」。夜間頁刻意不放主要
 * CTA——UV 是 0，不需要防曬，沒有倒數可開始——但整頁沒有行動會讓使用者
 * 分不出是功能壞了還是本來就沒事做（2026-08-23 裁決，見
 * `docs/decisions/2026-08-23-wireframe-copy-fixes.md` §3.3）。
 *
 * DESIGN.md 第六節「每頁只保留一個最主要任務與一個主要 CTA」是**上限
 * 不是下限**，沒有 CTA 並不違反規範。
 */

defineEmits<{ start: [] }>();
</script>

<template>
  <div class="night-notice">
    <p class="night-notice__body">現在不需要防曬，明早出門前再開始提醒。</p>

    <!--
      逃生出口不可省略：裝置時區或時鐘設錯、跨時區旅行、夜班戶外工作者
      都可能真的需要在夜間開始提醒。硬性阻斷會讓產品對他們完全不可用。
      做成 text link 而非按鈕，避免與「現在不需要防曬」互相矛盾。
    -->
    <button
      class="text-link night-notice__escape"
      type="button"
      @click="$emit('start')"
    >
      還是要開始提醒
    </button>
  </div>
</template>

<style scoped>
.night-notice {
  display: grid;
  gap: var(--space-5);
}

.night-notice__body {
  margin: 0;
  color: var(--text-emphasis);
  font-size: var(--font-size-body);
  line-height: 1.6;
}

.night-notice__escape {
  justify-self: start;
  padding: var(--space-2) 0;
  border: 0;
  background: none;
  font: inherit;
  font-size: var(--font-size-caption);
  cursor: pointer;
}
</style>
