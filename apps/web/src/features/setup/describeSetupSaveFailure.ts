import { SetupValidationError } from "./createSetupController";

/**
 * 把「選情境時儲存失敗」分成兩類，並留下可診斷的痕跡。
 *
 * **為什麼需要這個函式。** 2026-08-31 之前 `SetupPage.vue` 那裡是一個空的
 * `catch {}`——例外被整個丟掉，只留一句固定文案「設定內容目前無法儲存，
 * 請重新整理後再試一次。」。使用者問「為什麼無法儲存」時，**程式碼的結構
 * 讓這個問題答不出來**：同一句話至少涵蓋三種完全不同的狀況——
 *
 * 1. 草稿不存在（`requireDraft` 丟 `SetupValidationError`）
 * 2. IndexedDB 寫入失敗
 * 3. 跨分頁 invalidation 撞上同一筆草稿
 *
 * 而且這條路徑 2026-08-24 才因為例外沒被接住出過一次事（畫面既不揭露後半
 * 段也不顯示任何錯誤，看起來像點了沒反應）。當時的修法是「接住並顯示
 * 訊息」，但**沒有留下任何痕跡**，所以這次重現時仍然只能猜。
 *
 * `console.error` 是刻意保留的：它不影響使用者，但下一次有人回報時，主控台
 * 裡會有原始例外可以看。
 *
 * 抽成獨立模組而不是留在 `<script setup>` 裡，是為了讓它可以被測試——
 * 分類邏輯藏在元件內部就只能靠掛載整頁來驗證。
 */
export function describeSetupSaveFailure(
  error: unknown,
  log: (message: string, cause: unknown) => void = console.error
): string {
  log("[setup] 儲存情境失敗", error);

  /*
   * 草稿不存在是唯一「重試也沒用」的一種：要重新開始，不是再試一次。
   * 其餘的（寫入失敗、跨分頁衝突）重試通常會成功，所以維持原本的文案。
   */
  if (
    error instanceof SetupValidationError &&
    error.fieldErrors.draft !== undefined
  ) {
    return "找不到目前的設定草稿，請重新整理後從頭開始設定。";
  }

  return "設定內容目前無法儲存，請重新整理後再試一次。";
}
