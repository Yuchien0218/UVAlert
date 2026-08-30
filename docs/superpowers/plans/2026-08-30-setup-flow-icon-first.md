# 設定流程 icon-first 與精簡（B 批）Implementation Plan

> **狀態：裁決完成，尚未動工（2026-08-30）。** 三個裁決點使用者已定：情境版面採 **4 格 2×2**（方案 A）、塗抹時間採 **`1 分鐘前` ＋ `調整時間` 兩選項**（方案 A，等於反轉 2026-08-24 移除自訂時間的裁決）、頁面說明改為 **「選擇情境與塗抹時間」**。

**Goal:** 讓「開始防曬提醒」的第一步從「讀四張卡片」變成「掃四個圖示」——情境選擇改成兩欄 icon-first，說明文字改為選取後才展開，並精簡塗抹時間與頁面文案。

**Architecture:** 只動設定流程的呈現層：`SetupPage.vue` 的模板與三個子元件（`ContextSelector`、`QuickProtectionSummary`、`ApplicationTimePicker`）。**不動 domain、contracts、controller**——`SessionContext` 的六個值、`createSetupController` 的介面、草稿結構全部維持原樣。這一批是版面與互動，不是行為。

**Tech Stack:** Vue 3 SFC `<script setup>`、TypeScript、CSS custom properties、Vitest、Vue Test Utils、Stylelint、pnpm。

## Global Constraints

- **不改變任何既有行為**：能不能建立提醒、倒數怎麼算、草稿怎麼存，全部不變。
- **不新增文案**；改寫既有文案要先裁決（見下）。
- 圖示尺寸只能用 `DESIGN.md` 第八節的四檔位（16／20／24／32）。
- 樣式不得寫死值，顏色／圓角／間距一律 `var(--*)`；沒有對應 token 就是 `DESIGN.md` 的缺口，提出來不要就地硬寫。
- **不碰 `SunscreenClaimQuickQuestion`**（SPF 標示題）——它決定能不能建立正式的補擦倒數，屬於 C 批，要單獨處理。
- **不碰 UV 相關程式碼**：另一個工具正在做天氣 API 串接，避免撞車。
- 每個 Task 結束 `pnpm check` 全綠；視覺改動一律用 Browser pane 實跑，不能只靠測試。

---

## 動工前必須裁決

### 裁決 1（已定：A．4 格 2×2）：情境版面要 4 格還是 6 格

目前的資訊架構是 **2 張頂層卡（一般戶外／戶外運動）＋ 2 個可展開群組（室內／水上），各含 2 個子選項**，合計 6 個 `SessionContext`。

改成兩欄格狀之後有兩種走法：

| 方案 | 版面 | 取捨 |
| --- | --- | --- |
| **A（建議）** | 4 格 2×2：一般戶外／戶外運動／室內／水上。選到室內或水上後，子選項在下方展開區出現 | 首屏只有 4 個掃讀目標，跟「新增防曬裝備」的品類格一致；子選項與說明共用同一個展開區，只有一種展開模式 |
| B | 6 格全攤平 | 少一次點擊，但首屏變 6 個目標，而且「近直射窗邊／遠離直射光」這種需要判讀的選項不適合只靠圖示 |

**建議 A。** 理由是 B9 第一輪的同一條：圖示要當掃讀入口，目標數愈少愈有效；而室內／水上的子選項本來就是「選了大類再細分」的語意。

### 裁決 2（已定：A．兩選項）：塗抹時間要不要反轉 2026-08-24 的裁決

`ApplicationTimePicker.vue` 的檔頭寫著：

> 2026-08-24 使用者裁決：移除自訂時間（datetime-local）與每個選項下方的絕對時刻。這頁的第一考量是「當計時器用」，選項愈少、文字愈少愈好。

這次的需求是 **移除「剛剛」、預設「1 分鐘前」、加回可手動調整的輸入框**——等於把當時移除的自訂時間加回來，同時把快選從 4 個砍到 1 個。

方向不衝突（都是「更簡單」），但**加回自訂輸入是明確反轉前次裁決**，需要你確認。

另外要決定：**15／30／1 小時前這三個快選要不要一起移除？** 需求寫「改成兩個選項」，字面上是全砍。但砍掉之後「30 分鐘前才擦的」使用者必須進手動輸入，比現在多一步。

| 方案 | 選項 | 取捨 |
| --- | --- | --- |
| **A（建議）** | `1 分鐘前`（預設）＋`調整時間` | 完全照需求。最輕，但常見的 15／30 分鐘要多一步 |
| B | `1 分鐘前`（預設）＋`15 分鐘前`＋`30 分鐘前`＋`調整時間` | 常見情境仍是一鍵，但版面沒有變成「兩個選項」 |

### 裁決 3（已定：採用）：頁面說明文字

| 現況 | 改為 |
| --- | --- |
| 選擇情境與實際塗抹時間，就能開始倒數。 | **選擇情境與塗抹時間** |

移除「實際」與「就能開始倒數」——底部的開始按鈕已經表達結果。屬於改寫，需要裁決。

---

## File Structure and Responsibilities

- `apps/web/src/components/setup/ContextSelector.vue`：情境格狀版面、選取後展開說明與子選項。主要改動點。
- `apps/web/src/components/setup/QuickProtectionSummary.vue`：從卡片改為 inline 文字段落。
- `apps/web/src/components/setup/ApplicationTimePicker.vue`：快選精簡與手動調整入口。
- `apps/web/src/pages/setup/SetupPage.vue`：頁面說明文字、預設情境。
- `apps/web/src/components/setup/SetupFlowComponents.test.ts`：既有測試，改完要跟著調。
- `DESIGN.md` 第五節：回寫情境選擇器的版面規範。

