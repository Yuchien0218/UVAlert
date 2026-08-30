# 2026-08-30 介面稽核：實測結果與待辦

**狀態**：**稽核完成，改動尚未進行。** 這份文件是為了讓下一個 session 不用重跑量測就能接手。
**方法**：不靠靜態 grep 猜測，全部以 Browser pane 在 390×844 實際量渲染後的值。

---

## 一、共用 token 有設定卻沒套用？→ **幾乎沒有**

掃 `font-size`／`border-radius`／`color`／`background-color`／`z-index`／`transition-duration` 的寫死值：

| 屬性 | 寫死的 | 判定 |
| --- | --- | --- |
| `background-color`、`z-index` | 0 處 | ✅ |
| `border-radius` | `50%` × 2 | 正當（圓形） |
| `color` | `inherit` × 6、`transparent` × 1 | 正當 |
| `transition-duration` | `0.01ms !important` × 1 | 正當（`prefers-reduced-motion`） |
| `font-size` | `clamp()` × 5 | 正當——倒數讀數與有 `data-typography-exception` 標記的標題，`DESIGN.md` 明訂為元件級例外 |

**結論**：token 紀律良好。這是 2026-08-30 那幾輪收斂加上 stylelint／`lineHeightTokens.test.ts` 的成果，不需要再做一輪。

---

## 二、字級套用不正確 → **找到一個系統性問題：`<small>` 是量表外的 13px**

字級量表是 12／14／16／18／20／28。實測發現 `<small>` 渲染成 **13px**——量表上沒有這個值。

**原因**：`<small>` 的瀏覽器預設是 `font-size: smaller`（≈0.8125em），而 `app.css` 與 `styles.css` **都沒有為 `small` 設字級**，所以落到預設值。

**影響範圍**：全站 8 處 `<small>`，其中 **7 處是 13px**（只有 `ZoneProtectionForm` 有一處自己設了 caption 12px）。

| 檔案 | 內容 |
| --- | --- |
| `pages/MorePage.vue` | 入口卡說明 |
| `pages/education/EducationIndexPage.vue` | 分類卡說明 |
| `pages/education/EducationCategoryPage.vue` | 文章摘要 |
| `pages/help/HelpIndexPage.vue` | 主題摘要 |
| `components/setup/ContextSelector.vue` | 情境子選項說明 |
| `components/setup/ZoneProtectionForm.vue` | 群組說明（另一處已設 caption） |
| `components/reapplication/ReapplicationZoneSelector.vue` | 「建議」標籤 |

**建議修法**：在 `app.css` 為 `small` 設 `font-size: var(--font-size-supporting)`（14px），而不是逐處加 class——這樣新寫的 `<small>` 也自動正確。**要先確認 14px 是這些位置想要的角色**（多數是卡片說明，supporting 合理）。

**另外量到的量表外值**：首頁的 `stat-figure--inline`（「1 分鐘前」的數字）是 **17px**，也不在量表上。

**其餘沒問題**：`/products/new` 全頁字級零例外；`data-typography-role` 的 28 個 `section-title` 全部用在 `<h2>` 上，沒有誤用。

---

## 三、icon 沒套用／太小 → **除了「更多」頁，其他頁幾乎沒有圖示**

| 頁面 | 圖示數 | 尺寸 |
| --- | ---: | --- |
| `/more` | 5 | **32px** ✅（B9 第一輪做的） |
| `/` 首頁 | 2 | 20、24 |
| `/products` 裝備清單 | **1** | 20 |
| `/settings/data` | 1 | 20 |
| `/education` | **0** | 完全沒有 |

使用者提供的參考稿（衛教首頁）**分類卡上有圖示**（放大鏡、時鐘、水滴），現在一個都沒有。

**這一項的本質不是「圖示太小」，是「icon-first 只做了「更多」一頁」。** B9 第一輪的範圍就只有那一頁，其餘頁面從未套用。

---

## 四、右上角叉叉讓標題離上面很遠 → 已量到數字，待修

`/setup` 實測（390×844）：

- `main` 頂端 y=72
- 叉叉按鈕 y=96、尺寸 44×44
- `<h1>` 頂端 y=95

叉叉與標題幾乎同高，但叉叉獨佔一列，把標題往下推。使用者要求**改成「回上一頁」**。

**未做。** 這牽涉 `SetupStepShell` 與 `detail-header` 兩種樣式，而且「關閉設定」與「回上一頁」的語意不同（前者會取消草稿），改之前要確認行為要不要跟著變。

---

## 五、各部位提醒狀態很雜亂 → 待討論

首頁目前把 8 個部位平鋪成 8 個 pill，每個都寫「・1 個原因」。使用者問要不要收合。

**尚未給出建議。** 需要先釐清：那個「1 個原因」在新規則下是 `PRODUCT_IDENTITY_UNKNOWN`（標示尚未確認），對多數不填防曬乳的使用者會**永遠顯示**——那可能才是雜亂的來源，收合只是遮住它。

---

## 六、裝備區簡化 → 計畫未寫

使用者的方向：「裝備區只是記錄買過的防曬乳（期限、價格、好不好用），屬於附加價值，現在太複雜」。

2026-08-30 的 `2026-08-30-countdown-without-product-label.md` 已移除「裝備要餵資料給倒數引擎」這個責任，**簡化的前置條件已經具備**。

先前實測 `/products/new` 找到的三個具體問題：

1. **一張 124px 的卡只為了說「這裡沒有東西」**——選非防曬乳品類時出現「這件裝備不會建立補擦倒數」整張卡，而品類格下方已經有一行「只做紀錄，不會影響補擦倒數。」在講同一件事
2. **SPF 在兩張卡出現但意義不同**——「裝備暱稱」卡有 SPF／PA 欄位，下一張「包裝標示確認」又說「請填寫包裝標示」，兩者差別（展示用 vs 進倒數計算）畫面上看不出來
3. **四張等重的卡**——品類、暱稱、包裝標示、購買/到期/備註，必填與選填視覺重量相同

頁面總高 1633px（防曬乳）／1294px（太陽眼鏡）。
