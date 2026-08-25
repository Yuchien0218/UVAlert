# UVAlert 手刻頁面共用元件抽取 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** 把目前分散在多個頁面、彼此重複或已經肉眼可見漂移的手刻 UI（提示框、二次確認、部位勾選、loading 文字、空白狀態）收斂成共用元件或共用 class，不改變任何頁面現有的功能行為、文案、路由與可見文字；只在少數已知會被抽取影響的既有測試中更新選擇器。

**Architecture:**

- 新元件放在新資料夾 `apps/web/src/components/common/`。目前 `components/` 完全依領域分資料夾（`home`／`product`／`setup`／`shell`／`feedback`／`reminder`…），沒有跨領域共用元件的容身之處；`common/` 是這次新增的例外，只放「不屬於任何單一功能領域、純粹是重複 UI 樣式」的元件（`AppNotice`、`ConfirmAction`、`EmptyStateCard`、（可選）`QuickTimePicker`）。屬於特定領域邏輯的抽取（部位勾選）維持放在該領域資料夾（`components/reminder/`），不進 `common/`。
- 樣式共用的原則沿用 `apps/web/src/assets/app.css` 現有慣例：這個檔案已經有多次「把 N 個檔案裡逐字重複的 class 收斂成一份」的紀錄（`.icon-button`、`.question-card`、`.choice-grid`、`.option-selected`、`.text-link--muted` 都是這樣來的），且都附註了收斂前後的差異與日期。這次新增的共用 class／元件 style 一律比照這個慣例補註解，不要重新發明一套模式。
- **不是每個重複都必須是 Vue 元件。** `AppNotice` 這種純展示、無互動邏輯的元素，優先考慮直接在 `app.css` 補共用 class（`.notice`／`.notice--ok`／`.notice--error`）＋一個薄元件包裝 role/class 選擇邏輯；`ConfirmAction`／`ZoneSelectorGrid` 有實際互動狀態（confirm/cancel、checkbox toggle），適合做成真正的元件。
- 既有元件優先重用，不重複造：
  - `apps/web/src/components/feedback/SunLoader.vue` 已存在，Task 3 只做採用，不新建 loading 元件。
  - `apps/web/src/components/reapplication/ApplicationTimeSelector.vue` 目前的 markup／props（`appliedAt`／`referenceNow`／`error`，emit `change`／`quick`）與 `EventCorrectionPage.vue`、`ReportContextEventPage.vue` 手刻的 `.quick-times` + `datetime-local` 區塊**逐字結構相同**（同一組「剛剛／15／30／60 分鐘前」快選＋自訂時間＋摘要＋錯誤文字），只有标题文字與 id 前綴不同。這不是三個時間元件裡隨便選一個湊合，是目前唯一形狀吻合的既有元件；`ApplicationTimePicker.vue`（設定流程，僅四個相對快選、無自訂輸入、無摘要）與 `WaterStartPicker.vue`（confirmed/unknown 語意、資料模型是 `WaterStartFormValue`）都是不同的資料模型與互動，不適用。因此 Task 2 的做法是**把 `ApplicationTimeSelector.vue` 的標題文字與 DOM id 前綴改成可傳入的 props，搬到 `components/common/QuickTimePicker.vue`**，讓 `ReapplyPage.vue`、`EventCorrectionPage.vue`、`ReportContextEventPage.vue` 三處共用；命名與搬移屬於重構既有元件，列入 Open Questions 供你確認範圍。
- `ZoneStatusList.vue`（`components/reminder/`）是「唯讀顯示各部位目前狀態」，`.zone-grid`／`.zone-chip` 手刻的是「可勾選輸入哪些部位受影響」——兩者職責不同，不合併，但新元件 `ZoneSelectorGrid.vue` 會放在同一個 `components/reminder/` 資料夾裡，維持「部位相關元件」聚在一起的慣例。
- `.notice`／`.confirm-note`／`.empty-state`／`.zone-grid`／`.zone-chip`／`.quick-times` 這些 class 目前**完全沒有定義在 `app.css`**，每個頁面各自 scoped 定義一份；抽出共用元件後，這些頁面 scoped style 裡的對應區塊要整段刪除，不留死碼。

**Tech Stack:** Vue 3、TypeScript、Vitest、Vue Test Utils、Vite、pnpm workspace。

## Global Constraints

