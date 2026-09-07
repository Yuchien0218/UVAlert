# 私密隱私請求每日彙整設計

**日期：** 2026-09-07  
**狀態：** 已取得設計同意，待使用者審閱規格後才建立實作計畫。

## 目標與範圍

既有匿名 `/feedback` 表單已可提交 `privacy_request`。本設計新增私密的每日處理通知：有新的隱私／帳號資料請求時，寄送一封彙整 Email 給服務營運者；沒有新的請求時不寄信。

這項功能不會：

- 公開營運者的個人 Gmail。
- 要求使用者登入或填寫聯絡 Email。
- 自動匯出、刪除或變更使用者帳號／資料。
- 影響既有 bug、功能建議與內容勘誤的 feedback 流程。

## 使用者與資料規則

1. 使用者即使不填聯絡 Email，仍可成功提交隱私請求；聯絡 Email 維持選填。
2. 只要有新的 `privacy_request`，每日彙整信就會列出完整訊息、選填聯絡 Email、提交時間與案件識別碼。
3. 沒有新的隱私請求時，不寄出空白或「零件」Email。
4. 私人收件 Gmail 與 Email 服務 API key 只存於 Supabase Edge Function Secrets，不會進入前端、公開頁面、Git 或 `Reply-To`。
5. 每筆隱私請求自建立日起保留 90 天；每日清理已逾期資料。

## 選定方案：Resend 私人測試寄送模式

第一版使用 Resend 的未驗證網域測試寄信能力，寄件來源維持服務提供的測試寄件地址，且只寄到營運者自己的私人 Gmail。這不需自訂網域，且符合目前僅由本人處理每日彙整的需求。

日後若需寄給其他人、使用品牌寄件地址、或接受公開回信，需先新增並驗證自訂網域；本次不包含該工作。

## 架構與資料流

1. 匿名使用者透過既有 `/v1/feedback` 提交 `privacy_request`，可選擇是否留下聯絡 Email。
2. 既有 Edge Function 驗證、限流並以 service role 寫入私有 `feedback_submissions`。
3. Supabase Cron 每日台灣時間 09:00 觸發新的私有 Edge Function。
4. Function 以原子 claim 取得尚未成功彙整的隱私請求，建立一個可重試的 digest batch。
5. Function 呼叫 Resend API 寄送一封 HTML 與純文字皆具備的摘要信給私密收件者。
6. 收到成功回應後，batch 與其請求標示為已寄送；失敗則保留未完成狀態，下一次排程安全重試。
7. 同一個 batch 使用穩定的寄送冪等鍵，避免 HTTP 重試或排程重疊造成重複 Email。
8. 每日清理工作刪除已超過 90 天的隱私請求與相依的 batch 關聯資料。

## 後端元件與責任

### 資料庫

- 為 privacy digest 建立專用 batch 與 batch item 資料表，不把寄送狀態混入一般 feedback 的 `status` 欄位。
- batch 有唯一的台灣日期／範圍識別、狀態、claim 時間、成功寄送時間與服務端回傳的寄送識別碼。
- batch item 僅連到 `privacy_request` 的 feedback 識別碼。
- RLS 開啟且不授權 anon／authenticated；只有 service role 與受控 RPC 可讀寫。
- 以 SQL RPC 原子化建立或取得待寄 batch，避免兩次 Cron 執行寄送相同請求。

### `privacy-digest` Edge Function

- 僅接受受控 Cron 呼叫；驗證既有私有排程密鑰，不接受瀏覽器使用。
- 讀取 `RESEND_API_KEY`、`PRIVACY_DIGEST_RECIPIENT` 與排程密鑰等私密值。
- 僅查詢 `feedback_type = 'privacy_request'` 且尚未成功納入 digest 的資料。
- 沒有資料時回傳成功的 no-op 結果，不呼叫 Resend。
- 寄送內容採純文字跳脫與 HTML escape，防止使用者輸入被當成信件 HTML。
- API 失敗時記錄可診斷、但不含完整訊息或 Email 的錯誤摘要；維持可重試狀態。

### Supabase Cron 與 Vault

- Cron 使用 Vault 保存的專案 URL 與排程密鑰呼叫 Edge Function，不將密鑰寫進 migration 原始碼。
- 時程以台灣時間每日 09:00 為產品語意；實作會明確測試 UTC 對應，避免伺服器時區誤解。
- 90 天清理可由同一支受控 Function 執行，或用受限 SQL job 執行；兩者皆需可監測成功／失敗。

## 寄信內容與隱私界線

- 主旨使用「UVAlert：隱私／帳號資料請求每日彙整」。
- 每封信顯示處理日期、案件數與每筆案件的提交時間、案件識別碼、完整留言及選填聯絡 Email。
- 不放入登入 token、裝置推播訂閱、提醒資料、完整 IP、User-Agent 或資料庫連線資訊。
- 不設定營運者 Gmail 為公開寄件者或 Reply-To。
- 不啟用開信／點擊追蹤。

## 失敗處理與可觀測性

- Resend 暫時失敗、Function timeout 或 Cron 重疊時，資料不標示為已寄送。
- 下次日排程會先重試已 claim 但未完成的 batch，再處理新請求。
- 管理者可在 Supabase 的 Cron 與 Edge Function Logs 查看 job 是否成功；Log 不記錄請求原文或聯絡 Email。
- 若 API key 或私密收件者缺失，Function 失敗並回傳明確設定錯誤，不會假裝寄送成功。

## 驗證策略

1. 單元測試：空 digest、不含聯絡 Email、含特殊字元訊息、API 成功、API 失敗、重試與冪等鍵。
2. SQL 測試：RLS／權限、原子 claim、batch 唯一性、只選取 privacy request、90 天清理。
3. 本機整合：Cron secret 驗證與 Resend HTTP request mock。
4. 正式環境：以本人私有 Gmail 發送一次受控測試；確認信件到達後，驗證無新增案件時不再寄出。

## 需要的正式設定（實作完成後再請求）

- Resend 帳號與僅有「寄信」權限的 API key。
- Supabase Edge Function Secrets：`RESEND_API_KEY`、`PRIVACY_DIGEST_RECIPIENT`。
- Supabase Vault：排程呼叫所需的專案 URL 與私有排程密鑰。
- 套用 migration、部署 Edge Function、建立 Cron job 的明確使用者授權。

## 完成定義

- 使用者未填聯絡 Email 時仍可匿名提交隱私請求。
- 有新隱私請求時，每天最多寄出一封彙整信給私有 Gmail。
- 無新請求時不寄信。
- 暫時寄送失敗可重試且不重複寄送。
- 請求與 digest 關聯資料在 90 天後清理。
- 個人 Gmail 不會出現在公開網站、前端 bundle、版本庫或公開文件。
