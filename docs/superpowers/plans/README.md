# UVAlert 實作計畫索引

**用途**：說明各份 agentic implementation plan 的目的、目前可否續跑，以及應先讀的現況文件。計畫是執行清單，不是產品現況。  
**更新日期**：2026-08-22（Asia/Taipei）

## 計畫清單

| 計畫 | 目前判讀 | 續跑前先讀 |
| --- | --- | --- |
| [`2026-08-17-backend-foundation.md`](2026-08-17-backend-foundation.md) | 資料庫 schema、RLS、4 份 migration、7 個 edge function 與後端測試皆已實作並提交；計畫 checkbox 完全未同步封存（53 項全未勾），**不可當成尚未開工**，續作前務必先盤點 `supabase/` 現況 | [`../../backend/README.md`](../../backend/README.md)、[`../specs/2026-08-17-backend-foundation-design.md`](../specs/2026-08-17-backend-foundation-design.md) |
| [`2026-08-17-comprehensive-copy-audit.md`](2026-08-17-comprehensive-copy-audit.md) | 主要文字整理已完成；計畫清單仍有未封存項目，不能直接從第一個 Task 重跑 | [`../../decisions/2026-08-17-copy-audit.md`](../../decisions/2026-08-17-copy-audit.md)、目前 `apps/web/src` |
| [`2026-08-17-home-wireframe-variants.md`](2026-08-17-home-wireframe-variants.md) | 原始產圖計畫；目前不作為現行 UI 依據，續作前需重新確認需求與資產 | [`../../design/README.md`](../../design/README.md)、[`../../design/2026-08-17-home-wireframe-variants-design.md`](../../design/2026-08-17-home-wireframe-variants-design.md) |
| [`2026-08-17-public-education-seo.md`](2026-08-17-public-education-seo.md) | 主要實作已完成；公開頁、draft gate、noindex 與 sitemap 規則以現行實作說明為準 | [`../../education/public-seo-implementation.md`](../../education/public-seo-implementation.md)、[`../../education/README.md`](../../education/README.md) |
| [`2026-08-17-zh-tw-copy.md`](2026-08-17-zh-tw-copy.md) | 主要文案整理已有實作提交；計畫 checkbox 未同步封存，不能盲目重新執行 | [`../../decisions/2026-08-17-copy-audit.md`](../../decisions/2026-08-17-copy-audit.md)、目前 `apps/web/src` |
| [`2026-08-18-uvalert-logo-concepts.md`](2026-08-18-uvalert-logo-concepts.md) | 第一輪概念、字標與比較板已產出；06 播報印記已成為正式 Logo 方向 | [`../../design/logo-concepts/README.md`](../../design/logo-concepts/README.md)、[`../../../DESIGN.md`](../../../DESIGN.md) |
| [`2026-08-25-shared-component-extraction.md`](2026-08-25-shared-component-extraction.md) | Task 1–4、6 已完成並通過測試／typecheck；Task 5（`MorePage` 導覽清單抽象）使用者決定跳過（單一呼叫端，非重複） | [`../../../DESIGN.md`](../../../DESIGN.md)、`apps/web/src/assets/app.css` |

## 執行計畫前必做

1. 先讀本索引與計畫的 `Goal`、`Global Constraints`、`File Map`。
2. 查看目前分支、`git status`、最近提交與相關程式碼，確認計畫沒有被後續提交取代。
3. 查看 Task checkbox；未勾選只代表計畫紀錄未完成，不代表可以跳過現況盤點。
4. 若計畫與現行決策、規格或程式碼衝突，先停止並提出差異，不要自行擴大範圍。
5. 完成後把測試結果、commit 與剩餘未完成項目回寫計畫或相鄰 README。

## 計畫與規格的差別

- `specs/` 回答「要做成什麼、邊界是什麼」。
- `plans/` 回答「要分幾個 Task、怎麼驗證、哪些檔案會動」。
- 實際產品行為仍以目前程式碼與測試為準；不要只因 plan 的文字看起來完整，就宣稱功能已完成。
