# UVAlert 衛教內容：SEO、AEO、GEO 研究筆記

## 研究資訊

- 研究日期：2026-08-13（Asia/Taipei）
- 專案：UVAlert
- 研究範圍：公開衛教文章的可索引性、答案型內容、結構化資料、健康內容可信度與生成式搜尋引用條件
- 研究原則：只採用 Google Search Central、Bing Webmaster 官方文件、Schema.org 與 W3C/WAI 等第一方資料；未修改程式碼
- 重要界線：SEO 是官方廣泛使用的術語；AEO（Answer Engine Optimization）與 GEO（Generative Engine Optimization）目前沒有由 Google、Bing、W3C 或 Schema.org 共同發布的獨立技術標準。以下 AEO/GEO 做法是根據官方搜尋、內容、結構化資料與可及性要求整理出的產品規則，不是「保證被引用」的公式。

## 結論先行

1. **衛教內容可以做 SEO、AEO、GEO，但三者應共用同一個基礎：公開、可抓取、可理解、以使用者為優先的文章。** Google 明確表示，AI Overviews／AI Mode 沒有額外技術門檻，也不需要新增 AI 專用檔案或特殊 Schema.org 標記；頁面仍須能被索引、可顯示搜尋摘要，並遵守一般 SEO 與內容政策。
2. **UVAlert 的衛教文章應與登入後的個人資料分離。** 公開文章可以有穩定網址、內部連結、sitemap 與 canonical；Session、提醒紀錄、裝備個人紀錄、收藏與問題回報不應成為公開可索引內容。
3. **健康／安全相關內容要以高可信度流程處理。** Google 將可能影響健康、安全或福祉的主題視為需要更強 E-E-A-T（Experience、Expertise、Authoritativeness、Trustworthiness）的 YMYL 類型；文章需要清楚來源、作者／審閱者與複查日期，而不是只堆關鍵字。
4. **AEO 的可落地做法是「先直接回答，再補充條件與來源」。** 這是對官方「清楚、聚焦、可驗證、重要資訊靠前」要求的產品化推論，並非搜尋引擎承諾會顯示答案卡。
5. **GEO 不應另外製作一套神奇格式。** Bing 官方文件使用 grounding／citation（取材與引用）的說法，要求內容清楚、單一主題、重要資訊早出現、可獨立驗證；同一份文件也明確表示 GEO 不保證被引用。Google 則說不需要 AI 專用檔案或特殊 Schema.org。

## 1. 衛教文章的產品邊界

### 1.1 建議的公開／私人分界

| 類型 | 是否公開索引 | 原因 |
|---|---:|---|
| 衛教首頁、主題分類頁 | 可以 | 有穩定內容與導覽價值，能作為文章入口 |
| 單篇衛教文章 | 可以 | 文章可用固定網址被搜尋、分享與引用 |
| 文章搜尋結果、篩選結果、收藏篩選 | 預設不索引 | 內容可能重複、組合數量無限，且不是穩定知識頁 |
| 個人防曬乳／裝備紀錄 | 不索引 | 屬於使用者資料，不應被公開抓取 |
| Session、提醒事件、地區／通知設定 | 不索引 | 屬於私人或暫時狀態 |
| 問題回報、草稿、備份與同步頁 | 不索引 | 含私人資料或流程狀態 |

這個分界也是 UX wireframe 的前置條件：每篇公開文章都要有「可單獨開啟、可分享、可返回衛教分類」的完整頁面，而不是只有 App 內抽屜或必須登入才能取得的內容。Google 的 AI 搜尋指南要求頁面先符合一般搜尋的索引與摘要資格；被登入牆或不可讀取的內容不適合當作公開衛教來源。

### 1.2 C+ 衛教首頁與單篇文章頁

目前已接受的 C+「編輯式精選＋結構化清單」可以保留設計感，同時讓文章具有搜尋與引用基礎：

