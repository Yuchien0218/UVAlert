# 倒數不再依賴產品標示 Implementation Plan

> **狀態：待確認，尚未動工。** 這是第一次改動核心提醒迴圈的規則，動工前請先看「為什麼這不是放寬安全標準」那一節。

**Goal:** 沒有填寫防曬乳資訊時也能開始補擦倒數，使用 120 分鐘保守預設；把「包裝上有明確的防曬或 SPF 標示嗎？」移出設定流程。已知有問題的產品（過期／異常／不適）維持不建立倒數。

**Architecture:** 改動集中在 `packages/domain/src/reducer.ts` 的一個判斷條件，加上設定流程移除一張卡。**contracts 完全不動**——`ProductEligibility` 的六個值、`ProductLabelSnapshotV1` 的欄位、reason code 全部保留，改的只是「哪些 eligibility 會擋住一般倒數」。

**Tech Stack:** TypeScript、Vue 3、Vitest、Zod、pnpm。

## 為什麼這不是放寬安全標準

三個查證結果：

**一、產品標示只會讓倒數變短，不會變長。**

```js
interval = snapshot.reapplicationIntervalStatus === "explicit_minutes"
  ? Math.min(GENERAL_MAX_MINUTES, snapshot.reapplicationIntervalMinutes)
  : GENERAL_MAX_MINUTES;   // 120
```

沒有標示資訊時的值就是 120——**這已經是最保守的那個數字**。現在的規則不是「因為不確定所以更保守」，而是「因為不確定所以什麼都不給」。

**二、現行 UX 基準文件本來就是這樣訂的。**

`docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md` 第 116 行：

> 標示資料尚未完整的防曬乳仍列在「目前使用」，顯示「標示尚未確認」；**可使用 120 分鐘保守預設**。

那份文件是 CLAUDE.md 指名的現行 UX／IA 基準。**偏離的是實作，不是這次的提案。**

**三、擋住倒數的規則只存在於 archive。**

`RR-P0-ELIGIBILITY-002`（無防曬宣稱或身分未知不得建立期限）出自 `docs/archive/2026-08-pre-redesign/`，而 CLAUDE.md 明寫 archive「只能用來理解歷史，不可當作現行依據」。現行文件沒有任何一處重述它。

## 核心區別：「不知道」與「知道有問題」

現在的 `DT-ELIGIBILITY-01` 把兩種完全不同的情況都歸成「不可建立期限」。這次只鬆綁前者。

| `ruleEligibilityAtApplication` | 語意 | 一般倒數（現在） | 一般倒數（改後） |
| --- | --- | ---: | ---: |
| `eligible` | 已確認防曬乳 | 是 | 是 |
| `identity_unconfirmed` | **不知道**是不是防曬乳 | 否 | **是（120 保守預設）** |
| `no_sunscreen_claim` | **知道**沒有防曬宣稱 | 否 | **是（120 保守預設）** |
| `expired` | 已過期 | 否 | **否（維持）** |
| `abnormal_reported` | 使用者回報異常 | 否 | **否（維持）** |
| `discomfort_reported` | 使用者回報不適 | 否 | **否（維持）** |

後三者是使用者主動說「這瓶有狀況」。這時給倒數等於忽略他的回報——那才是真正的安全問題，維持封鎖。

**耐水倒數維持需要 `eligible`**（2026-08-30 裁決）：沒有抗水標示就算不出耐水時間，那不是保守預設能補的。

## Global Constraints

- **contracts 不動**：eligibility 列舉、snapshot 欄位、reason code 全部保留。
- **reason code 仍然回報**：`PRODUCT_NO_SUNSCREEN_CLAIM` 與 `PRODUCT_IDENTITY_UNKNOWN` 從「封鎖原因」變成「說明性原因」，畫面仍可顯示「標示尚未確認」，只是不再擋住倒數。
- **耐水倒數的條件一行都不改。**
- 不碰任何 UV 相關程式碼（另一個工具正在做天氣 API）。
- 每個 Task 結束 `pnpm check` 全綠；domain 改動要先有測試。

---

## File Structure and Responsibilities

- `packages/domain/src/reducer.ts`：一般倒數的 eligibility 判斷。**唯一的行為改動點。**
- `packages/domain/src/reducer.test.ts`（與相關測試檔）：新規則的測試。
- `apps/web/src/features/setup/createSetupController.ts`：沒有 snapshot 時仍建立 application。
- `apps/web/src/pages/setup/SetupPage.vue`：移除 SPF 題與它的驗證。
- `apps/web/src/components/setup/SunscreenClaimQuickQuestion.vue`：刪除。
- `apps/web/src/components/setup/ProductEligibilityNotice.vue`：文案要跟著改（現在說「不建立倒數」）。
- `docs/decisions/`：裁決記錄。
- `DESIGN.md`／Sitemap：回寫實際規則。

---

### Task 1: 先寫測試描述新規則

