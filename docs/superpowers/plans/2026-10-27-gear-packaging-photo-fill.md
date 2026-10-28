# 防曬乳外包裝拍照辨識自動填表 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在防曬乳裝備表單（`GearForm.vue`）新增拍照自動辨識填表功能，透過 OpenRouter 視覺模型（如 `openai/gpt-4o-mini` 或 `google/gemini-2.0-flash-001`）解析外包裝規格，並自動帶入表單。

**Architecture:**

- 前端透過 Canvas 進行圖片尺寸縮小與輕量壓縮（長邊 1280px，WebP/JPEG 80% 畫質，約 150KB）。
- 呼叫 Supabase Edge Function `/v1/parse-sunscreen-label`，後端自 Supabase Secrets 讀取 `OPENROUTER_API_KEY`，轉發至 OpenRouter API（`https://openrouter.ai/api/v1/chat/completions`）提取規格。
- 圖片在伺服器端純記憶體轉發，零落盤、不存資料庫，保障隱私。
- 回傳結構化資料對齊 `packages/contracts`，自動填入 `GearForm.vue` 欄位並提供高亮提示與確認。

**Tech Stack:** Vue 3、TypeScript、Zod、Supabase Edge Functions (Deno)、OpenRouter API (OpenAI-compatible)、HTML5 Canvas、Vitest

---

## Global Constraints

- **品類限定**：僅對 `gearCategory === "sunscreen"` 啟用拍照填表按鈕，其他品類（如衣物、帽子、陽傘）不得顯示。
- **隱私第一**：照片禁止存入 Supabase Storage 或任何資料庫，純記憶體轉發後立即釋放。
- **安全性**：`OPENROUTER_API_KEY` 嚴格存放在後端 Secrets，前端不可包含任何 AI 金鑰。
- **契約一致性**：所有解析欄位型態必須嚴格對齊 `packages/contracts/src/product.ts`。
- **樣式與無障礙**：符合 `DESIGN.md`，使用既有色彩與按鈕 token（`.button--secondary`、`InlineLoader` 等），不可寫死顏色數值。
- **未經授權禁止 commit/push**：在使用者確認前不執行 git commit 或 git push。

---

## File Map

- **New**: `packages/contracts/src/parse-sunscreen-label.ts`（請求與回應 Zod Schema）
- **New**: `packages/contracts/src/parse-sunscreen-label.test.ts`（Schema 單元與邊界測試）
- **Modify**: `packages/contracts/src/index.ts`（匯出新 Schema）
- **New**: `supabase/functions/parse-sunscreen-label/index.ts`（Edge Function 主程式）
- **New**: `supabase/functions/parse-sunscreen-label/index.test.ts`（Edge Function 單元與 mock 測試）
- **New**: `apps/web/src/helpers/imageCompress.ts`（前端 Canvas 圖片等比壓縮函式）
- **New**: `apps/web/src/helpers/imageCompress.test.ts`（圖片壓縮邏輯測試）
- **New**: `apps/web/src/components/product/GearPhotoScannerSheet.vue`（拍照/選圖與辨識 Sheet 元件）
- **New**: `apps/web/src/components/product/GearPhotoScannerSheet.test.ts`（拍照 Sheet 元件測試）
- **Modify**: `apps/web/src/components/product/GearForm.vue`（整合拍照辨識按鈕與表單填入邏輯）
- **Modify**: `apps/web/src/components/product/GearFormLayout.test.ts`（靜態守門測試更新）

---

### Task 1: 建立 Contracts Schema 與邊界測試 (TDD)

**Files:**

- Create: `packages/contracts/src/parse-sunscreen-label.ts`
- Create: `packages/contracts/src/parse-sunscreen-label.test.ts`
- Modify: `packages/contracts/src/index.ts`

- [x] **Step 1: 撰寫 Schema 失敗測試**
      撰寫 `packages/contracts/src/parse-sunscreen-label.test.ts`，測試：
  - `ParseSunscreenLabelRequestSchema` 驗證圖片數量限制（1~2 張）與 ISO 時間。
  - `ParseSunscreenLabelResponseSchema` 驗證 SPF 正整數、耐水狀態 enum、到期日 regex 等。

- [x] **Step 2: 執行測試確認失敗**

  ```bash
  pnpm vitest run packages/contracts/src/parse-sunscreen-label.test.ts
  ```

- [x] **Step 3: 實作 Schema 並於 `index.ts` 匯出**
      在 `packages/contracts/src/parse-sunscreen-label.ts` 建立 Schema 並於 `packages/contracts/src/index.ts` 匯出。

- [x] **Step 4: 執行測試確認通過**
  ```bash
  pnpm vitest run packages/contracts/src/parse-sunscreen-label.test.ts
  ```

---

### Task 2: 實作前端圖片等比壓縮函式與單元測試

**Files:**

- Create: `apps/web/src/helpers/imageCompress.ts`
- Create: `apps/web/src/helpers/imageCompress.test.ts`

