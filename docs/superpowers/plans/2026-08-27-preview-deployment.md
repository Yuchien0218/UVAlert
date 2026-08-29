# UVAlert Vercel 預覽部署

**目標**：發布手機可開啟的 HTTPS 預覽版，不宣稱正式後端已上線。

## 已確認的 Vercel 專案設定

- 專案名稱：`uv-alert-web`
- 框架：Vite
- Root Directory：`apps/web`
- 正式網域：`https://uv-alert-web.vercel.app`
- 正式部署分支：`main`

## 預覽版邊界

- 可驗證：首次設定、提醒建立／補擦／結束、同網域重新整理後的 IndexedDB 資料、PWA 資產與衛教頁。
- 未設定：Supabase 登入、跨裝置同步、`/v1/*` 後端 API、UV 預報與意見回報。
- 資料注意：localhost 與 Vercel 網域屬於不同來源；提醒資料會各自儲存在目前瀏覽器，無法自動移轉。

## 執行清單

- [x] 找出現有 Vercel 專案與 root directory。
- [x] 驗證深層網址 `/setup/context` 為 404，確認需要 SPA rewrite。
- [x] 驗證空白 Supabase 設定導致 `supabaseUrl is required`，並以回歸測試固定行為。
- [x] 修正空白環境變數：將其視為未設定，改用既有 offline adapters。
- [x] 在 `apps/web/vercel.json` 新增「先讀靜態檔，再 fallback 到 SPA」路由。
- [x] 建立 Vercel preview deployment；受保護測試確認 manifest 可正確讀取。
- [x] 確認手機存取方式：登入 Vercel 的使用者可開啟 preview；使用者已回報網址可正常開啟。
- [ ] 設定預覽部署所需的公開網站網址環境變數。
- [ ] 在匿名手機連線驗證根頁、深層網址、衛教頁、manifest 與 Service Worker。
- [ ] 在手機完成核心提醒流程 smoke test。

## 安全限制

- 不提交 Supabase key、token 或任何 `.env` 檔。
- 不新增 Vercel serverless function，也不把缺少的 `/v1/*` API 偽裝成已完成。
- 預覽部署先產生獨立網址；驗證後才考慮更新正式網域。

## 存取限制

Vercel 專案啟用了 Standard Protection，因此 preview URL 會先顯示 Vercel 登入頁。使用者已確認登入狀態下可開啟。關閉 Vercel Authentication 是 project-wide 變更，會使目前與未來的所有 deployment URL 都不再要求登入；不能在未確認前套用。若要維持保護，請在手機登入同一個 Vercel 帳號，或從 Vercel deployment 頁面建立單一 preview 的 Shareable Link。正式網域與 preview 的目前差異見 [`../../backend/preview-deployment.md`](../../backend/preview-deployment.md)。
