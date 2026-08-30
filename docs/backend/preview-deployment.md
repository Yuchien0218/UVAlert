# UVAlert Vercel 部署狀態

## 2026-08-30 Production 現況

**驗證時間**：2026-08-30 16:14（Asia/Taipei）

**程式 commit**：`f358a5a326d4ad1b9610ba0407b76c6c3192888e`

**Vercel deployment**：`dpl_2Zmowvrz7hnt2qphR2exitW2xrSN`（`READY`）

**正式網址**：`https://uv-alert-web.vercel.app`

**Supabase Function**：`https://ykfdnltaqpdytmrszbbk.supabase.co/functions/v1/uv-forecast`

- Vercel Production 與 Preview 的 `VITE_API_BASE_URL` 已設為 `https://ykfdnltaqpdytmrszbbk.supabase.co/functions/v1`，類型為公開 Config。
- Supabase `uv-forecast` 為 `ACTIVE`、version 11、`verify_jwt=false`；只有這個公開 Function 關閉平台 JWT 檢查。
- `Origin: https://uv-alert-web.vercel.app` 的 OPTIONS 與 GET CORS 已驗證；`regionCode=63000010` 實測 HTTP 200，回傳 5 日 UV 與溫度資料。
- 同一區域後續回應保留第一次成功請求的 `fetchedAt=2026-08-30T07:55:57.744Z`；資料庫 migration 已授予 `service_role` 必要的 cache `select/insert/update` 權限。這是 cache 行為證據，但本次沒有額外取得 Function invocation log。
- 正式 `/forecast` 與主 JS bundle HTTP 200；bundle 包含正確 Supabase Function base 與 `uv-forecast` slug，不含 `CWA_API_KEY` 或 CWA 授權碼格式。
- `pnpm check` 通過：100 個測試檔、1057 項測試；typecheck、ESLint、Stylelint 全通過。`pnpm build` 亦通過。
- build 仍有既有的大型 chunk 警告；本機未設定 `VITE_PUBLIC_SITE_URL` 時，教育靜態頁 canonical 會暫用 localhost。兩者未阻擋本次正式部署。
- 尚未完成實體手機 UI smoke test；Auth、Sync 與 feedback 的完整正式環境驗證不屬於本次 UV Function 完成證據。

以下 2026-08-27／08-29 內容保留為歷史紀錄；其中「正式網址尚未更新」等敘述已由本節取代。

**紀錄日期**：2026-08-27（Asia/Taipei）；**2026-08-29 補註，見文末**
**用途**：區分目前可供測試的 Vercel preview，與尚未更新的正式網址；本文件是部署現況，不代表正式後端已上線。

## 目前網址

| 類型     | 網址                                          | 已驗證狀態                                         | 備註                                                                    |
| -------- | --------------------------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| 正式網域 | `https://uv-alert-web.vercel.app`             | 根頁 HTTP 200；manifest 與 Service Worker HTTP 200 | 仍指向 `main` 的 commit `9e6cc20`，沒有這次 preview 修正。              |
| 預覽部署 | `https://uv-alert-1zy1w2zxl-yuu15.vercel.app` | Vercel Ready；使用者已回報可開啟                   | 目前受 Vercel Authentication 保護；登入同一 Vercel 帳號的使用者可開啟。 |

## 正式網址的限制

- 正式網域尚未因 preview 部署而更新，Vercel preview 與 production 是兩個獨立版本。
- 2026-08-27 實測 `https://uv-alert-web.vercel.app/setup/context` 回應 HTTP 404；因此正式網址尚不支援 Vue Router 的直接深層連結／重新整理。
- 正式部署仍保留三個空白的後端環境變數。舊版程式會把空字串當成已設定的 Supabase 值，可能在初始化時失敗；preview 已修正為安全的 offline mode。

## 預覽版已包含的修正

- 空白 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` 與 `VITE_API_BASE_URL` 視為未設定，改用既有 offline adapters。
- `apps/web/vercel.json` 先提供部署中的靜態檔，再把未命中的網址交給 Vue SPA 的 `index.html`；這保留 manifest、Service Worker 與衛教靜態頁，同時支援 `/setup/context` 等 App 路由。
- 使用 Vercel 的受保護 deployment request 驗證 preview 的 `manifest.webmanifest` 為有效 JSON。

## 預覽版的邊界

- 可測：首次設定、本機提醒資料、補擦／結束流程、同網域 IndexedDB、PWA 資產與衛教頁。
- 未設定：Supabase 登入、跨裝置同步、`/v1/*` 後端 API、UV 預報與意見回報。
- localhost、正式網域與 preview 網域各自有獨立的瀏覽器資料；提醒不會自動互通。

## 驗證紀錄

- 相關 adapter 回歸測試：7 passed。
- `pnpm --filter @sunshield/web typecheck`：passed。
- `pnpm --filter @sunshield/web build`：passed。
- 2026-08-27 曾啟動 `pnpm check` 但工具未回傳完整 lint 結果。**2026-08-29 已補跑完整 `pnpm check`（typecheck + 全部測試 + eslint + stylelint）並通過。**

## 下一步

1. 在手機以目前 Vercel 帳號開啟 preview，完成首次設定、建立提醒、重新整理、補擦與結束的 smoke test。
2. 確認後，把本次程式與 Vercel 設定提交並部署到 `main`，才會更新正式網址。
3. 正式前另行設定真實 Supabase 與 `/v1/*` 後端；不要以 preview 的 offline mode 宣稱雲端功能可用。

## 2026-08-29 補註

**上表「正式網域」那一列的 commit `9e6cc20` 已經過期**——`main` 從 2026-08-27 之後又前進了二十多個 commit（含 PR #5 字級量表）。網址與已驗證狀態的敘述仍成立，但「仍指向哪個 commit」需要重新查證再引用。

另外，這次程式碼的部分**沒有跟著這個分支一起帶過來**：空白環境變數的處理（`configuredEnvironment.ts` 與 Supabase adapter 的防護）已經由另一條路徑（PR #5 的 `fix(web): tolerate blank preview configuration` 等三個 commit）進入 `main`，內容與 2026-08-27 的版本等價。所以這個分支只帶 `vercel.json`、忽略規則與文件——**adapter 不需要再改一次**。
