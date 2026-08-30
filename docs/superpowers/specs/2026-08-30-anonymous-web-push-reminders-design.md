# UVAlert 匿名 Web Push 補擦提醒設計規格

**日期**：2026-08-30（Asia/Taipei）

**狀態**：設計已確認，等待使用者審閱書面規格

**範圍**：Supabase 後端推播、匿名裝置訂閱、單次補擦排程與瀏覽器 Web Push 接收

## 1. 目標

讓未登入使用者在支援 Web Push 的裝置上，即使 UVAlert 分頁已關閉，仍有機會於下一個補擦到期時間收到一則系統通知：

> 該補擦防曬乳了

本機 Session、倒數與 IndexedDB 仍是提醒狀態的唯一真值。後端推播是輔助送達通道；離線、權限拒絕、平台不支援或後端失敗都不得阻擋使用者建立、補擦、停止或結束本機提醒。

## 2. 已確認的產品決策

- 未登入使用者可以啟用後端推播，不以 Google 登入為前置條件。
- 每個最近到期時間只送一次，不提供 5／15 分鐘再次提醒。
- 通知只顯示「該補擦防曬乳了」，不顯示第二行內容。
- 通知 payload 不包含身體部位、產品、位置、UV 數值或完整 Session。
- 點擊通知只開啟或聚焦 UVAlert 首頁，由前端讀取本機資料呈現最新狀態。
- 採用「排程資料表＋固定 Supabase Cron＋Edge Function dispatcher」。
- Cron 每分鐘掃描到期排程，接受約 0～60 秒的排程掃描誤差；Push Service 與作業系統仍可能增加延遲。
- 已送出或取消的排程保留 7 天；90 天未活動的匿名訂閱自動刪除。
- 到期超過 10 分鐘的排程不再補送。
- 暫時性 `429`／`5xx` 最多重試 3 次，但不得超過到期後 10 分鐘。

## 3. 支援範圍與誠實承諾

第一版目標平台：

- Android 上支援 Web Push 的 Chrome、Edge 等瀏覽器。
- Windows／macOS 上支援 Web Push 的桌面瀏覽器。
- iPhone／iPad 上已加入主畫面、從主畫面啟動且允許通知的 Web App。

不支援 Push API、Service Worker 或 Notifications API 的環境，保留既有本機倒數與分頁存活期間的本機通知，並明確顯示背景推播不可用。產品不得宣稱所有瀏覽器、所有省電狀態或所有網路條件都保證準時送達。

## 4. 系統架構

```text
Vue 前端
  ├─ 申請通知權限
  ├─ 建立 PushSubscription
  ├─ 本機保存匿名裝置管理憑證
  └─ 建立／覆蓋／取消最新到期排程
             │
             ▼
Supabase Edge Functions
  ├─ push-subscription：註冊、更新、撤銷匿名裝置訂閱
  ├─ push-schedule：建立、覆蓋、取消該裝置唯一待送排程
  └─ push-dispatch：領取到期排程並呼叫 Web Push Service
             │
             ▼
Supabase PostgreSQL
  ├─ push_subscriptions
  └─ push_schedules
             ▲
             │ 每分鐘
        Supabase Cron
             │
             ▼
瀏覽器 Push Service → Service Worker → 系統通知
```

Vercel 只託管 Vue／Vite 前端。PostgreSQL、Edge Functions、Cron、VAPID private key 與發送流程全部位於 Supabase。

## 5. 元件與責任邊界

### 5.1 前端 Push adapter

負責：

- 檢查 Service Worker、Push API 與通知權限能力。
- 使用公開 VAPID key 建立或讀取 `PushSubscription`。
- 呼叫 subscription 與 schedule Functions。
- 在目前裝置安全保存 `deviceId` 與 `deviceSecret`。
- 將離線期間未完成的「更新排程／取消排程」保存為單一最新意圖，恢復連線後重送。
- 不直接讀寫 Supabase push 資料表。

### 5.2 Notification controller

既有 controller 仍觀察目前 Session 投影。新邊界需把同一個 `sessionNextDueAt` 同步到：

1. 現有分頁存活期間的本機通知。
2. 新增的後端 Web Push 排程。

後端同步失敗只更新背景推播狀態，不得讓 Session command 失敗。Session 結束、沒有下一個到期時間或使用者關閉背景推播時，controller 要求取消遠端排程。

