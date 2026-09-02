# 2026-09-02 UI/UX 排版一致性與設計優化建議書

**日期**：2026-09-02（Asia/Taipei）  
**用途**：供 AI / 開發者檢閱並執行全站 UI 排版、導覽出口、卡片層級、文字段落間距與元件樣式的一致性收斂。  
**設計唯一權威基準**：[`DESIGN.md`](file:///c:/Users/yu/Coding%20Projects/UVAlert/DESIGN.md)

---

## ⚠️ 核心原則：優先使用既有共用元件，嚴禁自行造輪子！

在執行任何 UI 調整時，**絕對不要在頁面內自己刻樣式、自己寫按鈕或自訂圖示容器**。本專案已經有成熟且經過完整無障礙與守門測試驗證的共用元件庫與全域 CSS 類別，必須優先引用：

### 1. 既有共用 Vue 元件庫（路徑：[`apps/web/src/components/common/`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/components/common/)）
| 元件名稱 | 用途與規範 | 呼叫範例 |
| :--- | :--- | :--- |
| **`IconButton.vue`** | **所有純圖示按鈕唯一來源**（關閉叉叉 `tool-close`、返回箭頭 `tool-arrow-left`）。自帶 44px 觸控命中區、WCAG 焦點環與 `aria-label`。禁止自己刻 `<button class="icon-btn">`。 | `<IconButton icon="tool-arrow-left" label="返回更多" @click="goBack" />` |
| **`IconLead.vue`** | **標題旁 40px / 空狀態 56px 領銜圖示唯一來源**。確保圖示與標題平起平坐，禁止在 scoped CSS 覆寫圖示大小。 | `<IconLead icon="feature-notification"><span><h2>通知設定</h2></span></IconLead>` |
| **`ChevronLink.vue`** | **文字 ＋ 右側箭頭連結**（帶 44px 觸控區）。用於次要展開或跳轉。 | `<ChevronLink to="/forecast">查看五日預報</ChevronLink>` |
| **`AppNotice.vue`** | **系統狀態／操作結果提示盒**（支援 `ok` 藕紫、`error` 赭紅、`info`）。 | `<AppNotice kind="ok">已完成設定</AppNotice>` |
| **`EmptyStateCard.vue`** | **載入失敗／空狀態卡片**。 | `<EmptyStateCard title="目前無資料" body="..." />` |
| **`ConfirmAction.vue`** | **危險操作二次確認彈窗**（刪除、清除資料）。 | `<ConfirmAction ... />` |
| **`Icon.vue`** | **全站圖示渲染器**。只接受 `icons.generated.ts` 中的 62 顆合法自訂圖示名稱，禁止使用第三方圖示庫或手寫 SVG。 | `<Icon name="tool-download" :size="20" />` |
| **`BroadcastLoader.vue`** | **頁面讀取中動畫**（播報印記蓄能動畫）。 | `<BroadcastLoader label="正在載入..." />` |

### 2. 全域 CSS 共用類別（路徑：[`apps/web/src/assets/app.css`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/assets/app.css)）
- **頁面骨架**：`.page-stack`（垂直留白節奏）、`.page-heading`（一級頁面標題列）、`.flow-heading`（二級流程標題列，支援左標題右叉叉/箭頭）。
- **容器樣式**：`.app-card`（標準卡片）、`.note-box`（輔助提示盒）、`.wave-divider`（波浪分隔線）。
- **按鈕與連結**：`.button`、`.button--primary`（主要行動深杏桃）、`.button--quiet`（次要按鈕）、`.text-link`。
- **表單與選取**：`.choice-grid`（選項網格）、`.option-selected`（標準選取狀態：`--color-muted` 邊框 ＋ `--color-hairline` 底）。
- **文字量表**：`[data-typography-role="page-title"]`、`[data-typography-role="section-title"]`、`[data-typography-role="card-title"]`。

---

## 現況問題概述

專案經歷多輪功能迭代與獨立重構後，在不同頁面間產生了數種彼此割裂的「視覺與互動方言」：
1. **二級頁面出口混亂**：左上返回箭頭、右上關閉叉叉、頁尾文字連結、無返回按鈕四種方式並存。
2. **卡片層級語意模糊**：深色表面（`#2E2925`）在首頁被移除，但在分享卡中又作為主卡，設定類頁面則退化為密集的純文字清單。
3. **表單控制項視覺分裂**：通知設定頁殘留瀏覽器原生 Radio Button，與全站自訂的 Pill / Choice Grid 元件脫節。
4. **資訊密度與圖示節奏不均**：衛教頁面圖文開闊具雜誌感，但設定與資料管理頁面無圖示錨點，視覺乾癟。
5. **品牌字體個性在工具頁消逝**：襯線標題（Noto Serif TC）在工具表單頁僅剩頂端 H1，其餘次標題被大量黑體淹沒。
6. **畫面出現突兀空白與垂直懸空**：部分頁面收合或條件渲染後，下方留下大面積真空，或獨立卡片內僅有一顆按鈕而缺乏內容平衡。
7. **文字段落間距扁平化（Flat Gap）**：卡片內連續多個 `<p>` 直屬 Grid 容器，導致段落與段落的距離跟段落與按鈕的距離完全等寬，違反鄰近律。

---

## 七大優化方向與具體落地對照

### 一、統一全站頁首與導覽出口機制（Navigation & Exit Consistency）

#### 1. 現存斷層
- **左上返回箭頭（`←`）**：出現在 [`SetupStepShell.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/components/setup/SetupStepShell.vue)、裝備分享頁。
- **右上關閉叉叉（`✕`）**：出現在 [`ReapplyPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/ReapplyPage.vue)、[`ReportContextEventPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/ReportContextEventPage.vue)、[`NotificationSettingsPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/settings/NotificationSettingsPage.vue)、[`GearFormPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/GearFormPage.vue)。
- **頁尾文字連結（「返回更多」／「返回常見問題」）**：出現在 [`SpecialSituationPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/SpecialSituationPage.vue)、[`HelpTopicPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/help/HelpTopicPage.vue)、[`AccountDataPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/settings/AccountDataPage.vue)。

#### 2. 收斂規則
| 頁面型態 | 定義與適用頁面 | 統一出口標準（一律使用共用元件） |
| :--- | :--- | :--- |
| **模態流程／暫態表單**<br>*(Modal / Action Flow)* | 記錄補擦 (`/reminder/reapply`)、記錄狀況 (`/reminder/report`)、新增／編輯裝備 (`/products/new`)、事件更正 (`/reminder/event/:id/correct`) | **右上角關閉叉叉（`✕`）**<br>使用標準 `.flow-heading` 容器搭配 `<IconButton icon="tool-close" label="返回提醒" />`，代表「放棄／關閉目前操作」。 |
| **層級深入／設定資訊頁**<br>*(Hierarchical Drill-down)* | 通知設定 (`/settings/notifications`)、本機資料 (`/settings/data`)、雲端帳號 (`/settings/account-data`)、特殊狀況 (`/special-situation`)、衛教文章 (`/education/articles/:slug`) | **左上角返回箭頭（`←`）**<br>使用標準 `.flow-heading` 容器搭配 `<IconButton icon="tool-arrow-left" label="返回上一頁" />`，代表「回到上一層目錄（如回到『更多』或衛教分類）」。**一律移除頁尾冗餘的「返回更多」文字連結**。 |

---

### 二、卡片容器與深淺表面語意明確化（Surfaces & Card Hierarchy）

#### 1. 現存斷層
- `DESIGN.md` 定義了 `canvas` (#FAF5EC)、`surface-soft` (#F7EDE1)、`surface-card` (#F0E2D1)、`surface-cream-strong` (#EFD0BC)、`surface-dark` (#2E2925)。
- 深色卡（Dark Surface）原本在首頁被移除，但在裝備分享頁又出現，使用範圍缺少系統化約束。

#### 2. 收斂規則
1. **深色表面（`surface-dark: #2E2925`）的唯一語意**：
   - 僅用於**「即時核心看板（如進行中的高對比倒數讀數）」**或**「裝備分享卡的主角卡片」**。
   - 一般常態設定、表單、清單頁面**禁止使用大面積深色卡**。
2. **淺色卡片雙層標準**：
   - 全站常規卡片統一採用共用類別 `.app-card`（`canvas` 地板 ＋ `surface-card` 或 `surface-soft` 卡片）。
   - 卡片圓角一律綁定 `var(--radius-lg)`（20px），內距一律使用 `var(--card-padding)`（20px 行動端 / 24px 桌面端），禁止在 scoped CSS 寫死固定 padding。

---

### 三、表單與選擇器控制項標準化（Controls & Input Polish）

#### 1. 現存斷層
- 通知設定頁（[`NotificationSettingsPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/settings/NotificationSettingsPage.vue#L204-L230)）目前使用瀏覽器原生 `<input type="radio">`。
- 其他頁面則混合使用 Pill 按鈕（時間選擇器）與大型 Choice Grid 方塊（情境選擇器）。

#### 2. 收斂規則
1. **徹底消滅原生 Radio**：
   - 將 `NotificationSettingsPage` 的「再次提醒頻率」改為**膠囊切換組（Segmented Pill Group）**，例如三格水平排列：`[只提醒一次] [每 5 分鐘] [每 15 分鐘]`。
2. **統一全站「已選取」樣式**：
   - 遵守 `assets/selectedOptionStyle.test.ts` 守門規範：選取狀態一律套用共用 `.option-selected` 類別（`--color-muted` 邊框 ＋ `--color-hairline` 淺底），嚴格禁止將行動主色（`--color-primary` 深杏桃）誤用為選取背景色。

---

### 四、資訊密度與圖示錨點平衡（Icon Rhythm & Density）

#### 1. 現存斷層
- 衛教分類頁與主題頁採用 40px `IconLead`，視覺豐富開闊。
- 「通知設定頁」與「本機資料與隱私頁」全站最乾癟，整頁為無圖示的純文字表格。

#### 2. 收斂規則
1. **為設定與資料管理頁面補上領銜圖示（使用 `IconLead`）**：
   - `NotificationSettingsPage` 頁首帶上 `<IconLead icon="feature-notification">`。
   - `DataSettingsPage` 的三大區塊分別配上 `<Icon name="feature-storage" />`、`<Icon name="tool-download" />`、`<Icon name="tool-delete" />` 視覺錨點。
2. **本機資料清單（Summary Grid）層次分組**：
   - 將「使用者紀錄（裝備數、進行中提醒、結束歷史）」與「技術狀態（草稿狀態、氣象快照、時鐘校對）」以微細分隔線（`--border-subtle`）或分組標籤區隔，提升易讀性。

---

### 五、品牌字體與溫度感融合（Typography & Tone）

#### 1. 現存斷層
- 工具與表單頁面（如 `GearFormPage`、`DataSettingsPage`）充斥密集無襯線黑體，襯線字（Noto Serif TC）僅出現在 H1，導致品牌專屬的「暖象牙文學感」在工具頁消失。

#### 2. 收斂規則
1. **區塊標題（Section Title）提升至襯線體**：
   - 如本機資料頁的 `h2`「這台裝置儲存了什麼」、裝備頁的 `h2`「我的防曬裝備」，採用 `Noto Serif TC` 20px（`--font-size-section-title`，字重 400 負字距），延續品牌溫度。
2. **輔助說明文字容器化**：
   - 避免散落的次要文字直接裸露在背景上，統一收進共用的 `.note-box` 提示盒，維持一致的視覺重量。

---

### 六、畫面異常空白與佈局懸空問題盤點（Weird Whitespaces & Layout Voids）

針對實機各頁面排版中出現的「空洞卡片」、「垂直高度塌陷」與「視覺斷層」進行全面清查與收斂：

#### 1. 通知設定頁：底部「裝置測試」卡片極度空洞
- **位置**：[`NotificationSettingsPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/settings/NotificationSettingsPage.vue#L236-L260)
- **現象**：單獨開闢一張 100% 寬度的 `.app-card`，裡面僅有 `<h2>裝置測試</h2>` 和一個靠左的按鈕 `<button class="button button--quiet">送出測試通知</button>`，卡片內約 75% 的面積完全是空白的，顯得突兀且浪費垂直空間。
- **優化方案**：將「送出測試通知」按鈕作為操作列（Action Row），整併進上方的「再次提醒頻率」或「通知傳送說明」卡片底部，不再單獨撐出一張空卡。

#### 2. 裝備詳情抽屜：標題與品類膠囊之間的「橫線夾心空白」
- **位置**：[`GearDetailSheet.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/components/product/GearDetailSheet.vue#L175-L184)
- **現象**：`BottomSheet` 的 Header 自帶底邊框（`border-bottom`），而抽屜 Body 的第一行是 `.gear-detail__caption`（品類與狀態膠囊「防曬乳・僅供紀錄」）。導致「裝備名稱（在 Header）」與「品類膠囊（在 Body）」被一條橫線隔開，且上下空了近 30px 的空白斷層，視覺讀起來不像同一件裝備的標題與副標。
- **優化方案**：將品類與狀態膠囊移入 `BottomSheet` 的 Header 內（或將 Body 頂部間距收斂），消除橫線兩側多餘的留白。

#### 3. 地區設定頁：手動收合後的「下半部巨大真空」
- **位置**：[`RegionPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/RegionPage.vue#L80-L104)
- **現象**：當手動行政區選單預設收合時，頁面內容在 y ≈ 420px 就全部結束，下方僅留兩行文字連結，在標準手機螢幕（844px）上下方留下了約 400px（近半個螢幕）的完全懸空象牙色空白，缺乏視覺重心。
- **優化方案**：在下方加入柔和的 `.note-box` 說明卡片（例如「為什麼需要地區設定？僅用於比對氣象署紫外線資料」），或優化「手動選擇地區」與「目前位置」的卡片排版比重，讓下半部佈局保持平衡。

#### 4. 首頁無 Session / 夜間狀態時的「垂直高度塌陷」
- **位置**：[`HomeNightNotice.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/components/home/HomeNightNotice.vue) 與 [`HomePage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/HomePage.vue)
- **現象**：夜間或沒有進行中提醒時，頁面僅有頂部 Header 與中央月亮圖示兩行文字，整頁在不到 250px 高度內嘎然而止，直到底部 Tab 之間有大片無內容空白，容易讓使用者誤以為 App 載入失敗或白屏。
- **優化方案**：夜間空狀態可適度加入「明日紫外線預報提示卡」或「防曬衛教精選推薦」，維持首頁豐富度與生活感。

#### 5. 裝備分享卡：底部安全免責與勾選框的脫節空白
- **位置**：裝備分享卡頁面
- **現象**：分享卡內的免責小字（*「這是協助記得補擦的紀錄…」*）與最下方的 `[ ] 在卡片上顯示價格` 勾選框之間缺乏實體邊界，視覺焦點散落。
- **優化方案**：將分享卡加上獨立的外框卡片容器（帶 `1px hairline` 與 `radius-sheet` 圓角），讓免責小字貼齊小卡頁尾，下方的勾選控制項則獨立於卡片外部。

---

### 七、文字段落與行距異常空白盤點（Typography & Paragraph Spacing Anomalies）

針對各頁面中「多段文字彼此疏離」、「標題與說明文字間距過大」或「文字排版行距突兀」進行清查與收斂：

#### 1. 卡片內多個段落直屬 Grid 導致文字彼此過度疏離（Flat Grid Gap）
- **位置**：[`DataSettingsPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/settings/DataSettingsPage.vue#L199-L205) 與 [`ContentUnderReview.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/components/help/ContentUnderReview.vue#L21-L26)
- **現象**：`.app-card` 使用 `display: grid; gap: var(--space-4)`（16px）。卡片內的說明段落 `<p>` 與警語 `<p class="caution">` 直接作為 Grid 項目排列，導致「段落與段落的距離（16px）」和「段落與下方按鈕的距離（16px）」完全相同。多個段落之間看起來像互不相干的獨立句子，無法聚合成一個閱讀群組。
- **優化方案**：將關聯的多段文字包裹於專屬文字區塊中，段落間距收緊至 `var(--space-2)`（8px），與下方按鈕維持 `var(--space-4)`（16px），落實視覺鄰近律（Proximity）。

#### 2. 審查狀態卡片中文字層級與行距扁平
- **位置**：[`ContentUnderReview.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/components/help/ContentUnderReview.vue#L48-L56)
- **現象**：卡片內 `body`（主說明）、`requiredReview`（審查要求）與 `under-review__note`（*這不影響提醒功能*）三段文字字級全為 16px，且每段之間都有 12px 均等間距，導致頁面看起來像一堆未分組的零散文字。
- **優化方案**：將次要的 `meta` 與 `note` 改為 14px 輔助文字（`--font-size-supporting`），並在下方緊湊排列（間距 4px），主說明文與次要資訊之間留出 12px 間隔。

#### 3. 衛教長文中引用區塊（Blockquote）前後間距疊加過大
- **位置**：[`EducationArticlePage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/education/EducationArticlePage.vue#L253-L258)
- **現象**：內文段落原本已有 `--prose-paragraph-gap`（約 16px 下邊距），而 `blockquote` 又宣告了 `margin: var(--space-5) 0`（上下各 20px）。兩者疊加後，引用區塊前後出現了高達 36px 的斷層空隙，嚴重打斷長文閱讀節奏。
- **優化方案**：改用 `margin-block: var(--space-4)` 配合邊距折疊，確保引用區塊前後的視覺呼吸感與普通段落保持一致。

#### 4. 警示提示盒（Notice Box）圖示與標題首行的垂直基線微偏
- **位置**：[`ProductEligibilityNotice.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/components/setup/ProductEligibilityNotice.vue#L78-L96)
- **現象**：左側 20px 圖示在 Grid 中預設置頂，而右側 `<strong>` 標題因字型內部自帶內白與 1.4 行高，使得圖示中心比標題文字重心略高出約 2~3px，圖文在手機上看起來沒有對齊。
- **優化方案**：左側圖示加上 `margin-top: 1px` 或使用微調，使圖示幾何中心精準對齊標題第一行的英數/漢字基線。

---

## 執行優先順序推薦（Implementation Roadmap）

| 優先序 | 任務項目 | 預期成效 | 涉及檔案 |
| :---: | :--- | :--- | :--- |
| **P0** | **統一二級頁面出口**：<br>1. 設定類/資料類改為左上 `<IconButton icon="tool-arrow-left">`<br>2. 移除各頁底部的「返回更多」文字連結 | 解決使用者在二級頁面找不到一致返回路徑的困擾。 | `NotificationSettingsPage.vue`<br>`DataSettingsPage.vue`<br>`AccountDataPage.vue`<br>`SpecialSituationPage.vue`<br>`HelpTopicPage.vue` |
| **P1** | **收斂段落間距與空洞卡片**：<br>1. 將卡片內連續 `<p>` 聚合成緊密文字群組（8px 間距）<br>2. 合併「裝置測試」空卡至上方頻率設定<br>3. 收斂 `GearDetailSheet` 標題與膠囊夾心斷層 | 消除多餘空卡與散落段落，讓文字閱讀符合鄰近律。 | `DataSettingsPage.vue`<br>`NotificationSettingsPage.vue`<br>`ContentUnderReview.vue`<br>`GearDetailSheet.vue` |
| **P2** | **控制項現代化**：<br>將 `NotificationSettingsPage` 的原生 Radio 替換為膠囊切換組（Segmented Pill） | 消除全站唯一的原生表單破綻，讓 PWA 視覺完整統一。 | `NotificationSettingsPage.vue`<br>`app.css` |
| **P3** | **設定頁圖示與標題提升**：<br>1. 為通知與資料設定頁補上 `IconLead` 視覺錨點<br>2. 區塊標題套用襯線體 | 讓冷硬的系統設定頁面融入品牌的溫暖質感。 | `NotificationSettingsPage.vue`<br>`DataSettingsPage.vue` |
| **P4** | **分享小卡與長文排版細節落地**：<br>1. 為分享卡補上獨立外框與日期印記<br>2. 收斂 `EducationArticlePage` 引用區塊間距 | 提升社群分享質感與衛教文章流暢閱讀體驗。 | 裝備分享元件<br>`EducationArticlePage.vue` |

---

## 給執行 AI 的守門與驗證提醒

1. **嚴禁自行造輪子**：所有按鈕、圖示、提示盒一律引用 `IconButton`、`IconLead`、`AppNotice`、`Icon` 等共用元件。
2. **CSS Token 紀律**：禁止在 scoped `<style>` 中寫死 px 顏色、圓角或間距，一律引用 `var(--*)`。
3. **無障礙對比度（WCAG AA）**：修改底色與文字搭配時，確保文字對比度高於 4.5:1（大字 3:1）。
4. **自動化檢驗**：修改完畢後執行 `pnpm check`，確保全 Workspace 測試與 stylelint 100% 通過。（原文寫「132 個測試檔案」是稽核當下的數字，會一直變，不要當驗收標準。）

---

## 檢視結果與待辦（2026-09-02，接手 AI 逐項對照程式碼與既有裁決後）

這份稽核**觀察大多準確**，但有幾個「解法」與近期的刻意決策衝突，另有兩處前提是錯的。以下是逐項處置狀態。

### ✅ 已採用並實作（PR #100，commit `5930da2`）

| 稽核項 | 實作 |
| --- | --- |
| §7.1 段落 Flat Gap | `DataSettingsPage`「匯出本機資料」卡：兩段說明包進 `.card-prose`（段落間 `--space-2`，與按鈕維持 `--space-4`） |
| §7.2 審查卡文字層級 | `ContentUnderReview`：`__meta`＋`__note` 收成 `.under-review__aside` 群組、降 `--font-size-supporting`、以 `--space-1` 貼緊 |
| §7.3 blockquote 間距 | `EducationArticlePage`：`margin: var(--space-5) 0` → `margin-block: var(--space-4)`。**修正稽核前提**：相鄰 `<p>`/`blockquote` 在一般流裡邊距會折疊，不是「疊加 36px」 |
| §6.1 「裝置測試」空卡 | `NotificationSettingsPage`：移除獨立空卡，「送出測試通知」併進「通知傳送說明」卡頁尾當操作列（`v-if="isGranted"`）；守門測試與 sitemap §通知設定頁 分區敘述同步 |

### ❌ 不採用（與既有裁決衝突，或前提有誤）

| 稽核項 | 不採用理由 |
| --- | --- |
| **§1 / P0 統一二級頁面出口** | 觀察正確（四種出口方式並存），但「設定頁一律左上箭頭＋刪頁尾連結」的**解法是設計方向題，不是 bug 修正**。與 `NotificationSettingsPage` 2026-08-24「改成右上叉叉跟其他頁一致」的註解衝突；`2026-08-30-pending-decisions §2／§12.2` 顯示 `/setup` 的箭頭要左上還是右上**使用者當時正在裁決、尚未定案**。頁尾「返回更多」照 `2026-08-27-copy-a11y-test-dead-code-audit.md` 的既有結論應抽成 `BackToMoreLink` 元件，而不是全刪。**待使用者定一條規則**再一次套。 |
| **§5 / P3 區塊標題改襯線** | **前提錯**：`section-title` 角色本來就是襯線（`--font-family-section-title: var(--font-serif)`，20px）。設定頁 `<h2>` 用的是 `card-title`，B8 規格（`2026-08-27-b8-role-based-typography-design.md`）**刻意**讓它是黑體。要更多襯線＝改 B8 規格與 `typographyRoles.test.ts` 守門，是規格修訂不是微調；另 `--font-weight-section-title: 500` 對只有 400 的 Noto Serif TC 會觸發假粗糊字（見 `2026-08-30-pending-decisions:440`），連帶要處理。 |
| **§6.2 GearDetailSheet 膠囊夾心** | 團隊已辨識同一張力並選了**另一種解法**（`GearDetailSheet.vue:162-174` 註解：改用和 `GearListItem` 一致的「說明文字＋膠囊」語彙，而非移進 header）。是否再改成「移進 header」需要截圖佐證「30px 斷層」確實還在，光看程式碼無法確認。 |
| **§6.3 RegionPage 下半部真空** | `2026-08-23-hifi-redesign-round2-closeout.md:74` 明寫「RegionPage 核對後不需要改」。折疊區下方的空白不是壞掉，硬塞說明卡是為填空而填空。 |
| **§6.4 首頁夜間加內容卡** | **直接推翻 `2026-08-26-night-session-layout-revert.md`**——那是使用者第三度翻案，刻意選「收工版面／極簡／不讓倒數跨夜」。夜間畫面短是設計意圖，不是塌陷。要加內容＝再翻一次案，需使用者明確點頭。 |

### ⏳ 待實作（方向可行，但要調整；未動工）

| 稽核項 | 前置條件／調整 |
| --- | --- |
| **§1 導覽出口** | 待使用者定「模態流程＝右上叉叉／階層下鑽＝左上箭頭」這類規則，再一次套到所有二級頁；頁尾連結抽 `BackToMoreLink`。 |
| **§3 / P2 原生 Radio → 膠囊組** | `NotificationSettingsPage` 的「再次提醒頻率」是全站唯一原生 radio。原生 radio group **無障礙上完全合格**，這是視覺一致性而非破綻。可做，屬 polish，優先序建議降為 P3。做的話用既有 `.choice-grid` + `.option-selected`，不可自刻選取色。 |
| **§4 / P3 設定頁圖示錨點** | `DataSettingsPage` 三大區塊配 `<Icon>` 可做；頁首 `IconLead` 要先確認不破壞 `.flow-heading`（右上叉叉版型盤點 §17 剛收斂過）的 grid 兩欄——先出一版截圖再定。 |
| **§2 深色表面語意** | 主要是 `DESIGN.md §10` 的文件缺口（`--surface-inverse` 引用 0 次，早記為待處理），不是程式碼 bug。落點是 `DESIGN.md` 補一條「深色表面只用於：即時核心看板／分享卡主角卡」，程式碼幾乎不動。 |
| **§7.4 ProductEligibilityNotice 圖示基線** | 2~3px 光學偏移可能存在，但稿子建議的 `margin-top: 1px` 是寫死魔術數字。要做的話先截圖確認偏移量，改用 `align-items` 或既有間距 token，不塞 `1px`。 |

**回寫落點**：`docs/decisions/README.md` 的「裁決 → 回寫落點」表已補一列指向本節。