- 不修改 `packages/domain`、`packages/persistence-web`、`packages/platform` 的任何邏輯；本計畫只動 `apps/web/src/components` 與 `apps/web/src/pages`。
- 不新增或修改路由。
- 不改變任何使用者可見文案（繁體中文字串維持逐字不變），除非該文案本身就是重複定義、彼此不一致，此時以目前程式碼實際顯示的版本為準，不自行改寫成看起來更順的說法。
- 不改變既有的無障礙屬性語意（`role="status"` / `role="alert"` / `aria-live` 等行為不能因為抽元件而消失或轉換）。
- 每個 Task 完成後才進到下一個 Task；每個 Task 內先跑受影響頁面的既有測試建立基準，改完再跑一次確認沒有非預期斷言變化。
- 新元件一律要有對應 `.test.ts`（至少涵蓋 props 變化與 emit 行為），不能只靠頁面測試間接覆蓋。
- `AccountDataPage.test.ts` 第 48 行有 `wrapper.get(".confirm-note button.button--primary")` 這種直接耦合 CSS class 的選擇器——Task 1 設計 `ConfirmAction` 元件時，根節點必須保留可命中的 `.confirm-note` class（或者明確更新這個測試選擇器並在 Step 中列出），不能悄悄讓這個既有測試變成誤判通過或誤判失敗。
- 完成後跑 `pnpm --filter @sunshield/web typecheck` 與 `pnpm vitest run apps/web/src/...`（依 Task 影響範圍縮小指令），最終整體跑 `pnpm check`。
- 不提交 `.claude/settings.local.json` 或其他與本任務無關的未追蹤檔案。

---

## File Map

### Task 1：Notice／二次確認元件

- Create: `apps/web/src/components/common/AppNotice.vue`（＋ `AppNotice.test.ts`）
- Create: `apps/web/src/components/common/ConfirmAction.vue`（＋ `ConfirmAction.test.ts`）
- Modify: `apps/web/src/pages/FeedbackPage.vue`
- Modify: `apps/web/src/pages/settings/SyncSettingsPage.vue`
- Modify: `apps/web/src/pages/settings/DataSettingsPage.vue`
- Modify: `apps/web/src/pages/settings/AccountDataPage.vue`
- Modify: `apps/web/src/assets/app.css`（新增 `.notice` / `.notice--ok` / `.notice--error` 共用 class）
- Test: `apps/web/src/pages/settings/AccountDataPage.test.ts`、`apps/web/src/pages/settings/SyncSettingsPage.test.ts`（確認既有斷言仍過；`.confirm-note` 選擇器需驗證）

### Task 2：部位勾選網格與時間快選

- Create: `apps/web/src/components/reminder/ZoneSelectorGrid.vue`（＋ `.test.ts`）
- Create: `apps/web/src/components/common/QuickTimePicker.vue`（＋ `.test.ts`）（由 `ApplicationTimeSelector.vue` 搬移＋泛化）
- Delete: `apps/web/src/components/reapplication/ApplicationTimeSelector.vue`（其測試如存在一併搬移，目前確認無獨立 `.test.ts`）
- Modify: `apps/web/src/pages/EventCorrectionPage.vue`
- Modify: `apps/web/src/pages/ReportContextEventPage.vue`
- Modify: `apps/web/src/pages/ReapplyPage.vue`（改 import 路徑與新 props 名稱）

### Task 3：採用既有 SunLoader

- Modify: `apps/web/src/pages/EventCorrectionPage.vue`
- Modify: `apps/web/src/pages/ReportContextEventPage.vue`
- Modify: `apps/web/src/pages/ProductDetailPage.vue`
- Modify: `apps/web/src/pages/ProductsPage.vue`
- Test: `apps/web/src/pages/ProductDetailPage.test.ts`（目前無 loading 狀態斷言，需確認改動不影響既有案例）

### Task 4：空白狀態卡片

- Create: `apps/web/src/components/common/EmptyStateCard.vue`（＋ `.test.ts`）
- Modify: `apps/web/src/pages/ProductsPage.vue`
- Modify: `apps/web/src/pages/help/HelpIndexPage.vue`
- Modify: `apps/web/src/pages/ProductDetailPage.vue`（「找不到這件裝備」併入 `EmptyStateCard`，已確認納入）

### Task 5（低優先／選配）：MorePage 導覽清單

- Create: `apps/web/src/components/common/ListNav.vue`（＋ `.test.ts`）
- Modify: `apps/web/src/pages/MorePage.vue`

### Task 6：頁尾連結一致性小修正