### 5.3 Service Worker

新增 `push` event handler：

- 驗證 payload schema 與固定事件類型。
- 使用固定 `tag` 顯示「該補擦防曬乳了」。
- 不採用 payload 提供的任意標題、HTML 或 URL。
- `notificationclick` 延續現有行為：優先聚焦同源視窗，否則開啟首頁。

固定 `tag` 讓重試造成的多個 push event 在通知中心互相取代，不堆疊多則提醒。

### 5.4 Public Edge Functions

`push-subscription` 與 `push-schedule` 是免登入公開端點，但不代表匿名呼叫者可以直接操作資料表。兩者必須執行：

- 嚴格 method、Content-Type、body schema 與大小限制。
- 精確 CORS allowlist。
- 端點級限流。
- 裝置憑證驗證。
- 受控錯誤回應與敏感資料遮蔽。

### 5.5 Dispatcher

`push-dispatch` 只允許 Cron 使用伺服器端憑證呼叫，不對一般瀏覽器公開。它負責：

- 以原子 claim／lease 取得一批到期排程。
- 每筆獨立發送，單一裝置失敗不阻擋其他裝置。
- 依 Push Service 狀態碼完成、重試、失效或清理。
- 避免將 endpoint、key、secret 或完整 PushSubscription 寫入 log。

## 6. 匿名裝置身分

首次註冊成功時，後端產生不可猜測的 `deviceId` 與至少 256-bit 隨機 `deviceSecret`。原始 `deviceSecret` 只回傳一次並保存在該瀏覽器本機；資料庫只保存 `HMAC-SHA-256(DEVICE_CREDENTIAL_PEPPER, deviceSecret)`。`DEVICE_CREDENTIAL_PEPPER` 只存在 Supabase Function secret，不進入資料庫或前端。

後續更新 subscription、建立／覆蓋／取消排程與撤銷裝置時，都必須提供 `deviceId` 與 `deviceSecret`。驗證使用固定時間比較；錯誤回應不得透露 device 是否存在。

清除網站資料會遺失本機裝置憑證。前端若仍能讀取既有 PushSubscription 但沒有裝置憑證，必須建立新的後端裝置紀錄，不嘗試接管舊紀錄；舊紀錄由失效回應或 90 天清理機制移除。

## 7. 資料模型

### 7.1 `push_subscriptions`

每個匿名裝置最多一筆有效 subscription：

- `device_id uuid primary key`
- `device_secret_hash text not null`
- `endpoint text not null unique`
- `p256dh text not null`
- `auth text not null`
- `status text not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`
- `last_active_at timestamptz not null`
- `last_push_succeeded_at timestamptz null`

`status` 僅允許 `active`、`revoked`、`expired`。資料表啟用 RLS，不授予 anon／authenticated 直接讀寫權限；service role 只由 Edge Functions 使用。

### 7.2 `push_schedules`

每個裝置最多一筆目前排程，使用 `device_id` 作唯一鍵：

- `device_id uuid primary key references push_subscriptions(device_id) on delete cascade`
- `due_at timestamptz not null`
- `status text not null`
- `attempt_count integer not null default 0`
- `next_attempt_at timestamptz not null`
- `claimed_at timestamptz null`
- `claim_token uuid null`
- `sent_at timestamptz null`
- `cancelled_at timestamptz null`
- `last_error_code text null`
- `last_operation_id uuid not null`
- `created_at timestamptz not null`
- `updated_at timestamptz not null`

`status` 僅允許 `pending`、`claimed`、`sent`、`cancelled`、`expired`、`failed`。資料庫約束需確保 `attempt_count >= 0`，並建立 dispatcher 查詢所需的 `(status, next_attempt_at)` 索引。

排程表不保存 notification body、產品、部位、位置、UV 或 Session payload。

## 8. API 契約

### 8.1 Subscription

- `POST /functions/v1/push-subscription`：註冊新裝置，回傳一次性的裝置憑證。
- `PUT /functions/v1/push-subscription`：以裝置憑證更新 subscription keys／endpoint。
- `DELETE /functions/v1/push-subscription`：撤銷 subscription 並級聯取消／刪除待送排程。

### 8.2 Schedule

- `PUT /functions/v1/push-schedule`：建立或覆蓋該裝置唯一排程。
- `DELETE /functions/v1/push-schedule`：取消該裝置待送排程。

