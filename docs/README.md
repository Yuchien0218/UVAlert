# UVAlert 文件導覽

**更新日期**：2026-08-22（Asia/Taipei）  
**用途**：提供人類與 AI 共用的文件入口，避免換對話後漏讀規格、研究或決策。

## 建議閱讀順序

第一次接手專案，請依序閱讀：

1. [`../CLAUDE.md`](../CLAUDE.md)：AI 助理動手前的專案規則與目前狀態。
2. [`../README.md`](../README.md)：產品、monorepo、執行方式與文件總入口。
3. [`../DESIGN.md`](../DESIGN.md)：目前視覺設計系統的唯一權威。
4. 本文件：依工作目的選擇下方的現行文件。
5. 相關程式碼與測試：確認「已實作的現況」；文件不取代程式碼驗證。

## 依工作目的找文件

| 如果你要做什麼 | 先讀 | 接著讀 |
| --- | --- | --- |
| 了解產品頁面、Sitemap、User Flow | [`decisions/2026-08-15-redesign-sitemap-userflow-current.md`](decisions/2026-08-15-redesign-sitemap-userflow-current.md) | [`decisions/README.md`](decisions/README.md) |
| 做 wireframe、UI／UX 或前端畫面 | [`../DESIGN.md`](../DESIGN.md) | [`design/README.md`](design/README.md)、[`design/current-direction.md`](design/current-direction.md) |
| 了解後端、登入、同步、回報 BUG | [`backend/README.md`](backend/README.md) | [`superpowers/specs/README.md`](superpowers/specs/README.md) 中的後端規格 |
| 修改台灣繁體中文文案 | [`decisions/2026-08-17-copy-audit.md`](decisions/2026-08-17-copy-audit.md) | [`superpowers/specs/2026-08-17-zh-tw-copy-design.md`](superpowers/specs/2026-08-17-zh-tw-copy-design.md) |
| 編寫或審查衛教文章 | [`education/README.md`](education/README.md) | [`education/sources.md`](education/sources.md)、[`research/README.md`](research/README.md) |
| 做 SEO／AEO／GEO 公開頁 | [`education/public-seo-implementation.md`](education/public-seo-implementation.md) | [`research/2026-08-13-uvalert-education-seo-aeo-geo.md`](research/2026-08-13-uvalert-education-seo-aeo-geo.md) |
| 執行既有開發計畫 | [`superpowers/plans/README.md`](superpowers/plans/README.md) | 先確認計畫狀態、分支與目前程式碼，再讀指定計畫 |

## 文件權威性與狀態

文件用途不同，不能全部當成同一種「真相」：

1. **程式碼與測試**：代表目前實際能執行的行為。
2. **現行決策**：`docs/decisions/` 代表產品與資訊架構已確認的方向。
3. **設計系統**：根目錄 `DESIGN.md` 是色彩、字體、元件與圖示 token 的唯一權威；`docs/design/` 補充品牌方向與設計規格。
4. **設計規格**：`docs/superpowers/specs/` 是詳細的目標契約；先看文件內的狀態，不要把「待實作」當成已完成。
5. **實作計畫**：`docs/superpowers/plans/` 是執行清單與驗證脈絡，不是產品現況；未勾選項目不能視為已交付。
6. **研究筆記**：`docs/research/` 是衛教與 SEO 的證據來源，不直接新增產品功能或醫療保證。
7. **封存資料**：`docs/archive/2026-08-pre-redesign/` 只用來追查歷史原因；與現行文件衝突時，以現行文件與程式碼為準。

## 目前維護中的文件區

| 目錄 | 內容 | 入口 |
| --- | --- | --- |
| `decisions/` | Sitemap、User Flow、文字與產品裁決 | [`decisions/README.md`](decisions/README.md) |
| `design/` | 視覺方向、wireframe、圖示與 Logo 資產 | [`design/README.md`](design/README.md) |
| `education/` | 六大衛教分類、文章、來源與公開 SEO 實作 | [`education/README.md`](education/README.md) |
| `research/` | 官方來源、搜尋問句與 SEO／AEO／GEO 研究 | [`research/README.md`](research/README.md) |
| `backend/` | Supabase 本機開發、部署與資料邊界入口 | [`backend/README.md`](backend/README.md) |
| `superpowers/` | 詳細設計規格與實作計畫 | [`superpowers/README.md`](superpowers/README.md) |
| `archive/` | 重新設計前的歷史資料 | [`archive/2026-08-pre-redesign/README.md`](archive/2026-08-pre-redesign/README.md) |

## 新增或更新文件時必填的開頭資訊

每份會影響設計、產品或工程判斷的 Markdown，建議在標題下方明確寫出：

- **日期／更新日期**：這份內容何時整理或最後確認。
- **狀態**：例如草稿、已確認、進行中、已實作、已封存。
- **用途**：這份文件要幫誰做什麼決定。
- **範圍／非範圍**：避免 AI 把文件延伸成未授權功能。
- **權威性**：與哪些文件或程式碼衝突時，誰優先。
- **相關文件**：上一層 README、對應 spec／plan、實作入口與研究來源。
- **取代關係**：若取代舊文件，寫明舊檔案位置與是否已封存。

新增維護中的文件後，請同時把它加入最近的資料夾 README；新增一個新的文件區時，再加入本文件與根目錄 [`README.md`](../README.md)。

## 明確不要從這裡推論的事情

- 不要把衛教文章當成診斷或個人化醫療建議。
- 不要把 Logo 概念規格直接當成已上線的正式資產；正式狀態請看 [`design/logo-concepts/README.md`](design/logo-concepts/README.md) 與 [`../DESIGN.md`](../DESIGN.md)。
- 不要因為 plan 有某個 Task 就自行新增未經確認的功能。
- 不要從封存文件恢復舊 Sitemap、舊色票或舊入口。