- [x] **Step 1: 撰寫圖片壓縮工具的失敗測試**
      撰寫 `apps/web/src/helpers/imageCompress.test.ts`，測試：
  - 超過最大長邊（1280px）時能正確等比縮放尺寸。
  - 小於最大尺寸時維持原長寬不放大。
  - 輸出格式符合 base64 data URL 規範。

- [x] **Step 2: 執行測試確認失敗**

  ```bash
  pnpm vitest run apps/web/src/helpers/imageCompress.test.ts
  ```

- [x] **Step 3: 實作 `compressImageFile` 函式**
      利用 `HTMLImageElement` 與 `HTMLCanvasElement` 實作非同步圖片縮小與品質壓縮。

- [x] **Step 4: 執行測試確認通過**
  ```bash
  pnpm vitest run apps/web/src/helpers/imageCompress.test.ts
  ```

---

### Task 3: 實作 Supabase Edge Function `parse-sunscreen-label`

**Files:**

- Create: `supabase/functions/parse-sunscreen-label/index.ts`
- Create: `supabase/functions/parse-sunscreen-label/index.test.ts`

- [x] **Step 1: 撰寫 Edge Function 單元測試**
      撰寫 `supabase/functions/parse-sunscreen-label/index.test.ts`，使用 mock fetch 測試：
  - 缺少圖片或格式不合時回傳 400。
  - 成功轉發至 OpenRouter Chat Completions API 並解析回傳符合契約的 200。
  - API 失敗或逾時時回傳 502/500。
  - Rate limit 限制觸發。

- [x] **Step 2: 執行測試確認失敗**

  ```bash
  pnpm vitest run supabase/functions/parse-sunscreen-label/index.test.ts
  ```

- [x] **Step 3: 實作 `parse-sunscreen-label` 函式**
  - 複用 `_shared/http.ts` 與 `_shared/rate-limit.ts`。
  - 呼叫 `https://openrouter.ai/api/v1/chat/completions`，帶上 `Authorization: Bearer $OPENROUTER_API_KEY`、`HTTP-Referer` 與 `X-Title`。
  - 預設模型設為 `openai/gpt-4o-mini` 或讀取 `OPENROUTER_MODEL`。
  - 指定 `response_format` 為 JSON Schema，確保回傳完全符合 `ParseSunscreenLabelResponseSchema`。

- [x] **Step 4: 執行測試確認通過**
  ```bash
  pnpm vitest run supabase/functions/parse-sunscreen-label/index.test.ts
  ```

---

### Task 4: 開發拍照/選圖 Sheet 元件 `GearPhotoScannerSheet.vue`

**Files:**

- Create: `apps/web/src/components/product/GearPhotoScannerSheet.vue`
- Create: `apps/web/src/components/product/GearPhotoScannerSheet.test.ts`

- [x] **Step 1: 撰寫元件測試**
      測試：
  - 渲染正面與背面照片上傳按鈕。
  - 選擇照片後調用壓縮函式並顯示預覽縮圖。
  - 點擊「開始辨識」進入 loading 狀態（顯示 `InlineLoader`）。
  - 辨識完成 emit `"detected"` 事件。

- [x] **Step 2: 執行測試確認失敗**

  ```bash
  pnpm vitest run apps/web/src/components/product/GearPhotoScannerSheet.test.ts
  ```

- [x] **Step 3: 實作 `GearPhotoScannerSheet.vue`**
  - 整合 `<input type="file" accept="image/*" capture="environment">`。
  - 包含正面（必要）與背面（選填）兩個卡槽。
  - 視覺設計遵循 `DESIGN.md`，使用暖色系 Token 與微動態反饋。

- [x] **Step 4: 執行測試確認通過**
  ```bash
  pnpm vitest run apps/web/src/components/product/GearPhotoScannerSheet.test.ts
  ```

---

### Task 5: 整合至 `GearForm.vue` 與靜態守門驗證

**Files:**

- Modify: `apps/web/src/components/product/GearForm.vue`
- Modify: `apps/web/src/components/product/GearFormLayout.test.ts`

- [x] **Step 1: 新增靜態守門測試**
      在 `GearFormLayout.test.ts` 中加入斷言：
  - 拍照速填按鈕只在 `gearCategory === 'sunscreen'` 條件下存在。
  - 成功解析後能更新品名、SPF、PA 與 snapshot 狀態。
  - 必須有「已由照片自動填入」提示標註。

- [x] **Step 2: 執行測試確認失敗**

  ```bash
  pnpm vitest run apps/web/src/components/product/GearFormLayout.test.ts
  ```

- [x] **Step 3: 於 `GearForm.vue` 嵌入按鈕與處理邏輯**
  - 當點擊拍照按鈕時開啟 `GearPhotoScannerSheet`。
  - 接收辨識結果，將欄位賦值並設為 touched 狀態。
  - 表單呈現高亮提示與確認。

- [x] **Step 4: 執行全專案檢查與驗證**
  ```bash
  pnpm check
  ```
