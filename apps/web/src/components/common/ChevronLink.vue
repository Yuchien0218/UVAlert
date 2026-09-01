<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import Icon from "../icons/Icon.vue";

/**
 * 「文字 ＋ 右側箭頭」的次要入口。
 *
 * **為什麼要有這個元件。** 2026-08-31 清點時，這個形狀在三個地方各寫了
 * 一份，而且三份長得不一樣：
 *
 *   .uv-headline__more    12px、gap space-1、無 min-height
 *   .zone-group__toggle   16px、gap space-2、min-height 44px
 *   .events-toggle        16px、gap space-2、min-height 44px
 *
 * 使用者的原話是「我怕改一個其他沒跟著改到」。現在只有這一份。
 *
 * **兩種用途共用同一個外觀，因為它們對使用者是同一件事**：「這裡還有
 * 別的東西」。差別只在按下去是換頁還是就地展開：
 *
 *   <ChevronLink to="/forecast">五日預報</ChevronLink>
 *   <ChevronLink :expanded="open" controls="panel-id" @click="…">…</ChevronLink>
 *
 * **`tone` 保留給狀態色。** 部位群組的那一顆會隨狀態變色（追蹤中藍、
 * 建議補擦紅），那不是裝飾——顏色在那裡承載狀態。統一大小與間距，但不
 * 統一顏色；預設是 `--color-primary`（行動色）。
 *
 * chevron 換的是圖示 name 而不是 `transform: rotate`，符合 DESIGN.md
 * 第五節的展開收合契約。
 */

const props = defineProps<{
  /** 有 to 就是導覽連結；沒有就是按鈕。 */
  to?: string;
  /** 展開狀態；只有同時給 `controls` 時才會輸出 aria-expanded。 */
  expanded?: boolean;
  /**
   * 展開時控制的面板 id。
   *
   * **有沒有給這個，決定它是不是展開控制。** 原本想用「expanded 是不是
   * undefined」來判斷，但 Vue 對型別宣告的 boolean prop 有轉型規則：
   * **沒傳的 boolean prop 會變成 `false` 而不是 `undefined`**，於是導覽
   * 連結也長出了 `aria-expanded="false"`——對螢幕閱讀器來說那是在說
   * 「這個連結可以展開，現在收著」，是錯的。寫測試時實測到。
   *
   * 改用 `controls` 判斷同時也更誠實：展開控制本來就必須指出它控制誰。
   */
  controls?: string;
  /** 覆寫顏色，例如部位群組的狀態色。預設是行動色。 */
  tone?: string;
  /** 整段的無障礙標籤；文字被拆成好幾個 span 時需要。 */
  label?: string;
}>();

const isDisclosure = computed(() => props.controls !== undefined);

const iconName = computed(() =>
  props.expanded === true ? "tool-chevron-down" : "tool-chevron-right"
);
</script>

<template>
  <component
    :is="to === undefined ? 'button' : RouterLink"
    class="chevron-link"
    :style="tone === undefined ? undefined : { '--chevron-link-tone': tone }"
    :to="to"
    :type="to === undefined ? 'button' : undefined"
    :aria-expanded="isDisclosure ? expanded : undefined"
    :aria-controls="controls"
    :aria-label="label"
  >
    <slot />
    <!--
      箭頭一律在最後，且是 flex 的最後一個項目——它是「往這邊」的指向，
      不是圖示。放在文字前面會讀成項目符號。
    -->
    <Icon class="chevron-link__chevron" :name="iconName" :size="20" />
  </component>
</template>

<style scoped>
.chevron-link {
  /*
   * 在這裡宣告預設值，呼叫端用 inline style 覆寫。這樣顏色只有一個來源，
   * 不需要「有沒有傳 tone」的修飾類別，stylelint 也查得到這個自訂屬性。
   */
  --chevron-link-tone: var(--color-primary);

  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: var(--tap-target);
  padding: 0;
  border: 0;
  background: none;
  color: var(--chevron-link-tone);
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  text-align: start;

  /*
   * 2026-08-31：**刻意不寫 `text-decoration: none`**（使用者要求「有沒有
   * 底線都保持原樣」）。
   *
   * 這個元件會渲染成 `<a>`（導覽）或 `<button>`（展開）。不碰
   * text-decoration 的話，兩者各自保持它們原本的樣子：連結有瀏覽器預設的
   * 底線，按鈕沒有。那正好就是收斂之前三個使用點的狀態。
   *
   * 中間有一版把三處統一成「都有底線」，被使用者退回——統一的是**大小**，
   * 不是外觀的每一項。
   */
}

.chevron-link__chevron {
  flex: none;
}
</style>
