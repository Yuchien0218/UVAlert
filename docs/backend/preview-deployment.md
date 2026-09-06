# UVAlert Vercel 部署狀態

## 2026-09-06 Supabase 同步 Function 與資料表權限部署

**驗證時間**：2026-09-06 20:06–20:07（Asia/Taipei）

**Supabase project ref**：`ykfdnltaqpdytmrszbbk`

- 遠端 migration 清單已同步至 `20260906000000`；其中 `sync_table_privileges` 撤銷 `public`／`anon` 對三張同步表的權限，僅授予 `authenticated` 必要的 CRUD 權限，RLS 的逐使用者隔離維持不變。
- `sync-manifest`、`sync-read`、`sync-commit`、`sync-delete` 均已部署為 version 2／`ACTIVE`，且皆保留 `verify_jwt=true`。
- 自 `https://uv-alert-web.vercel.app` 發出的 OPTIONS 預檢，四支 Function 均回 HTTP 204 與精確的 `Access-Control-Allow-Origin`。
- 不帶登入憑證的實際 GET／POST 請求，四支 Function 均被平台 JWT 回 HTTP 401；本次 smoke 沒有寫入同步資料。
- Vercel 正式站已更新至同步 Function slug 對應版本。以已登入的正式 Chrome 工作階段重新執行「查看同步預覽」，成功顯示同步項目與「同步這些資料」，未按下確認、沒有上傳本機資料；這修復了先前因 `authenticated` 缺少 table-level `SELECT` 而產生的 manifest HTTP 500。
- 兩個永久帳號的 manifest／commit／read／conflict／delete 隔離實測仍待完成。

## 2026-09-05 匿名背景推播中繼驗證

**驗證時間**：2026-09-05 21:15–23:07（Asia/Taipei）

**程式 commit**：`a51471d`

**Vercel deployment**：`dpl_BEwaUyTL1qhr1oTmWCXGU9r82VGX`／`https://uv-alert-pag62ta2w-yuu15.vercel.app`（`Ready`，已 alias 至 `https://uv-alert-web.vercel.app`）

**Supabase project ref**：`ykfdnltaqpdytmrszbbk`

**Push migrations**：遠端已套用 `20260830000200`、`20260830000300`、`20260830000400`，完整 migration 清單同步至 `20260904000000`。

**Push Functions（2026-09-05 23:07 即時查核）**：`push-subscription` version 1／ACTIVE、`push-schedule` version 1／ACTIVE、`push-dispatch` version 1／ACTIVE；三者 `verify_jwt=false`。

**Cron（2026-09-05 23:07 即時查核）**：

- `uvalert-push-dispatch`：job id 1、每分鐘；latest run id 745，`succeeded`，2026-09-05 15:07:00 UTC。
- `uvalert-push-cleanup`：job id 2、每日 03:17 UTC；latest run id 34，`succeeded`，2026-09-05 03:17:00 UTC。

- Windows Chrome 已在正式網址成功啟用背景推播；設定頁顯示「已啟用背景推播」，瀏覽器沒有 push warning/error。
- Supabase Unified Logs 於 21:15:03 記錄 `POST /rest/v1/push_subscriptions` HTTP `201`，確認匿名裝置訂閱已寫入後端。
- 先前的 browser `fetch` receiver 錯誤已由 `9bfd667` 修正；完整驗證通過 182 個測試檔、2489 項測試，typecheck、ESLint、Stylelint 與 production build 皆通過。
- `a51471d` 另修正同一個長駐 Setup controller 在成功提交後無法建立下一份草稿；正式站已驗證結束提醒後可再次進入完整設定流程。
- Windows Chrome 於 21:50 在所有 UVAlert 分頁關閉後收到固定文案「該補擦防曬乳了」，點擊後正確開啟提醒頁。Windows 原先的通知顯示設定曾阻擋第一輪肉眼確認；開啟後，本機測試通知與第二輪背景通知均可見。
- Supabase 在 21:34:01 的第一輪排程已有 `sent` 與 `last_push_succeeded_at` 證據；21:50 第二輪完成實際 closed-tab 顯示與 notification click 驗證。
- Desktop 取消測試通過：21:55 排程先確認同步，於 21:53 前結束提醒，觀察至 21:56 未收到舊通知。
- Desktop 排程取代測試通過：先建立 22:23 舊排程，再以有效的防曬乳補擦紀錄取代為 22:26；Supabase 於 22:17:48 確認同一裝置僅保留 `due_at=2026-09-05 14:26:00+00`、`status=pending` 的單一排程。實際觀察為 22:23 未通知、22:26 收到新通知。
- 取代測試前一次更正使用了「不建立倒數」的防曬乳紀錄，因此只取消舊排程、未產生新 `dueAt`；該輪列為無效前置，不計為推播失敗。
- Desktop 離線恢復測試通過：於 Chrome DevTools Network offline 時建立 22:48 排程，前端顯示等待同步；恢復連線後顯示「已同步下一個補擦提醒」，關閉 UVAlert 分頁後於 22:48 收到通知。
- 過期恢復測試也通過後端條件：22:48 排程在已過期後恢復連線，Supabase 於 22:53:43 將它記為 `cancelled`，`attempt_count=0`、`sent_at=null`，沒有建立或補送過期 Web Push。實機當時看到的通知來自前端本機 fallback，其既有契約是將已到期提醒立即顯示；不得誤記為後端 Push。
- Desktop 拒絕權限降級測試通過：Windows Chrome 將正式站通知設為「封鎖」後，通知設定頁正確顯示「通知已被拒絕」與解除封鎖說明；在權限仍被拒絕時，仍可確認塗抹時間、開始提醒、看到進行中狀態與最近事件、結束提醒並回到可操作的提醒頁。
- 同輪 focused regression 通過 5 個測試檔、114 項測試，涵蓋 browser notification／remote-push adapters、notification controller、通知設定頁與 app boot integration。瀏覽器權限為 blocked 時不把「未顯示 OS 通知」列為失敗，因為這正是瀏覽器拒絕權限的預期結果；unsupported capability 與分頁存活時的 local fallback 由上述自動化契約驗證。
- 封鎖測試完成後已重新載入權限狀態，正式站顯示「通知已開啟」；舊背景訂閱先依介面安全完成關閉，再重新註冊，最後顯示「已啟用背景推播」。
- Desktop 較長的 exactly-once 觀察，以及 Android、iPhone/iPad 實機仍待 Task 11 驗證，不宣告整體完成。

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
