# 行動裝置拍照重載與資料流失修復計畫 (Camera Tab Reload Fix)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 解決手機端拍完防曬乳正面照按下「確定」後，網頁發生重新整理（Tab Reload）導致已輸入內容與辨識進度完全流失之重大問題。

**Global Constraints:**
- **禁止使用 EMOJI**：介面、按鈕、提示、佔位圖示嚴禁出現任何 Emoji 字元。
- **嚴格遵守 Design Token**：嚴禁手寫 hex 顏色或任意數值，全面依循 `DESIGN.md`。
- **勿造輪子硬寫 code**：複用既有樣式與 helper 工具。
- **分批執行與每次檢查**：每個 Batch 完成後必須執行對應測試（`vitest` / `typecheck` / `lint`）確認無回歸方可進入下一批。

---

## 問題根因分析

1. **強制呼叫相機 (`capture="environment"`) 觸發系統記憶體回收 (LMK)**：
   - `<input capture="environment">` 會強制啟動系統全螢幕原生相機 App。
   - 現代手機相機 App 需進行高畫素感光元件計算、HDR 與 AI 運算，佔用 300MB–500MB RAM。
   - 行動作業系統（iOS WebKit Jetsam / Android Low Memory Killer）為保證前台相機運作，常將背景的瀏覽器標籤頁殺死或卸載。使用者在相機按下「確定／使用照片」回到瀏覽器時，瀏覽器被迫全頁重載 `/products/new`。
2. **圖片壓縮過程記憶體暴增引發 WebProcess OOM Crash**：
   - `imageCompress.ts` 原本先使用 `readFileAsDataUrl(file)` 將 12MP–48MP 的數位相片轉成 20MB–60MB 的巨大 Base64 字串，再以 `new Image().src = dataUrl` 載入記憶體。
   - 此舉在行動版 WebKit 中極易瞬間突破記憶體保護上限（超過限制時 Safari 會直接跳出「此網頁發生問題因而重新載入」）。
3. **缺少 Form Draft 暫存機制**：
   - `GearForm.vue` 過去完全依賴記憶體中 Vue reactive state。一旦頁面發生非預期重載，表單立即還原為預設空值，使用者辛苦填寫的資料付之一炬。

---

## 分批執行清單 (Batches)

### Batch 1: 記憶體與相機最佳化 (`imageCompress.ts` 與 `GearPhotoScannerSheet.vue`)
**目標**：透過 `URL.createObjectURL` 達成零拷貝解碼，並移除強制相機屬性，避免系統殺背景分頁。
- [x] **Step 1.1**: 重構 `apps/web/src/helpers/imageCompress.ts`：
  - 改用 `URL.createObjectURL(file)` 載入圖片。
  - 在 `onload` 與 `onerror` 中即時呼叫 `URL.revokeObjectURL(objectUrl)` 釋放記憶體。
  - 保留 canvas context 不可用時優雅降級邏輯。
- [x] **Step 1.2**: 更新 `apps/web/src/helpers/imageCompress.test.ts`，加入 `URL.createObjectURL` 與釋放行為之測試。
- [x] **Step 1.3**: 修改 `apps/web/src/components/product/GearPhotoScannerSheet.vue`：
  - 移除 `#photo-front` 與 `#photo-back` 的 `capture="environment"` 屬性。
  - 讓行動裝置開啟原生選擇選單（可即時拍照亦可從相簿挑選相片）。
- [x] **Step 1.4**: 更新 `apps/web/src/components/product/GearPhotoScannerSheet.test.ts` 的相機守門測試，確保不含 `capture="environment"`。
- [x] **Step 1.5**: 執行測試驗證：
  - `pnpm vitest run apps/web/src/helpers/imageCompress.test.ts`
  - `pnpm vitest run apps/web/src/components/product/GearPhotoScannerSheet.test.ts` (27 項測試全數通過)

### Batch 2: 表單自動暫存與防重載復原機制 (`gearFormDraft.ts` 與 `GearForm.vue`)
**目標**：即使遇到極端低記憶體裝置重載分頁，使用者輸入與辨識狀態仍能 100% 自動復原。
- [x] **Step 2.1**: 建立 `apps/web/src/features/product/gearFormDraft.ts`：
  - 定義 `GearFormDraftState` 型別。
  - 實作 `saveGearFormDraft`、`loadGearFormDraft`、`clearGearFormDraft`（使用 `sessionStorage` 並包覆 try/catch）。
- [x] **Step 2.2**: 建立單元測試 `apps/web/src/features/product/gearFormDraft.test.ts`，測試暫存、還原、清空與異常容錯。
- [x] **Step 2.3**: 整合至 `GearForm.vue`：
  - 在 `onMounted` 判斷當 `props.productId === null` 時，若有暫存草稿則自動還原欄位與辨識狀態。
  - 監聽表單與辨識欄位變更，即時同步更新至暫存。
  - 於 `save()` 儲存成功後清除暫存。
- [x] **Step 2.4**: 在 `GearFormPage.vue` 的 `handleCancel()` 取消操作時清除暫存。
- [x] **Step 2.5**: 執行測試驗證：
  - `pnpm vitest run apps/web/src/features/product/gearFormDraft.test.ts`
  - `pnpm vitest run apps/web/src/components/product/GearFormLayout.test.ts` (41 項測試全數通過)

### Batch 3: 全套件驗證、正式站部署與實測確認
**目標**：保證全站無回歸、無 Emoji、完全符合 token，推送至 GitHub main 並於正式站驗證。
- [x] **Step 3.1**: 執行 `pnpm check`（包含 Typecheck、213 個測試檔案、8,327 項測試全過、Lint 0 錯誤）。
- [x] **Step 3.2**: Commit 並 push 到 GitHub `main`。
- [x] **Step 3.3**: 驗證 Vercel 正式站部署上線。
