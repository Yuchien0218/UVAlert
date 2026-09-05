<script setup lang="ts">
import type { IconName } from "../../generated/icons.generated";
import Icon from "../icons/Icon.vue";

/**
 * 領銜圖示：圖示與它所帶的標題並排在同一列。
 *
 * **為什麼要有這個元件，而不是各處各寫一次 `<Icon :size="40" />`。**
 *
 * 2026-08-31 使用者的原話是「怕大小改一個又跑掉」。量表上緣（40／56）
 * 出現在衛教分類卡、衛教主題頁標題、提醒頁空狀態這三個彼此離很遠的地方，
 * 它們在視覺上必須是同一件事——散在三個檔案裡的字面量做不到這件事，
 * 只要有人調其中一個，另外兩個就悄悄不一致了。
 *
 * 所以 40 與 56 只在這裡出現一次。要調領銜圖示的大小，改這個檔案。
 *
 * **兩個檔位的差別不是大小，是角色**：
 *
 * - `lead`（40px）：**旁邊有標題**。圖示與標題平起平坐，一起當那一列的
 *   視覺重量。用在分類卡、頁面標題。
 * - `hero`（56px）：**旁邊沒有別的內容**。空狀態裡圖示是唯一的視覺主體，
 *   所以改成上下堆疊、置中。
 *
 * 圖示一律 decorative——這個元件的前提就是旁邊（或下方）有可見的文字，
 * 螢幕閱讀器讀那段文字就夠了，不需要再播報一次圖示的 title。
 */

withDefaults(
  defineProps<{
    icon: IconName;
    size?: "lead" | "hero";
  }>(),
  { size: "lead" }
);
</script>

<template>
  <span class="icon-lead" :class="`icon-lead--${size}`">
    <Icon
      class="icon-lead__icon"
      :name="icon"
      :size="size === 'hero' ? 56 : 40"
    />
    <slot />
  </span>
</template>

<style scoped>
.icon-lead {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

/*
 * flex: none 是必要的，不是保險。
 *
 * 2026-08-31 的 ProductDetailPage 事故（見 CLAUDE.md「有些問題只有畫出來
 * 看才找得到」）就是 flex 子項預設可壓縮造成的：DOM、文字、測試都正確，
 * 只有寬度是錯的。圖示是固定尺寸的圖形，被壓縮就是變形。
 */
.icon-lead__icon {
  flex: none;
}

/*
 * hero 沒有並排的對象，所以改成堆疊——圖示在上、文字在下。
 *
 * **2026-08-31：改成靠左，不再置中**（使用者回報夜間頁「置中，跟其他頁
 * 有點不太像」）。確實：這是全站唯一置中的內容區塊，其他頁一律靠左，
 * 置中＋大留白讓它讀起來像錯誤頁，而不是「本來就沒事做」。
 *
 * 堆疊保留（那是 hero 與 lead 真正的差別：一個是唯一的視覺主體，一個是
 * 與標題平起平坐），只把水平對齊拉回全站的基準線。
 */
.icon-lead--hero {
  flex-direction: column;
  align-items: flex-start;
  gap: var(--space-4);
  text-align: start;
}
</style>