---

### Task 1: 情境選擇改成兩欄 icon-first

參考對象是「新增防曬裝備」的品類格（`GearForm.vue` 的 `.category-grid`／`.category-option`）：兩欄、圖示置中在上、名稱在下、文字置中。

- [ ] 依裁決 1 決定 4 格或 6 格
- [ ] 版面改為 `repeat(2, 1fr)`，手機與桌面都是兩欄
- [ ] 圖示 24px → **32px**，置於名稱上方（現在是左側）
- [ ] **名稱永遠顯示**，不做成只有圖示——`context-indoor` 與 `context-water` 光看圖猜不出「近直射窗邊」這種區分
- [ ] 選取狀態不能只靠顏色：外框或勾選圖示，且要能通過既有的 focus-visible 樣式
- [ ] 觸控區至少 44×44px
- [ ] 改版後仍要保持選取變色。**那個特異性 bug 已於 2026-08-24 修好**（2026-08-30 瀏覽器實測確認選取後底色確實變深），檔案註解是在描述已修復的歷史——不要誤讀成待修項目。改版時沿用共用類別，不要再寫本地 `background` 把它弄回來
- [ ] `pnpm check` 全綠

### Task 2: 說明文字改成選取後才出現

- [ ] 未選取時只顯示圖示＋名稱
- [ ] 選取後在**格子區下方**顯示該情境的說明（不是在格子內），避免格子高度隨文字長短跳動
- [ ] 若裁決 1 選 A：室內／水上的子選項也出現在同一個展開區，與說明共用一種展開模式
- [ ] 展開／收合遵守 `DESIGN.md`「展開收合（disclosure）」小節：真實 `button`、`aria-expanded` ＋ `aria-controls`、chevron 換圖示 name 不用 rotate
- [ ] 收合不清除已選狀態
- [ ] `pnpm check` 全綠

### Task 3: 預設情境為「一般戶外」

- [ ] 進入設定流程時 `selectedContext` 預設 `outdoor_general`
- [ ] **畫面必須清楚顯示它已被選取**——使用者要看得出系統代選了什麼，不能只是悄悄帶入
- [ ] 確認預設值不會略過 `ensureRecommendedProtection()`，也不會讓「尚未選擇」的錯誤提示失效
- [ ] 確認草稿回復（`recoveryPending`）時不會被預設值覆蓋掉使用者原本的選擇
- [ ] `pnpm check` 全綠

### Task 4: 快速提醒去卡片化

- [ ] `QuickProtectionSummary` 從 `app-card` 改為情境選擇器下方的一段 inline 文字
- [ ] 移除「快速提醒（推薦）」大標題——選取後才出現，本來就不需要再宣告一次
- [ ] 保留「調整提醒部位」為文字按鈕
- [ ] 確認 `.quick-protection` 的內距原本在 header／details 上（`appCardPadding.test.ts` 的具名例外），去卡片化後那個例外要跟著移除
- [ ] `pnpm check` 全綠

### Task 5: 塗抹時間與頁面文案

- [ ] 依裁決 2 調整快選與手動輸入
- [ ] 手動調整不常駐：點擊後才開 bottom sheet 或原生時間選擇器（`BottomSheet.vue` 已存在可複用）
- [ ] 調整後顯示結果（例如「已調整為 15 分鐘前」），不要讓使用者看不出目前選了什麼
- [ ] 依裁決 3 改頁面說明文字
- [ ] 更新 `ApplicationTimePicker.vue` 檔頭那段 2026-08-24 的裁決記錄——它會變成過時敘述
- [ ] `pnpm check` 全綠

### Task 6: 驗證與回寫

- [ ] Browser pane 走完整流程：進入 `/setup` → 預設已選一般戶外 → 切到室內 → 子選項出現 → 選塗抹時間 → 建立提醒
- [ ] 390×844 與桌面兩種寬度都看過
- [ ] 200% zoom 不破版、文字不截斷
- [ ] 鍵盤操作：Tab 順序、Enter／Space 可選取、focus ring 可見
- [ ] 量測改動前後的首屏可見選項數與版面高度
- [ ] `DESIGN.md` 第五節回寫情境選擇器規範
- [ ] 裁決結果寫進 `docs/decisions/`

---

## Final Self-Review Checklist

- [ ] 沒有改動 domain、contracts 或 controller 介面
- [ ] `SessionContext` 六個值都還能選得到
- [ ] 沒有碰 SPF 標示題與任何 UV 相關程式碼
- [ ] 圖示尺寸都在四檔位內
- [ ] 沒有新增文案；改寫的都經過裁決
- [ ] 選取狀態不只靠顏色
- [ ] 預設值有在畫面上明確呈現
- [ ] 三種寬度與鍵盤操作都實際驗過
- [ ] `pnpm check` 全綠

---

## 附錄：2026-08-30 動工前的實測基準（390×844）

改動前的量測，Task 6 要拿這組數字做前後對照。

| 區塊 | 高度 |
| --- | ---: |
| `context-selector` | **393px** |
| `quick-protection` | 94px |
| `question-card`（SPF 標示題） | **331px** |
| `time-picker` | **249px** |
| 文字連結＋免責 | 45px |
| **內容合計** | **1112px** |

頁面總高 1611px、視窗 844px；**主 CTA 位於 y=1518**，也就是選完情境後仍要再捲約 700px 才按得到「開始防曬提醒」。

B 批預估可省：情境選擇器約 160px、塗抹時間約 120px、快速提醒約 45px，合計約 **325px**。

**做完 B 批之後，最大的單一區塊會變成 SPF 標示題（331px）**——那屬於 C 批，B 批不碰。
