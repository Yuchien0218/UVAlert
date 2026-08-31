<script setup lang="ts">
import { computed } from "vue";
import { ICONS, type IconName } from "../../generated/icons.generated";

/**
 * 自訂圖示系統的唯一進入點。取代 @lucide/vue——不要再從那裡匯入新圖示，
 * 也不要手刻 inline SVG，一律經過這個元件讀 icons.generated.ts。
 *
 * decorative（預設 true）對應「圖示旁邊已經有文字」的常見情境：aria-hidden，
 * 螢幕閱讀器不重複播報。單獨使用、沒有相鄰文字標籤時傳 :decorative="false"，
 * 這時會用 role="img" 並保留圖示自帶的 <title>。
 */
interface Props {
  name: IconName;
  /**
   * 六個檔位各有角色，不要為了「稍微大一點」發明中間值：
   *
   *   16  文字行內的輔助圖示（按鈕內、標籤旁）
   *   20  清單列、次要位置
   *   24  下排導覽、按鈕、區塊標題
   *   32  卡片或功能入口的主要視覺（2026-08-29 新增，B9 裁決 1）
   *   40  與標題並排的領銜圖示（2026-08-31 新增）
   *   56  空狀態的主角圖示（2026-08-31 新增）
   *
   * 32 是刻意只加這一檔。B9 規格原本還提了 18px「文字旁的輔助圖示」，
   * 但那正是 20 已經在做的事，加了只是在 16 與 20 之間多塞一格；而 32
   * 對應的「卡片主視覺」原本沒有任何檔位，只能拿 24 硬撐——24 同時當
   * 導覽、按鈕、卡片主視覺三種角色用，才是真正的缺口。
   *
   * **2026-08-31 新增 40 與 56。** 使用者回報「畫了很多圖示卻都沒感覺」，
   * 清點後成因很明確：36 個使用點裡 20 個是 20px，而整個 App 沒有任何
   * 圖示大於 32px——量表的上緣就是缺的那一段。40 與 32 的差別不是「稍微
   * 大一點」：32 是卡片裡的一個元素，40 是與標題**平起平坐**的領銜位置；
   * 56 更進一步，是空狀態裡沒有其他內容時唯一的視覺主體。
   *
   * 40 與 56 一律透過 IconLead.vue 使用，不要在各處各寫一次 :size="40"
   * ——那正是使用者擔心的「改一個又跑掉」。
   */
  size?: 16 | 20 | 24 | 32 | 40 | 56;
  decorative?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  size: 24,
  decorative: true
});

const icon = computed(() => ICONS[props.name]);

/**
 * decorative（預設）時把 <title> 拿掉：aria-hidden 只擋螢幕閱讀器，
 * <title> 的文字仍算進 DOM textContent，跟旁邊本來就有的可見文字
 * 標籤重複（例如下排導覽「提醒」連結會變成「提醒\n提醒」）。
 */
const body = computed(() =>
  props.decorative
    ? icon.value.body.replace(/<title>.*?<\/title>/, "")
    : icon.value.body
);
</script>

<template>
  <svg
    :viewBox="icon.viewBox"
    :width="size"
    :height="size"
    :aria-hidden="decorative ? 'true' : undefined"
    :role="decorative ? undefined : 'img'"
    v-html="body"
  />
</template>
