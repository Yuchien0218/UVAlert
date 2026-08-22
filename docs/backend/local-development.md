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
supabase functions serve
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
VITE_API_BASE_URL=/v1
```

Edge Function 的 CWA key、allowed origins 與 Google provider secret 不進前端：

```bash
supabase secrets set \
  CWA_API_KEY=<cwa-key> \
  ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

本機 Supabase 會提供 `SUPABASE_URL`、`SUPABASE_ANON_KEY` 與 service-role secret 給 Edge Runtime；若使用自訂部署流程，請確認 `SUPABASE_SERVICE_ROLE_KEY` 已以 secret 注入。不要把這個值放在 `.env`、前端 bundle、錯誤訊息或 commit。

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
```

`VITE_API_BASE_URL=/v1` 是產品路徑；開發 server 或正式 hosting 必須做 rewrite。若沒有 rewrite，請在本機暫時把 `VITE_API_BASE_URL` 指向 proxy，而不要把 service-role key 放給瀏覽器。

## 檢查命令

```bash
pnpm typecheck
pnpm test
pnpm build
supabase test db
```
