# 高保真重新設計第二輪收尾紀錄

**日期**：2026-08-23（Asia/Taipei）
**用途**：延續 `2026-08-23-hifi-redesign-handoff.md` 交接紀錄，記錄第四節
三個待問問題的最終裁決、實作結果，以及這輪高保真重新設計的收尾狀態。
**背景**：兩個併行 session 分工完成交接文件列出的優先序 1–4，並各自
確認過沒有互相衝突的檔案改動。

---

## 一、交接文件第四節三個問題的最終裁決

1. **裝備清單「新增裝備」vs「新增防曬裝備」**：採用**新增防曬裝備**
   （保留現況）。理由：符合 `2026-08-17-copy-audit.md`「防曬乳與其他
   配件統稱『防曬裝備』」的規則，且是上一輪才剛改過的用詞。
2. **通知設定被拒絕狀態的「如何開啟」按鈕**：點擊**原地展開步驟說明**
   （不連到 `/help`、不嘗試直接開啟瀏覽器設定——網頁做不到後者）。
   已實作於 `apps/web/src/pages/settings/NotificationSettingsPage.vue`。
3. **設定流程步驟指示器要不要換成線性進度條**：**換成線性進度條**＋
   「步驟 X/2」文字。已實作於
   `apps/web/src/components/setup/SetupStepShell.vue`，順手拿掉一個
   死節點（原本 `maxStep` 預設值會多畫出連到已不存在的 `/setup/review`
   的第三步）。

## 二、額外浮現、當場問過使用者的問題

### 裝備卡片圖示要不要放進方形色塊（icon-avatar）

交接文件原文寫「圖示放在方形色塊裡（icon-avatar）」，但
`uvalert-design-system/`（2026-08-23 同步的 Claude Design 元件庫下游
產物）裡的 `GearListItem.jsx` 實際上是裸圖示、無色塊背景——文件描述
落後於元件庫。**裁決：採元件庫版本（裸圖示，不加色塊）**，已實作於
`apps/web/src/components/product/GearListItem.vue`。

## 三、優先序 1–4 實作結果與 commit

| 優先序 | 內容                                                               | 檔案                                                               | commit    |
| ------ | ------------------------------------------------------------------ | ------------------------------------------------------------------ | --------- |
| 1      | `/reminder` 補平面線性進度條＋嵌入 `FiveDayUvCard`                 | `ReminderPanel.vue`、`reminderPresentation.ts`、`ReminderPage.vue` | `2ff3497` |
| 2      | 裝備清單卡片視覺對齊（品類圖示＋一行摘要，保留使用中／收納中分區） | `GearListItem.vue`                                                 | `11faee9` |
| 3      | 設定流程步驟指示器改線性進度條                                     | `SetupStepShell.vue`                                               | `1e90fe6` |
| 4      | 通知設定頁重排＋「如何開啟」展開說明                               | `NotificationSettingsPage.vue`                                     | `1241f7e` |

另有兩個小修正由另一個併行 session 完成：`SetupProcessBanner.vue`
顏色語意修正（`238b39f`）、`BrandHeader.vue` 放大 Logo／移除文字
（`abc16ac`）。

## 四、優先序 5、6 的處置

- **優先序 5**（`ForecastPage`、`ReapplyPage`、`MorePage`、
  `GearForm`／`GearFormSheet`、`SetupTimingPage` 步驟 2、
  `ProductDetailPage`）：已跟使用者確認 Claude Design canvas 裡**沒有
  新畫面**，這輪不動，維持現狀。
- **優先序 6**（原以為是 `/reminder/report`、`/reminder/event/:id/correct`、
  `/region` 三個「完全沒做」的頁面）：使用者當時確認「這輪不做」，但
  這個前提本身是錯的——三個頁面其實都已經做完，見下方更正。

### 更正：三個「完全沒做」的頁面其實都做完了

2026-08-23 稍晚核對程式碼時發現，`交接文件` 與本文件原本說
`/reminder/report`、`/reminder/event/:id/correct`、`/region`
「完全沒做」是**舊資訊，且三個都錯**。用 `Grep apps/web/src/router/
index.ts` 核對後，三條路由全部存在且指向功能完整的頁面：

