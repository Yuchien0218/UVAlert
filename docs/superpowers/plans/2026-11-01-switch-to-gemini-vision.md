# 防曬乳拍照辨識改接 Google Gemini Flash 免費視覺 API 計畫

> **日期：** 2026-11-01
> **目標：** 將 `parse-sunscreen-label` Edge Function 主力辨識引擎改為免費額度充裕（每日 500～1,500 次、免綁卡）且中日英包裝辨識力強的 Google AI Studio `gemini-2.5-flash` API。

**Global Constraints:**
- **禁止使用 EMOJI**：程式碼、錯誤訊息與介面文字嚴禁任何 Emoji。
- **隱私與安全**：照片僅以記憶體 `inlineData` 轉發，零落盤；`GEMINI_API_KEY` 透過 `x-goog-api-key` Header 傳遞（不放 URL query 避免日誌留存）。
- **分批執行與每次檢查**：先寫單元測試（TDD），通過後再進行型別／Lint 檢查與正式環境部署。

---

## 分批執行清單 (Batches)

### Batch 1: Edge Function 支援 Google Gemini `generateContent`（TDD）
- [x] **Step 1.1**: 在 `supabase/functions/parse-sunscreen-label/index.test.ts` 新增測試：
  - 設定 `GEMINI_API_KEY` 時呼叫 `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`，驗證 `x-goog-api-key` Header、`inlineData` Base64 拆解與 `responseMimeType: "application/json"`。
  - 當 `GEMINI_API_KEY` 與舊 `OPENROUTER_API_KEY` 同時存在時，優先使用 `GEMINI_API_KEY`（直接繞過已達上限之舊 OpenRouter 金鑰）。
  - 處理 Gemini 特有之 `400 API_KEY_INVALID` 轉為 `UPSTREAM_AUTH_ERROR`，以及 `429` 轉為 `RATE_LIMITED`。
- [x] **Step 1.2**: 執行測試確認紅燈（Red）。
- [x] **Step 1.3**: 更新 `supabase/functions/parse-sunscreen-label/handler.ts` 實作 Gemini 視覺請求與回應解析（並保留 OpenRouter 向下相容 fallback）。
- [x] **Step 1.4**: 執行單元測試確認全綠（10 項測試全數通過）。

### Batch 2: 品質檢查、Supabase 正式站部署與 Git 同步
- [x] **Step 2.1**: 執行 `pnpm lint` 與相關測試套件確認 0 錯誤。
- [x] **Step 2.2**: 部署 `parse-sunscreen-label` 至 Supabase 正式專案 `ykfdnltaqpdytmrszbbk`。
- [x] **Step 2.3**: Commit 並推送至 GitHub `main`。
