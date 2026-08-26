# UVAlert 第一版後端基礎設計

**日期**：2026-08-17  
**狀態**：設計已由產品端逐段確認，待使用者審閱文件後進入實作計畫  
**適用分支**：`claude/pre-redesign-p0-work`

## 1. 設計目標

本設計為 UVAlert 建立第一版後端基礎，但不改變目前已確認的產品核心：

- 核心仍是防曬乳補擦倒數，不是雲端帳號或歷史紀錄。
- 使用者可免註冊直接使用；本機 IndexedDB 是提醒與離線操作的必要基礎。
- Google 登入與跨裝置同步是選配，不是開始提醒的前置條件。
- 後端不可取代本機倒數，也不可因網路或通知能力不足而阻擋手動操作。
- 第一版只同步跨裝置有立即價值的資料，不同步完整過往 Session 歷史。
- 第一版不建立裝備照片雲端儲存；分享圖在使用者裝置上產生。
- 第一版不建立專用管理員前台；問題回報先透過 Supabase Dashboard 查看。

## 2. 範圍與非範圍

### 2.1 第一版範圍

1. Supabase Auth 的 Google OAuth 登入。
2. 使用者主動同意後的資料預覽與跨裝置同步。
3. 進行中提醒、裝備、行政區與使用者偏好的同步。
4. 同步版本、衝突檢查、冪等重送與刪除標記。
5. 中央氣象署 UV 預報代理與快取。
6. 不需登入的問題回報／意見回饋 API。
7. 清除 UVAlert 雲端資料與登入帳號的操作。
8. RLS、輸入驗證、限流、遮罩日誌與整合測試。

### 2.2 第一版不包含

- 已結束 Session 與完整補擦事件歷史的跨裝置同步。
- 自動建立雲端匿名帳號。
- 裝備照片上傳、照片同步或 Supabase Storage。
- 衛教內容 CMS 或專用管理員後台。
- 依使用者資料建立公開頁面或搜尋索引。
- 依通知權限或背景服務建立伺服器排程提醒。

過往紀錄仍保留在本機，並可使用現有的「匯出本機資料」保存；之後若要加入歷史同步，另立資料模型與產品決策。

## 3. 技術架構

```text
PWA（Vue 3／Vite）
├─ IndexedDB
│  ├─ 免登入提醒與離線資料
│  ├─ 本機同步前的來源資料
│  └─ UV 最後一次有效快取
├─ Supabase Auth（Google OAuth）
└─ Edge Functions
   ├─ /v1/sync/manifest
   ├─ /v1/sync/read
   ├─ /v1/sync/commit
   ├─ /v1/sync/delete
   ├─ /v1/uv/forecast
   ├─ /v1/feedback
   └─ /v1/account/delete
          │
          ▼
   Supabase PostgreSQL
   ├─ sync_records
   ├─ sync_tombstones
   ├─ uv_forecast_cache
   └─ feedback_submissions
```

### 3.1 前端與後端邊界

- `packages/domain` 繼續只負責倒數規則與 reducer，不依賴 Supabase。
- `packages/contracts` 是前後端 payload 的版本化驗證來源。
- `packages/persistence-web` 繼續負責 IndexedDB、本機交易與跨分頁同步。
- 新增的雲端能力應透過 `packages/platform` 的 port 接入，避免頁面直接呼叫 Supabase SDK。
- `apps/web/src/adapters` 實作 Auth、Sync、Feedback 與 UV API adapter。
- PWA 目前預留的 `/v1/uv/forecast` 保持不變；正式部署由同源 rewrite 或 API gateway 對應至 Edge Function，開發環境使用 Vite proxy 或環境變數切換。

### 3.2 身份策略

- 使用者第一次進入時不建立 Supabase 匿名帳號，保持現有本機訪客身份。
- 使用者從「本機資料與隱私」或免登入入口主動選擇 Google 同步後，才開始 OAuth。
- OAuth 成功後，以 Supabase Auth 的使用者 UUID 作為雲端資料擁有者。
- Google 登入失敗、取消或網路中斷時，本機資料完全不變。

## 4. 同步資料範圍

### 4.1 第一版同步