- Modify: `apps/web/src/pages/InstallPage.vue`（如需要）
- Modify: `apps/web/src/pages/PlaceholderPage.vue`（如需要）
- 註：`SpecialSituationPage.vue` 實際上已使用 `text-link text-link--muted` 且已用共用元件 `ContentUnderReview.vue`，不屬於手刻問題，稽核原文列錯，這裡不需要改動。

---

## Task 1: 建立 Notice 與二次確認共用元件

**Files:** 見 File Map「Task 1」。

**Interfaces:**

- `AppNotice.vue`
  - Props：`kind: 'ok' | 'error'`（決定 class 與 `role`：`ok` → `role="status"`、`error` → `role="alert"`）
  - Slot：default（訊息內容，取代目前逐頁手寫的插值文字）
  - 輸出 DOM 需保留 `class="notice notice--ok"` / `class="notice notice--error"`，讓既有測試中以文字比對（非 class 比對）的斷言不受影響。
- `ConfirmAction.vue`
  - Props：`confirming: boolean`、`pending?: boolean`（對應各頁的 `busy`）、`triggerLabel: string`、`confirmLabel: string`、`cancelLabel?: string`（預設「取消」）
  - Slot：`warning`（可選，放确认前的警示文字，例如 AccountDataPage 的「確定要清除雲端資料嗎？」、DataSettingsPage 的清單式警示）
  - Emits：`trigger`（點第一顆按鈕，通常父層自己把 `confirming` 設 true）、`confirm`、`cancel`
  - 根節點在「已進入確認態」時輸出 `class="confirm-note"`（沿用現有 class 名稱），確保 `AccountDataPage.test.ts` 的 `.confirm-note button.button--primary` 選擇器不必更動。

**Steps:**

- [x] Step 1: 執行基準測試 —— 確認只有 `SyncSettingsPage.test.ts`／`AccountDataPage.test.ts` 存在（`FeedbackPage.test.ts`／`DataSettingsPage.test.ts` 沒有頁級測試），2 個檔案 4 個測試皆通過，記為基準。

- [x] Step 2: 在 `app.css` 新增 `.notice` / `.notice--ok` / `.notice--error` 共用 class，取 `DataSettingsPage.vue` 的完整版本（含 padding／底色），附上收斂註解與日期。

- [x] Step 3: 建立 `AppNotice.vue` 與 `AppNotice.test.ts`（涵蓋 `kind="ok"` 與 `kind="error"` 兩種 role／class 輸出）。

- [x] Step 4: 建立 `ConfirmAction.vue` 與 `ConfirmAction.test.ts`。實作時發現 Interfaces 草案沒考慮到的兩個真實差異：(1) `DataSettingsPage.vue` 的「清除草稿」原本沒有警示文字，只有按鈕；改用 `$slots.warning` 有無內容決定要不要套 `.confirm-note` 外框，沒有警示文字時只顯示按鈕列。(2) 觸發按鈕除了 `pending` 還需要獨立的 `triggerDisabled`（草稿列的 `!summary.hasSetupDraft`），補了這個 prop。

- [x] Step 5: 改 `FeedbackPage.vue`、`SyncSettingsPage.vue` 套用 `AppNotice`，刪除各自 scoped 的 `.notice*` 定義。

- [x] Step 6: 改 `DataSettingsPage.vue` 三組清除確認（drafts／history／all）與 `AccountDataPage.vue` 清除雲端資料套用 `ConfirmAction`；`notice notice--ok/error` 套用 `AppNotice`；刪除頁面內對應 scoped style。

- [x] Step 7: 確認測試 —— `SyncSettingsPage.test.ts`、`AccountDataPage.test.ts`、`AppNotice.test.ts`、`ConfirmAction.test.ts` 共 12 個測試全過；`AccountDataPage.test.ts` 的 `.confirm-note` 選擇器不需修改選擇器本身，但因為 `shallowMount` 預設會把子元件整個換成 stub、內部 DOM 不會渲染，額外加了 `global: { stubs: { ConfirmAction: false } } }` 讓這個元件照常渲染，測試才能命中真正的 DOM。這是計畫草案沒預料到的必要修改。`pnpm --filter @sunshield/web typecheck` 與全專案 `pnpm vitest run`（80 檔／474 測試）皆通過。

