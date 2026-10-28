# 防曬乳外包裝拍照辨識自動填表：設計規格

**日期**：2026-10-27  
**狀態**：使用者已確認規格與採用 OpenRouter API（預設模型 `openai/gpt-4o-mini`），進入實作計畫階段  
**用途**：定義在裝備管理（`GearForm`）中透過拍攝／上傳防曬乳外包裝照片，經由視覺 AI（Vision Model）自動解析規格並填寫表單之端到端架構、Schema 契約、使用者體驗與安全邊界。  
**權威性**：若與既有資料模型衝突，以 `packages/contracts/src/product.ts` 為準；視覺樣式以根目錄 `DESIGN.md` 為準。

---

## 一、問題背景與設計目標

### 1.1 現況痛點

- 在新增防曬裝備時（`/products/new` 或 `/setup` 流程內嵌的 `GearFormSheet`），使用者需要填寫品名、SPF、PA 等級，以及進階包裝標示（耐水性 40/80 分鐘、曝曬前等待時間、建議補擦間隔、有效期限）。
- 防曬乳外包裝文字細小、排版緊湊、中英日文夾雜，使用者難以在短時間內找到對應規格，容易產生填寫阻力或放棄填寫進階標示。

### 1.2 核心目標

1. **一鍵速填**：拍下防曬乳正面（與背面）外包裝，1~2 秒內由 AI 結構化解析出規格並自動填入表單。
2. **容錯與確認**：自動填入後高亮提示，使用者保有 100% 最終修改權；AI 辨識僅作「輔助建議」，不強行覆蓋既有自訂內容。
3. **隱私與零留存（Zero Retention）**：遵循 UVAlert 隱私第一原則，照片僅在 Edge Function 記憶體中轉發推論，**絕不存入資料庫、絕不保存於檔案系統**。
4. **安全隔離**：API Key（`OPENROUTER_API_KEY`）嚴格隔離於 Supabase Secrets，前端不暴露任何 AI 金鑰。

---

## 二、範圍與非範圍

### 2.1 涵蓋範圍

- **品類限定**：僅對 `gearCategory === "sunscreen"`（防曬乳）啟用拍照辨識。其他品類（如衣物、帽子、陽傘、太陽眼鏡）不適用。
- **支援照片數量**：支援 1 ~ 2 張照片（多數防曬乳正面標記品名/SPF/PA，背面標記耐水性、使用方法與有效期限）。
- **前端圖像優化**：拍照後於前端先進行壓縮（最大寬高 1280px、JPEG/WebP 80% 畫質），單圖體積控制於 200KB 內，減少網路傳輸與 Token 消耗。
- **後端 Edge Function**：於 Supabase 新增 `parse-sunscreen-label` 函式，作為代理端點。

### 2.2 非範圍

- 不支援連續錄影或即時 AR 物件偵測。
- 不維護龐大的靜態條碼產品庫（以 Vision AI 即時文字理解為主）。
- 離線狀態下不進行本地重型模型辨識（離線時維持既有純手動填寫）。

---

## 三、使用者體驗與互動流程（UX Flow）

```
[使用者進入 GearForm]
       │
       ▼ (品類為「防曬乳」時顯示)
┌──────────────────────────────────────────────┐
│  [ 📸 拍照自動填寫防曬乳包裝 (正面／背面) ]  │
└──────────────────────────────────────────────┘
       │
       ├─ 使用者點擊，透過原生拍照介面拍攝 1~2 張照片
       │
       ▼
┌──────────────────────────────────────────────┐
│  縮圖預覽 + [ 開始辨識 ]                      │
└──────────────────────────────────────────────┘
       │
       ▼ (前端 Canvas 壓縮 -> POST /v1/parse-sunscreen-label)
┌──────────────────────────────────────────────┐
│  載入狀態：InlineLoader + 「正在解析包裝標示…」  │
└──────────────────────────────────────────────┘
       │
       ▼ (成功回傳結構化資料)
┌──────────────────────────────────────────────┐
│  自動填入表單各欄位                           │
│  - 標記小提示「已由照片自動帶入，請確認」     │
│  - 使用者可微調或直接按下「儲存裝備」         │
└──────────────────────────────────────────────┘
```

### 3.1 互動細節規範

