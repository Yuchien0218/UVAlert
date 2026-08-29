# 文案、無障礙、測試耦合與死碼稽核（2026-08-27）

範圍：`F1`–`F4`、`G2`–`G3`。本輪只集中真正需要跨檔同步的文案；不為假設性的 i18n 把所有繁中文字串搬離元件。

## F1：使用者可見文案集中度

### 值得開子項目的重複

| 文案／模式     | 證據                                                                                                                                   | 裁決                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| 「返回更多」   | 8 個 `.vue` 使用（7 個可見連結、1 個 icon button 的 `aria-label`）                                                                     | 建議後續抽 `BackToMoreLink`，統一 `to="/more"`、可見文字／accessible name 與 `text-link--muted`；這是目前唯一明確「改一次需要 grep 全站」的導覽文案。 |
| 「取消」       | 通用二次確認已由 `ConfirmAction.cancelLabel` 集中；表單／dialog 的取消是各元件互動契約                                                 | 不建立全域 copy 常數。相同字面值不代表同一個元件責任。                                                                                                |
| loading 文案   | `BroadcastLoader` 有預設「載入中」（本稽核當時名稱為 `SunLoader`），頁面另有「正在讀取裝備清單／目前提醒狀態／本機資料概況」等具體名稱 | 保留就近、具情境的 label；只統一呈現元件，不把不同 accessible name 壓成模糊的「載入中」。                                                             |
| 寫入／讀取失敗 | 多處共享「輸入仍保留／資料維持原狀／可以再試一次」結構，但每個操作的資料安全後果不同                                                   | 不抽單一錯誤字串。將「發生什麼、資料是否改變、下一步」列為 copy checklist，比共用常數更安全。                                                         |

### 文案 checklist

- 新增跨頁返回入口時，先評估使用 `BackToMoreLink` 子項，而不是複製 markup。
- 非同步狀態必須說明正在讀取的資料，並作為 `BroadcastLoader` 的 accessible name。
- 錯誤訊息依序回答：操作是否完成、使用者資料是否保留、可採取什麼下一步。
- 只有完全相同的產品概念與修改生命週期才集中；單純字面相同不構成抽取理由。

## F2：無障礙一致性

掃描結果：`role="status"` 23 處、`role="alert"` 39 處、`role="note"` 3 處。兩套 modal overlay（`BottomSheet`、`SessionEndControl`）皆使用 `useOverlay`；未找到其他 dialog、正 tabindex、或以非互動元素模擬按鈕的實作。

### Findings

| 嚴重度 | 位置                                                                                                             | 現況                                                                                      | 建議                                                                                      | 原因                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| MEDIUM | `components/shell/AppShell.vue`                                                                                  | 初次載入時，頁首內容位於 `<main>` 前，但沒有 skip link；只有路由切換後才程式化 focus main | 在 AppShell 的第一個可聚焦位置加入「跳到主要內容」，指向 main；保留路由切換 focus         | 鍵盤使用者初次載入仍需穿越重複頁首內容。                                       |
| LOW    | `pages/InstallPage.vue`、`pages/settings/NotificationSettingsPage.vue`、`components/help/ContentUnderReview.vue` | 對頁面初次渲染即存在的靜態狀態使用 `role="status"`；通知 denied 初始卡使用 `role="alert"` | 靜態資訊移除 live-region role；只讓使用者操作後新增或更新的結果進入 `status`／`alert`     | Live region 是給動態更新，不是一般卡片分類；初始靜態內容可能被重複或突兀宣讀。 |
| LOW    | `components/common/ConfirmAction.vue`                                                                            | 使用者主動展開的刪除說明使用 `role="alert"`                                               | 後續搭配目標螢幕閱讀器驗證；若按鈕與警示能依閱讀順序被理解，改為 `role="note"` 或一般群組 | `alert` 應保留給急迫錯誤；確認說明重要但不是系統突發錯誤。                     |

### 已確認一致的部分

- `AppNotice`：成功結果用 polite `status`，失敗用 `alert`。
- 表單錯誤：動態出現時使用 `alert`；`QuickTimePicker` 同時以 `aria-describedby` 關聯欄位。
- Overlay：Escape、focus trap、背景 inert、捲動鎖與焦點返回集中在 `useOverlay`，兩個 dialog 都有 `aria-modal` 與 accessible label。
- 衛教頁的審查說明使用 `role="note"`，語意適合非急迫補充資訊。

### 驗證與裁決

- 已完成原始碼語意掃描、互動元素掃描、dialog/useOverlay 引用掃描。
- 本輪未重新執行 NVDA／VoiceOver 實機朗讀；上述 live-region 建議仍需在修改時加入對應 component test 與實機抽查。
- 裁決：**Needs changes**（無 HIGH，保留 1 個 MEDIUM、2 個 LOW 後續項）。

## F3：測試脆弱耦合

### 本輪已修

- 移除 `BottomNavigation.test.ts` 直接讀 `.vue` 並比對 `position`、safe area、`z-index`、背景色等 CSS 字串的案例。
- 移除 `AppShellLayout.test.ts`；它同樣只驗證 source 中有 class/token 字串，不能證明內容未被固定導覽遮住。此風險回到 F5 的 viewport/reflow 驗收矩陣。
- `AccountDataPage.test.ts`、`ConfirmAction.test.ts` 改用按鈕文字、ARIA role 與 emit 結果，不再以 `.button--primary`／`.button--quiet` 找操作。
- `RegionLocationPanel.test.ts` 移除「重新定位必須帶某個置中 class」的外觀實作斷言，保留文字與 emit 行為。

### 刻意保留

- `tokens.test.ts` 讀取 `DESIGN.md`／`styles.css`：目的就是驗證兩份 token 真相的 drift，屬於架構守門，不是假行為測試。
- `AppNotice` kind class、UV／提醒狀態 modifier、`stat-figure`：這些 class 表達元件對外的視覺狀態契約；目前保留，若未來有 visual regression 工具再評估下放。
- `data-testid`、欄位 id、ARIA 屬性：它們是穩定互動／無障礙契約，不視為脆弱耦合。

## F4：DataSettingsPage loading

- 以 TDD 新增頁面測試；先證實找不到當時的 `SunLoader` 而失敗，再改為具體 label 後通過。2026-08-29 合併主線時，實作與測試一併改接 `BroadcastLoader label="正在讀取本機資料概況"`。
- 原有具體文案成為 loader 的 accessible name，沒有退回模糊的預設「載入中」。

## G2–G3：死碼

- 移除 `ContextSelector.vue` 對原生 toggle button 重複宣告的 `:focus-visible`；隱藏 radio 的兩個 `:has(input:focus-visible)` 規則保留。
- 移除 `app.css` 未被任何 template 使用的 `.status-card`、`.status-card__label`、5 個狀態變體。
- 移除同樣零使用的 `.uvi-badge` 與 5 個 UVI 變體。
- ESLint baseline 沒有 unused import；沒有為了「順手」刪除動態引用或只靠命名猜測的程式。
