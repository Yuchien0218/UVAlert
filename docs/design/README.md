# UVAlert 前端視覺設計資料索引

## 先看哪裡

目前進行 wireframe、UI／UX 或前端畫面整理時，請依下列順序閱讀：

1. `docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`：目前 Sitemap、User Flow 與產品結構的唯一現行基準。
2. `docs/design/current-direction.md`：已確認的視覺方向與尚未實作的設計原則。
3. `packages/ui/src/styles.css`：目前實際使用的顏色、字級、間距、圓角、陰影與動畫 token。
4. `apps/web/src/assets/app.css`：目前實際使用的共用版面與元件樣式。

程式碼是「目前畫面長什麼樣」的真實來源；設計文件是「接下來應該往哪裡走」的共同語言。兩者不一致時，先不要自行猜測或覆蓋，應先確認是否要把新方向正式實作。

## 目前視覺方向

UVAlert 採用「防曬氣象管家 × 防曬生活編輯部」的混合方向：

- 提醒頁以任務為中心，倒數與下一步操作永遠優先。
- 衛教頁才使用較完整的生活編輯部／氣象情報視覺。
- 基底以溫暖中性色與清楚排版建立親和感。
- UV 色階只在需要表達紫外線資料時使用，避免全站變成多色儀表板。
- 狀態不可只靠顏色表達，仍要搭配文字與圖示。

完整內容見 `current-direction.md`。

## 進行中提醒主頁低擬真 Wireframe

六款灰階草稿使用相同的進行中提醒資料，以不同資訊架構比較首頁方向。每張為獨立直式畫面，不是正式 UI：

- [設計規格](./2026-08-17-home-wireframe-variants-design.md)
- [A｜大倒數中心型](./wireframes/home-active/home-active-a-countdown-centered.png)
- [B｜今日播報型](./wireframes/home-active/home-active-b-daily-briefing.png)
- [C｜部位狀態型](./wireframes/home-active/home-active-c-body-status.png)
- [D｜行動優先型](./wireframes/home-active/home-active-d-action-first.png)
- [E｜直向時間軸型](./wireframes/home-active/home-active-e-timeline.png)
- [F｜儀表摘要型](./wireframes/home-active/home-active-f-dashboard-summary.png)

這些圖片只用來比較資訊順序、主要 CTA 與版型，不代表最後字體、色彩、圖示或元件樣式。

## 舊資料

舊版 P0 規格、舊版設計系統、舊版 Sitemap／User Flow、mockup、截圖與實作計畫已移至：

`docs/archive/2026-08-pre-redesign/`

它們只用於了解歷史脈絡，不作為目前 wireframe、UI／UX 或開發依據。