1. **入口位置**：
   - 位於 `GearForm.vue` 品類選擇下方、品名輸入框上方。
   - 使用次要行動按鈕風格（`button--secondary`），搭配圖示 `tool-camera`（或相機圖示）。
2. **多張照片支援**：
   - 預設提供兩個拍攝槽位：「正面（品名、SPF、PA）」與「背面（耐水、說明、有效期限，選填）」。
   - 若使用者只拍 1 張亦可直接送出辨識。
3. **辨識後覆蓋規則**：
   - 若欄位為預設值（例如「未命名防曬乳」或空白），直接填入辨識結果。
   - 若使用者已自行輸入過品名，保留使用者輸入，僅填入空白之係數欄位（或以輕提示詢問是否覆蓋）。

---

## 四、資料契約（Contracts & Schemas）

在 `packages/contracts` 定義專屬的 Request 與 Response Schema：

### 4.1 請求契約：`ParseSunscreenLabelRequestSchema`

```typescript
export const ParseSunscreenLabelRequestSchema = z.object({
  /** Base64 編碼的圖片資料（含 data:image/... 前綴或純 base64，最多 2 張） */
  images: z.array(z.string().min(1)).min(1).max(2),
  /** 客戶端當前本地日期時間（ISO 8601），輔助推算到期日 */
  clientLocalTime: z.string().datetime({ offset: true })
});
```

### 4.2 回應契約：`ParseSunscreenLabelResponseSchema`

必須嚴格對齊 `packages/contracts/src/product.ts` 既有欄位型態：

```typescript
export const ParseSunscreenLabelResponseSchema = z.object({
  /** 產品名稱 / 品牌與系列 */
  displayName: z.string().trim().min(1).max(80).nullable(),

  /** SPF 防曬係數（正整數，若為 50+ 則解析為 50） */
  spf: z.number().int().positive().nullable(),

  /** PA 等級（如 "PA++++", "PA+++", "PPD 16", "Broad Spectrum"） */
  paGrade: z.string().trim().min(1).max(20).nullable(),

  /**
   * 耐水性狀態
   * 40: 具 40 分鐘耐水
   * 80: 具 80 分鐘耐水（或 Very Water Resistant）
   * not_water_resistant: 明確標註不具耐水性
   * no_claim: 一般未宣稱
   * unknown: 無法從照片判讀
   */
  waterResistanceStatus: z.enum([
    "40",
    "80",
    "not_water_resistant",
    "no_claim",
    "unknown"
  ]),

  /** 建議補擦間隔（分鐘數，若包裝寫 2 小時則為 120） */
  reapplicationIntervalMinutes: z.number().int().positive().nullable(),

  /** 曝曬前等待時間（分鐘數，如 15 分鐘） */
  preExposureWaitMinutes: z.number().int().positive().nullable(),

  /** 有效到期日（格式 YYYY-MM-DD，若包裝標記 EXP: 2027/05 則推算月底或該月） */
  expiryDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),

  /** 是否有明確防曬宣稱 */
  sunscreenClaimConfirmed: z.boolean(),

  /** AI 辨識備註（如：「有效期限反光微模糊，推估為 2027-06-30」），供 UI 提示 */
  notes: z.string().trim().max(300).nullable()
});
```

---

## 五、後端 Edge Function 設計 (`parse-sunscreen-label`)

### 5.1 端點資訊

- **路徑**：`/v1/parse-sunscreen-label`
- **權限驗證**：公開允許（搭配匿名 Rate Limiting）或綁定既有 Supabase Auth。
- **執行環境**：Supabase Deno Edge Function。

### 5.2 系統 Prompt（System Prompt）規範