| 路由                          | 元件                         | 功能狀態                                                                                                                                                          |
| ----------------------------- | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/reminder/report`            | `ReportContextEventPage.vue` | 完整：選擇狀況（大量流汗／擦毛巾／明顯摩擦／洗手／游泳下水）→ 影響部位 →（水上活動另問入水時間確信度）→ 實際時間 → 確認，`createContextEventController.ts` 已接好 |
| `/reminder/event/:id/correct` | `EventCorrectionPage.vue`    | 完整：S-10 更正最近事件，原事件不改寫、送出 replace／void 後繼事件，`createEventCorrectionController.ts` 已接好                                                   |
| `/region`                     | `RegionPage.vue`             | 完整：定位／手動選地區／略過，`RegionLocationPanel`、`RegionManualSelector`、`RegionPreferenceSummary` 都已接好                                                   |

`ReportContextEventPage.vue`（commit `638c34c`）與 `EventCorrectionPage.vue`
（commit `e85a914`）都已補上視覺對齊：桌面限制最大寬度並置中、成功
卡片加上色條、送出動作旁補上「取消」，比照 `ReapplyPage.vue` 的既有
樣式。`RegionPage.vue` 核對後不需要改——已用標準 `page-heading` 樣式，
定位／地區圖示仍是 Lucide 是 DESIGN.md 第十三節記載的刻意延後項目。
三個頁面**功能都不缺，不是要從零設計的新頁面**，這輪視覺對齊也已
全部完成。

**教訓**：這個「完全沒做」的清單被至少兩份文件（交接文件、本文件第一版）
原樣沿用，沒人在動手前用 `Grep` 核對路由表。下一輪如果看到任何文件說
某個頁面「沒做」，先查路由表和對應元件檔案是否存在，不要直接信文件。

## 七、第四輪：`防曬補擦流程設計/` 新稿子對齊（2026-08-24）

使用者提供第三份 Claude Design 匯出（`防曬補擦流程設計/UVAlert
Screens.dc.html`，10 個畫面），涵蓋原本沒有稿子的
`ForecastPage`／`ReapplyPage`／`MorePage`／`GearForm`／
`SetupTimingPage` 步驟 2／`ProductDetailPage`，也重新畫了已完成的
`/reminder`、通知設定、裝備卡片、設定步驟指示器供核對。**這批稿子的
字型是霞鶩文楷 TC，已被 DESIGN.md 的最終裁決推翻（改回 Noto Serif TC
單獨使用），實作時忽略字型設定，只採版面與元件結構。**

發現並處理的落差：

- **設定流程步驟指示器要重做**：稿子畫的是分段線條（每步一段，完成
  與否由該段填滿與否表示），不是上一輪做的連續進度條。已改成分段版
  （commit `11908d8`）。
- **`ProductDetailPage` 稿子編造資料**：畫了「依情境的補擦間隔：
  120／80／60 分」，但一瓶防曬乳在資料模型裡只有一個
  `reapplicationIntervalMinutes`，不會依情境變出三個數字。不採用這
  部分。
- **`ForecastPage` 稿子編造資料**：畫了逐時 UV 長條圖與「今日最高
  UVI」卡片，但 `FiveDayUvForecast` 沒有逐時欄位。不採用；既有頁面
  結構本來就與稿子其餘部分一致，未改動。
- **`MorePage`、`GearForm` 視覺對齊**：入口卡改成 DESIGN.md 的
  `more-entry-card`（杏桃奶油底、無邊框）；`GearForm` 品類選擇器改
  3 欄圖示格子，順手修掉一個既有 bug（`choice-grid` 樣式只定義在
  `ProductSnapshotEditor.vue` 的 scoped style 裡，品類選項原本完全
  沒套到樣式）。已完成，commit `a68f077`。
- **`/reminder` 稿子與現行裁決衝突**：稿子的按鈕文字是「我剛補擦了」，
  跟已稽核的 `copy-audit.md`「記錄補擦」矛盾；稿子上的深色圓環
  `CountdownPanel` 用法經使用者截圖核對後，實際渲染跟現行平面版本
  一致，不是我原本以為的深色面板差異。**裁決：維持「記錄補擦」不改，
  `/reminder` 不需要照這批稿子調整**。
- **`ReapplyPage`、`SetupTimingPage` 步驟 2**：稿子本身標註為「提案」
  （上游未定義），現有實作已有更完整的流程（部位×裝備配對、水上
  活動確信度等），這輪未逐項比對是否需要改動。

過程中額外發現 `--border-strong` 這個 CSS 變數從未在
`packages/ui/src/styles.css` 定義過，多處元件（`GearListItem.vue`、
`GearForm.vue`、`ReportContextEventPage.vue`、`EventCorrectionPage.vue`）
都在用，落回瀏覽器預設 `currentColor`。已開背景任務修正。

## 五、已知遺留問題（非本輪範圍，已開背景任務）

`FiveDayUvCard.vue` 在沒設定地區時顯示的「設定地區」連結是無效的
`#outdoor-context` 頁內錨點，不是導向 `/region` 的連結。這是既有問題，
這輪把卡片嵌入 `/reminder` 後同一個壞連結出現在兩處，更容易被注意到。
已透過背景任務追蹤（非 session 內完成）。

## 六、第三輪：通知「再次提醒頻率」＋「裝置測試」（2026-08-24）

交接文件第三節列的下一輪項目，依賴 `NotificationController` 排程邏輯
重構——這輪已完成，commit `3f969bc`：

- `ScheduledNotification` 新增 `repeatMinutes`；`BrowserNotifications`
  顯示後若有設定會依頻率重新武裝，同一 id 的下一次 `schedule()`（到期
  時間被重算）自然砍掉整條重複鏈。
- 新增 `UserPreferencesPort`／`LocalUserPreferencesRepository`，接上
  `UserPreferencesV1.reminderFrequencyMinutes`——這個欄位早就在
  `packages/contracts` 裡定義好了，只是從沒有任何程式碼讀寫過。跟
  `LocalSyncRepository` 共用同一個 `AppMetadata` key，本機優先，不需要
  雲端同步也能用。
- `NotificationSettingsPage` 已授權狀態新增「再次提醒頻率」（只提醒
  一次／每 5／15 分鐘再提醒一次）與「裝置測試」兩區塊，文案明講重複
  提醒受同一個「只在分頁存活時有效」的平台限制，不是新的送達保證。

`pnpm check` 全綠（typecheck + 481 個測試）。因為 headless 測試環境無法
把通知權限切成 granted，已授權狀態的畫面靠單元測試涵蓋（radio 互動、
測試按鈕點擊），沒有額外做瀏覽器目視驗證。

---

**這輪高保真重新設計到此告一段落。** 下一輪如果使用者帶新的高保真圖
或想處理優先序 6 的三個頁面，直接從這份文件與
`2026-08-23-hifi-redesign-handoff.md` 接手即可，兩份文件不衝突。
