# 重新設計前封存資料

**封存日期**：2026-08-15  
**用途**：保留歷史決策、舊版規格、視覺探索與實作紀錄，避免資料遺失；不作為目前產品依據。

## 目前應使用的文件

- `docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`
- `docs/design/current-direction.md`
- `packages/ui/src/styles.css`
- `apps/web/src/assets/app.css`

若封存內容與上述文件衝突，以目前文件與程式碼為準。

## 封存分類

| 目錄 | 內容 | 不再直接採用的原因 |
| --- | --- | --- |
| `p0-specifications/` | 舊 PRD、P0 manifest、screen inventory、copy、技術規格與規則表 | 以舊四入口、舊 `/help` 與舊版產品結構為前提 |
| `visual-design/` | 舊 Design System、Icon Design System、P0 設計約束 | 新版品牌方向尚未以此套規則重新收斂 |
| `decision-history/` | 舊 Sitemap／User Flow、mockup、訪談與問題分析 | 保存決策脈絡，但部分方案已被重新設計取代 |
| `legacy-design-v1/` | 舊版完整快照與截圖 | 只能用來回看歷史畫面，不代表現行 UI |
| `superpowers/` | 舊版實作計畫與技術設計草稿 | 對應舊規格，不能直接當成新設計的執行計畫 |

## 特別說明

`.worktrees`、`.claude/worktrees`、`node_modules` 與建置輸出不是產品規格資料，因此沒有移入這個封存區；它們屬於 Git／開發環境資料，避免移動造成工作樹或依賴失效。
