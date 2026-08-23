# 裁決紀錄

這個資料夾只保留目前可供 wireframe、UI／UX 與產品討論使用的現行決策。

## 現行整合基準

| 檔案 | 用途 | 狀態 |
| --- | --- | --- |
| `2026-08-15-redesign-sitemap-userflow-current.md` | 最新 Sitemap、User Flow、產品結構與已確認的重新設計決策 | 現行基準（2026-08-23 已回寫） |
| `2026-08-17-copy-audit.md` | 全站台灣繁體中文詞彙、語氣與文字整理盤點 | 現行文案依據 |
| `2026-08-23-notification-decision.md` | 通知功能落差盤點與「做 service worker ＋ 本機通知」裁決 | 現行裁決 |
| `2026-08-23-content-and-flow-decisions.md` | `/help` 保留、逾期文案維持、`/help` 發布審查日期、特殊狀況文案處置 | 現行裁決 |
| `2026-08-23-wireframe-copy-fixes.md` | wireframe 使用者可見文字的修正清單 | 待套用 |
| `2026-08-22-mvp-flow-review.md` | 重做 wireframe 前的流程斷點盤點與簡化建議 | **已裁決**（2026-08-23）——結論見 `2026-08-23-content-and-flow-decisions.md` |

`2026-08-22-mvp-flow-review.md` 原為待裁決的分析文件，2026-08-23 已逐項裁決完畢，轉為歷史參考。它指出的問題有一部分與實際程式碼不符（例如「三個並行的衛教入口」），採用前請先核對程式碼。

## 裁決 → 回寫落點

| 裁決 | 落點 | 狀態 |
| --- | --- | --- |
| `/help` 與 `/special-situation` 保留，不砍 | `2026-08-15-redesign-sitemap-userflow-current.md` §一、§五 | 已回寫（2026-08-23） |
| 逾期文案維持「該補擦了」 | 無需改動 | 已完成 |
| `/help` 兩則放行（`reviewedAt` 2026-08-23／`nextReviewAt` 2027-08-23） | `apps/web/src/features/help/helpTopics.ts` | 待實作 |
| `/help` 內容接進 App | `apps/web/src/pages/help/HelpTopicPage.vue`（目前缺 `v-else` 分支） | 待實作 |
| `/help/how-it-works` 改寫成誠實版（移除不存在的通知承諾） | `apps/web/src/features/help/` | 待實作 |
| 特殊狀況文案起草，維持 `MEDICAL_REVIEW` | `apps/web/src/features/help/` | 待實作 |
| 做 service worker ＋ 本機通知 | `apps/web/`、`vite.config.ts` | 待實作 |
| 通知行為補進現行 Sitemap | `2026-08-15-redesign-sitemap-userflow-current.md` §4.3（全面改寫）、§4.1 第 6 點 | 已回寫（2026-08-23） |
| 夜間／收工行為補進現行 Sitemap | `2026-08-15-redesign-sitemap-userflow-current.md` §4.2 | 已回寫（2026-08-23） |
| 「不做暫停」的取捨寫進規格 | `2026-08-15-redesign-sitemap-userflow-current.md` §4.2 | 已回寫（2026-08-23） |
| wireframe 文字修正 | wireframe 原始檔 | 待套用 |

視覺設計另見：

- `docs/design/current-direction.md`
- `docs/design/README.md`

## 歷史資料

舊版 P0 規格、訪談逐項紀錄、Sitemap／User Flow 原型、mockup、截圖與實作計畫已移至：

`docs/archive/2026-08-pre-redesign/`

它們仍可用來追查「當初為什麼這樣決定」，但不再是開發或 wireframe 依據。若歷史文件與現行整合基準衝突，以現行整合基準為準。

**例外**：`/help` 兩則主題的正式內容目前仍只存在於 `docs/archive/2026-08-pre-redesign/p0-specifications/防曬晴報員PRD.md` §13.4／§13.5，接進 App 前該處是唯一來源。
