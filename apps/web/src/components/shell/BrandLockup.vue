<script setup lang="ts">
/**
 * 品牌 lockup。
 *
 * **2026-09-01 從 `BrandHeader.vue` 抽出**，因為分享卡也要放同一個 lockup。
 * **2026-09-02 幾何再往下抽一層到 `brandLockupMarkup.ts`**：分享圖要在
 * canvas 上畫出真的 logo，而 canvas 讀不到 Vue 模板——幾何必須是資料才能
 * 被 DOM 與 canvas 兩邊共用。理由與「不可手改 path」的規則見那個檔案。
 *
 * **兩種 variant，差別是有沒有中文字標**（2026-09-02 使用者要求分享卡改成
 * 標題前面只放標記）：
 *
 * - `full`（預設）：標記 ＋「防曬晴報員」字標，橫式。用在 App 頁首。
 * - `mark`：只有標記。用在**旁邊已經有品牌以外的標題**的地方——分享卡的
 *   標題是「我的防曬裝備」，再放一次字標等於同一列有兩組字。
 *
 * 兩種 variant 走的是不同的 viewBox，不是用 CSS 把字標裁掉——裁切會讓
 * `getBBox`、可及性樹與 canvas 三邊看到不同的東西。
 *
 * 這裡用 `v-html` 是刻意的：內容是專案自己的靜態常數，不是外部輸入，
 * 沒有注入面。改用 `v-for` 逐一渲染元素則要在這裡重新實作一次 SVG 的
 * 屬性對應，等於把幾何拆成第二種表示法。
 *
 * 尺寸由呼叫端用 class 決定（`height` ＋ `width: auto`），這裡不設。
 */
import { computed } from "vue";
import {
  BRAND_LOCKUP_MARKUP,
  BRAND_LOCKUP_VIEW_BOX,
  BRAND_MARK_MARKUP,
  BRAND_MARK_VIEW_BOX
} from "./brandLockupMarkup";

const props = withDefaults(
  defineProps<{
    variant?: "full" | "mark";
  }>(),
  { variant: "full" }
);

const viewBox = computed(() =>
  props.variant === "mark" ? BRAND_MARK_VIEW_BOX : BRAND_LOCKUP_VIEW_BOX
);

const markup = computed(() =>
  props.variant === "mark" ? BRAND_MARK_MARKUP : BRAND_LOCKUP_MARKUP
);
</script>

<template>
  <!-- eslint-disable-next-line vue/no-v-html -->
  <svg :viewBox="viewBox" role="img" aria-hidden="true" v-html="markup" />
</template>
