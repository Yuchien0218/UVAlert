# 本機後端開發

## 需要的工具

- Node.js `>=24`
- pnpm `>=11`
- Docker Desktop
- Supabase CLI

確認版本：

```bash
node --version
pnpm --version
supabase --version
docker --version
```

## 啟動 Supabase

在 repository 根目錄：

```bash
pnpm install
supabase start
supabase db reset
supabase functions serve --env-file supabase/.env.local
```

`db reset` 會依序套用 `supabase/migrations/` 與 `supabase/seed.sql`。seed 只有假的 UV 預報，不含真實使用者資料或 secrets。RLS／schema 的 pgTAP 檢查：

```bash
supabase test db
```

## 環境變數

前端複製 `apps/web/.env.example`；只放公開值：

```dotenv
VITE_SUPABASE_URL=http://127.0.0.1:54321
VITE_SUPABASE_PUBLISHABLE_KEY=<local publishable/anon key>
VITE_API_BASE_URL=http://127.0.0.1:54321/functions/v1
VITE_PUSH_PUBLIC_KEY=replace-with-local-vapid-public-key
```

`VITE_PUSH_PUBLIC_KEY` 是公開值，必須與下方 dispatcher 使用的 `VAPID_PUBLIC_KEY` 屬於同一組本機、非 production VAPID pair；它可進 bundle。上面的 `VITE_API_BASE_URL` 讓瀏覽器直接呼叫本機 Supabase Edge Function。若開發環境已另設同源 proxy，也可保留 `VITE_API_BASE_URL=/v1`；此時 proxy 必須將產品路徑 `/v1/uv/forecast` 轉送到 Supabase 的 `/functions/v1/uv-forecast`。

Edge Function 的 CWA key、allowed origins 與 Google provider secret 不進前端。複製 `supabase/.env.example` 為被 Git 忽略的 `supabase/.env.local`，只在本機填值：

```dotenv
CWA_API_KEY=<local-cwa-key>
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
VAPID_SUBJECT=mailto:ops@example.invalid
VAPID_PUBLIC_KEY=replace-in-secure-shell
VAPID_PRIVATE_KEY=replace-in-secure-shell
DEVICE_CREDENTIAL_PEPPER=replace-in-secure-shell
PUSH_DISPATCH_SECRET=replace-in-secure-shell
```

先以專案已核對的工具或團隊程序產生**一組**本機、非 production 的 VAPID key pair，再把它填入安全位置；不要猜用未驗證的產生指令。`VAPID_PRIVATE_KEY`、`DEVICE_CREDENTIAL_PEPPER` 與 `PUSH_DISPATCH_SECRET` 都是 server secret，絕不可放入前端 `.env.local`、`VITE_*`、bundle、錯誤訊息或 commit。

本機 Supabase 會提供 `SUPABASE_URL`、`SUPABASE_ANON_KEY` 與 service-role secret 給 Edge Runtime；若使用自訂部署流程，請確認 `SUPABASE_SERVICE_ROLE_KEY` 已以 server secret 注入。不要把 service-role key 放在前端 `.env.local`、bundle、錯誤訊息或 commit。

複製 examples、在安全 shell 以 local 非 production 值填入 `supabase/.env.local` 後，執行 `supabase start`、`supabase db reset` 與既有的 `supabase functions serve --env-file supabase/.env.local` 流程。三個 push Function 與其他 Function 使用相同的 serve 模式；不要把 production secret 交給前端。

`supabase db reset` 套用 migration 後會建立兩筆 local Cron rows：`uvalert-push-dispatch` 和 `uvalert-push-cleanup`。dispatcher Cron 若要在本機實際送達，仍必須先用經核准的 Dashboard secret entry 或已驗證的 parameterized SQL 流程，安全供應 Vault 的 `uvalert_project_url` 與 `uvalert_push_dispatch_secret`；本 repo 沒有可供照抄的 Vault write CLI，未完成前不得宣稱 local Cron 可送達。

## Google OAuth

1. 在 Google Cloud OAuth client 的 Authorized redirect URI 加入 Supabase Auth callback：`<SUPABASE_URL>/auth/v1/callback`。
2. 在 Supabase Dashboard 的 Authentication → Providers → Google 設定 client ID／secret。
3. 在 Authentication → URL Configuration 加入 `http://localhost:5173/` 與 `http://127.0.0.1:5173/`。
4. 前端只呼叫 Google OAuth；取消或失敗時不建立匿名帳號、不修改 IndexedDB。

## 前端與 function 路徑

Supabase CLI 直接 serve 時 function 原生路徑是：

```text
/functions/v1/sync-manifest
/functions/v1/sync-read
/functions/v1/sync-commit
/functions/v1/sync-delete
/functions/v1/uv-forecast
/functions/v1/feedback
/functions/v1/account-delete
/functions/v1/push-subscription
/functions/v1/push-schedule
/functions/v1/push-dispatch
```

本機直連 Edge Function 的 API base 是：

```text
http://127.0.0.1:54321/functions/v1
```

同源 proxy 的可選 base 才是 `/v1`。正式 Vercel 不代理 UV API，而是把 `VITE_API_BASE_URL` 設為 `https://your-project-ref.supabase.co/functions/v1`。公開的 `uv-forecast` 不需把 service-role key 或 CWA key 交給瀏覽器。

## 正式 UV Function 部署順序

先在安全 shell session 設定本計畫使用的環境變數，勿輸出或 commit 真值：

```powershell
$env:UVALERT_SUPABASE_PROJECT_REF = "已確認的 project ref"
$env:UVALERT_CWA_API_KEY = "只存在目前 shell 的 CWA key"
$env:UVALERT_ALLOWED_ORIGINS = "https://正式網域,https://已核准的預覽網域"
```

確認 project 與 migration 後再執行：

```powershell
supabase login
supabase link --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
supabase db push --dry-run
supabase db push
supabase secrets set "CWA_API_KEY=$env:UVALERT_CWA_API_KEY" "ALLOWED_ORIGINS=$env:UVALERT_ALLOWED_ORIGINS" --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
supabase functions deploy uv-forecast --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
```

`db push --dry-run` 若包含非本次預期的破壞性或無關變更，停止部署並先釐清，不直接套用。

## 檢查命令

```bash
pnpm typecheck
pnpm test
pnpm build
supabase test db
```
