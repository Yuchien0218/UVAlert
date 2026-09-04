<script setup lang="ts">
import { RouterView } from "vue-router";
import AppShell from "./components/shell/AppShell.vue";

/**
 * 離場的保險絲，毫秒。**必須 ≥ `--duration-fast`**，
 * `appTransitionTimeout.test.ts` 會比對兩邊。
 *
 * ## 為什麼需要它
 *
 * Vue 預設等 `transitionend` 才算離場結束，而 `mode="out-in"` 又要等離場結束
 * 才掛新元件。**隱藏的文件不跑 `requestAnimationFrame`**，於是離場永遠停在
 * `page-leave-from` 那一格，`transitionend` 永遠不來——**新頁面永遠不掛載**。
 * 2026-09-04 的頁面健檢實測到：路由與 `document.title` 都變了，畫面卻停在
 * 三頁以前。真實情境是背景分頁。
 *
 * 而且這不只是「動畫沒播」：元件不掛載，`onMounted` 就不跑，任何靠它做的事
 * 都一起停住（同一天做的「不存在的裝備 id 導回清單」就是被它擋住的）。
 *
 * ## 為什麼是 JS hook
 *
 * `@leave` 只要收下 `done` 這個參數，Vue 就不再等 `transitionend`，改由這個
 * hook 負責宣告結束——而 `setTimeout` 在隱藏的文件裡照樣會觸發。CSS 淡出仍然
 * 由 `.page-leave-active` 負責，這裡只是保證它一定會被收掉。
 *
 * 緩衝 40ms：class 從 `leave-from` 換成 `leave-to` 本身要等一個影格，
 * 抓剛好 160ms 有機會在淡出還差一點時就把元素拔掉。
 *
 * ## 試過但不能用的兩個做法（不要再走一次）
 *
 * - `:css="visible"` 依可見性關掉 CSS 轉場：`css` **不能反應式切換**，Vue
 *   建立 transition hook 時就讀死了，中途改會讓內部狀態壞掉——實測整個 App
 *   拋 `Cannot read properties of null (reading 'parentNode')`。
 * - `:duration="{ leave: 160 }"` 讓 Vue 用計時器放行：沒用。Vue 的 `resolve`
 *   本身就寫在 `nextFrame` 裡，沒有 rAF 就到不了那一行。
 * - 拿掉 `mode="out-in"`：新頁面確實會掛載了，但離場的舊頁**會累積**——實測
 *   在隱藏狀態連續換六頁之後，`<main>` 裡躺著七棵 DOM 樹。
 */
const LEAVE_TIMEOUT_MS = 200;

function finishLeave(_element: Element, done: () => void): void {
  globalThis.setTimeout(done, LEAVE_TIMEOUT_MS);
}
</script>

<template>
  <AppShell>
    <!--
      換頁的離場轉場（2026-09-04，裁決 4：接受多 120–160ms）。

      在這之前 page-stack 只處理進場——舊頁瞬間消失、新頁才開始淡入，
      中間有一格「什麼都沒有」的空白。加上離場之後，舊頁先淡出，新頁接手。

      mode="out-in" 而不是預設的同時進出：兩頁同時存在會疊在一起，在
      #FAF5EC 這種低對比暖底上會讀成鬼影，版面也會瞬間變成兩倍高。代價是
      總時間變成離場 ＋ 進場，也就是使用者接受的那 160ms。

      @leave 是保險絲，不是動畫——動畫仍然在 CSS 裡。理由見上方註解。

      :key 用 route.path 而不是 route.fullPath——查詢字串變化（例如衛教
      分類的篩選）不該整頁重來。
    -->
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in" @leave="finishLeave">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </AppShell>
</template>
