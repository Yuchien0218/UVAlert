# Sitemap 分支流程 — 實現狀態

基於 `2026-08-06-sitemap-userflow.html` 的目標架構，本文檔追蹤各分支流程的實現進度。

---

## 一、核心 User Flow（四個節點）

### ✅ 節點 1：首頁 `/`

**規格**
- 主要 CTA：`開始防曬提醒` → `/setup/context`
- 側支：地區與定位 → `/region`（不阻擋主線，沒有地區也能開始提醒）

**實現狀態**
- ✅ 首頁已實作（`HomePage.vue`）
- ✅ 「開始提醒」CTA 可導向設置流程
- ✅ 地區設置側支可用（`/region`）
- ✅ 規格合規：無地區時仍可進行

**程式碼**
- `apps/web/src/pages/HomePage.vue` - 已完成

---

### ✅ 節點 2：設定步驟 1 — 情境 `/setup/context`

**規格**
- 使用者目的：選擇情境（四選一）
- 主要 CTA：`下一步` → `/setup/timing`
- 路由守卫：已有 Session 時進不來，導回首頁

**實現狀態**
- ✅ SetupContextPage 已實作
- ✅ 四個情境選項可用
- ✅ 路由守卫正確（`requiresNoActiveSession: true`）
- ✅ 兩步流程標記（`:max-step="2"`）

**程式碼**
- `apps/web/src/pages/setup/SetupContextPage.vue` - 已完成

---

### ✅ 節點 3：設定步驟 2 — 確認並開始 `/setup/timing`

**規格**
- 使用者目的：
  - 看到建議追蹤部位
  - 輸入實際塗抹時間（剛剛／15／30／60 分鐘前／自訂）
  - 直接開始（計時起點）
- 主要 CTA：`開始提醒` → `/reminder`
- 必顯內容（併入原 S-06）：
  - 情境與水上狀態
  - 追蹤部位與方法
  - 產品 snapshot 摘要
  - 警示（過期／異常／不適）
  - 「提醒期限不是安全曝曬時間」
- 同頁展開（選用）：`調整追蹤部位或防護方式`
- 分支：全衣物覆蓋時，跳過產品與時間輸入

**實現狀態**
- ✅ SetupTimingPage 已重構（本次會議）
  - 整合 SetupCompletionSummary 摘要
  - 按鈕改為「開始提醒」
  - 直接提交（調用 setup.submit()）
- ✅ 時間選擇器可用
- ✅ 產品調整 sheet 可用
- ⏳ 完整摘要顯示（待確認）

**程式碼**
- `apps/web/src/pages/setup/SetupTimingPage.vue` - 已重構
- `apps/web/src/components/setup/SetupCompletionSummary.vue` - 新增
- `apps/web/src/components/setup/SetupStepShell.vue` - 支持 maxStep

**已完成**
- [x] 原 S-06 必顯內容在摘要中完整（2026-08-07，5 則測試守著）
- [x] 全衣物覆蓋分支：隨防護方式移除而不存在，`/setup/review` 已改 redirect

---

### ✅ 節點 4：進行中提醒 `/reminder`

**規格**
- 使用者目的：看到最高優先狀態、受影響部位、原因，執行下一個動作
- 主要 CTA：依 `primaryAction.actionKind` 動態變化（13 種目的地）
- 下一步：S-08 補擦 ／ S-09 回報 ／ S-07 原地處理
- 次要 CTA（2026-08-07 裁決）：
  - `查看已保存紀錄` → 本頁最近事件清單（原地錨點並展開）
  - `查看處理說明` → S-17 特殊狀況
  - `更新防護紀錄` → S-08
  - `更新防護方式` → S-04 原地 sheet
- 最近事件清單（必要元件）：
  - 純文字清單（預設顯示最新一筆，其餘收合）
  - 每列可點進 S-10 更正
  - 是 S-10 的唯一入口

**實現狀態**
- ✅ ReminderPage 已實作
- ✅ 主要 CTA 動態路由（`resolveActionRoute`）
  - 13 個 ActionKind 已完整映射
  - 4 個補擦類 → `/reminder/reapply`
  - 其他 9 個 → 相應的頁面或 placeholder
- ✅ 四則次要 CTA 已實作（2026-08-07）：呈現層新增 `secondaryActions`，
  依 reason code 對照規格表產生；`查看已保存紀錄` 原地錨點並展開、
  `查看處理說明` → S-17、`更新防護紀錄` → S-08、
  `更新防護方式` 暫落 placeholder（無 Session 部位變更命令）
- ✅ 順帶補上三則產品安全卡（過期／異常／不適），先前全部掉進通用 fallback
- ✅ 最近事件清單已集成到提醒頁

**程式碼**
- `apps/web/src/pages/ReminderPage.vue` - 已完成
- `apps/web/src/helpers/resolveActionRoute.ts` + 測試 - 已完成
- `apps/web/src/components/reminder/RecentEventsList.vue` - 已實現（待集成）

