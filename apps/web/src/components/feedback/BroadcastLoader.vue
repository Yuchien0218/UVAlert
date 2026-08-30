<script setup lang="ts">
/**
 * 全站 loading 指示器：播報印記的射線依序亮起。
 *
 * 為什麼是這個而不是通用 spinner——它**就是品牌標記本身在動**，不是放在
 * 旁邊的裝飾。射線是單側非對稱的（Logo 原本就這樣），所以不會被讀成
 * 「轉動的太陽」，也不會跟 feature-uv-forecast 之類的對稱太陽混淆。
 * 語意上也對：這個產品叫防曬晴報員，載入中＝正在播報。
 *
 * 三件跟品牌有關的紀律：
 *
 * 1. **path 資料是從 Logo 原樣搬過來的，不可手改**。幾何真實來源是
 *    Illustrator（`docs/design/logo/uvalert-lockup-horizontal.ai`）。置中
 *    靠外層 <g> 的 transform 完成，不動任何座標——這樣 Logo 之後重新匯出
 *    時，這裡可以直接整段換掉。
 * 2. **顏色寫死 Logo 的墨咖／琥珀金**，跟 `BrandHeader.vue` 同一個做法。
 *    `packages/ui/src/styles.css` 沒有這兩個色的 token，因為那份是「介面」
 *    配色，Logo 與圖示是另一套（DESIGN.md 第八節），兩者刻意不互相代入。
 * 3. **只用 opacity 動畫**，不旋轉、不位移、不縮放（DESIGN.md 第十二節）。
 *
 * 節奏是刻意調過的，不是等距循環：
 *
 * - 射線間隔遞減（0 → 0.14 → 0.24），做出由近而遠的加速感
 * - 淡入快、淡出慢，讓光留有餘暉
 * - 每輪末尾留約 0.55 秒停頓，打破無縫循環的機械感
 * - 最低透明度是 0.22 不是 0，射線始終在，只是暗著
 *
 * 停頓與底色都調過一次：初版是 1.9 秒一輪、底透明度 0.18，畫出關鍵影格
 * 之後發現安靜期佔了半輪、而且射線在底部幾乎消失，整體讀起來像「卡住」
 * 而不是「在等」。loader 的第一要務是看起來還活著。
 *
 * 第二次調整（同日）：收緊之後仍然像卡住，原因是**圓點從頭到尾不動**。
 * 它是畫面上最大、最飽和的元素，眼睛會停在它身上；射線再怎麼明滅，主角
 * 一直靜止就會讀成靜止。解法不是讓射線轉（見下），而是讓圓點在射線掃完
 * 之後接手：暗下去再亮起來，像蓄能，然後射線再發射。任何時刻都恰好有
 * 一個元素在動，安靖期就消失了。
 *
 * **為什麼不讓射線繞著圓點微幅轉動**——那是最直覺的解法，但有三個問題：
 * 它違反「動畫只用 opacity」；它把使用者原本就嫌通用的旋轉又放回來；
 * 最重要的是**這是品牌標記本身**，射線是單側非對稱的固定造型，轉起來等於
 * 有一段時間 Logo 是歪的。
 *
 * 另外：整顆 loader **延遲 0.25 秒才出現**。本機優先的讀取大多幾十毫秒就
 * 回來，沒有這個延遲的話 loader 會閃一下再消失，那個閃動本身就是最廉價的
 * 觀感。快的請求根本看不到它。
 */
interface Props {
  label?: string;
}

withDefaults(defineProps<Props>(), {
  label: "載入中"
});

/** 由上而下掃過。間隔遞減，不是等距。 */
/*
 * 2026-08-30：跟著 Logo 重新匯出一起更新座標，正如上方紀律第 1 點預告的
 * 「Logo 之後重新匯出時，這裡可以直接整段換掉」。
 *
 * **視覺零變化。** 新版 lockup 只是把畫布留白裁掉，圖形本身沒動——實測
 * 相對位移完全一致（舊 55.88−45.78 ＝ 新 16.1−6 ＝ 10.1），整組 mark 平移
 * 了 (39.78, 26.20)，正好等於舊畫布的左留白與上留白。所以這裡換的是數字
 * 來源，不是造型。
 */
