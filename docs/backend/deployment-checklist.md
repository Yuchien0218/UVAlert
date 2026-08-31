# UVAlert 正式部署檢查表

## Supabase project 與 secrets

- [ ] 建立正式 Supabase project，確認 project ref 與 production database 不會與 local 混用。
- [ ] 套用全部 migration，包含 sync batch、feedback dedupe 與 account-delete RPC。
- [ ] 確認 `sync_records`、`sync_tombstones`、`sync_idempotency_receipts`、`uv_forecast_cache`、`feedback_submissions` 均啟用 RLS。
- [ ] 設定 `CWA_API_KEY`、`ALLOWED_ORIGINS` 與 Google provider secrets；不要把值寫進 git。
- [ ] 確認 service-role key 只存在 Edge Functions／部署 secret，不出現在 `VITE_*`、HTML、source map、response 或 log。

## 匿名 Web Push（尚無 production 部署證據）

以下全部是 Task 10–11 的 production checklist；本機實作或 Task 9 的本機可部署證據都不能把其中任何一項視為已完成。

- [ ] **Read-only preflight**：以 `supabase projects list`、`supabase migration list --project-ref $env:UVALERT_SUPABASE_PROJECT_REF`、`supabase functions list --project-ref $env:UVALERT_SUPABASE_PROJECT_REF`、`vercel whoami` 與 `vercel project ls` 確認目標；只確認五個 secure-shell 變數非空，不列印其值。
- [ ] **Dry run**：`supabase link --project-ref $env:UVALERT_SUPABASE_PROJECT_REF` 後執行 `supabase db push --dry-run`；若看到破壞性或不相關 migration，立即停止。
- [ ] **VAPID pair**：用已核對的工具或團隊程序產生一組 VAPID pair；瀏覽器只使用 public key，private key 不得進 Git、Vercel、bundle、response 或 log。
- [ ] **Function secrets**：在安全 shell 以環境變數設定 `VAPID_SUBJECT`、`VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY`、`DEVICE_CREDENTIAL_PEPPER` 與 `PUSH_DISPATCH_SECRET`；可使用已驗證的命令：

  ```powershell
  supabase secrets set "VAPID_SUBJECT=$env:UVALERT_VAPID_SUBJECT" "VAPID_PUBLIC_KEY=$env:UVALERT_VAPID_PUBLIC_KEY" "VAPID_PRIVATE_KEY=$env:UVALERT_VAPID_PRIVATE_KEY" "DEVICE_CREDENTIAL_PEPPER=$env:UVALERT_DEVICE_CREDENTIAL_PEPPER" "PUSH_DISPATCH_SECRET=$env:UVALERT_PUSH_DISPATCH_SECRET" --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
  ```

- [ ] **Vault pair**：以經核准的 Dashboard secret entry 或已驗證的 parameterized SQL 流程，寫入 `uvalert_project_url` 與 `uvalert_push_dispatch_secret`；不在 SQL、終端輸出或文件中列出真值。未取得專案核准的 write 流程前，不杜撰 Vault CLI。
- [ ] **Migration**：以 `supabase db push` 套用所有尚未套用的 migration 序列，包括 `20260830000200_anonymous_push_foundation.sql`、`20260830000300_push_schedule_operations.sql`、`20260830000400_push_dispatch.sql`；不要只手動套最後一份。
- [ ] **Functions**：依序部署 `push-subscription`、`push-schedule`、`push-dispatch`，再用 `supabase functions list --project-ref $env:UVALERT_SUPABASE_PROJECT_REF` 確認三者 ACTIVE。三者的 `verify_jwt=false` 只關閉平台 JWT 驗證：前兩者仍要求 `Authorization: Device …`，dispatcher 仍要求 `X-Dispatch-Secret`。

  ```powershell
  supabase db push
  supabase functions deploy push-subscription --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
  supabase functions deploy push-schedule --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
  supabase functions deploy push-dispatch --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
  ```

