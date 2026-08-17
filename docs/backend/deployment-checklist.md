# UVAlert 正式部署檢查表

## Supabase project 與 secrets

- [ ] 建立正式 Supabase project，確認 project ref 與 production database 不會與 local 混用。
- [ ] 套用全部 migration，包含 sync batch、feedback dedupe 與 account-delete RPC。
- [ ] 確認 `sync_records`、`sync_tombstones`、`sync_idempotency_receipts`、`uv_forecast_cache`、`feedback_submissions` 均啟用 RLS。
- [ ] 設定 `CWA_API_KEY`、`ALLOWED_ORIGINS` 與 Google provider secrets；不要把值寫進 git。
- [ ] 確認 service-role key 只存在 Edge Functions／部署 secret，不出現在 `VITE_*`、HTML、source map、response 或 log。

## Google OAuth

- [ ] Google Cloud Authorized redirect URI 使用正式 Supabase Auth callback。
- [ ] Supabase URL Configuration 只加入正式前端 origin 與必要 preview origin。
- [ ] OAuth 取消、失敗、登出均確認本機 active session、產品與倒數仍可讀。
- [ ] 清除 UVAlert 雲端資料後，確認 Google 帳號仍可在 Google 端使用；只刪除 UVAlert Auth user。

## Web／PWA rewrite 與 CORS

- [ ] 將 `/v1/sync/manifest`、`/v1/sync/read`、`/v1/sync/commit`、`/v1/sync/delete` 對應到 Supabase functions。
- [ ] 將 `/v1/uv/forecast`、`/v1/feedback`、`/v1/account/delete` 對應到 Supabase functions。
- [ ] `ALLOWED_ORIGINS` 與實際網站 origin 完全一致；OPTIONS、Authorization、Content-Type 可通過。
- [ ] 不讓瀏覽器直接讀取 `uv_forecast_cache` 或 `feedback_submissions`。

## 資料與錯誤行為

- [ ] manifest 不含 payload；read 只讀使用者確認的 key。
- [ ] revision conflict 回 `409 SYNC_CONFLICT` 且整批不寫入。
- [ ] 相同 idempotency key 重試只回放原結果。
- [ ] CWA 失敗回 `503 UPSTREAM_UNAVAILABLE`，不顯示 UVI 0；前端可留在本機快取狀態。
- [ ] feedback 可匿名送出、限流回 `429`、重複 payload 不建立多筆；資料列不含 session／精確位置欄位。
- [ ] account delete 要求二次確認，成功後 sync records／tombstones／receipts 不可再讀。

## 上線前命令與 smoke test

```bash
pnpm check
pnpm build
supabase db reset
supabase test db
```

使用兩個永久測試帳號逐項驗證：Google login → manifest preview → active session／product sync → 第二裝置 read → stale revision conflict → UV cache hit／miss → feedback 429／dedupe → account delete。每一步都確認免登入本機提醒仍能開始、倒數、補擦與結束。
