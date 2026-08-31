<script setup lang="ts">
/**
 * 只有圖示的按鈕（關閉、返回、結束等）。
 *
 * **2026-08-31 從 `.icon-button` 這個 class 升級成元件。** 使用者的原話是
 * 「可以做成共用元件嗎？我怕改一個其他沒一起動到」——那個顧慮當時就是
 * 事實：`.icon-button` 只規定圓圈與命中區，**圖示尺寸由八個呼叫端各自
 * 決定**，所以 2026-08-31 把叉叉縮成 compact 時只動到兩處，其餘六處還是
 * 24px 圖示配 44px 圓圈。
 *
 * 元件把三件會漂移的事收進來：
 *
 * 1. **命中區 44px、視覺圓圈 32px**（`.icon-button--compact`）。視覺尺寸
 *    可以再調，但命中區不行——WCAG SC 2.5.5，也是 `--tap-target` 存在的
 *    理由。
 * 2. **圖示 20px**，配 32px 圓圈的比例。
 * 3. **`aria-label` 必填**。只有圖示的按鈕沒有可讀名稱就是無名控制項，
 *    型別上強制，忘記會編譯不過而不是靜默壞掉。
 *
 * `disabled`、`@click`、額外的 class 都靠 Vue 的 fallthrough 落到 `<button>`
 * 上（單一根元素），所以呼叫端不需要為了加一個 class 就重寫一顆按鈕。
 */
import Icon from "../icons/Icon.vue";
import type { IconName } from "../../generated/icons.generated";

defineProps<{
  /** 圖示名稱，來自產生的圖示註冊表。 */
  icon: IconName;
  /** 螢幕閱讀器讀到的名稱。必填。 */
  label: string;
}>();
</script>

<template>
  <button
    class="icon-button icon-button--compact"
    type="button"
    :aria-label="label"
  >
    <Icon :name="icon" :size="20" />
  </button>
</template>