```text
你是一位化妝品包裝與防曬規範專家。請檢視所附的防曬乳包裝照片（正面或背面），提取各項防曬與產品標示。
輸出必須是符合指定 JSON Schema 的乾淨 JSON 物件，嚴禁包含額外 markdown 標記。

提取規則：
1. displayName: 提取最顯著的產品品名（包含品牌，如「安耐曬 金鑽高效防曬露」）。若有多語言，以繁體中文或英日文原名為主。
2. spf: 數值化數字。若是 "SPF 50+"，填入 50；若未標註填 null。
3. paGrade: 如 "PA++++", "PA+++", "Broad Spectrum", "Boots 3 Star"。若無填 null。
4. waterResistanceStatus:
   - 看到 "80 min", "Very Water Resistant", "耐水 80 分鐘" -> "80"
   - 看到 "40 min", "Water Resistant", "耐水 40 分鐘" -> "40"
   - 看到 "不防水", "non-water resistant" -> "not_water_resistant"
   - 包裝背面無提及耐水特性 -> "no_claim"
   - 模糊或反光無法判斷 -> "unknown"
5. reapplicationIntervalMinutes: 包裝指示每幾小時補擦。若註明 "at least every 2 hours" 填 120。若未提及填 null。
6. preExposureWaitMinutes: 塗抹後等待時間。如 "apply 15 minutes before sun exposure" 填 15。未提及填 null。
7. expiryDate: 格式為 "YYYY-MM-DD"。若只有月份如 "EXP 2027/08"，填該月最後一天 "2027-08-31"。未找到填 null。
8. sunscreenClaimConfirmed: 是否明確為防曬產品（true / false）。
9. notes: 任何反光、不確定或需使用者留意的簡短提示（繁體中文，50 字內）。
```

### 5.3 模型配置與 Secrets

- **API 服務**：[OpenRouter](https://openrouter.ai/)（端點：`https://openrouter.ai/api/v1/chat/completions`）。
- **預設採用模型**：`openai/gpt-4o-mini` 或 `google/gemini-2.0-flash-001`（兼具多模態視覺解析精度、極快回應速度與低成本）。
- **後端 Secret**：`OPENROUTER_API_KEY`（透過 `supabase secrets set OPENROUTER_API_KEY=xxx` 配置）。
- **Request Headers**：
  - `Authorization: Bearer $OPENROUTER_API_KEY`
  - `HTTP-Referer: https://uvalert.tw`
  - `X-Title: UVAlert`
- **相容擴充性**：OpenRouter 支援透過單一 API Key 無縫路由至所有主流視覺模型（OpenAI, Gemini, Claude 等），後端程式碼保留模型名稱為環境變數（`OPENROUTER_MODEL`），便於日後彈性切換。

---

## 六、隱私、安全與限流（Security & Privacy）

1. **零落盤政策（Zero-Disk Policy）**：
   - 圖片在 Deno Edge Function 中讀取為記憶體 buffer，直接打包送往 Vision API。
   - 不得呼叫 Supabase Storage，不得寫入 PostgreSQL，亦不得於 Log 中記錄 Base64 內容。
2. **傳輸加密**：
   - 端到端一律強制 HTTPS。
3. **頻率限制（Rate Limiting）**：
   - 複用 `supabase/functions/_shared/rate-limit.ts`，限制單一 IP 每小時最多辨識 30 次，防止惡意消耗 API 額度。

---

## 七、錯誤處理與退避策略

| 狀況                      | 前端表現                                                     | 處置方式                                              |
| :------------------------ | :----------------------------------------------------------- | :---------------------------------------------------- |
| **照片過於模糊 / 反光**   | 顯示黃色提示：「部分資訊無法辨識，請手動確認或重新拍攝」     | 辨識成功的欄位正常帶入，未辨識出之欄位維持原樣。      |
| **拍攝非防曬乳物品**      | 顯示提示：「未檢測到防曬產品標示，請確認拍攝的是防曬乳包裝」 | `sunscreenClaimConfirmed === false`，不更動表單數值。 |
| **網路中斷 / 伺服器錯誤** | 顯示提示：「暫時無法辨識照片，請稍後再試或直接手動輸入」     | 關閉載入狀態，表單維持原狀，不阻塞使用者手動輸入。    |
| **API 額度耗盡**          | 後端回傳 429，前端提示服務忙碌中                             | 優雅退回手動填寫流程。                                |

---

## 八、下一步工作排程

1. [ ] **使用者審閱**：確認此規格書內容是否符合需求、確認預計採用的 API 供應商（Gemini / OpenAI 等）。
2. [ ] **撰寫實作計畫（Plan）**：規劃 Task 1（Contracts 定義）、Task 2（Edge Function）、Task 3（前端拍照元件與整合）、Task 4（測試與驗證）。
3. [ ] **TDD 實作與上線**。
