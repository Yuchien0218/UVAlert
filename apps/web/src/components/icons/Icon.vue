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
  size?: 16 | 20 | 24;
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
