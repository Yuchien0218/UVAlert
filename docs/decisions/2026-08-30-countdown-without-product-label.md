# 倒數不再依賴產品標示

**日期**：2026-08-30（Asia/Taipei）
**狀態**：**已裁決並已實作**。
**範圍**：`packages/domain/src/reducer.ts` 的三處 eligibility 判斷、設定流程移除 SPF 標示題。contracts 未動。
**權威性**：低於 `DESIGN.md`；與 `2026-08-15-redesign-sitemap-userflow-current.md` 一致（本次正是把實作對齊那份文件）。

## 裁決

**沒有填寫防曬乳資訊時也能開始補擦倒數，使用 120 分鐘保守預設。**

**已知有問題的產品維持不建立倒數**：過期、使用者回報異常、使用者回報不適。

**耐水倒數維持需要 `eligible`**——沒有抗水標示算不出耐水時間，那不是保守預設能補的。

## 為什麼這不是放寬安全標準

**一、產品標示只會讓倒數變短，不會變長。**

```js
interval = reapplicationIntervalStatus === "explicit_minutes"
  ? Math.min(GENERAL_MAX_MINUTES, reapplicationIntervalMinutes)
  : GENERAL_MAX_MINUTES;   // 120
```

沒有標示資訊時的值就是 120——**已經是最保守的那個數字**。改動前的規則不是「因為不確定所以更保守」，而是「因為不確定所以什麼都不給」。

**二、現行 UX 基準文件本來就是這樣訂的。**

`2026-08-15-redesign-sitemap-userflow-current.md`（CLAUDE.md 指名的現行 UX／IA 基準）：

> 標示資料尚未完整的防曬乳仍列在「目前使用」，顯示「標示尚未確認」；**可使用 120 分鐘保守預設**。

**三、擋住倒數的規則只存在於 archive。**

`RR-P0-ELIGIBILITY-002` 出自 `docs/archive/2026-08-pre-redesign/`，而 CLAUDE.md 明寫 archive「只能用來理解歷史，不可當作現行依據」。現行文件沒有任何一處重述它。

**所以偏離的是實作，不是這次的提案。**

## 核心區別：「不知道」與「知道有問題」

| `ruleEligibilityAtApplication` | 語意 | 改前 | 改後 |
| --- | --- | ---: | ---: |
| `eligible` | 已確認防曬乳 | 有倒數 | 有倒數 |
| `identity_unconfirmed` | **不知道**是不是防曬乳 | 無 | **120 保守預設** |
| `no_sunscreen_claim` | **知道**沒有防曬宣稱 | 無 | **120 保守預設** |
| `expired` | 已過期 | 無 | **無（維持）** |
| `abnormal_reported` | 回報異常 | 無 | **無（維持）** |
| `discomfort_reported` | 回報不適 | 無 | **無（維持）** |

後三者是使用者主動說「這瓶有狀況」。這時給倒數等於忽略他的回報。

## 實作上最值得記的一件事

**同一個規則在 reducer 裡有三處判斷，而且必須一致。** 只改一處會得到看起來很像正常、實際不對的畫面：

| 位置 | 只改這裡會怎樣 |
| --- | --- |
| `generalDueAt` 的條件 | 期限算得出來，但畫面顯示「需要補充資料」 |
| `invalidTopical`（決定 `timingStatus`） | 分組變成「提醒進行中」，但**沒有倒數數字** |
| `derivePrimaryAction` | 首頁的 `buildHomeReminderClockPresentation` 看到 `untimed_action_card` 就整個不渲染倒數 |

前兩次都是**瀏覽器實測才發現的，測試沒抓到**——因為第一版測試只斷言 `generalDueAt`。現在三處都有斷言守著（見 `packages/test-fixtures/src/reducer.test.ts`）。

教訓：改「某個狀態能不能產生倒數」這類規則時，要先把所有讀取該狀態的地方列出來，不要改完一處就以為結束。

## 連帶改動

- **SPF 標示題移出設定流程**：規則改動後，`makeSessionOnlyProductSnapshot` 把 interval／wait／water 全設為 `unknown`，所以「有／沒有／不確定」三個答案會得到完全相同的 120 分鐘倒數——它不再影響任何結果。**是失去作用後才移除，不是硬拿掉。**
- **沒有任何產品資訊時仍建立 snapshot**：改前會落到 `applications: []`，沒有 `appliedAt` 錨點就沒有倒數起點。現在退到 `claimAnswer: "unknown"`，每個欄位都是「不知道」，不宣稱任何標示內容。
- **`ProductEligibilityNotice` 移除兩則警示**：`no_sunscreen_claim` 與 `identity_unconfirmed` 原本寫「不會產生 120、40 或 80 分鐘期限」「暫時無法建立補擦倒數」——改動後這兩句是假的。這是移除已不成立的敘述，不是改寫 Copy Deck 條目。

## 驗證

瀏覽器實測（390×844，清空本機資料後的全新使用者）：

- 不填任何防曬乳資訊 → 倒數顯示 **119 分鐘・預計 15:53**（13:53 塗抹 + 120 分鐘）
- 設定頁內容 854px → **499px**，SPF 卡消失

**沒有瀏覽器實測的部分**：過期／異常／不適仍然不建立倒數，這三種只有 domain 測試涵蓋——要在畫面上重現需要先建立一個帶到期日的產品。

`pnpm check` 全綠（1026 個測試）。

## 未做、但方向一致

**裝備區簡化。** 使用者的原始需求包含「裝備區只是記錄買過的防曬乳，屬於附加價值，現在太複雜」。方向一致——裝備區複雜正是因為它同時扛著「餵資料給倒數引擎」的責任，這個責任移除後才能真正簡化。但那是 IA 改動（snapshot 欄位、裝備表單四題、`/products` 結構），另案處理。