```text
衛教首頁
├─ 一篇精選文章（可有少量授權圖片）
├─ 六個主題分類
├─ 搜尋／已收藏（使用者功能，不建立公開索引頁）
└─ 文章清單（標題、摘要、分類、複查狀態）

單篇文章
├─ H1／頁面標題
├─ 簡短摘要與「資料標籤」（已決定：上方簡短、文末完整來源）
├─ 直接回答／重點結論
├─ 內容段落與 H2/H3
├─ 適用範圍、限制與必要的安全提醒
├─ 來源與完整引用
├─ 作者／審閱者／最後複查日期
└─ 相關文章與返回分類
```

「防曬生活編輯部」繼續是視覺與內容概念；正式頁名維持「防曬衛教」。SEO/AEO/GEO 需要的是清楚文字與穩定資訊，不需要把頁面做成新聞跑馬燈或堆滿裝飾。

## 2. 內容規則：SEO 基礎＋健康內容可信度

### 2.1 每篇文章只處理一個主要問題

Google 建議頁面標題與主要標題要能準確、簡潔描述內容；Bing 也建議每個 URL 聚焦單一主題，避免把無關問題混在同一頁。文章規格應包含：

- 一個明確的主要問題／意圖（例如「補擦間隔怎麼判斷」這類問題；實際醫學結論仍需由來源與審閱者決定）。
- 一個唯一且穩定的頁面標題與 H1，不為了關鍵字另做近似頁面。
- 自然使用使用者會說的詞彙（繁體中文、同義詞與常見問法），不重複塞入關鍵字。
- 文章開頭先提供一句可理解的摘要，再說明適用情境、例外與來源。
- 重要定義、數字、限制與適用條件都在頁面文字中直接寫出，不只放在圖片、圖表或滑動元件中。

Google 也明確提醒，沒有「為 SEO 應寫幾字」的固定字數；內容應以完整解決讀者問題為準。

### 2.2 健康／安全題材的信任資料

衛教文章要能讓讀者回答「誰寫的、根據什麼、何時複查」。建議每篇保存並呈現：

- 作者或內容負責單位（可為 UVAlert 編輯／營運團隊）。
- 審閱者或審閱單位，以及其專長（如果有合格專業人員審閱，需如實標示；沒有就不要虛構）。
- 主要來源的組織名稱、文件標題、原始連結與發布／更新日期（若來源提供）。
- UVAlert 的發布日期與「最後審閱」日期；只有內容真的改動或重新查核時才更新日期，不以改日期假裝新內容。
- 內容適用範圍、限制與必要的就醫／專業諮詢提示；不要把一般衛教寫成個人診斷或保證。
- 若使用 AI 協助草稿，需有人員查核來源、數字、語意與安全風險；是否向讀者揭露 AI 使用，依讀者合理期待與內容製作流程決定，但不得用未審閱的生成文字直接當健康建議。

這不是為了「做出 E-E-A-T 分數」；Google 說 E-E-A-T 本身不是單一排名因素，但健康與安全相關主題會更重視能建立信任的整體訊號。

### 2.3 來源呈現（符合目前已選 C）

- **文章上方：**顯示簡短資料標籤，例如「資料來源：官方健康機構／最後審閱：YYYY-MM-DD」。不要用一大段來源打斷第一段閱讀。
- **文章正文：**需要時在相應段落放可理解的內文連結，連結文字說明目標內容，不使用無意義的「點我」「閱讀更多」。
- **文章結尾：**列出完整來源、文件名稱、發布／更新日期與連結；若文章使用多個來源，分別列出，不只放一個首頁網址。
- **更新歷史：**內容有重大修訂時保留簡短「本次更新」說明，讓讀者知道是改了什麼；不要只有日期跳動。

## 3. AEO：讓答案容易被讀懂（不是保證答案卡）

目前沒有 Google／Bing／W3C 發布的「AEO 標記標準」。以下是依官方內容原則整理的文章版型推論：