**已知的視覺收斂差異（非破壞性，供之後對照）：**
- `DataSettingsPage.vue` 的「清除裝備與歷史」「清除全部」原本 `.confirm-note` 警示框與下方的確認／取消按鈕是分開的兩個區塊（垂直堆疊）；`ConfirmAction` 統一成 `AccountDataPage.vue` 的樣子——按鈕列包在警示框內、並排顯示。
- `DataSettingsPage.vue` 三組「取消」按鈕原本沒有 `:disabled="busy"`（只有確認按鈕有），`AccountDataPage.vue` 的取消按鈕原本就有。`ConfirmAction` 統一成「pending 時取消也停用」，避免清除進行中被取消造成競態。

---

## Task 2: 部位勾選網格與時間快選抽取

**Files:** 見 File Map「Task 2」。

**Interfaces:**

- `ZoneSelectorGrid.vue`
  - Props：`zones: ZoneProjection[]`（selectable 清單）、`selectedZoneIds: string[]`、`locked?: boolean`
  - Emits：`toggle: [zoneInstanceId: string]`
  - 內部沿用 `getZoneLabel`（`features/reminder/reminderPresentation`）取部位顯示名稱；保留 `zone-grid` / `zone-chip` / `zone-chip--locked` class 名稱與既有樣式數值，只搬移不改視覺。
- `QuickTimePicker.vue`（由 `ApplicationTimeSelector.vue` 泛化）
  - Props：`heading: string`（原本各頁寫死的 `<h2>` 文字，如「實際何時補擦？」／「實際什麼時候發生？」／「實際何時發生？」，改由呼叫端傳入）、`idPrefix: string`（原本寫死的 `reapply-time` id，改參數化避免同頁多個 picker 時 id 衝突）、`value: string`（occurredAt/appliedAt ISO 字串）、`referenceNow: string`、`error?: string`
  - Emits：`change: [value: string]`、`quick: [minutesAgo: number]`
  - 快選文字（剛剛／15／30／60 分鐘前）維持寫死在元件內，三處呼叫端目前用的都是同一組，不需要參數化。

**Steps:**

- [x] Step 1: 執行基準測試 —— 確認 `ReapplyPage.vue`、`EventCorrectionPage.vue`、`ReportContextEventPage.vue` 三頁都沒有頁級 `.test.ts`（全文搜尋 `.test.ts` 檔案無人 import 這三個頁面），改以全專案 `pnpm vitest run`（Task 1 結束時 80 檔／474 測試）與 `pnpm --filter @sunshield/web typecheck` 作為基準，兩者皆通過。

- [x] Step 2: 建立 `ZoneSelectorGrid.vue` 與 `.test.ts`（涵蓋 toggle emit、locked 時 disabled＋`zone-chip--locked`、選取狀態呈現）。實作時發現 `EventCorrectionPage.vue` 原本鎖定部位時只disable checkbox、沒套用 `zone-chip--locked` 淡化樣式（`ReportContextEventPage.vue` 有），屬於既有漂移；新元件統一套用兩者都鎖定時的樣式，算是收斂順便修掉的小落差。

- [x] Step 3: 改 `EventCorrectionPage.vue`、`ReportContextEventPage.vue` 套用 `ZoneSelectorGrid`，刪除兩頁各自的 `.zone-grid`／`.zone-chip`（含 `--locked`）scoped 定義。

- [x] Step 4a：原地泛化 `ApplicationTimeSelector.vue`，新增 `heading`／`idPrefix` props（預設「實際何時補擦？」／`reapply-time`），內部 `<h2>`／`id` 改吃 props；`#reapply-time-summary` 這個 ID 選擇器改成 `.time-summary` class（本來就是動態 id，selector 沒法用了，順便跟其他兩頁的 class 命名一致）。`ReapplyPage.vue` 未跟著改，typecheck 通過確認預設值等價於原行為。

- [x] Step 4b：`git mv` 搬到 `apps/web/src/components/common/QuickTimePicker.vue`，內容不變。

- [x] Step 5: 改 `ReapplyPage.vue` 的 import 路徑與元件標籤指到 `QuickTimePicker`，未傳 `heading`／`id-prefix`，吃預設值。

- [x] Step 6: 改 `EventCorrectionPage.vue`（`id-prefix="correction-time"`）、`ReportContextEventPage.vue`（`id-prefix="report-time"`）套用 `QuickTimePicker`，刪除兩頁各自的 `.quick-times`／`.time-section input`／`.time-summary` scoped 定義與變成死碼的 `localValue`／`isQuickSelected` 函式。**實作時發現一個 Interfaces 草案沒考慮到的差異**：`EventCorrectionPage.vue` 的確認時間摘要文字原本是「更正後：」，跟另外兩頁的「確認時間：」不同——這不是漂移，是更正頁的刻意用語（呼應「更正」情境），不能強行統一。補了 `summaryLabel` prop（預設「確認時間：」），`EventCorrectionPage.vue` 傳 `summary-label="更正後："`覆寫，其餘不變。