| 資料                                 | 是否同步 | 說明                                   |
| ------------------------------------ | -------- | -------------------------------------- |
| 進行中的 Session、部位狀態與補擦事件 | 是       | 讓換裝置後可以繼續目前提醒             |
| 防曬乳與其他裝備紀錄                 | 是       | 包含文字欄位與封存狀態；不含裝備照片   |
| 行政區選擇                           | 是       | 只同步行政區代碼與名稱，不同步精確座標 |
| 提醒頻率、聲音等使用者偏好           | 是       | 只同步 App 偏好，不同步瀏覽器權限      |
| 已結束 Session 與完整歷史事件        | 否       | 先留在本機，可匯出                     |
| UV 預報快取                          | 否       | 每台裝置自行取得與快取                 |
| 未完成設定草稿                       | 否       | 避免跨裝置帶入半成品流程               |
| 裝置識別碼、精確座標、通知權限       | 否       | 裝置專屬或隱私敏感資料                 |

### 4.2 同步前預覽

同步前先取得雲端 manifest，不直接下載完整 payload。預覽至少顯示：

- 雲端是否已有資料。
- 進行中提醒是否存在，以及最近更新時間。
- 裝備數量與最近更新時間。
- 行政區與偏好是否存在。
- 本機與雲端是否有可能衝突。

使用者確認後，才讀取或提交完整資料。敏感資料預設不傳；目前定義的敏感資料包括精確座標、裝置識別碼與瀏覽器通知狀態。

## 5. 資料庫設計

第一版同步資料採「版本化 JSON 文件」保存，以沿用 `packages/contracts` 的 schema，避免在核心事件模型尚未需要公開查詢前，先建立大量互相耦合的關聯表。

### 5.1 `sync_records`

用途：保存目前可跨裝置使用的雲端資料。

主要欄位：