1. **以自然問題作為 H1 或 H2。** 例如使用者真的會問的「需要多久補擦一次？」；標題仍要準確，不為了吸睛誇大。
2. **標題後先給一段直接答案。** 建議 1–3 句，先講結論，再說明適用條件、例外與資料來源。不要在答案前放很長的品牌故事。
3. **一個問題只給一個清楚的主答案。** 若要比較兩種情境，拆成明確小標與條列，避免同一段同時回答多個未定義的問題。
4. **答案必須在可見文字中成立。** 圖表、圖示與卡片可以加強閱讀，但不能成為唯一載體；讀者複製文字或使用螢幕閱讀器仍應得到完整意思。
5. **加入條件、例外與不確定性。** 健康資訊不能為了短答案而省略適用限制；「一般情況」與「需要尋求專業意見」要清楚分開。
6. **以來源連結支持可驗證的主張。** 每一項重要數字、時間、定義或安全提醒，都應能追溯到可靠來源或說明是產品規則／一般 UX 設計。
7. **讓相關文章可沿著內部連結找到。** 使用描述性 anchor text，把「補擦間隔」「流汗／碰水後處理」等相關主題連起來，但不建立大量近似內容頁。

這些做法能提升人類閱讀與搜尋系統理解；Google/Bing 仍可能自行改寫標題、摘要或答案，也不保證顯示在精選摘要、AI Overview 或 Copilot。

## 4. 結構化資料：該用什麼、不要承諾什麼

### 4.1 建議的 Schema.org 類型

| 類型 | UVAlert 用途 | 注意事項 |
|---|---|---|
| `Article` 或 `BlogPosting` | 單篇衛教文章 | 用最符合內容的類型；不要把一般衛教誤標成 `NewsArticle`。Google 說 Article 標記可協助理解標題、作者、圖片與日期，但不保證出現複合式結果。 |
| `BreadcrumbList` | 首頁 → 防曬衛教 → 文章 | Google 要求至少兩個 `ListItem` 才有資格顯示麵包屑；資料應反映使用者導覽路徑，而不是盲目複製 URL。 |
| `FAQPage` | 真的由多組可見「問題／答案」組成的頁面 | Schema.org 仍定義此類型，但 Google FAQ rich result 已於 2026-05-07 起不再顯示；不要把它當成獲得 Google FAQ 卡片的承諾。可為內容語意與其他消費者保留，但所有問答必須在頁面上可見且真實存在。 |
| `WebPage` 的 `lastReviewed`、`reviewedBy` | 表達複查日期／審閱者 | 這些是 Schema.org 語意屬性；要同時在畫面上顯示，不能只藏在 JSON-LD。Google 是否使用或顯示不保證。 |

### 4.2 `Article` 最小可行資料

依 Google Article 文件，第一版可準備下列與頁面可見內容一致的欄位（欄位是否採用仍交由工程規格確認）：

- `headline`：文章標題。
- `author`：真實的 `Person` 或 `Organization`，包含 `name`；若有可公開的作者／團隊頁再提供 `url`。
- `datePublished`：首次發布日期。
- `dateModified`：最近一次實質修改日期，使用 ISO 8601 與時區。
- `image`：可被抓取的代表圖片，且圖片確實代表文章。
- `inLanguage`、`articleSection`、`about`：有可靠資料時再加入，避免為了填欄位而亂標。
- `mainEntityOfPage`／`url`：指向該篇的穩定標準網址。

結構化資料必須與可見文字一致，部署後用 Rich Results Test 與 Search Console URL Inspection 檢查；即使通過測試，Google 也不保證顯示複合式結果。

### 4.3 不建議第一版投入

- 不要為了 GEO 自製 `ai.txt`、`llms.txt` 或一套只給模型看的隱藏內容；Google 明確說不需要新的 AI 專用檔案或特殊 Schema.org。
- 不要對沒有實際評分／評論的衛教文章加 `Review`／星級標記。
- 不要把關鍵答案只放在 JSON-LD、圖片或 CSS 產生的文字中；結構化資料是補充，不是正文替代品。

## 5. 可抓取性、sitemap、canonical 與 robots

### 5.1 公開文章 URL