domain 是純 reducer、不讀系統時間，測試直接傳 clock 即可——這是這個 repo 最好測的一層，先寫測試再改邏輯。

- [ ] `identity_unconfirmed` 的 application 會產生 120 分鐘的一般倒數
- [ ] `no_sunscreen_claim` 同上
- [ ] `expired` **仍然不**產生倒數
- [ ] `abnormal_reported`、`discomfort_reported` **仍然不**產生倒數
- [ ] 上述每一種情況的 reason code 都仍然回報（不因為不再封鎖就消失）
- [ ] 耐水倒數在 `identity_unconfirmed` 下**仍然是 null**
- [ ] 先確認這批測試在改邏輯前是紅的
- [ ] 記錄失敗清單作為 Task 2 的完成條件

### Task 2: 改 reducer 的判斷條件

- [ ] 一般倒數的條件從 `currentEligibility === "eligible"` 改為「不在封鎖集合內」
- [ ] 封鎖集合明確列舉：`expired`、`abnormal_reported`、`discomfort_reported`
- [ ] **用列舉而不是否定**——寫成 `BLOCKING_ELIGIBILITY.has(x)`，之後新增 eligibility 值時預設不會意外放行
- [ ] 確認 `latestEligibleApplicationForCause`（決定「為什麼到期」）要不要跟著放寬——它現在也過濾 `eligible`
- [ ] 耐水那段（`applicationSelection.candidates.filter(... === "eligible")`）**不動**
- [ ] Task 1 的測試全部轉綠
- [ ] `pnpm check` 全綠

### Task 3: 沒有產品資訊時仍建立 application

現在 `productLabelSnapshot === null` 時 `applications: []`，等於沒有 `appliedAt` 錨點，倒數沒有起點。

- [ ] `saveTiming` 在沒有任何 snapshot 時，自動建立 `claimAnswer: "unknown"` 的 session-only snapshot
- [ ] 確認這條路徑不會覆蓋既有產品的 snapshot（優先序：input > draft > 產品設定 > 自動建立）
- [ ] `pnpm check` 全綠

### Task 4: SPF 題移出設定流程

改完 Task 2 之後，這一題在設定流程裡**已經不影響任何結果**——`makeSessionOnlyProductSnapshot` 把 interval／wait／water 全設為 `unknown`，所以三個答案都得到同樣的 120 分鐘倒數。

- [ ] 移除 `SunscreenClaimQuickQuestion` 的使用與元件本身
- [ ] 移除 `validateForm` 裡的 `sunscreenClaim` 驗證
- [ ] 移除 `needsSunscreenClaim` 與相關狀態
- [ ] 「改為填寫完整的防曬乳包裝標示」入口**保留**——想要更短間隔的人仍需要它
- [ ] 確認移除後 `saveTiming` 仍走得到 Task 3 的自動 snapshot
- [ ] `pnpm check` 全綠

### Task 5: 文案與提示跟著現實走

- [ ] `ProductEligibilityNotice`：現在說「不建立倒數」，改後只有過期／異常／不適才成立
- [ ] 「標示尚未確認」的提示保留——它仍然為真，只是不再代表沒有倒數
- [ ] **這一步的文案改寫要先裁決**，不要在實作時自行決定
- [ ] `pnpm check` 全綠

### Task 6: 驗證與回寫

- [ ] Browser pane 走一次全新使用者流程：不填任何防曬乳 → 開始提醒 → 確認倒數是 120 分鐘
- [ ] 走一次有產品但已過期的流程 → 確認仍然不給倒數、原因顯示正確
- [ ] 量測設定頁改動後的內容高度與主 CTA 位置，跟 B 批的數字並列
- [ ] `docs/decisions/` 記錄這次裁決與三個查證依據
- [ ] Sitemap 第 116 行標註「實作已對齊」
- [ ] `DESIGN.md` 補上倒數與產品標示的關係

---

## 這個計畫**不**包含

- **裝備區簡化**（使用者提的第 3 點）。方向一致——倒數不再依賴產品標示之後，裝備區才能真正變成「記錄買過什麼、期限、價格、好不好用」的備忘錄。但那是 IA 改動（snapshot 欄位、裝備表單四題、`/products` 結構），**先做這個計畫，裝備簡化才有意義**；反過來做會卡住。
- **耐水倒數的任何改動。**
- **UV 相關程式碼**（另一個工具正在做）。

## Final Self-Review Checklist

- [ ] contracts 一行都沒改
- [ ] 過期／異常／不適仍然不建立倒數，而且有測試守著
- [ ] 耐水倒數的條件沒有被動到
- [ ] reason code 仍然回報，只是不再封鎖
- [ ] 封鎖集合是明確列舉，不是否定判斷
- [ ] 新使用者不填任何防曬乳就能得到 120 分鐘倒數
- [ ] 文案改寫都經過裁決
- [ ] `pnpm check` 全綠