const rays = [
  {
    delay: "0s",
    fill: "#33291F",
    d: "M16.1,9.64l10-6c.9-.6,1.1-1.9.5-2.8-.6-.8-1.7-1.1-2.6-.6l-10,6c-.9.6-1.1,1.9-.5,2.8.6.8,1.7,1.1,2.6.6Z"
  },
  {
    delay: "0.14s",
    fill: "#33291F",
    d: "M18,17.95h14c1.1,0,2-.9,2-2s-.9-2-2-2h-14c-1.1,0-2,.9-2,2s.9,2,2,2Z"
  },
  {
    delay: "0.24s",
    fill: "#C1832E",
    d: "M14.17,26.01l9.63,5.35c1.07.53,2.35.21,2.89-.86s.21-2.35-.86-2.89h0l-9.63-5.35c-1.07-.53-2.35-.21-2.89.86s-.21,2.35.86,2.89Z"
  }
];
</script>

<template>
  <div class="broadcast-loader" role="status" :aria-label="label">
    <svg class="broadcast-loader__icon" viewBox="0 0 48 48" aria-hidden="true">
      <!--
        置中與縮放只做在這一層，內部座標維持 Logo 原值。
        2026-08-30：Logo 裁掉畫布留白後整組平移了 (39.78, 26.20)，置中偏移
        跟著減同一個量（56.78−39.78＝17、42.4−26.2＝16.2）。scale 不變，
        因為圖形大小沒變。
      -->
      <g transform="translate(24 24) scale(1.176) translate(-17 -16.2)">
        <circle
          class="broadcast-loader__core"
          cx="6"
          cy="15.94"
          r="6"
          fill="#C1832E"
        />
        <path
          v-for="ray in rays"
          :key="ray.d"
          class="broadcast-loader__ray"
          :style="{ '--ray-delay': ray.delay }"
          :d="ray.d"
          :fill="ray.fill"
        />
      </g>
    </svg>
  </div>
</template>

<style scoped>
/*
 * 延遲出現：前 0.25 秒維持 opacity 0，之後才淡入。快取命中的讀取完全
 * 看不到這顆 loader，也就不會有「閃一下」。
 */
.broadcast-loader {
  display: inline-flex;
  opacity: 0;
  animation: broadcast-loader-appear var(--duration-fast) var(--ease-out)
    var(--duration-loader-delay) forwards;
}

/* 3.25rem 是這顆 loading 圖示專屬的裝飾尺寸，不在 DESIGN.md 的
   16/20/24 圖示級距裡，沿用 SunLoader 原本的尺寸。 */
.broadcast-loader__icon {
  width: 3.25rem;
  height: 3.25rem;
}

/*
 * 射線的動畫延遲要加上那 0.25 秒，否則 loader 淡入時掃描已經跑到一半，
 * 每次出現的相位都不一樣。
 */
.broadcast-loader__ray {
  opacity: 0.22;
  animation: broadcast-loader-sweep var(--duration-loader-cycle)
    var(--ease-in-out) infinite;
  animation-delay: calc(var(--duration-loader-delay) + var(--ray-delay));
}

/*
 * 圓點在射線掃完（約 64%）之後才開始暗下去，100% 回到全亮，緊接著下一輪
 * 射線發射。射線與圓點刻意不重疊，才會讀成「交棒」而不是「一起閃」。
 */
.broadcast-loader__core {
  animation: broadcast-loader-charge var(--duration-loader-cycle)
    var(--ease-in-out) infinite;
  animation-delay: var(--duration-loader-delay);
}

@keyframes broadcast-loader-charge {
  0%,
  64% {
    opacity: 1;
  }
  86% {
    opacity: 0.45;
  }
  100% {
    opacity: 1;
  }
}

@keyframes broadcast-loader-appear {
  to {
    opacity: 1;
  }
}

/* 10% 亮起（快）、48% 回到底（慢）、其餘是停頓 */
@keyframes broadcast-loader-sweep {
  0% {
    opacity: 0.22;
  }
  10% {
    opacity: 1;
  }
  48% {
    opacity: 0.22;
  }
  100% {
    opacity: 0.22;
  }
}

/*
 * 減少動態：射線不掃描，但「延遲出現」保留——它防的是畫面閃動，
 * 本身不是裝飾。改成瞬間切換，沒有淡入。
 */
@media (prefers-reduced-motion: reduce) {
  .broadcast-loader {
    animation: broadcast-loader-appear 0s var(--ease-out)
      var(--duration-loader-delay) forwards;
  }

  .broadcast-loader__ray {
    animation: none;
    opacity: 0.75;
  }

  .broadcast-loader__core {
    animation: none;
  }
}
</style>