- 每篇文章使用一個穩定、可讀、永久性 URL；slug 表達主題，不加入不必要的追蹤參數。
- 同一篇內容若有不同入口，所有內部連結指向同一個 canonical URL。
- canonical 頁面在 HTML `<head>` 放自我指向的 `rel="canonical"`；若是重複頁，指向偏好的標準頁。不要用 robots.txt 來做 canonical。
- XML sitemap 只列想出現在搜尋結果的 canonical 公開 URL；使用完整絕對 URL。`lastmod` 只在主要內容、結構化資料或連結有實質更新時改動。
- sitemap 是提示，不保證 Google 下載、抓取或索引；仍要讓文章由衛教首頁、分類頁與相關文章的可抓取 `<a href>` 連結找到。

### 5.2 robots.txt 與 noindex

- 對希望被搜尋／AI 搜尋引用的衛教文章，robots.txt 不應阻擋 crawler，且重要文字、圖片與必要資源要可讀取。
- robots.txt 是抓取管理，不是安全或隱藏工具；被阻擋的 URL 仍可能因外部連結而出現在搜尋結果。要真正禁止公開索引，使用 `noindex`、登入／密碼保護或移除頁面。
- 因此，個人資料頁、Session、提醒紀錄、收藏與內部搜尋結果應在公開路由之外，或用適當的 `noindex`／登入保護；不要一邊用 robots.txt 阻擋，一邊期待 crawler 讀到 `noindex`。

### 5.3 JavaScript 與 wireframe 的注意事項

Google 可以處理未被阻擋的 JavaScript 內容，但官方也提醒 JavaScript SEO 比一般網站更複雜。對 UVAlert 的設計規格，至少要確保：

- 公開文章的標題、摘要、正文、來源與更新資料在 crawler 收到的頁面中可取得，不必先登入、點擊或等待個人資料載入。
- 每篇文章有可直接開啟與分享的 route；瀏覽器返回與重新載入不會遺失文章。
- 搜尋／收藏等個人化 UI 可以是 App 功能，但不應成為取得文章正文的唯一方式。

是否採 SSR、SSG 或其它渲染方案屬於後續工程決策，本研究不替專案定案。

## 6. Bing／Copilot 與生成式搜尋（GEO）

Bing 官方 Webmaster Guidelines 目前直接以 Bing、Copilot 與 grounding API 的可見性說明規則。對 UVAlert 可轉化為：

- **可發現：**用 XML sitemap、可抓取內部連結與（若之後需要）IndexNow 告知新增／更新／刪除 URL。
- **可驗證：**關鍵事實與定義寫在該 URL，不要只靠上一頁或圖片；提供來源連結與清楚的文章主題。
- **可理解：**使用標準 HTML、唯一且描述性的 `<title>`、meta description、H1–H6 階層、語意元素與圖片 alt。
- **可引用：**不要對預期被引用的文章設 `nosnippet`、`noarchive` 或過度限制 snippet 的控制；如果未來有特殊隱私／授權需求，再逐頁評估預覽控制。
- **可維護：**內容改版保留穩定 URL；移除內容回傳正確 404，必要時透過 IndexNow 更新，避免 AI 回答引用過期頁面。
- **勿操弄：**不複製／輕改官方文章、不關鍵字堆砌、不大量自動生成未審閱內容、不使用隱藏文字或 prompt injection 影響模型。

Bing 同時寫明：SEO 與 GEO 都不保證排名、grounding 或 citation。也就是說，應把目標定為「讓可靠內容可被找到與正確理解」，而不是承諾「一定出現在 AI 答案」。

Google 的 AI 搜尋文件則表示：AI Overviews／AI Mode 沿用一般 SEO 基礎；頁面要能被索引並有搜尋摘要資格，沒有額外技術要求，也不需要新的 AI 檔案或特殊 Schema.org。這是 UVAlert 第一版不另建 GEO 格式的主要依據。

## 7. W3C/WAI 對文章 UX 與可理解性的支援

W3C/WAI 的寫作與頁面結構指引不是搜尋排名規則，但會直接改善使用者與輔助技術對文章的理解，也與搜尋系統偏好的清楚結構一致：

