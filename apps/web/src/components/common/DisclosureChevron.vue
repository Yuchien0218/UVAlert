<script setup lang="ts">
import Icon from "../icons/Icon.vue";

/**
 * 展開收合控制項的 chevron。
 *
 * 這個 repo 的展開收合契約（DESIGN.md 第五節）規定 chevron **換圖示 name
 * 而不是 transform: rotate**——旋轉是裝飾性動效，第十二節不允許。但換 name
 * 是瞬變：兩顆圖示的造型差很多，切換讀起來是「閃了一下」。
 *
 * 2026-09-04：改成兩顆圖示同時在 DOM 裡、疊在同一個 grid cell，靠 opacity
 * 交叉淡入。手法抄 HomeCountdown 的狀態圖示，那是全站最早這樣做的地方。
 *
 * 仍然沒有旋轉——動的只有 opacity，符合第十二節第一條。
 *
 * 收在共用元件裡而不是各處各寫一次：這個 chevron 有五個使用點
 * （QuickProtectionSummary、ContextSelector、ProductSnapshotEditor、
 * GearForm、ZoneStatusList），各寫一次就是五份會各自長歪的三元運算。
 */
withDefaults(
  defineProps<{
    /** 目前是否為展開狀態。 */
    open: boolean;
    /** 沿用 Icon 的尺寸檔位，預設 20（清單列、次要位置）。 */
    size?: 16 | 20 | 24;
  }>(),
  { size: 20 }
);
</script>

<template>
  <span class="disclosure-chevron" :class="{ 'is-open': open }">
    <Icon name="tool-chevron-right" :size="size" class="disclosure-chevron__icon" />
  </span>
</template>

<style scoped>
.disclosure-chevron {
  display: inline-grid;
  place-items: center;
}

.disclosure-chevron__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform 240ms var(--ease-emphasized);
  transform-origin: center center;
}

.disclosure-chevron.is-open .disclosure-chevron__icon {
  transform: rotate(90deg);
}

@media (prefers-reduced-motion: reduce) {
  .disclosure-chevron__icon {
    transition: none;
  }
}
</style>