---

## 二、提醒子流程

### ✅ S-08：記錄已補擦 `/reminder/reapply`

**規格**
- 包含首次記錄變體（`complete_protection_record`）
- 4 個補擦類 ActionKind 導向此頁

**實現狀態**
- ✅ 完整實現（本次會議）
  - 核心業務邏輯層
  - 完整 UI 組件（部位、產品、時間、確認）
  - 路由與導航
  - 測試通過（5 個測試）

**程式碼**
- 所有相關文件已在本次會議完成
- 149 個測試全部通過

---

### ⏳ S-09：回報狀況 `/reminder/report`

**規格**
- 由 `report_context_event` ActionKind 導向

**實現狀態**
- ❌ 路徑不存在
- ⏳ 待實施

---

### ⚠️ S-10：最近事件更正 `/reminder/event/:id/correct`

**規格**
- 修改事件時間、受影響部位
- 建立後繼事件（replace/void）
- 保留不可變稽核鏈

**實現狀態**（2026-08-07 更新）
- ✅ 路徑已存在（目前為 placeholder，`requiresActiveSession`）
- ✅ 最近事件清單已接上提醒頁，每列可點並正確帶入事件 id
- ✅ 事件流讀取路徑完成：`getCurrentSessionEventStream` +
  `createSessionEventsController`（10 則測試）
- ⏳ 更正表單待實施（唯一剩餘項）

**程式碼**
- `packages/platform` — 新增 `SessionEventStreamRepositoryPort`
- `packages/persistence-web` — `getCurrentSessionEventStream` 公開既有的
  私有 `#loadEventStream`
- `apps/web/src/features/reminder/createSessionEventsController.ts` — 新增
- `apps/web/src/components/reminder/RecentEventsList.vue` — 加上 `correct` emit

---

## 三、設定頁面改版

### ⏳ 產品頁改版 `/products`

**規格**
- 改為防曬裝備清單（不只是防曬產品）
- 兩區呈現：會影響提醒 ／ 純屬紀錄
- 新增品類選擇（防曬乳／衣物／墨鏡／其他裝備）
- 新增欄位：購買月份、到期日、備忘、過去用過
- 只有防曬乳進 reducer

**實現狀態**
- ❌ 未改版
- ⏳ gearCategory 數據模型待擴充
- ⏳ UI 待重構
- 待辦：6 小時

---

### ⏳ 新增裝備 `/products/new`

**規格**
- 先選品類決定後續欄位

**實現狀態**
- ❌ 未實施

---

### ⏳ 編輯裝備 `/products/:id/edit`

**規格**
- 編輯、封存（過去用過）、刪除

**實現狀態**
- ❌ 未實施

---

## 四、說明與設定頁面

### ⏳ Q&A 總覽 `/help`

**規格**
- 列出可用主題
- App 內索引，不對外公開
- 後四項 CTA 直接進入 `/help/beach`

**實現狀態**
- ❌ 未實施
- 待辦：4 小時

---

### ⏳ 海邊防曬 Q&A `/help/beach`

**規格**
- 內容來自 Copy Deck

**實現狀態**
- ❌ 未實施

---

### ⏳ 運作說明 `/help/how-it-works`

**規格**
- 也是 `view_conservative_reminder` 的目的地（時鐘不可信且離線）

**實現狀態**
- ❌ 未實施

---

### ⏳ 特殊狀況 `/special-situation`

**規格**
- 處理產品異常、不適等情況

**實現狀態**
- ❌ 未實施

---

## 五、數據管理與帳號

### ⏳ 顯示設定 `/settings/display`

**規格**
- 外觀設定（亮色/暗色）

**實現狀態**
- ⚠️ 功能已做，但內嵌在 `/more`
- 不符規格的位置

---

### ⏳ 本機資料管理 `/settings/data`

**規格**
- 查看及清除（2026-08-07 裁決：本機匯出納入）
- 匯出不上傳、不經後端
- 清除前必須提示可先匯出

**實現狀態**
- ❌ 未實施
- 待辦：隸屬 P0-19

---

### ⏳ PWA 安裝 `/install`

**規格**
- 提示用戶安裝到手機
- 防止數據遺失的關鍵手段

**實現狀態**
- ❌ 未實施

---

## 六、分支流程矩陣

### 按優先級

