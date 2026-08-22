# Sunshield Advisor

這個 repository 採用 Web／PWA first、Capacitor-ready 的 pnpm monorepo。

目前的可執行核心分為：

- `apps/web`：Vue 3＋Vite 的 PWA 前端，唯一的可執行應用。
- `packages/contracts`：跨 UI、domain、儲存層共用的版本化 Zod schema。
- `packages/domain`：不依賴 Vue、Dexie、瀏覽器 global 或系統時間的純 reducer。
- `packages/persistence-web`：Dexie／IndexedDB schema、原子 command transaction 與跨分頁 invalidation。
- `packages/platform`：domain 與瀏覽器之間的 port 介面（儲存、定位、連線、生命週期），實作在 `apps/web/src/adapters`。
- `packages/ui`：設計 token（`src/styles.css`）與主題識別，被 `apps/web` 匯入。
- `packages/test-fixtures`：跨套件共用的測試資料與契約測試。
- `tools/region-data`：將官方 NLSC 鄉鎮市區 SHP 固定版本轉成可重現的 WGS84 裝置端界線與索引。

## 文件總入口（給人類與 AI）

開始新對話或接手工作前，請先讀 [`docs/README.md`](docs/README.md)。它會依工作目的導向現行 Sitemap／User Flow、設計系統、後端、衛教研究、規格與實作計畫，並說明哪些文件只是歷史或執行脈絡，不能直接當成目前產品行為。

## 現行產品與資訊架構依據

目前重新設計的唯一整合基準是：

- `DESIGN.md`：設計系統唯一權威——色彩 token、字體、間距、元件與圖示規範。
- `docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`：現行 Sitemap、User Flow、頁面任務與產品結構。
- `docs/design/current-direction.md`：品牌角色與區域視覺任務（色彩／字體細節以 `DESIGN.md` 為準）。
- `docs/research/2026-08-13-uvalert-education-seo-aeo-geo.md`：衛教內容的 SEO／AEO／GEO 研究紀錄。
- `docs/education/public-seo-implementation.md`：公開衛教頁、發布閘門、canonical、Schema、robots 與 sitemap 的實作規則。

舊版 PRD、P0 規格、Sitemap／User Flow、mockup、截圖與實作計畫集中在 `docs/archive/2026-08-pre-redesign/`，只供查閱，不要直接拿來新增畫面或功能。

## 地區設定與定位隱私

`/region` 支援目前位置、手動行政區與明確略過。精確經緯度只在使用者按下按鈕後短暫存在單次函式記憶體中，裝置內界線解析完成後不會保存、加入 URL、記錄或傳送到 UV API。IndexedDB 只保存官方 `TOWNCODE`、縣市／行政區名稱、界線版本與選擇方式。

官方界線重建與驗證方式請見 `tools/region-data/README.md`。

## 修改畫面之前

前端視覺設計的唯一權威是根目錄的 `DESIGN.md`——完整色彩 token、字體、間距、元件規範與圖示風格，第十節列出目前與程式碼的落差。索引與周邊資料見 `docs/design/README.md`。

目前畫面的真實來源只有兩個程式碼檔案：

- `packages/ui/src/styles.css`：設計 token（字級、間距、顏色、圓角、動畫時間）。
- `apps/web/src/assets/app.css`：共用類別（`.app-card`、`.button`、`.text-link`、`.stat-figure` 等）。

文件與這兩個檔案衝突時以程式碼為準；若要導入新的品牌方向，先確認 wireframe／UIUX 決策，再同步更新 token 與共用樣式。`apps/web/dist/` 是建置產物，不可當作設計來源。

## 本機驗證

```bash
pnpm install
pnpm check
```

衛教內容會在 Web build 前由 `tools/education/generate-content.mjs` 產生 Vue 使用資料，build 後再產生公開 HTML、`robots.txt` 與 `sitemap.xml`。正式部署前請設定 `VITE_PUBLIC_SITE_URL`；文章完成專業審閱後才會進入 sitemap。

## 後端開發入口

第一版後端位於 `supabase/`，提供選配 Google 登入同步、CWA UV 預報代理、匿名問題回報與 UVAlert 雲端資料清除；免登入本機提醒不依賴後端。請先讀：

- `docs/backend/local-development.md`：Supabase CLI、Google OAuth、Edge Function secrets 與本機命令。
- `docs/backend/deployment-checklist.md`：正式環境 RLS、CORS、`/v1/*` rewrite 與 smoke test。
- `supabase/README.md`：function 路徑與資料邊界。

前端只使用 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY` 與 `VITE_API_BASE_URL`；CWA API key、service-role key 與 Google client secret 不得放在 `VITE_*` 或 commit。
