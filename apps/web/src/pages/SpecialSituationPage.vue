<script setup lang="ts">
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
</script>

<template>
  <div class="page-stack">
    <header class="page-heading">
      <h1 class="page-heading__title">特殊狀況</h1>
    </header>

    <ContentUnderReview
      title="此功能尚未開放"
      body="特殊狀況的分類與說明尚未完成必要審查，因此目前不提供。本服務不提供診斷、治療建議，也無法判斷你能否曝曬或使用特定產品。"
      required-review="醫療／法務"
    />

    <RouterLink class="text-link text-link--muted" to="/more"
      >返回更多</RouterLink
    >
  </div>
</template>

<style scoped></style>
