<script setup lang="ts">
/**
 * 頁尾的「返回更多」連結。
 *
 * **2026-09-02 抽出。** `2026-08-27-copy-a11y-test-dead-code-audit.md` 的結論
 * 就是這一條——當時盤點到 8 個 `.vue` 各自貼一份，並寫下「新增跨頁返回入口
 * 時，先評估使用 `BackToMoreLink` 子項，而不是複製 markup」。這次要幫
 * `DataSettingsPage` 補上返回（它是唯一三個設定頁裡完全沒有返回機制的），
 * 正好是那句話講的情況，所以先抽再用，而不是貼第六份。
 *
 * 這裡只收斂**頁尾文字連結**這一種。`NotificationSettingsPage` 用的是
 * 右上角 `IconButton`（`label="返回更多"`），那是另一種出口，它要不要改成
 * 箭頭仍在 `2026-09-02-ui-layout-consistency-audit.md` §1 待裁決——**不要
 * 順手把它也併進來**，那會替使用者做掉還沒做的決定。
 *
 * 樣式沿用既有的 `.text-link--muted`：這是收斂，不是重新設計，五個既有頁面
 * 的外觀必須逐像素不變。
 */
</script>

<template>
  <RouterLink class="text-link text-link--muted" to="/more"
    >返回更多</RouterLink
  >
</template>