| 流程 | 狀態 | 優先級 | 工作量 | 阻擋項 |
| --- | --- | --- | --- | --- |
| 核心 4 節點 | ✅ | P0 | ✓ 完成 | - |
| S-08 補擦 | ✅ | P0 | ✓ 完成 | - |
| 兩步流程 | ✅ | P0 | ✓ 完成 | `/setup/review` 已改 redirect，guard 已移除 |
| S-04 揭露層次 | ⛔ 作廢 | - | - | 2026-08-07 裁決移除防護方式選擇 |
| 最近事件清單 | ✅ | P0 | ✓ 完成 | 已接上提醒頁，S-10 入口打通 |
| S-09 回報狀況 | ❌ | P0 | TBD | - |
| S-10 事件更正 | ❌ | P0 | TBD | 事件流 API |
| 產品頁改版 | ❌ | P0 | 6h | gearCategory |
| /help 幫助 | ⚠️ | P0 | 機制完成 | **內容全未核准，閘門正確擋下** |
| /special-situation | ⚠️ | P0 | 機制完成 | CP-SPECIAL-004/005 為 BLOCKED，流程不得公開 |
| /settings/display | ✅ | P0 | ✓ 完成 | 已從 /more 移到獨立路由 |
| PWA 安裝 | ✅ | P0 | ✓ 完成 | 依平台顯示；不安裝仍可用 |
| /more 五類入口 | ✅ | P0 | ✓ 完成 | 六頁在 App 內終於可達 |
| 本機匯出 | ❌ | P0 | TBD | 隸屬 /settings/data |
| 本機資料管理 | ❌ | P0 | TBD | 路由已存在（placeholder） |

### 按分支類型

| 分支類型 | 數量 | 完成 | 待實施 |
| --- | --- | --- | --- |
| 主流程分支 | 4 | 4 | 0 |
| 提醒子流程 | 3 | 1 | 2 |
| 設定頁面 | 4 | 0 | 4 |
| 說明與設定 | 5 | 0 | 5 |
| 小計 | 16 | 5 | 11 |

---

## 七、規格缺口與分支流程的關係

### 1. 兩步流程 ✅
- **分支影響**：設置精靈從 3 個節點簡化為 2 個
- **實現狀態**：完成
- **對其他流程的影響**：無
- **下游依賴**：無

### 2. S-04 揭露層次 ⛔ 作廢
- **分支影響**：衣物覆蓋路徑整條消失；只剩「追蹤／不追蹤」
- **實現狀態**：2026-08-07 裁決移除逐部位防護方式選擇，本項連同三層揭露一併作廢
- **連帶效果**：「全衣物覆蓋跳過產品與時間」分支不再可達；產品變成建立 Session 的必要條件
- **詳見**：`2026-08-07-remove-protection-method-selection.md`

### 3. gearCategory 裝備分類 ⏳
- **分支影響**：產品頁的分支（品類選擇決定後續欄位）
- **實現狀態**：待實施
- **對其他流程的影響**：影響 S-11、S-12、S-13
- **下游依賴**：數據模型擴充、Copy Deck 審查

### 4. /help 幫助中心 ⏳
- **分支影響**：從多個入口進入幫助
- **實現狀態**：待實施
- **對其他流程的影響**：補充信息流程，不阻擋主線
- **下游依賴**：Copy Deck 內容審查、S-17

### 5. 最近事件清單 ⏳
- **分支影響**：提醒頁的事件查詢 → S-10 更正流程
- **實現狀態**：組件已實現，待集成
- **對其他流程的影響**：S-10 的唯一入口
- **下游依賴**：事件流 API、S-10 實施

---

## 八、下一步建議

### 立即優先（阻擋後續流程）
1. **S-04 揭露層次** - 12 小時
   - 影響設置 UX 和提醒頁的調整入口
   - 建議在 S-11 之前完成

2. **事件流 API** - 6 小時
   - S-10 的前置依賴
   - 最近事件清單集成

### 後續優先（P0 必要功能）
3. **S-11/12/13 產品頁** - 6 小時
   - gearCategory 數據模型
   - 新增、編輯、封存邏輯

4. **/help 幫助中心** - 4 小時
   - 信息架構補完
   - 不阻擋其他流程

5. **S-09、S-10、本機管理** - TBD
   - 後續功能完善

---

## 九、檢查清單

### 已驗證的分支流程
- [ ] 首頁 → 設置 vs 地區側支（AC-33）
- [ ] 設置 2 步流程（S-03 → S-05）
- [ ] 全衣物覆蓋分支（跳過產品時間）
- [ ] 提醒頁 13 個 ActionKind 動態路由
- [ ] 補擦流程首次記錄變體

### 待驗證的分支流程
- [ ] S-04 揭露層次（0-2-3 個單選鈕）
- [ ] 最近事件清單 → S-10 正確傳遞 id
- [ ] 產品品類選擇決定後續欄位
- [ ] /help 後四項 CTA 直接進入 /help/beach
- [ ] 本機匯出 → 清除前提示邏輯

---

## 相關文檔

- 主規格：`2026-08-06-sitemap-userflow.html`
- 屏幕清單：`P0_SCREEN_INVENTORY.md`
- 發布清單：`P0_RELEASE_MANIFEST.md`
- 技術設計：`P0_TECHNICAL_DESIGN_DOCUMENT.md`
- 規則表：`P0_REMINDER_RULE_DECISION_TABLE.md`
- Copy Deck：`P0_COPY_DECK.md`
- PRD：`防曬晴報員PRD.md` v3.11