- 每個頁面有簡短、唯一且能描述內容的 title。
- 使用語意化 H1–H6 組織段落，不用單純放大字體假裝標題；標題階層不要無理由跳級。
- 連結文字描述目的，不用模糊的「點這裡」或單獨的「閱讀更多」。
- 每張有資訊功能的圖片提供描述性 alt；純裝飾圖片可使用空 alt。
- 文字保持清楚、精簡、可掃讀；長文章使用小標與段落。

因此 C+ 的視覺設計可以保留精選圖片、色條與編輯部感，但不能讓關鍵答案、來源或限制只存在於視覺裝飾中。

## 8. UVAlert 第一版可落地清單（供後續 sitemap／wireframe）

### 內容與編輯

- [ ] 公開衛教文章與私人 App 資料分開，文章可免登入閱讀與分享。
- [ ] 每篇文章先定義一個主要問題與讀者意圖。
- [ ] 文章上方有簡短資料標籤；文末有完整來源（已接受的 C）。
- [ ] 顯示作者／內容負責單位、審閱者（如有）、發布日期、最後審閱日期與更新摘要。
- [ ] 每個健康／安全主張能追溯到來源；不把一般衛教寫成個人診斷或保證。
- [ ] 以自然問句＋直接答案＋條件／限制＋來源的結構支援 AEO/GEO；不做關鍵字堆砌。

### URL 與索引

- [ ] 每篇文章一個穩定 canonical URL；分類頁只有在內容有獨立價值時才公開索引。
- [ ] sitemap 只收錄公開 canonical 衛教頁；準確維護 `lastmod`。
- [ ] robots.txt 不阻擋公開衛教正文與必要資源；私人頁面用登入／`noindex` 等方式處理。
- [ ] 文章有衛教首頁、分類頁、相關文章的可抓取內部連結。
- [ ] 搜尋／收藏／個人資料頁不進 sitemap，也不成為文章可讀性的必要條件。

### 結構化資料與品質驗證

- [ ] 單篇文章使用符合內容的 `Article`／`BlogPosting`；不使用不實的 `NewsArticle`。
- [ ] 深層文章使用 `BreadcrumbList`，且資料與畫面上的導覽相符。
- [ ] 只有真正的可見問答頁才考慮 `FAQPage`；不以 FAQ rich result 作為 KPI。
- [ ] JSON-LD 與可見文字、作者、日期、圖片、來源保持一致。
- [ ] 發布前後用 Rich Results Test、URL Inspection、Search Console 檢查可讀性與索引狀態。
- [ ] 定期複查健康內容與官方來源；內容更新不以改日期冒充新內容。

## 9. 需要在後續訪談／規格中確認的產品問題

1. **公開範圍：**衛教文章是否確定免登入、可被搜尋與社群分享？若是，需在 sitemap 與路由規格明確標出「公開內容」與「私人 App」兩棵樹。
2. **內容責任：**誰負責文章撰寫、來源查核與最後審閱？是否需要一個「內容團隊／審閱者」介紹頁？
3. **複查週期：**UV 與健康建議的來源多久檢查一次？哪些變更算「實質更新」並觸發 `dateModified`／sitemap `lastmod`？
4. **FAQ 的目的：**如果要做 FAQ，是否接受它主要是閱讀與答案清楚度功能，而不是 Google FAQ 複合式結果功能？
5. **搜尋 KPI：**第一版要觀察曝光／索引、自然搜尋點擊、文章閱讀完成度、來源點擊，還是使用者回到提醒功能的比例？不要把「被 AI 引用」當成可保證的單一 KPI。

## 官方來源（查閱日：2026-08-13）

