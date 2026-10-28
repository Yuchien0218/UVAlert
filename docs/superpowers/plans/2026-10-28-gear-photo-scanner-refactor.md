# 拍照速填介面規範重構與正式站連線修復 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正拍照辨識正式站 405 阻擋問題，並全面重構介面以符合 `DESIGN.md` Design Tokens、嚴格禁止 Emoji、移除造輪子之重複 CSS、強化行動裝置圖片相容性。

**Global Constraints:**
- **禁止使用 EMOJI**：介面、按鈕、提示、佔位圖示嚴禁出現任何 Emoji 字元（如 📷、✨、💡、🔒、📋 等），改用純文字或標準 SVG 圖示。
- **嚴格遵守 Design Token**：嚴禁手寫 hex 顏色（如 `#fff3e0`、`#e65100`），全面依循 `DESIGN.md` 色彩、字級、間距與圓角 token。
- **勿造輪子硬寫 code**：刪除元件內重複手寫的按鈕與卡片 CSS，全面複用 `apps/web/src/assets/app.css` 既有類別。
- **分批執行與每次檢查**：每個 Batch 完成後必須執行對應測試（`vitest` / `typecheck` / `lint`）確認無回歸方可進入下一批。

---

## 分批執行清單 (Batches)

### Batch 1: 修復網路端點與正式站 405 阻擋
**目標**：解決 Vercel 靜態主機攔截 POST 請求造成 `405 Method Not Allowed` 的根本問題。
- [x] **Step 1.1**: 在 `apps/web/src/helpers/parseSunscreenLabelEndpoint.ts` 建立標準端點解析工具，直連 Supabase Edge Function 端點，並支援環境變數與 dev proxy。
- [x] **Step 1.2**: 在 `apps/web/vercel.json` 加入 `/v1/parse-sunscreen-label` route 轉發規則作為雙重保障。
- [x] **Step 1.3**: 更新 `GearPhotoScannerSheet.vue` 使用 `resolveParseSunscreenLabelEndpoint`。
- [x] **Step 1.4**: 執行測試與驗證（`parseSunscreenLabelEndpoint.test.ts` 5 項測試全數通過）。

### Batch 2: 全面移除 EMOJI 並統一文案風格
**目標**：徹底清除所有 Emoji，改用符合台灣繁體中文語氣的簡潔專業文案。
- [x] **Step 2.1**: 修改 `GearForm.vue`：
  - 按鈕文字由 `📷 拍照辨識自動填表` 改為 `拍照辨識規格`。
  - 填入標籤由 `✨ 已由 AI 辨識填入，請確認後儲存` 改為 `已由照片自動帶入，請確認後儲存`。
  - 備註提示由 `💡 辨識備註：` 改為 `辨識備註：`。
- [x] **Step 2.2**: 修改 `GearPhotoScannerSheet.vue`：
  - 移除隱私提示中的 `🔒`。
  - 移除照片卡槽內的 `📷` 與 `📋` 佔位 Emoji，改為純文字 `未拍攝正面` 與 `未拍攝背面`。
- [x] **Step 2.3**: 在 `GearFormLayout.test.ts` 與 `GearPhotoScannerSheet.test.ts` 加入靜態守門測試，確保原始碼中 0 個 Emoji。
- [x] **Step 2.4**: 執行測試確認通過。

### Batch 3: Design Tokens 與 CSS 重構（勿造輪子）
**目標**：清除硬編碼數值，消除重複 CSS，對齊 `DESIGN.md`。
- [x] **Step 3.1**: 移除 `GearPhotoScannerSheet.vue` 中重複手寫的 `:where(.button--secondary)` 樣式，直接套用 `app.css`。
- [x] **Step 3.2**: 替換所有自訂 hex 顏色為標準 design token（`--color-surface-soft`、`--color-hairline`、`--color-primary-text`、`--color-muted` 等）。
- [x] **Step 3.3**: 檢查字級與間距，全面使用 `var(--space-*)`、`var(--radius-*)` 與 `var(--font-size-*)`。
- [x] **Step 3.4**: 執行 `pnpm lint` 確保 ESLint 與 Stylelint 全綠通過。

### Batch 4: 圖片壓縮相容性強化（iOS / Android）
**目標**：確保行動裝置拍攝之照片壓縮後可靠送出，避免 WebP 降級問題。
- [x] **Step 4.1**: 將 `imageCompress.ts` 預設 MIME 格式調整為全瀏覽器相容的 `image/jpeg`（品質 0.8），防止 iOS Safari 降級成巨大 PNG。
- [x] **Step 4.2**: 執行 `apps/web/src/helpers/imageCompress.test.ts` 確認尺寸與格式皆如預期通過。

### Batch 5: 部署至正式站並進行端到端檢查
**目標**：送出 commit 並推送至 GitHub main，等待 Vercel 部署完成，進行正式站驗證。
- [x] **Step 5.1**: 執行全套件檢查（`pnpm check`，8,318 項測試全數通過）。
- [x] **Step 5.2**: Commit 並 push 到 GitHub `main`（Commit `d8ff730`）。
- [x] **Step 5.3**: 驗證 Vercel 正式站部署狀態並確認實際請求不再回傳 405（實測已能正確連線至 Supabase 並回傳格式校驗訊息）。
