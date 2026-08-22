# UVAlert 前端視覺設計資料索引

## 先看哪裡

目前進行 wireframe、UI／UX 或前端畫面整理時，請依下列順序閱讀：

1. `DESIGN.md`（**根目錄**）：設計系統的唯一權威——完整色彩 token、字體、間距、元件規範、圖示風格，以及第十節的「與程式碼的落差」對照表。
2. `docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`：目前 Sitemap、User Flow 與產品結構的唯一現行基準。
3. `docs/design/current-direction.md`：品牌角色、區域視覺任務與資訊層級原則（色彩／字體細節已由 `DESIGN.md` 取代）。
4. `docs/design/icon-system/README.md`：圖示系統完整規格與取捨紀錄。
5. `packages/ui/src/styles.css`：目前實際使用的顏色、字級、間距、圓角、陰影與動畫 token。
6. `apps/web/src/assets/app.css`：目前實際使用的共用版面與元件樣式。

程式碼是「目前畫面長什麼樣」的真實來源；設計文件是「接下來應該往哪裡走」的共同語言。兩者不一致時，先不要自行猜測或覆蓋，應先確認是否要把新方向正式實作。

## 目前視覺方向

UVAlert 採用「防曬氣象管家 × 防曬生活編輯部」的混合方向：

- 提醒頁以任務為中心，倒數與下一步操作永遠優先。
- 衛教頁才使用較完整的生活編輯部／氣象情報視覺。
- 基底以溫暖中性色與清楚排版建立親和感。
- UV 色階只在需要表達紫外線資料時使用，避免全站變成多色儀表板。
- 狀態不可只靠顏色表達，仍要搭配文字與圖示。

完整內容見 `current-direction.md`。

## Logo 概念探索

`docs/design/logo-concepts/` 收錄第一輪 Logo 概念比較板與六款獨立圖標／橫式標誌。**更新（2026-08-18）**：已定案選用 06 播報印記，PWA icon／favicon／apple-touch-icon 已正式換上（commit `8355d11`）。

Logo 的墨咖 `#33291F` ＋ 琥珀金 `#C1832E` 是**圖示與 Logo 專用配色**（見 `DESIGN.md` 第八節），與介面配色（暖象牙 `#FAF5EC` ＋ 深杏桃 `#9F5E42` ＋ 深咖啡 `#2E2925`，見 `DESIGN.md` 第二節）是兩套不同範圍的色票，不要互相代入。介面配色目前也尚未套進 `packages/ui/src/styles.css`，完整落差見 `DESIGN.md` 第十節。詳見 [`logo-concepts/README.md`](logo-concepts/README.md)。

## 舊資料

舊版 P0 規格、舊版設計系統、舊版 Sitemap／User Flow、mockup、截圖與實作計畫已移至：

`docs/archive/2026-08-pre-redesign/`

它們只用於了解歷史脈絡，不作為目前 wireframe、UI／UX 或開發依據。
