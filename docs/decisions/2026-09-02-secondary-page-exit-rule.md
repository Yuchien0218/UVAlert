# 二級頁面的返回出口規則

**日期**：2026-09-02
**裁決者**：使用者
**狀態**：已套用

## 規則

右上角圖示鈕的圖示，依「這一頁是什麼」決定，不依「它在哪個資料夾」：

| 頁面性質 | 圖示 | 意思 |
| --- | --- | --- |
| **可放棄的流程／模態** | `tool-close`（叉叉） | 「不做了，離開這段流程」 |
| **階層下鑽** | `tool-arrow-left`（箭頭） | 「回到上一層」 |

判準是**離開時使用者會不會覺得有東西沒完成**。叉叉帶著「放棄」的語氣，箭頭只是「往回走」。

## 為什麼是這條規則

`2026-09-02-ui-layout-consistency-audit.md` §1 把現況描述成「四種出口方式並存」，並提議「設定類一律左上箭頭＋刪頁尾連結」。實際盤點之後，情況比那樂觀得多——這條規則**已經被遵守九成**：

| 圖示 | 頁面 |
| --- | --- |
| 叉叉 | `ReapplyPage`、`ReportContextEventPage`、`EventCorrectionPage`、`GearFormPage`、`BottomSheet`、`SessionEndControl` |
| 箭頭 | `EducationCategoryPage`、`EducationArticlePage`、`GearSharePage`、`SetupStepShell` |

叉叉那一列全是「做到一半可以放棄」的東西，箭頭那一列全是「從某處點進來的一層」。唯一站錯邊的是 `NotificationSettingsPage`：它是從「更多」下鑽進來的一頁設定，卻用叉叉。

所以這不是一道空白的設計題，而是**一頁用錯了族群**。裁決是採用這條既有規則，並只改那一頁。

## 為什麼不採用稽核原本的提案

稽核 §1 的 P0 是「設定／資料類一律**左上**箭頭，並刪掉頁尾的『返回更多』文字連結」。三個理由都不採用：

1. **左上／右上仍未定案**。`2026-08-30-pending-decisions §2／§12.2` 顯示 `/setup` 的箭頭要左上還是右上使用者當時正在裁決。現行版型是 `.flow-heading`（標題左、圖示右），2026-08-31 才為了「右上角叉叉跑版」收斂過一次。這次只換圖示，位置不動。
2. **刪頁尾連結與既有結論衝突**。`2026-08-27-copy-a11y-test-dead-code-audit.md` 的結論是抽成 `BackToMoreLink` 元件，不是全刪；該元件已於 2026-09-02（#104）建立並收斂 6 個使用點。
3. **頁尾連結與右上圖示鈕是兩個不同的軸**。這次只定圖示族群，不動「哪些頁面該有頂端出口」。

## 已知仍不一致的地方（刻意留著）

三個設定頁的**出口形式**仍不一致：

| 頁面 | 頂端圖示鈕 | 頁尾連結 |
| --- | --- | --- |
| `NotificationSettingsPage` | 箭頭 | 無 |
| `DataSettingsPage` | 無 | 有 |
| `AccountDataPage` | 無 | 有 |

這是另一個問題（「哪些頁面該有頂端出口」），不在本次裁決範圍。本次只保證：**有頂端圖示鈕的頁面，圖示選對族群。**

## 回寫落點

| 檔案 | 內容 |
| --- | --- |
| `apps/web/src/pages/settings/NotificationSettingsPage.vue` | `tool-close` → `tool-arrow-left`，並更新 2026-08-24 那段已過期的註解 |
| `apps/web/src/pages/pageExitIcons.test.ts` | 守門：叉叉／箭頭兩份名單，新頁面要選邊 |
