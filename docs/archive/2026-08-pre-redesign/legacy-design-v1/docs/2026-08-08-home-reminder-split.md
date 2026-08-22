# 首頁與提醒頁分工收斂

**日期**：2026-08-08
**狀態**：已實作

## 問題

`2026-08-08-userflow-critique.md` 問題 2：兩頁重複。首頁與提醒頁都有補擦倒數、回報狀況 CTA、各部位狀態、提醒控制。使用者建立不了「什麼時候該去哪一頁」的心智模型，而且吃掉一格底部導覽。

程式碼層面的重複更明確：`homeReminderClockPresentation.ts` 與 `reminderPresentation.ts` 是兩套各自手寫文案的呈現層，`HomeReminderSummary.vue` 兩套都 import。這已經造成過一次實際 bug——同一時刻兩頁顯示互相矛盾的狀態文字（見 commit `bff40b1`）。

## 決策

**首頁＝主要入口，提醒頁＝完整狀態。**

- 首頁：保留倒數主卡與主要 CTA，**移除各部位狀態**，新增「查看完整狀態」入口
- 提醒頁：倒數環降為一行摘要，保留各部位狀態、最近事件、更正入口、結束控制

## 為什麼不是反過來

檢討文件當時建議「首頁答『現在外面怎樣』、提醒頁答『操作台』」。**那個方向是錯的**，撰寫時沒有讀到 `P0_SCREEN_INVENTORY.md` S-01 的資訊順序註記：

> 2026-08-05 依實作更新。原順序把 UVI 資料放在提醒之前，實際實作反過來：使用者開 App 的目的是「還有多久要補擦」，不是查 UV，所以補擦提醒是 `<h1>`、排在最前面，UV 資訊退為次級（commit `d53fa3b`、`d81e066`）。

也就是說「首頁以天氣為主」這個版本**已經做過並被推翻一次**。S-01 的主要 CTA 規格也明寫「另提供次要入口前往 S-07 查看完整狀態」——規格本來就是首頁主、提醒頁詳。

把倒數環從首頁拿掉等於重蹈 08-05 已經否決的設計。

## 規格影響

各部位狀態原本是 S-01 資訊順序的第 2 項，本次移除，`P0_SCREEN_INVENTORY.md` 已同步更新。

範圍資訊不會遺失：倒數標題本身就帶了範圍——`接下來需要補擦：額頭`（priority）／`接下來需要全面補擦`（all），見 `homeReminderClockPresentation.ts` 的 `PRIORITY_LEAD_BY_TONE` 與 `ALL_TITLE_BY_TONE`。

## 實作註記

- `CountdownSunTime.vue` 是共用元件，同時被首頁的 `HomeReminderSummary.vue` 與提醒頁的 `ReminderPanel.vue` 使用。本次**沒有改動該元件**，只讓 `ReminderPanel` 不再渲染它，首頁的環維持原樣。
- `ReminderPanel` 只被提醒頁使用（經 `PrimaryReminderPanel`），所以直接改不需要加 prop。
- 連帶移除 `PrimaryReminderPanel` 裡只服務環的 `countdownProgress` 計算。

## 尚未處理

兩套呈現層仍然並存。合併屬重構，且重新設計 wireframe 會大幅改寫這兩頁，現在做會白費——留待重畫時一併處理。這一點在檢討文件問題 0 已記錄。