| 來源 | 用途／重點 | 官方更新資訊 |
|---|---|---|
| [Google：AI features and your website](https://developers.google.com/search/docs/appearance/ai-features) | AI Overviews／AI Mode 沿用一般 SEO；無額外要求、無特殊 AI 檔案或 Schema.org；內容需可索引、有文字、可抓取且結構化資料與可見內容一致 | Google 頁面標示 2025-12-10 更新 |
| [Google：AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) | 生成式搜尋仍以公開可抓取內容、一般技術 SEO、語意 HTML 與 JavaScript SEO 為基礎；不保證索引或服務 | Google 頁面標示 2026-07-10 更新 |
| [Google：Creating helpful, reliable, people-first content](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) | 人本內容、清楚來源、作者／專業背景、Who／How／Why、健康／安全 YMYL 與 E-E-A-T | Google 頁面標示 2025-12-10 更新 |
| [Google：SEO Starter Guide（繁體中文）](https://developers.google.com/search/docs/fundamentals/seo-starter-guide?hl=zh-tw) | 唯一標題、清楚內容、更新、自然搜尋字詞、內部連結、描述性錨定文字與重複內容／canonical 基礎 | Google 頁面標示 2025-12-18 更新 |
| [Google：Article structured data](https://developers.google.com/search/docs/appearance/structured-data/article) | `Article`／`BlogPosting`、作者、作者 URL、發布／修改日期、圖片、驗證與不保證顯示 | Google 頁面標示 2025-12-10 更新 |
| [Google：Breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb) | `BreadcrumbList`、至少兩個 ListItem、導覽路徑、Rich Results Test／URL Inspection | Google 頁面標示 2025-12-10 更新 |
| [Google：General structured data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) | 結構化資料需符合政策、與可見內容一致；通過測試也不保證顯示 | 官方文件（查閱 2026-08-13） |
| [Google：FAQ rich result removal / Search documentation updates](https://developers.google.com/search/updates) | 官方更新說明 FAQ rich result 自 2026-05-07 起不再出現在 Google 搜尋結果；不要把 FAQPage 當成 Google 複合式結果承諾 | 2026-05-08 deprecation／2026-06 文件移除說明 |
| [Google：Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap) | sitemap 只列希望出現在搜尋的 canonical URL、使用絕對 URL、準確 `lastmod`、sitemap 只是提示 | Google 頁面標示 2026-07-08 更新 |
| [Google：Canonicalization](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) | self-referential canonical、不要用 robots 做 canonical、sitemap／redirect／canonical 訊號一致 | 官方文件（查閱 2026-08-13） |
| [Google：Introduction to robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/intro) | robots 管理抓取，不是隱藏頁面；要阻止索引使用 `noindex`、登入／密碼或移除 | Google 頁面標示 2025-12-10 更新 |
| [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a) | Bing／Copilot grounding 與 citation 的官方建議：清楚單一主題、重要資訊靠前、可驗證、結構化資料正確、避免操弄；GEO 不保證引用 | 官方頁面；查閱 2026-08-13（頁面未提供可讀更新日期） |
| [Schema.org：Article](https://schema.org/Article) | `Article` 語意、headline、author、datePublished、dateModified、citation 等詞彙定義 | Schema.org 官方版本 30.0：2026-03-19 |
| [Schema.org：FAQPage](https://schema.org/FAQPage) | FAQPage 的語意定義、`lastReviewed`／`reviewedBy` 等 WebPage 屬性；Schema.org 定義不代表 Google 一定提供複合式結果 | Schema.org 官方頁面；查閱 2026-08-13 |
| [Schema.org：BreadcrumbList](https://schema.org/BreadcrumbList) | BreadcrumbList／ListItem 結構與 JSON-LD 範例 | Schema.org 官方版本 30.0：2026-03-19 |
| [W3C/WAI：Writing for Web Accessibility](https://www.w3.org/WAI/tips/writing/) | 唯一頁面標題、語意標題、描述性連結文字、圖片替代文字、清楚精簡內容 | W3C/WAI 頁面；查閱 2026-08-13 |
| [W3C/WAI：Headings](https://www.w3.org/WAI/tutorials/page-structure/headings/) | 標題階層、內容組織、輔助技術導覽與避免跳級 | W3C/WAI 頁面；查閱 2026-08-13 |

---

### 研究限制

搜尋引擎會改寫標題、摘要與生成式答案，且是否抓取、索引、排名或引用都不保證。本文把官方文件能支持的要求與產品層面的合理推論分開；不能把 AEO／GEO 當成一個可驗收「一定上答案卡」的功能，也不能以結構化資料取代真實、經查核的健康內容。
