<script setup lang="ts">
/**
 * 品牌橫式 lockup（標記 ＋ 字標）。
 *
 * **2026-09-01 從 `BrandHeader.vue` 抽出**，因為分享卡也要放同一個 lockup。
 * **2026-09-02 幾何再往下抽一層到 `brandLockupMarkup.ts`**：分享圖要在
 * canvas 上畫出真的 logo，而 canvas 讀不到 Vue 模板——幾何必須是資料才能
 * 被 DOM 與 canvas 兩邊共用。理由與「不可手改 path」的規則見那個檔案。
 *
 * 這裡用 `v-html` 是刻意的：內容是專案自己的靜態常數，不是外部輸入，
 * 沒有注入面。改用 `v-for` 逐一渲染元素則要在這裡重新實作一次 SVG 的
 * 屬性對應，等於把幾何拆成第二種表示法。
 *
 * 尺寸由呼叫端用 class 決定（`height` ＋ `width: auto`），這裡不設。
 */
import {
  BRAND_LOCKUP_MARKUP,
  BRAND_LOCKUP_VIEW_BOX
} from "./brandLockupMarkup";
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <svg
    :viewBox="BRAND_LOCKUP_VIEW_BOX"
    role="img"
    aria-hidden="true"
    v-html="BRAND_LOCKUP_MARKUP"
  />
</template>
