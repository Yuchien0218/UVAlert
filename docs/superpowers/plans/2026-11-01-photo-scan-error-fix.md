# 拍照速填 `[object Object]` 與後端 502 辨識失敗修復計畫

> **日期：** 2026-11-01
> **問題現象：** 手機端選取正背面照片已不再重載，但點擊「開始辨識」後顯示：`辨識失敗：[object Object]。請確認照片清晰，或手動填寫。`

**Global Constraints:**
- **禁止使用 EMOJI**：介面、按鈕、提示、錯誤訊息嚴禁出現任何 Emoji。
- **嚴格遵守 Design Token**：依循 `DESIGN.md`，不新增硬編碼顏色或尺寸。
- **勿造輪子硬寫 code**：對齊專案既有 `_shared/http.ts` 與 `BrowserFeedbackClient.ts` 的 `{ error: { code, message } }` 錯誤契約解析模式。
- **分批執行與每次檢查**：每個 Batch 先寫回歸測試（確認能抓到問題），修復後跑測試確認全綠，再進入下一批。

---

## 診斷與根因確認（Phase 1–3）

透過對正式站端點實測重現，確認共有**兩層問題疊加**：

1. **前端錯誤契約解析缺失（造成 `[object Object]`）**：
   - 後端 `_shared/http.ts` 的 `errorResponse()` 統一回傳結構為 `{ error: { code: string, message: string } }`。
   - `GearPhotoScannerSheet.vue` 誤將 `body.error` 當作字串直接插入模板字串 `${detail}`，導致物件被轉型為 `"[object Object]"`；舊單元測試也以 `{ error: "Internal Server Error" }` 假資料測試，未能攔截真實契約格式。
2. **後端 OpenRouter 上游非 2xx 回應（造成 HTTP 502 `UPSTREAM_ERROR`）**：
   - 實測呼叫正式站 `parse-sunscreen-label` 回傳 `502 {"error":{"code":"UPSTREAM_ERROR","message":"視覺辨識服務暫時無法回應，請稍後再試"}}`，定位於 `handler.ts` 的 `!upstreamResponse.ok` 分支。
   - 排名前三之可證偽假說：
     - **假說 1（OpenRouter 402 額度不足）**：預設模型 `openai/gpt-4o-mini` 為付費模型，若 OpenRouter 帳號未儲值（$0 餘額）會回傳 HTTP 402。
     - **假說 2（OpenRouter 401 金鑰格式或權限問題）**：`OPENROUTER_API_KEY` 若夾帶前後空白、雙引號或金鑰失效，會回傳 HTTP 401。
     - **假說 3（OpenRouter 400/404 參數或路由不相容）**：特定模型或隱私設定拒絕 `json_object` 或視覺請求。

---

## 分批執行清單 (Batches)

### Batch 1: 修復前端 `[object Object]` 錯誤訊息解析（TDD）
- [x] **Step 1.1**: 在 `apps/web/src/helpers/parseSunscreenLabelEndpoint.ts` 新增 `readSunscreenScanErrorMessage(body, status)`（對齊 `BrowserFeedbackClient.ts` 之 `readMessage` 模式，相容 `{ error: { message } }`、`{ error: "..." }` 與 `{ message: "..." }`，絕不回傳物件）。
- [x] **Step 1.2**: 在 `apps/web/src/helpers/parseSunscreenLabelEndpoint.test.ts` 與 `apps/web/src/components/product/GearPhotoScannerSheet.test.ts` 先補上真實 `{ error: { code, message } }` 格式的失敗測試，確認能重現 `[object Object]`。
- [x] **Step 1.3**: 更新 `GearPhotoScannerSheet.vue` 改用 `readSunscreenScanErrorMessage`，並避免將已含句號與建議的後端訊息重複拼接成不通順句子。
- [x] **Step 1.4**: 執行單元測試確認全綠（28 項測試全數通過）。

### Batch 2: 強化 Edge Function 金鑰清理與上游狀態分類並實測驗證
- [x] **Step 2.1**: 在 `supabase/functions/parse-sunscreen-label/index.test.ts` 新增測試：
  - `OPENROUTER_API_KEY` 含前後空白或引號時能自動清理並正常送出 `Bearer <key>`。
  - OpenRouter 回傳 `401`、`402`、`403 Key limit exceeded`、`429`、`400` 時分別對應明確錯誤代碼與繁體中文說明，且不外洩後端內部連結或金額資訊。
- [x] **Step 2.2**: 更新 `supabase/functions/parse-sunscreen-label/handler.ts` 實作金鑰清理與上游 HTTP 狀態分類。
- [x] **Step 2.3**: 執行單元測試確認通過（9 項測試全過），並部署 `parse-sunscreen-label` 至 Supabase 正式環境，實測確認真實根因：
  - **正式站實測定位結果**：OpenRouter 回傳 `HTTP 403 Key limit exceeded (total limit)`，即目前綁定於 Supabase Secrets 的這把 OpenRouter API Key 本身設定的「單把金鑰總額度上限（Credit Limit）」已用滿，導致 OpenRouter 拒絕該金鑰的一切請求。

### Batch 3: 全站檢查、前端正式站部署與金鑰更新指引
- [x] **Step 3.1**: 鎖定安全錯誤回應（回傳 `UPSTREAM_QUOTA_ERROR: 視覺辨識金鑰已達額度上限或餘額不足`，不對外暴露 OpenRouter 內部 workspace 路徑或帳務數字）並完成重部署驗證。
- [x] **Step 3.2**: 執行 `pnpm check`（Typecheck、213 個測試檔案共 8,335 項測試全過、ESLint 與 Stylelint 0 錯誤）。
- [x] **Step 3.3**: 推送前端更新至正式站，並提供使用者調整／更換 OpenRouter 金鑰之步驟。
