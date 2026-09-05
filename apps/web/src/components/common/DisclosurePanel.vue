<script setup lang="ts">
import { ref, watch } from "vue";

/**
 * 展開收合的內容區。**高度是連續的，不是瞬間消失。**
 *
 * 2026-09-04 裁決 2：為了連續感，突破「動畫只用 opacity」——收合時若只讓
 * 內容淡出，下方的內容會瞬間往上跳，那個跳動比動畫本身更搶眼。
 *
 * **不用 `interpolate-size: allow-keywords`。** 那是原訂做法，查證後否決：
 * 它只有 Chromium 支援（Chrome/Edge 129+），Firefox 與 Safari 都不支援。
 * 這是給台灣使用者的行動優先 PWA，iOS Safari 佔比很高，等於多數人看不到。
 *
 * 改用 `grid-template-rows: 0fr → 1fr`：Chrome 107+／Firefox 66+／
 * Safari 16+ 都支援，同樣能動到「內容的自然高度」而不必寫死像素。
 *
 * ## 為什麼需要 clipping 這個狀態
 *
 * 0fr→1fr 要成立，內層必須 `overflow: hidden`——否則內容會維持自然高度直接
 * 溢出，動畫等於沒有。但**一直開著 overflow: hidden 會裁掉焦點框**：這個
 * 專案的焦點框是 `outline` ＋ `outline-offset: 0.2rem`，畫在邊界外面，貼著
 * 面板邊緣的按鈕一取得焦點就會被切掉一角（WCAG SC 2.4.7）。
 *
 * 而改用 `v-if` 的舊寫法沒有這個問題（展開時根本沒有裁切容器），所以直接
 * 套 overflow: hidden 是**製造一個新的無障礙退步**，不是等價替換。
 *
 * 所以只在「收合中／已收合」時裁切，展開動畫跑完就解除。收在這個共用元件裡，
 * 每個使用點不必各自處理一次。
 *
 * ## 為什麼需要 inert
 *
 * 從 `v-if` 改成常駐 DOM 有一個不明顯的退步：**收合的面板仍然可以被 Tab
 * 進去，螢幕閱讀器也照讀**——高度是 0、視覺上看不到，但它還在焦點順序與
 * 無障礙樹裡。`v-if` 沒有這個問題，因為元素根本不存在。
 *
 * `inert` 把整棵子樹移出焦點順序與無障礙樹，等於補回 `v-if` 原本免費提供的
 * 那一半語意。支援度：Chrome 102+／Firefox 112+／Safari 15.5+。
 */
const props = defineProps<{ open: boolean }>();

const clipping = ref(!props.open);

watch(
  () => props.open,
  (open) => {
    // 開始收合的當下就要恢復裁切，否則內容會在收合過程中溢出。
    if (!open) clipping.value = true;
  }
);

function handleTransitionEnd(event: TransitionEvent): void {
  // 只認格線列的過渡；內容自己的 opacity／color 過渡也會冒泡到這裡。
  if (event.propertyName !== "grid-template-rows") return;
  if (props.open) clipping.value = false;
}
</script>

<template>
  <div
    class="disclosure"
    :data-open="open ? 'true' : 'false'"
    @transitionend="handleTransitionEnd"
  >
    <div
      class="disclosure__inner"
      :class="{ 'is-clipped': clipping }"
      :inert="!open"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>
.disclosure {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows var(--duration-fast) var(--ease-out);
}

.disclosure[data-open="true"] {
  grid-template-rows: 1fr;
}

/*
 * min-height: 0 是必要的——格線項目的預設 min-height 是 auto，會擋住
 * 0fr 把它壓到零，動畫看起來就完全沒發生。
 *
 * opacity 一起做：只有高度變化的話，內容會在極短的高度裡被壓扁再撐開，
 * 讀起來像被擠出來。高度負責「版面是連續的」，opacity 負責「轉場被看見」
 * ——正好是第十二節第一條說的那兩件事，而且同屬一個元素的同一個狀態改變，
 * 不違反第五條（一次只有一個元素在動）。
 */
.disclosure__inner {
  min-height: 0;
  opacity: 0;
  transition: opacity var(--duration-fast) var(--ease-out);
}

.disclosure[data-open="true"] .disclosure__inner {
  opacity: 1;
}

.disclosure__inner.is-clipped {
  overflow: hidden;
}
</style>