排程更新需帶一個前端產生的 `operationId`，後端以 `device_id` 與 `last_operation_id` 做冪等處理。`dueAt` 必須是含時區的有效 ISO 8601 timestamp，且介於伺服器目前時間減 10 分鐘與加 24 小時之間；前端不得主動建立已到期排程。上下限以伺服器時間判定並由測試覆蓋。

所有 API 使用共用 envelope 與受控錯誤碼，不回傳 Push endpoint、雜湊、service-role key 或 VAPID private key。

## 9. 排程狀態機

```text
pending ──claim──> claimed ──成功──> sent
   │                  │
   │                  ├─暫時失敗且仍在期限內──> pending
   │                  ├─永久失敗──────────────> failed
   │                  └─subscription 失效────> expired + 清除 subscription
   ├─使用者取消────> cancelled
   └─逾期超過 10 分鐘──> expired
```

claim 必須由資料庫函式原子完成，使用 `FOR UPDATE SKIP LOCKED`，每批最多取得 100 筆，並回傳不可猜測的 `claim_token`。只有持有相同 token 的 dispatcher 才能結算該次 claim。lease 固定為 2 分鐘；超過 2 分鐘仍未結算的 `claimed` 排程可回到 `pending`。

## 10. 重試規則

- 成功回應：標記 `sent`。
- Push Service `404`／`410`：subscription 標記失效並刪除其排程。
- `429`／暫時性 `5xx`：增加 `attempt_count`；第一次失敗後等待 1 分鐘，第二次失敗後等待 3 分鐘再重排。若 Push Service 提供合法且未超過到期後 10 分鐘的 `Retry-After`，採用較晚者。
- 最多發送嘗試 3 次。
- 到期超過 10 分鐘後一律 `expired`，不再補送。
- VAPID、簽章或伺服器設定錯誤視為部署問題；留下不含敏感值的錯誤代碼並停止無意義的密集重試。
- 網路結果不確定時允許有限重試；Service Worker 固定 `tag` 負責避免通知中心堆疊。

## 11. 離線與一致性

前端持久化的不是一串操作紀錄，而是「目前最新遠端意圖」：

- `schedule(dueAt, operationId)`；或
- `cancel(operationId)`。

新的意圖覆蓋舊意圖。恢復連線後：

- Session 仍有效且 `dueAt` 尚未到期：送出最新 schedule。
- Session 已結束、停止或沒有 due time：送出 cancel。
- `dueAt` 已到期：不補建陳舊排程，前端依最新 Session 決定是否已有下一個 due time。

後端排程狀態不得反向覆蓋本機 Session。背景推播同步錯誤只影響狀態提示與重試。

## 12. 安全與隱私

- VAPID private key、service-role key 與 Cron 呼叫憑證只放 Supabase secrets／Vault。
- VAPID public key是可公開設定，可由前端環境變數或只讀設定端點取得。
- 公開 Functions 不接受呼叫者指定任意通知文字、URL 或 payload。
- dispatcher 固定建立 `{ type: "reminder-due" }` 最小 payload；Service Worker 依固定 type 產生固定通知文字。
- API、資料表、log 與 analytics 不保存身體部位、產品、位置、UV 或完整 Session。
- endpoint、`p256dh`、`auth`、device secret 與完整 request body 視為敏感資料，不記錄原文。
- 註冊與排程端點需要限流；限流識別資料也必須最小化且設短期保留。
- CORS 只允許正式 origin 與明確核准的 preview／local origins。
- 不向 anon／authenticated role 開放 push tables 或 Queue schema。

## 13. 清理與保存

- `sent`、`cancelled`、`expired` 與 `failed` 排程在終態滿 7 天後刪除。
- `last_active_at` 超過 90 天的 subscription 與其排程刪除。
- 使用者在 UI 關閉背景推播時，立即呼叫撤銷 API、取消瀏覽器 subscription 並刪除遠端待送排程。
- Push Service 回覆 `404`／`410` 時立即清除失效 subscription。
- 清理由獨立資料庫函式與 Cron job 執行；不得和每分鐘 dispatcher 混成無界限的全表清掃。

## 14. 前端狀態

前端至少需要可區分：

