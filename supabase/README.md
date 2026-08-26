# UVAlert Supabase 後端

這個目錄包含 Supabase migration、RLS、seed 與 Edge Functions。前端仍以 IndexedDB 作為免登入提醒與離線操作的來源；Supabase 只在使用者主動 Google 登入後提供選配同步。

## 本機啟動

先安裝 [Supabase CLI](https://supabase.com/docs/guides/cli) 與 Docker Desktop，再在 repository 根目錄執行：

```bash
supabase start
supabase db reset
supabase functions serve
```

Edge Function secrets 只透過本機環境或 Supabase secrets 設定，不寫進 git：

```bash
supabase secrets set CWA_API_KEY=... ALLOWED_ORIGINS=http://localhost:5173
```

Google OAuth 的 client ID、secret 與 provider allowlist 在 Supabase Dashboard 設定。請參考 `docs/backend/local-development.md`。

## 主要 function

| 路徑                 | 登入           | 用途                              |
| -------------------- | -------------- | --------------------------------- |
| `/v1/sync/manifest`  | 永久 Auth user | 讀取同步摘要                      |
| `/v1/sync/read`      | 永久 Auth user | 讀取使用者確認的 records          |
| `/v1/sync/commit`    | 永久 Auth user | 以 revision／idempotency 原子提交 |
| `/v1/sync/delete`    | 永久 Auth user | 建立 tombstone                    |
| `/v1/uv/forecast`    | 不需要         | 伺服器代理 CWA F-D0047-091        |
| `/v1/feedback`       | 不需要         | 匿名問題回報與意見                |
| `/v1/account/delete` | 永久 Auth user | 清除 UVAlert 雲端資料與 Auth user |

Supabase 原生 function URL 是 `/functions/v1/<function-name>`；正式網站的 reverse proxy／rewrite 必須把上表 `/v1/*` 對應到各 function。不要把 service-role key 或 CWA API key 放進前端環境變數。

## 驗證

```bash
pnpm test
pnpm typecheck
pnpm build
supabase test db
```

本機 RLS／migration 測試在 `supabase/tests/backend_foundation.sql`。目前 repository 不提交任何真實帳號、token、API key 或 feedback 內容。
