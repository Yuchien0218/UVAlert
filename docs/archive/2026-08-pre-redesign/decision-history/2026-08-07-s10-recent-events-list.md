# S-10 最近事件清單 - 實現進度

## 完成狀態

### ✅ 已完成
1. **最近事件清單 UI 組件** - `RecentEventsList.vue`
   - 純顯示組件，無 reducer 更新
   - 支援事件列表顯示（時間、事件名、受影響部位）
   - 預設只顯示最新一筆，其餘收合
   - 點擊展開查看全部事件
   - 時鐘不可信時顯示警告
   - 沒有事件時不顯示空殼區塊

2. **組件功能**
   - 支援的事件類型：
     - 記錄補擦（applicationEvents）
     - 入水／離開水中（water_start／water_end）
     - 情境變更（context_changed）
     - 流汗／擦拭／磨擦／洗手等原因事件
     - 開始提醒（sessionStarted）
   - 事件時間顯示：
     - 同日顯示時間（HH:MM）
     - 跨日顯示日期和時間
   - 響應式設計，符合 DESIGN_SYSTEM 規則

## 待辦項（S-10 實施時完成）

### 1. 事件流數據取得
- 目前 `SessionProjection` 不包含事件流
- 需要在 `SessionRepositoryPort` 中新增 `getEventStream()` 方法
- 或在 `persistence-web` 中實現事件流查詢

### 2. 集成到提醒頁面
```vue
<RecentEventsList
  :zones="boot.currentSession.value.zones"
  :events="eventStream"
  :clock-trusted="boot.clockTrusted"
/>
```

### 3. S-10 路由與導航
- 建立 `/reminder/event/:id/correct` 路由
- 實作可點擊事件進入更正流程
- 不可更正的事件不呈現為可點擊

### 4. 更正事件表單（S-10）
- 修改事件時間
- 修改允許變更的受影響部位
- 以 replace 建立後繼事件
- 在允許情況下 void 事件
- 保留不可變稽核鏈

## 設計決策

### 呈現格式
符合 P0_SCREEN_INVENTORY.md 第 597-634 節的規定：
- 每列一行，共用同一條左對齊線
- 時間、事件、部位三欄，無 icon 佔位
- 展開／收合只改 `opacity`，不做位移

### 規則實施
✓ 預設收合，需要時才展開（S-04 原則）
✓ 只顯示已發生的事實
✓ 事件時間顯示絕對時間；跨日補上日期
✓ 沒有任何事件時不顯示空殼區塊
✓ 時鐘不可信時仍顯示，但標明時間可能不準
✓ 依規則 2：結構性區塊，上緣細分隔線 → 標題 → 內容，無框
✓ 依規則 3：時間、事件、部位三欄不得用 icon 佔位

## 測試驗收

- ✅ 組件類型檢查無誤
- ⏳ 集成測試待 S-10 實施時進行
- ⏳ 瀏覽器端到端測試待事件流數據實裝時進行

## 相關決策

- 2026-08-07 裁決：最近事件清單為 S-10 更正流程的唯一入口
- PRD §5.7.2：要求最近事件清單顯示
- Release Manifest §5.11：承諾「更正本機資料」功能
