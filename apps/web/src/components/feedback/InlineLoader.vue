<script setup lang="ts">
/**
 * 按鈕內的行內載入指示器：三段膠囊由左至右依序亮起。
 *
 * 取代 2026-08-29 之前的做法——`tool-loading` 圖示套 `transform: rotate`
 * 無限旋轉。那個做法有兩個問題：它是最通用的那種轉圈，而且**違反 DESIGN.md
 * 第八節「動畫只用 opacity，不用位移或縮放」**。轉圈是從 Lucide spinner
 * 沿用下來的慣性，不是這個設計系統的決定。
 *
 * 造型是 `BroadcastLoader` 的直線版：那顆是播報印記的射線由內而外掃過，
 * 這顆是同一個掃描節奏攤平成一排。時間曲線（1.5s、10% 亮起、48% 回到底、
 * 間隔遞減）刻意跟它完全一致，兩個 loader 在同一個 App 裡才像同一件事。
 *
 * 為什麼不直接把 `BroadcastLoader` 縮到 16px：印記是「一顆圓點＋三條細射線」，
 * 在 16px 射線只剩不到 1px，會糊成一團髒點。
 *
 * 顏色用 `currentColor`，因為它會出現在主要按鈕（深底淺字）與次要按鈕
 * （淺底深字）兩種情境，必須繼承按鈕自己的文字色。
 *
 * 這顆**沒有**像 `BroadcastLoader` 那樣延遲 0.25 秒出現。那個延遲是為了
 * 避免快取命中時閃一下；但這裡是使用者剛按下按鈕，立即回饋比避免閃動重要。
 */
interface Props {
  label?: string;
}

withDefaults(defineProps<Props>(), {
  label: "處理中"
});

/**
 * 間隔遞減，跟 BroadcastLoader 同一組值。custom property 也刻意共用
 * `--ray-delay` 這個名字——兩顆 loader 是同一個「掃描延遲」概念，一個概念
 * 一個名字，stylelint 的 token 白名單也只需要一筆。
 */
const segments = [
  { delay: "0s", x: 1 },
  { delay: "0.14s", x: 8.5 },
  { delay: "0.24s", x: 16 }
];
</script>

<template>
  <svg
    class="inline-loader"
    viewBox="0 0 21 8"
    role="img"
    :aria-label="label"
  >
    <rect
      v-for="segment in segments"
      :key="segment.x"
      class="inline-loader__segment"
      :style="{ '--ray-delay': segment.delay }"
      :x="segment.x"
      y="2.75"
      width="4"
      height="2.5"
      rx="1.25"
      ry="1.25"
      fill="currentColor"
    />
  </svg>
</template>

<style scoped>
.inline-loader {
  width: 1.3em;
  height: 0.5em;
  margin-right: 0.5em;
  flex: none;
}

.inline-loader__segment {
  opacity: 0.25;
  animation: inline-loader-sweep 1.5s ease-in-out infinite;
  animation-delay: var(--ray-delay);
}

@keyframes inline-loader-sweep {
  0% {
    opacity: 0.25;
  }
  10% {
    opacity: 1;
  }
  48% {
    opacity: 0.25;
  }
  100% {
    opacity: 0.25;
  }
}

@media (prefers-reduced-motion: reduce) {
  .inline-loader__segment {
    animation: none;
    opacity: 0.75;
  }
}
</style>
