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
| `2026-08-23-hifi-redesign-handoff.md` | 高保真重新設計交接紀錄——結構性衝突裁決、待辦清單、未解問題 | 第一輪交接文件，第四節三問已在收尾紀錄裁決 |
| `2026-08-23-hifi-redesign-round2-closeout.md` | 高保真重新設計第二輪收尾——交接文件第四節裁決、優先序 1–4 實作結果、優先序 5／6 處置 | **現行收尾文件**，session 換手時先讀這份 |
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
| 特殊狀況文案起草，維持 `MEDICAL_REVIEW` | `docs/superpowers/specs/2026-08-23-special-situations-copy-drafts.md` | 已完成（2026-08-23）——起草並校正三處引用問題，仍是 `MEDICAL_REVIEW`，未逕行核准 |
| 做 service worker ＋ 本機通知 | `apps/web/src/adapters/BrowserNotifications.ts`、`apps/web/public/sw.js`、`apps/web/src/features/notification/` | 已完成（2026-08-23）——只排單一下一個到期通知，`canDeliverInBackground` 恆為 false |
| 通知行為補進現行 Sitemap | `2026-08-15-redesign-sitemap-userflow-current.md` §4.3（全面改寫）、§4.1 第 6 點 | 已回寫（2026-08-23） |
| 夜間／收工行為補進現行 Sitemap | `2026-08-15-redesign-sitemap-userflow-current.md` §4.2 | 已回寫（2026-08-23） |
| 「不做暫停」的取捨寫進規格 | `2026-08-15-redesign-sitemap-userflow-current.md` §4.2 | 已回寫（2026-08-23） |
| wireframe 文字修正 | wireframe 原始檔 | 待套用 |
| 裝備清單新增按鈕維持「新增防曬裝備」 | 無需改動 | 已完成（2026-08-23） |
| `/reminder` 補線性進度條＋嵌入五日 UV 預報卡 | `ReminderPanel.vue`、`reminderPresentation.ts`、`ReminderPage.vue` | 已完成（2026-08-23，commit `2ff3497`） |
| 裝備清單卡片視覺對齊（裸圖示，不加 icon-avatar 色塊） | `GearListItem.vue` | 已完成（2026-08-23，commit `11faee9`） |
| 設定流程步驟指示器改線性進度條 | `SetupStepShell.vue` | 已完成（2026-08-23，commit `1e90fe6`） |
| 通知設定頁重排＋「如何開啟」展開步驟說明 | `NotificationSettingsPage.vue` | 已完成（2026-08-23，commit `1241f7e`） |
| 優先序 5（其餘頁面）暫緩 | `2026-08-23-hifi-redesign-round2-closeout.md` §四 | 已裁決（2026-08-23）——使用者確認暫不處理 |
| 優先序 6「三個完全沒做的頁面」是錯的認知，三個路由都已有完整功能的頁面 | `2026-08-23-hifi-redesign-round2-closeout.md` §四更正 | 已完成（2026-08-23）——`/reminder/report`（`638c34c`）與更正事件（`e85a914`）已補視覺對齊；`/region` 核對後不需要改 |
| 通知「再次提醒頻率」＋「裝置測試」 | `2026-08-23-hifi-redesign-round2-closeout.md` §六 | 已完成（2026-08-24，commit `3f969bc`） |

視覺設計另見：

- `docs/design/current-direction.md`
- `docs/design/README.md`

## 歷史資料

舊版 P0 規格、訪談逐項紀錄、Sitemap／User Flow 原型、mockup、截圖與實作計畫已移至：

`docs/archive/2026-08-pre-redesign/`

它們仍可用來追查「當初為什麼這樣決定」，但不再是開發或 wireframe 依據。若歷史文件與現行整合基準衝突，以現行整合基準為準。

**例外**：`/help` 兩則主題的正式內容目前仍只存在於 `docs/archive/2026-08-pre-redesign/p0-specifications/防曬晴報員PRD.md` §13.4／§13.5，接進 App 前該處是唯一來源。
