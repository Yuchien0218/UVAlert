<script setup lang="ts">
import BottomSheet from "../common/BottomSheet.vue";
import GearForm from "../product/GearForm.vue";

/**
 * 設定流程內填寫完整防曬乳包裝標示的 sheet。
 *
 * **2026-08-23 新增**，修正 Sitemap §2.2 的既有違規：原本
 * `SetupTimingPage` 的「改為填寫完整的防曬乳包裝標示」會整頁
 * `router.push` 到 `/products/new`，違反「不因產品標示……跳離到平行
 * 頁面；必要的調整以同頁區塊或 sheet 呈現」。這個 sheet 讓同一份
 * `GearForm.vue` 邏輯留在 `/setup/timing` 內開合，不離開流程。
 *
 * 開合、焦點鎖定、Escape 與焦點還原由共用 `BottomSheet` 負責。
 */

defineProps<{ open: boolean }>();
const emit = defineEmits<{
  close: [];
  saved: [];
}>();

function close(): void {
  emit("close");
}

function handleSaved(): void {
  emit("saved");
}
</script>

<template>
  <BottomSheet
    :open="open"
    title="填寫完整的防曬乳包裝標示"
    labelled-by-id="gear-form-sheet-title"
    @close="close"
  >
    <!--
      productId 固定傳 null——這裡永遠是「這次提醒要用的防曬乳」，
      對應目前使用中的 snapshot，不是編輯裝備清單裡的某一筆既有
      紀錄。GearForm 存檔後會建立新紀錄並設成目前使用中的
      snapshot（saveProduct 對 sunscreen 品類的既有行為）。
    -->
    <!--
      這裡的 product-id 恆為 null（設定流程只會新增，不會編輯），所以
      notFound 實務上不會發生。仍然接起來：GearForm 把它宣告成必要 emit，
      而「哪天有人在這裡傳了 id」不該是靜默壞掉的那條路。關掉 sheet 是這個
      情境下唯一合理的處置——沒有東西可以編輯。
    -->
    <GearForm
      :product-id="null"
      @saved="handleSaved"
      @not-found="emit('close')"
    />
  </BottomSheet>
</template>