- `unsupported`
- `permission-required`
- `subscribing`
- `enabled`
- `scheduled`
- `pending-sync`
- `schedule-error`

文案必須說明推播是輔助功能，平台、網路、省電或系統設定仍可能延遲或阻止送達。當背景推播未排定時，不得顯示成功狀態。

## 15. 測試策略

### 15.1 單元與整合測試

- subscription 建立、更新、撤銷與 payload validation。
- 原始 device secret 不落庫；錯誤憑證不能推測或操作其他裝置。
- 同一裝置只有一筆排程；更新覆蓋、取消冪等。
- 離線最新意圖覆蓋與重新連線補排。
- dispatcher 原子 claim、lease 恢復與並行隔離。
- 成功、`404`、`410`、`429`、`5xx`、網路錯誤與設定錯誤。
- 最多 3 次嘗試與到期後 10 分鐘停止。
- Service Worker `push`、固定文字、固定 tag 與 notification click。
- 不支援環境安全降級。
- 敏感值不出現在 response、log fixture 或前端 bundle。

### 15.2 資料庫測試

- schema、constraint、index、RLS 與 grants。
- anon／authenticated 不可直接存取 push tables。
- claim 函式並行時不重複回傳同一排程。
- 清理函式只刪除超過 7／90 天門檻的資料。

### 15.3 正式環境 smoke test

- Android Chrome。
- Windows 或 macOS 桌面瀏覽器。
- 若有可用實機：iPhone／iPad 主畫面 Web App。
- 關閉分頁後收到通知。
- 點擊後開啟／聚焦 UVAlert。
- 補擦、停止或結束後不收到已取消舊提醒。
- 離線建立後恢復連線補排。
- 拒絕權限與不支援平台仍能使用本機倒數。

缺少實機或未完成的項目必須標記「尚未驗證」，不得推論為通過。

## 16. 部署與營運

版本化內容包括：

- PostgreSQL tables、constraints、indexes、RLS、claim 與 cleanup functions。
- `push-subscription`、`push-schedule`、`push-dispatch` Edge Functions。
- dispatcher 與 cleanup Cron migrations。
- 無真實 secret 的環境變數範例與部署文件。

外部安全設定包括：

- VAPID key pair。
- Supabase Functions secrets 中的 VAPID private key。
- 前端公開 VAPID key。
- Supabase Vault 中 Cron 呼叫 dispatcher 所需的 URL 與伺服器憑證。
- 正式與核准 preview origins 的 CORS allowlist。

部署前必須先檢查 remote migrations、Functions 與 Cron 現況，再執行 migration dry run。若 dry run 含破壞性或無關變更，停止並請使用者確認。部署完成後記錄 project ref、Function versions、Cron 狀態、Vercel deployment、commit、時間與 smoke-test 證據。

## 17. 完成與勾選規則

後續 implementation plan 的所有 Task 與 Step 使用 checkbox：

- `- [ ]`：尚未完成。
- `- [x]`：已完成，且有相對應驗證證據。

只有同時符合以下條件才可勾選：

1. 程式或設定已完成。
2. Task 指定測試通過。
3. 獨立範圍審查沒有未解決問題。
4. 涉及部署時，正式環境 smoke test 通過。
5. 部署 URL、Function version、時間與驗證結果已寫入狀態文件。

提交、測試通過、Function 顯示 ACTIVE 或 Vercel 顯示 READY，任何單一證據都不足以獨立宣告整體完成。

## 18. 非目標

第一版不包含：

- Google 登入或跨裝置同步。
- 多台裝置共享同一個提醒狀態。
- 5／15 分鐘重複提醒。
- 任意通知文字、行銷推播、天氣警報或 UV 主動播報。
- SMS、Email、原生 App push 或 Expo push。
- 後端保存完整 Session、產品、部位、位置或 UV 資料。
- 推播送達率分析、使用者追蹤或行銷 analytics。
- 把後端排程當成本機提醒狀態的真值。

## 19. 回滾策略

- 前端可透過功能開關停用新的遠端 Push adapter，保留既有本機倒數與分頁內通知。
- 停用 dispatcher Cron 後不再發送新通知；已建立的排程保留供診斷或依保存規則清理。
- Edge Function 部署失敗不得修改 IndexedDB schema 或本機 Session。
- migration 採向前相容方式；正式資料表刪除需另立計畫，不納入緊急回滾命令。
