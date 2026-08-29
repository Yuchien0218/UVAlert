# UVAlert 設計規格索引

**用途**：集中列出已整理的詳細設計規格，讓換對話的 AI 先找到正確契約，再決定是否需要讀實作計畫。  
**更新日期**：2026-08-27（Asia/Taipei）

## 規格清單

| 規格                                                                                                                     | 文件內狀態                                         | 覆蓋範圍                                                           | 配套入口                                                                                                                                                         |
| ------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`2026-08-17-backend-foundation-design.md`](2026-08-17-backend-foundation-design.md)                                     | 設計已由產品端確認；文件標註待進入實作             | Supabase、Google 登入、同步、UV 代理、問題回報、資料清除與資料邊界 | [`../../backend/README.md`](../../backend/README.md)、[`../plans/2026-08-17-backend-foundation.md`](../plans/2026-08-17-backend-foundation.md)                   |
| [`2026-08-17-zh-tw-copy-design.md`](2026-08-17-zh-tw-copy-design.md)                                                     | 產品端已確認；文件標註待進入文案實作               | 台灣繁體中文語氣、統一詞彙、App／PWA 與衛教可見文案                | [`../../decisions/2026-08-17-copy-audit.md`](../../decisions/2026-08-17-copy-audit.md)、[`../plans/2026-08-17-zh-tw-copy.md`](../plans/2026-08-17-zh-tw-copy.md) |
| [`2026-08-18-uvalert-logo-concepts-design.md`](2026-08-18-uvalert-logo-concepts-design.md)                               | 方向規格；第一輪概念與正式採用狀態另見設計資產索引 | 六款 Logo 概念、字標、圖標、配色與禁止方向                         | [`../../design/logo-concepts/README.md`](../../design/logo-concepts/README.md)、[`../../../DESIGN.md`](../../../DESIGN.md)                                       |
| [`2026-08-27-b8-role-based-typography-design.md`](2026-08-27-b8-role-based-typography-design.md)                         | 產品端已確認；待撰寫實作計畫                       | 七角色字級量表、舊 token 遷移、長文節奏、文章波浪與視覺驗證        | [`../plans/2026-08-26-codebase-consolidation-audit.md`](../plans/2026-08-26-codebase-consolidation-audit.md)、[`../../../DESIGN.md`](../../../DESIGN.md)         |
| [`2026-08-27-b9-icon-first-progressive-disclosure-design.md`](2026-08-27-b9-icon-first-progressive-disclosure-design.md) | 方向已確認；待另行盤點與實作計畫                   | Icon-first、常駐／收合資訊分類、互動與無障礙契約                   | [`2026-08-27-b8-role-based-typography-design.md`](2026-08-27-b8-role-based-typography-design.md)、[`../../../DESIGN.md`](../../../DESIGN.md)                     |

## 讀取規則

- 規格是「應該如何設計」的詳細契約，不等於所有內容已經上線。
- 先看文件內的日期、狀態、範圍與非範圍，再讀配套 README 和目前程式碼。
- 若規格與目前程式碼、測試或現行決策衝突，不要自行猜測；以 [`../../README.md`](../../README.md) 的權威順序判斷，必要時先提出差異。
- 不要直接執行規格中提到的功能；執行時應改讀 [`../plans/README.md`](../plans/README.md)，確認計畫是否仍然有效。