- [x] Step 7: 確認測試與型別 —— 新增 `QuickTimePicker.test.ts`（5 案例）、`ZoneSelectorGrid.test.ts`（3 案例）皆過；`pnpm --filter @sunshield/web typecheck` 乾淨；全專案 `pnpm vitest run` 82 檔／482 測試全過。

---

## Task 3: 採用既有 SunLoader

**Files:** 見 File Map「Task 3」。

**Interfaces:**

- 不新增介面。`SunLoader.vue` 現有 Props：`label?: string`（預設「載入中」）。

**Steps:**

- [x] Step 1: 執行基準測試 —— `ProductDetailPage.test.ts` 4 案例通過（無 loading 狀態斷言），全專案基準是 Task 2 結束時的 82 檔／482 測試。

- [x] Step 2: 逐頁把 `<p role="status">正在讀取…</p>` 換成 `<SunLoader label="正在讀取…" />`（各頁文字保留原字串：「正在讀取這筆紀錄…」／「正在讀取目前提醒狀態…」／「正在讀取裝備資料…」／「正在讀取裝備清單…」），import `SunLoader` from `../components/feedback/SunLoader.vue`。**實作時確認了一件計畫草案沒明講的事**：`SunLoader.vue` 內部是 `<div role="status" :aria-label="label">` 包一個動畫太陽圖示，`label` 只進 `aria-label`，畫面上不會顯示文字——螢幕閱讀器使用者聽到的內容不變，但看得見畫面的使用者從「一行文字」變成「一個轉動的圖示」。這是這個 Task 本來就要做的事（採用全站統一的視覺 loading 指示器），不是意外的副作用，但這裡明講一次以免以為只是換個 class。

- [x] Step 3: 確認測試 —— `ProductDetailPage.test.ts` 4 案例、`pnpm --filter @sunshield/web typecheck`、全專案 `pnpm vitest run`（82 檔／482 測試）皆通過。

---

## Task 4: 空白狀態卡片

**Files:** 見 File Map「Task 4」。

**Interfaces:**

- `EmptyStateCard.vue`
  - Props：`title: string`、`body: string`
  - Slot：`actions`（可選，放 CTA 按鈕，例如 ProductsPage 的「新增防曬裝備」）
  - 根節點 class 沿用 `app-card empty-state`。

**Steps:**

- [x] Step 1: 執行基準測試 —— `ProductDetailPage.test.ts` 4 案例通過；`ProductsPage.vue`／`HelpIndexPage.vue` 確認無對應 `.test.ts`，以全專案 82 檔／482 測試（Task 3 結束時的基準）為準。

- [x] Step 2: 建立 `EmptyStateCard.vue` 與 `.test.ts`。**實作時發現 Interfaces 草案（只有 `title`／`body`／`actions` slot）漏了兩個真實存在的語意差異**：(1) `ProductDetailPage.vue` 的「找不到這件裝備」是那個畫面唯一的標題，用 `<h1>`；其餘兩頁用 `<h2>`——補了 `titleTag` prop（預設 `h2`）。(2) 三個呼叫端的 `role` 不同：`ProductDetailPage` 是 `alert`（錯誤狀態）、`HelpIndexPage` 是 `status`、`ProductsPage` 沒有 role——補了可選的 `role` prop，不強行統一（Global Constraint 明講無障礙語意不能因抽元件而改變）。另外查 `packages/ui/src/styles.css` 確認全站已有 `h1,h2,h3{margin:0}` 的共用重置（2026-08-24 收斂過），元件不需要再自己重置標題 margin。

- [x] Step 3: 改 `ProductsPage.vue`「還沒有任何裝備」與 `HelpIndexPage.vue`「目前沒有可查看的內容」套用 `EmptyStateCard`，刪除各自 scoped `.empty-state` 定義。**過程中抓到一個會實際變成視覺回歸的地方**：`HelpIndexPage.vue` 原本的 `.empty-state h2` 有明講 `font-size: var(--font-size-section-title)`（1.15rem），`ProductsPage.vue`／`ProductDetailPage.vue` 原本都沒有這個覆寫（本身就是既有落差）。如果元件不補這個字級，三頁收斂後 `HelpIndexPage` 的標題會從 1.15rem 跳大成瀏覽器預設 h2 字級（約 1.5em），是看得見的變大。已經在 `EmptyStateCard.vue` 補上 `.empty-state h2 { font-size: var(--font-size-section-title); }`，h1 維持不覆寫（跟 `ProductDetailPage.vue` 原本行為一致）。