- [ ] **Cron**：確認 `uvalert-push-dispatch`（每分鐘）與 `uvalert-push-cleanup`（每日 03:17 UTC）各只存在一次；在空 due queue 驗證 dispatcher 回 HTTP 200、零筆 claim、沒有 secret log，並記錄成功的 `cron.job_run_details`。
- [ ] **Vercel public config 與 redeploy**：在 Vercel UI 把 `VITE_PUSH_PUBLIC_KEY` 設為公開 Config，僅設定 Production 與明確核准的 Preview；從 monorepo root 部署 intended commit（project root 為 `apps/web`）。不得設定任何 private VAPID key、pepper、dispatcher secret 或其他 server secret 為 `VITE_*`。若要採用 CLI mutation，先以本機已安裝版本的 help 驗證語法。
- [ ] **Browser／device smoke**：進行 Task 11 的 Android Chrome、desktop、iPhone/iPad Home Screen、取消／替換、offline recovery 與本機 fallback 實測。iPhone/iPad 必須先把網站加入主畫面、從主畫面 Web App 開啟並允許通知，才可能使用背景推播；仍受網路、省電、OS／瀏覽器能力影響，不保證準時，不能只憑 user agent 或 simulator 推論支援。

### 匿名 Web Push evidence ledger（Task 10–11 回填）

- [ ] Supabase project ref：
- [ ] migration version(s)：
- [ ] `push-subscription` version／ACTIVE：
- [ ] `push-schedule` version／ACTIVE：
- [ ] `push-dispatch` version／ACTIVE：
- [ ] `uvalert-push-dispatch` latest Cron run id／result：
- [ ] `uvalert-push-cleanup` latest Cron run id／result：
- [ ] Vercel deployment ID：
- [ ] commit：
- [ ] production URL：
- [ ] timestamp：
- [ ] Android Chrome：
- [ ] desktop：
- [ ] iPhone/iPad Home Screen：
- [ ] cancellation／replacement：
- [ ] offline recovery：
- [ ] local fallback：

## Google OAuth

- [ ] Google Cloud Authorized redirect URI 使用正式 Supabase Auth callback。
- [ ] Supabase URL Configuration 只加入正式前端 origin 與必要 preview origin。
- [ ] OAuth 取消、失敗、登出均確認本機 active session、產品與倒數仍可讀。
- [ ] 清除 UVAlert 雲端資料後，確認 Google 帳號仍可在 Google 端使用；只刪除 UVAlert Auth user。

## Web／PWA API 路徑與 CORS

- [ ] 將 `/v1/sync/manifest`、`/v1/sync/read`、`/v1/sync/commit`、`/v1/sync/delete` 對應到 Supabase functions。
- [ ] 部署公開的 `uv-forecast`，並確認 `[functions.uv-forecast] verify_jwt = false` 已由 Supabase 套用。
- [ ] 在 Vercel production 設定 `VITE_API_BASE_URL=https://your-project-ref.supabase.co/functions/v1`；不要把 `uv-forecast` 完整 endpoint 重複放進 base URL。
- [ ] `ALLOWED_ORIGINS` 精確包含正式網站 origin 與明確核准的 preview origins；OPTIONS 與 GET 回傳相符的 `Access-Control-Allow-Origin`。
- [ ] feedback、account-delete 與其餘同步 API 依各自部署方案設定；UV API 成功不代表這些 endpoint 已完成。
- [ ] 不讓瀏覽器直接讀取 `uv_forecast_cache` 或 `feedback_submissions`。
- [ ] 瀏覽器 request、HTML、source map、response 與 log 都不包含 CWA key 或 service-role key。

## 資料與錯誤行為

- [ ] manifest 不含 payload；read 只讀使用者確認的 key。
- [ ] revision conflict 回 `409 SYNC_CONFLICT` 且整批不寫入。
- [ ] 相同 idempotency key 重試只回放原結果。
- [ ] CWA 失敗回 `503 UPSTREAM_UNAVAILABLE`，不顯示 UVI 0；前端可留在本機快取狀態。
- [ ] feedback 可匿名送出、限流回 `429`、重複 payload 不建立多筆；資料列不含 session／精確位置欄位。
- [ ] account delete 要求二次確認，成功後 sync records／tombstones／receipts 不可再讀。

## 上線前命令與 smoke test

```powershell
pnpm check
pnpm build
supabase db reset
supabase test db
supabase functions list --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
```

UV smoke test 先直接呼叫 `https://your-project-ref.supabase.co/functions/v1/uv-forecast?regionCode=63000010`，確認 HTTP 200、JSON contract 與 production CORS；再從 Vercel `/forecast` 驗證相同 request。第二次呼叫同一行政區時，使用 Function invocation／database evidence 確認有效 cache，不能只因 response 相同就推論 cache hit。

使用兩個永久測試帳號逐項驗證：Google login → manifest preview → active session／product sync → 第二裝置 read → stale revision conflict → UV cache hit／miss → feedback 429／dedupe → account delete。每一步都確認免登入本機提醒仍能開始、倒數、補擦與結束。
