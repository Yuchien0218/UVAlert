# UVAlert 後端開發入口

UVAlert 的後端以 Supabase 為第一版實作，但核心仍是免登入、IndexedDB、本機可工作的防曬補擦倒數。

- [本機開發](./local-development.md)：CLI、migration、Edge Functions、Google OAuth 與前端 env。
- [部署檢查表](./deployment-checklist.md)：正式環境 secrets、RLS、API 路徑、CORS 與刪除資料驗證。
- [Vercel 部署狀態](./preview-deployment.md)：目前 preview 與正式網域的差異、已驗證項目與升級條件。
- [後端設計](../superpowers/specs/2026-08-17-backend-foundation-design.md)：已確認的資料邊界與決策。
- [實作計畫](../superpowers/plans/2026-08-17-backend-foundation.md)：任務與驗證紀錄。
- [UV 預報串接規格](../superpowers/specs/2026-08-30-vercel-supabase-uv-forecast-integration-design.md)：Vercel 前端直連 Supabase `uv-forecast`、CWA secret、快取與分批部署契約。
- [UV 預報串接計畫](../superpowers/plans/2026-08-30-vercel-supabase-uv-forecast-integration.md)：本機實作、Supabase 部署、Vercel env 與 production 驗證步驟。
- [匿名 Web Push 提醒計畫](../superpowers/plans/2026-08-30-anonymous-web-push-reminders.md)：本機實作、Task 9 本機可部署證據，以及 Task 10–11 的 production 與實機驗證分界。
- 若是由 `docs/` 或新對話開始，先讀 [`../superpowers/specs/README.md`](../superpowers/specs/README.md) 與 [`../superpowers/plans/README.md`](../superpowers/plans/README.md)，確認規格和計畫的狀態，再回到本入口。

## 不變的產品邊界

1. 不登入也能開始、持續與結束提醒。
2. 登入不是啟動提醒的前置條件，也不會改變補擦公式。
3. 同步前先顯示摘要與選擇；衝突不自動覆蓋。
4. UV cache、已結束 Session、精確位置、裝置識別碼、通知權限、草稿與照片不進第一版跨裝置同步。
5. 清除 UVAlert 雲端資料不會刪除 Google 帳號；清除本機資料是另一個頁面與操作。

## 現行 UV 預報拓撲

- Vue／Vite／PWA 前端繼續由 Vercel 託管。
- `uv-forecast`、CWA API key 與 `uv_forecast_cache` 由 Supabase 承接。
- Vercel production 的 `VITE_API_BASE_URL` 指向 `https://your-project-ref.supabase.co/functions/v1`，前端直接呼叫 `uv-forecast`，不經 Vercel Function 或 rewrite。
- Sync、feedback 與 account-delete 仍依各自部署狀態判斷；UV 串通不代表其他 `/v1/*` API 已上線。

## 匿名 Web Push 的目前狀態

匿名 Web Push 的程式目前只完成本機實作。Task 9 會補齊本機測試、檢查與可部署證據，但不會變更 production；Task 10 的正式 Supabase／Vercel 部署與 Task 11 的實際裝置 smoke test 都必須另有附日期的證據紀錄，才可宣稱正式可用。

產品在沒有 remote push、使用者拒絕通知，或裝置／瀏覽器不支援時，仍可使用本機倒數與分頁仍開啟時的本機通知。背景 Web Push 是輔助送達方式，不是保證準時的核心狀態來源。

本機設定請見[本機開發](./local-development.md)，正式環境的前置條件、核准流程與未完成 evidence ledger 請見[部署檢查表](./deployment-checklist.md)。