- [x] Step 4: 改 `ProductDetailPage.vue`「找不到這件裝備」套用 `EmptyStateCard`（`title-tag="h1"` `role="alert"`），刪除該頁 scoped `.empty-state` 定義。

- [x] Step 5: 確認測試與型別 —— `EmptyStateCard.test.ts`（3 案例）、`ProductDetailPage.test.ts`（4 案例）皆過；`pnpm --filter @sunshield/web typecheck` 乾淨；全專案 `pnpm vitest run` 83 檔／485 測試全過。

**已知的視覺收斂差異（非破壞性，供之後對照）：**
- `HelpIndexPage.vue` 原本的空白狀態 padding 是 `clamp(1.25rem, 5vw, 2rem)`（隨螢幕寬度變化）、`gap` 是 `var(--space-3)`；`ProductsPage.vue`／`ProductDetailPage.vue` 原本是固定 `padding: var(--space-5)`、`gap: var(--space-4)`。`EmptyStateCard` 統一採用後者（2 對 1 的既有多數版本），`HelpIndexPage` 在寬螢幕上的空白狀態卡片會比改動前略窄一點。

---

## Task 5（低優先／選配）: MorePage 導覽清單抽象

**說明：** `MorePage.vue` 的 `.entry-list`／`.entry` 目前只有這一個頁面在用，**不是重複**，只是稽核建議的預防性抽象。優先度明顯低於 Task 1–4，建議等未來真的出現第二個「導覽清單」頁面時再抽，避免為了單一用途新增一層不必要的間接。

**2026-08-25 使用者決定：跳過。** 目前只有單一呼叫端，抽元件不會消除任何重複，純粹是預防性間接層，不符合「不為假設性需求設計」的原則。等真的出現第二個導覽清單頁面時再重新評估。

**Files:** 見 File Map「Task 5」。

**Interfaces（若執行）:**

- `ListNav.vue`
  - Props：`entries: { to: string; icon: string; label: string; description: string }[]`
  - 內部渲染目前 `MorePage.vue` 的 `.entry-list`／`.entry` 結構，樣式逐字搬移。

**Steps（若執行）:**

- [ ] Step 1: 建立 `ListNav.vue` 與 `.test.ts`。
- [ ] Step 2: 改 `MorePage.vue` 套用，刪除頁面內對應 scoped style。
- [ ] Step 3: 確認 `pnpm --filter @sunshield/web typecheck` 通過。

---

## Task 6: 頁尾連結一致性小修正

**Files:** 見 File Map「Task 6」。

**Steps:**

- [x] Step 1: 核對 `InstallPage.vue`、`PlaceholderPage.vue`、`SpecialSituationPage.vue` 三頁的頁尾／返回連結 class 與目的地——2026-08-25 重新讀檔確認：`InstallPage.vue`（`text-link text-link--muted` → `/more`）與 `SpecialSituationPage.vue`（同樣 `text-link text-link--muted` → `/more`）已經一致；`PlaceholderPage.vue` 的連結是 `text-link`（無 `--muted`）且目的地是 `/`（帶圖示的「返回提醒」），這是刻意的不同用途（無效路由回首頁 vs. 子頁返回上一層選單），不是需要修正的不一致。
- [x] Step 2: 稽核原文描述不準確，三頁頁尾連結已經各自符合其用途，無需改動。

---

## Open Questions（已於 2026-08-25 由使用者決定，記錄於此供追溯）

1. **Notice 視覺樣式基準** → 已決定：採用 `DataSettingsPage.vue` 的完整版本（有 padding／圓角／底色的卡片），Task 1 Step 2 依此執行。
2. **`ProductDetailPage.vue` 的「找不到這件裝備」要不要併入 `EmptyStateCard`？** → 已決定：要併入。Task 4 File Map 與 Step 4 已更新為必做項目。
3. **`QuickTimePicker` 是否要連帶重新命名 `ApplicationTimeSelector.vue` 並搬移資料夾？** → 已決定：拆成兩個更小步驟——先在原地加 `heading`／`idPrefix` props（帶預設值，行為不變）並驗證測試通過，再單獨做搬檔案改名。Task 2 Step 4 已拆為 Step 4a／4b。
