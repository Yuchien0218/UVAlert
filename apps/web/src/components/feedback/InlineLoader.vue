<script setup lang="ts">
/**
 * 按鈕內的行內載入指示器：三段膠囊由左至右依序亮起。
 *
 * 取代 2026-08-29 之前的做法——`tool-loading` 圖示套 `transform: rotate`
 * 無限旋轉。那個做法有兩個問題：它是最通用的那種轉圈，而且**違反 DESIGN.md
 * 第十二節「動畫只用 opacity，不用位移或縮放」**。轉圈是從 Lucide spinner
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
 *
 * ---
 *
 * **2026-09-05：改成純裝飾（`aria-hidden`），並移除 `label` prop。**
 *
 * 這顆的出現位置**永遠**是「按鈕內、旁邊就有忙碌文字」——按鈕自己已經從
 * 「儲存」變成「儲存中…」。原本的 `role="img"` ＋ `aria-label="處理中"`
 * 等於把同一件事播報兩次；`ReapplyPage` 那顆按鈕旁邊還有一個
 * `role="status"` 的「正在儲存補擦紀錄」，會變成三次。
 *
 * 同一天把它接到 13 顆按鈕上，這個重複會被放大 13 倍，所以在接之前先修。
 * 判準與 `GearSharePage` 對「儲存圖片」左邊那顆圖示的處置一致：**按鈕本身
 * 就有可見文字，螢幕閱讀器讀那句就夠了。**
 *
 * `label` prop 一併移除——沒有任何呼叫端傳過它（`SetupPage` 是
 * `<InlineLoader v-if="…" />`），留著只會讓下一個人以為它還有作用。
 */

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
  <svg class="inline-loader" viewBox="0 0 21 8" aria-hidden="true">
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
  animation: inline-loader-sweep var(--duration-loader-cycle) var(--ease-in-out)
    infinite;
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
