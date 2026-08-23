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

| 優先序 | 內容 | 檔案 | commit |
| --- | --- | --- | --- |
| 1 | `/reminder` 補平面線性進度條＋嵌入 `FiveDayUvCard` | `ReminderPanel.vue`、`reminderPresentation.ts`、`ReminderPage.vue` | `2ff3497` |
| 2 | 裝備清單卡片視覺對齊（品類圖示＋一行摘要，保留使用中／收納中分區） | `GearListItem.vue` | `11faee9` |
| 3 | 設定流程步驟指示器改線性進度條 | `SetupStepShell.vue` | `1e90fe6` |
| 4 | 通知設定頁重排＋「如何開啟」展開說明 | `NotificationSettingsPage.vue` | `1241f7e` |

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

| 路由 | 元件 | 功能狀態 |
| --- | --- | --- |
| `/reminder/report` | `ReportContextEventPage.vue` | 完整：選擇狀況（大量流汗／擦毛巾／明顯摩擦／洗手／游泳下水）→ 影響部位 →（水上活動另問入水時間確信度）→ 實際時間 → 確認，`createContextEventController.ts` 已接好 |
| `/reminder/event/:id/correct` | `EventCorrectionPage.vue` | 完整：S-10 更正最近事件，原事件不改寫、送出 replace／void 後繼事件，`createEventCorrectionController.ts` 已接好 |
| `/region` | `RegionPage.vue` | 完整：定位／手動選地區／略過，`RegionLocationPanel`、`RegionManualSelector`、`RegionPreferenceSummary` 都已接好 |

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

## 五、已知遺留問題（非本輪範圍，已開背景任務）

`FiveDayUvCard.vue` 在沒設定地區時顯示的「設定地區」連結是無效的
`#outdoor-context` 頁內錨點，不是導向 `/region` 的連結。這是既有問題，
這輪把卡片嵌入 `/reminder` 後同一個壞連結出現在兩處，更容易被注意到。
已透過背景任務追蹤（非 session 內完成）。

---

**這輪高保真重新設計到此告一段落。** 下一輪如果使用者帶新的高保真圖
或想處理優先序 6 的三個頁面，直接從這份文件與
`2026-08-23-hifi-redesign-handoff.md` 接手即可，兩份文件不衝突。
