# 公開衛教頁 SEO 實作說明

## 目前已接上的路徑

- `/education`：衛教首頁與六個分類入口。
- `/education/:category`：依「了解今天的 UV、出門前準備、外出中的補擦、流汗或碰水後、回家後與皮膚照顧、特殊情況」瀏覽文章。
- `/education/articles/:slug`：單篇衛教文章，包含摘要、主要問題、正文、來源、限制與延伸閱讀。

這些路徑同時有 Vue 互動頁與 Vite build 後的靜態 `index.html`。因此分享連結、搜尋引擎抓取或 JavaScript 尚未載入時，仍然能讀到標題、摘要與正文。

## 發布閘門

文章只有 front matter 同時符合以下條件才會被視為可索引：

```yaml
status: published
reviewStatus: approved
```

目前 48 篇文章仍是 `draft`／`needs-professional-review`，所以：

- 單篇與分類頁仍可用直接 URL 預覽，頁面顯示「專業審閱中」。
- 頁面使用 `noindex,follow`，不會把草稿誤送進搜尋索引。
- 草稿文章、沒有已發布文章的分類頁，以及衛教首頁不會寫入 `sitemap.xml`。

專業審閱、台灣產品標示與法規複查完成後，才可把文章 front matter 改成已發布狀態，再重新 build。

## Build 與網域

先設定公開網站的完整 HTTPS 網址，再建置：

```powershell
$env:VITE_PUBLIC_SITE_URL = "https://你的正式網域"
pnpm education:generate
pnpm --filter @sunshield/web build
```

`VITE_PUBLIC_SITE_URL` 會用在：

- 每個公開頁的 `<link rel="canonical">`。
- Open Graph `og:url`。
- Article／BreadcrumbList JSON-LD。
- `apps/web/dist/sitemap.xml` 的 `<loc>`。
- `apps/web/dist/robots.txt` 的 Sitemap 位置。

未設定時工具會以 `http://localhost:4173` 產生並在 build 顯示警告；這只適合本機檢查，不可直接當正式部署設定。

## 產物與部署注意事項

- `apps/web/dist/education/**/index.html` 是公開閱讀版，應和其他 Vite 產物一起部署。
- 主 PWA shell `apps/web/dist/index.html` 有 `noindex,follow`，私人提醒、產品、設定與同步頁不作公開 SEO 頁。
- `robots.txt` 只宣告允許抓取與 sitemap，不拿來隱藏私人資料；私人頁靠 shell 的 `noindex` 與不建立公開連結處理。
- 若主機使用 history fallback，仍要讓 `/education/**` 的靜態檔案優先於 SPA fallback，否則分享預覽可能只拿到 PWA shell。
- 上線後逐篇用 Google Rich Results Test、Search Console URL Inspection 與手機瀏覽檢查 title、摘要、canonical、JSON-LD 和可見正文是否一致。

## 資料來源與內容界線

文章原始檔仍在 `docs/education/articles/`，由 `tools/education/content-reader.mjs` 讀取並 escape 後轉成 HTML。不要在頁面另外放一份隱藏給搜尋引擎或 AI 的版本；SEO、AEO、GEO 共用同一份可見內容與官方來源。
