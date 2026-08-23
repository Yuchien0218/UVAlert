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
- **優先序 6**（`/reminder/report`、`/reminder/event/:id/correct`、
  `/region` 三個完全沒做的頁面）：已跟使用者確認**這輪不做**。

## 五、已知遺留問題（非本輪範圍，已開背景任務）

`FiveDayUvCard.vue` 在沒設定地區時顯示的「設定地區」連結是無效的
`#outdoor-context` 頁內錨點，不是導向 `/region` 的連結。這是既有問題，
這輪把卡片嵌入 `/reminder` 後同一個壞連結出現在兩處，更容易被注意到。
已透過背景任務追蹤（非 session 內完成）。

---

**這輪高保真重新設計到此告一段落。** 下一輪如果使用者帶新的高保真圖
或想處理優先序 6 的三個頁面，直接從這份文件與
`2026-08-23-hifi-redesign-handoff.md` 接手即可，兩份文件不衝突。