- `user_id uuid not null references auth.users(id)`
- `record_kind text not null`：`active_session`、`product_catalog`、`region_preference`、`user_preferences`
- `record_id text not null`
- `schema_version text not null`
- `payload jsonb not null`
- `payload_fingerprint text not null`
- `revision bigint not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

唯一鍵為 `user_id + record_kind + record_id`。`revision` 是每一筆 record 的單調版本，不是整個帳號共用的全域計數器。所有寫入必須由 Edge Function 驗證 payload 與該 record 的 revision 後執行。

### 5.2 `sync_tombstones`

用途：記錄使用者在某一裝置刪除的同步資料，避免另一台裝置因舊快照把資料復原。

主要欄位：

- `user_id uuid not null references auth.users(id)`
- `record_kind text not null`
- `record_id text not null`
- `revision bigint not null`
- `deleted_at timestamptz not null`

唯一鍵為 `user_id + record_kind + record_id`。tombstone 的 revision 沿用被刪除 record 的版本序列；讀取 manifest 時會一併回傳刪除摘要。

### 5.3 `uv_forecast_cache`

用途：保存後端從中央氣象署取得、已通過 contract 驗證的預報。

主要欄位：

- `region_code text primary key`
- `schema_version text not null`
- `source_dataset text not null`
- `payload jsonb not null`
- `fetched_at timestamptz not null`
- `usable_until timestamptz not null`
- `etag text null`
- `updated_at timestamptz not null`

此表不對前端直接開放；前端只能呼叫 `/v1/uv/forecast`。Edge Function 以伺服器 secret 呼叫 CWA，並在回傳前以 `FiveDayUvForecastSchema` 驗證。

### 5.4 `feedback_submissions`

用途：保存不需登入的問題回報與意見回饋。

主要欄位：

- `id uuid primary key`
- `feedback_type text not null`
- `message text not null`
- `contact_email text null`
- `app_version text not null`
- `route text not null`
- `user_agent_summary text null`
- `status text not null default 'new'`
- `created_at timestamptz not null`

回報不自動附帶 Session、裝備內容、精確位置或提醒事件。因為它是不需登入的支援資料，第一版不把它當作同步資料，也不讓公開用戶端直接寫入資料表。

## 6. API 契約

### 6.1 `GET /v1/sync/manifest`

需要永久 Google 登入使用者的 access token。

回傳每一類雲端資料的數量、record ID 摘要、revision、更新時間與刪除標記摘要；不回傳完整 payload。

### 6.2 `POST /v1/sync/read`

需要登入。Request 指定使用者已在預覽後選取的 record keys。Function 再次檢查 `auth.uid()` 與 record ownership，回傳通過 schema 驗證的完整資料。

### 6.3 `POST /v1/sync/commit`

需要登入。Request 包含：

- 每一筆 record 對應的 `expectedRevision`
- 要提交的版本化 records
- 使用者已確認的同步方向
- `idempotencyKey`

Function 會依序執行：驗證身份、驗證 payload、逐筆檢查 revision、寫入 records／tombstones、產生結果。任一 record 的 revision 不符時回傳 `409 SYNC_CONFLICT`，整批不提交，絕不直接覆蓋雲端資料。

### 6.4 `POST /v1/sync/delete`

需要登入。只建立對應 tombstone 並提高 revision，不接受直接以任意 payload 覆寫成刪除狀態。

### 6.5 `GET /v1/uv/forecast?regionCode=...`

不需要登入。Function：

1. 驗證行政區代碼格式與允許清單。
2. 優先使用仍在 `usable_until` 內的快取。
3. 快取失效或不存在時，以 secret 授權碼呼叫 CWA F-D0047-091。
4. 驗證回應並轉換成 `FiveDayUvForecast`。
5. 寫入快取後回傳。

若上游失敗，回傳可辨識的 `503`；前端保留本機最後一次有效快取並顯示資料狀態，不把失敗當成 UVI 為零。

### 6.6 `POST /v1/feedback`

不需要登入。Request 包含回報類型、描述、選填信箱，以及前端自動提供的版本／路由／瀏覽器摘要。Function 執行格式驗證、限流與垃圾內容基本檢查後，才寫入 `feedback_submissions`，回傳不含私人資料的回報編號。

第一版不接受圖片上傳。

### 6.7 `POST /v1/account/delete`

需要登入與明確確認。Function 在同一個受控流程中：

1. 刪除該 user 的 `sync_records`。
2. 刪除該 user 的 `sync_tombstones`。
3. 刪除 UVAlert 的 Supabase Auth user。
4. 使目前 access token 失效，前端回到免登入本機模式。

此操作不會刪除使用者的 Google 帳號。已提交的匿名回報不屬於同步資料，不因清除同步而自動消失。

## 7. 同步流程與衝突

### 7.1 首次同步

1. 使用者在本機提醒頁或「本機資料與隱私」點選 Google 同步。
2. 完成 Google OAuth。
3. 取得雲端 manifest。
4. 顯示本機／雲端資料預覽。
5. 雲端空白時，確認後提交本機選定資料。
6. 雲端有資料時，使用者選擇下載、上傳或維持本機。
7. 成功後更新本機同步 metadata；失敗時本機資料不變。

### 7.2 後續同步

- 進入 App、回到前景或使用者手動按「立即同步」時檢查 manifest。
- 不在每次倒數 tick 或每次補擦操作後強制網路同步。
- 可在背景連線恢復後安排一次同步，但不影響本機提醒。
- 任何寫入都以 `expectedRevision` + `idempotencyKey` 保護。

### 7.3 衝突

- 本機與雲端都有更新時，顯示更新時間、資料類型與簡短差異。
- 第一版不做不可逆的自動合併。
- 使用者可選擇本機版本、雲端版本或取消。
- 進行中的提醒衝突同樣採單一版本選擇，避免兩台裝置同時產生互相矛盾的 Session。

## 8. 帳號與資料生命週期

- 登出 Google：只結束登入，本機與雲端資料都保留。
- 停止同步：停止未來上傳／下載，雲端資料保留。
- 清除雲端資料：刪除 UVAlert 雲端資料與 UVAlert Auth user，不影響 Google 帳號。
- 清除本機資料：只清除此裝置；若之後重新登入，可再次預覽雲端資料。
- Google OAuth 取消、失敗或網路中斷：不刪除、不覆蓋本機資料。

## 9. 安全與維運

- 所有暴露 schema 的資料表啟用 RLS。
- `sync_records`／`sync_tombstones` 只允許永久登入者存取自己的 rows；以 `auth.uid()` 比對 `user_id`。
- `uv_forecast_cache` 與 `feedback_submissions` 不允許公開用戶端直接任意讀寫。
- Supabase publishable key 可放在前端；service role key、CWA 授權碼與其他 secret 只放 Edge Function secrets。
- CORS 只允許正式網域與本機開發網域。
- 回報與 UV API 加入請求限流；UV 快取依行政區與有效期限降低上游請求量。
- 日誌遮罩 email、user UUID、完整 payload、精確位置與裝備私人備註。
- `supabase/` 保存 migration、Edge Functions 與本機設定範例；真實密鑰不得進 git。
- 正式資料庫只透過 migration 更新，不直接依賴手動 Dashboard schema 修改。
- 第一版使用 Supabase Dashboard 查看回報；若日後需要工作流程、角色權限或批次內容管理，再另立管理員後台規格。

## 10. 錯誤契約

前端必須把後端錯誤轉為可理解的狀態，不顯示原始堆疊或 secret：

| HTTP | 代碼                   | 行為                             |
| ---- | ---------------------- | -------------------------------- |
| 401  | `AUTH_REQUIRED`        | 回到未同步狀態，不清除本機資料   |
| 403  | `FORBIDDEN`            | 顯示權限錯誤並停止本次同步       |
| 409  | `SYNC_CONFLICT`        | 重新取得摘要，顯示版本差異       |
| 422  | `VALIDATION_ERROR`     | 顯示欄位或資料版本錯誤，不提交   |
| 429  | `RATE_LIMITED`         | 顯示稍後再試，不重複自動送出     |
| 503  | `UPSTREAM_UNAVAILABLE` | 使用本機 UV 快取或保留本機功能   |
| 500  | `SERVER_ERROR`         | 顯示同步未完成，本機資料維持原狀 |

所有可重送的寫入都必須使用 `idempotencyKey`。成功重送應回放原結果，不建立第二筆資料。

## 11. 測試與驗收

### 11.1 Contract 與資料庫

- 使用 `packages/contracts` 驗證所有 sync payload。
- migration 建立後驗證欄位、唯一鍵、foreign key、索引與 RLS policy。
- 未登入、其他 user、匿名 JWT 均不能讀寫同步資料。

### 11.2 同步

- 首次同步雲端空白、本機空白、兩邊都有資料。
- 上傳、下載、取消與網路中斷。
- revision 衝突不覆蓋資料。
- 同一 idempotency key 重送只產生一次結果。
- tombstone 可以阻止舊裝置復原已刪除資料。
- 停止同步與登出不改變本機資料。
- 清除雲端資料後重新登入看不到舊 sync records。

### 11.3 UV 代理

- region code 驗證。
- CWA 成功回應轉成 `FiveDayUvForecast`。
- CWA 格式錯誤不寫入快取。
- 有效快取可在上游暫時失敗時使用。
- 過期快取不誤標為最新資料。
- CWA secret 不會出現在 response、前端 bundle 或測試輸出。

### 11.4 回報與安全

- 未登入可以送出，缺少必要欄位會拒絕。
- 聯絡信箱格式錯誤會回傳驗證錯誤。
- 限流後不會重複建立回報。
- 回報不會自動帶出 Session、精確位置或裝備私人備註。
- PWA 後端不可用時，現有本機倒數與手動補擦流程仍通過測試。

## 12. 實作順序

設計審閱通過後，以小步驟實作：

1. 建立 Supabase 本機設定、migration skeleton 與 secrets 範例。
2. 建立同步資料表、RLS policy 與 contract 驗證邊界。
3. 實作 Auth adapter 與 Google OAuth 回呼狀態。
4. 實作 manifest／read／commit／delete sync functions。
5. 實作前端同步預覽、確認、衝突與錯誤狀態。
6. 實作 CWA UV proxy、驗證與快取。
7. 實作匿名 feedback function 與限流。
8. 實作雲端資料清除與登出流程。
9. 完成整合測試、環境設定與部署檢查。

此順序不會先改變本機提醒核心；每一階段都能在後端不可用時維持既有 PWA 行為。
