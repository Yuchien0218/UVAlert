<script setup lang="ts">
import { useRouter } from "vue-router";
import IconButton from "../components/common/IconButton.vue";
import ContentUnderReview from "../components/help/ContentUnderReview.vue";

/**
 * S-17 特殊狀況。
 *
 * **本頁刻意不呈現分類流程。** `P0_COPY_DECK.md` §15 發布限制明訂：
 * CP-SPECIAL-004（破損／起泡／嚴重曬傷）與 CP-SPECIAL-005（急症紅旗）
 * 任一仍為 `BLOCKED` 時，不得公開特殊狀況流程；兩則目前皆為 `BLOCKED`。
 *
 * 同節並註明「紅旗條件與 119／就醫文字不得由工程端補寫」，
 * 因此本頁不提供任何醫療判斷、就醫指引或急症分流文字。
 * 開一個無法處理急症的分類流程，比不開更危險（AC-99）。
 */
const router = useRouter();

/*
 * 頂端的返回出口（2026-09-03，稽核 §G：下鑽頁一律有頂端箭頭）。
 * 直接回「更多」，不用 history.back——這一頁也可能是從網址列直接打開的。
 */
function goBack(): void {
  void router.push({ name: "more" });
}
</script>

<template>
  <div class="page-stack">
    <header class="page-heading page-heading--with-exit">
      <h1 class="page-heading__title" data-typography-role="page-title">
        特殊狀況
      </h1>
      <IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />
    </header>

    <ContentUnderReview
      title="此功能尚未開放"
      body="特殊狀況的分類與說明尚未完成必要審查，因此目前不提供。本服務不提供診斷、治療建議，也無法判斷你能否曝曬或使用特定產品。"
      required-review="醫療／法務"
    />
  </div>
</template>

<style scoped></style>
