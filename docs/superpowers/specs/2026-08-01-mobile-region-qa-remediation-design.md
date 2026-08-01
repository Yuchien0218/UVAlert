# 真機地區驗收修正設計

日期：2026-08-01  
狀態：待使用者審閱

## 目的

修正 Samsung Android 真機驗收發現的四項問題，同時維持既有行政區界線配對、IndexedDB preference、contracts 與 reducer 不變。

## 範圍

1. 修正產品頁在手機上的文字擠壓與同一題可呈現多個已選 radio 的問題。
2. 改善 Samsung Internet 封鎖定位後被誤顯示為純粹定位逾時的情況。
3. 行政區候選出現後，只保留一個主要 CTA。
4. 手動選擇改為縣市與鄉鎮市區兩層下拉，移除搜尋框並提供明確驗證回饋。

不包含產品目錄資料模型、提醒規則、IndexedDB schema、行政區界線內容或 UV API 的修改。

## 元件與責任

### `ProductsPage.vue`

- 繼續持有產品表單唯一真值。
- 將表單容器由 `shallowRef` 改為可追蹤巢狀欄位的 `ref`，因頁面會替換整份 snapshot，也需要追蹤子欄位變更。

### `ProductSnapshotEditor.vue`

- 每一題的 radio 使用各自獨立且穩定的 group name。
- 同一題任何時刻只能有一個 checked 項目。
- 手機寬度採單欄選項，使用「左側 radio、右側完整文字」。
- 較寬畫面才恢復二欄或三欄，避免中文逐字斷行。

### `BrowserGeolocation.ts`

- 保留瀏覽器原始 geolocation error code 對應。
- 當瀏覽器回傳 `timeout` 或 `position_unavailable` 時，若 Permissions API 可用，額外讀取 geolocation permission state。
- permission state 為 `denied` 時，統一回傳 `permission_denied`。
- Permissions API 不支援、查詢失敗或狀態不是 denied 時，保留原始錯誤分類。
- 不保存座標或瀏覽器原始錯誤內容。

### `RegionLocationPanel.vue`

- 尚無候選結果時，顯示主要 CTA「使用目前位置」。
- 候選結果出現後：
  - 唯一主要 CTA 為「確認並使用此地區」。
  - 原本的定位操作降級為「重新定位」次要文字按鈕。
- timeout 文案改為同時涵蓋權限與訊號不明的保守說法，避免瀏覽器無法正確分類時誤導使用者。

### `RegionManualSelector.vue`

- 移除行政區搜尋輸入框。
- 第一層選擇縣市；第二層只顯示該縣市的鄉鎮市區。
- 尚未選縣市時，第二層顯示「請先選擇縣市」並保持停用。
- 「保存手動選擇」只在保存 transaction 進行中停用；資料不完整時仍可點擊並得到回饋。
- 未選縣市：顯示「請先選擇縣市」，並將焦點移至縣市欄位。
- 已選縣市但未選行政區：顯示「請選擇鄉鎮市區」，並將焦點移至行政區欄位。
- 變更縣市時清除舊行政區與既有錯誤。

## 資料流

產品頁維持 `ProductsPage -> v-model -> ProductSnapshotEditor`。子元件只更新表單值，不自行保存；保存仍由頁面控制器執行。

地區頁維持 `RegionPage -> props -> RegionLocationPanel / RegionManualSelector`，子元件透過 typed emits 回報定位、確認或保存。實際 preference transaction 仍由既有 region controller 處理。

## 錯誤與無障礙

- 欄位錯誤使用可被輔助科技讀取的提示，欄位以 `aria-invalid`、`aria-describedby` 關聯錯誤。
- 驗證失敗後把焦點移到第一個未完成欄位。
- 定位錯誤保留可恢復操作；手動選擇與略過不被封鎖。
- 任一狀態只呈現一個主要 CTA，降低手機單手操作時的選擇負擔。

## 測試策略

### 元件測試

- 產品同一題連續選擇不同答案後，只剩最後一個 checked。
- 產品選項具有正確的 radio group name。
- 候選行政區出現前後，主要 CTA 數量與文案符合設計。
- 手動選擇不再渲染搜尋框。
- 未選縣市或行政區時，點保存會顯示對應錯誤且不 emit。
- 完成兩層選擇後，只 emit 所選 region code。

### Adapter 測試

- 原始 error code 1 仍對應 permission denied。
- error code 3 且 permission state denied 時改判 permission denied。
- Permissions API 不可用或查詢失敗時仍保留 timeout。

### 完整驗證

- `pnpm typecheck`
- `pnpm test`
- `pnpm build`
- Samsung Internet 真機複驗產品單選、拒絕定位、CTA 層級與手動兩層選擇。

## 驗收條件

1. 手機上產品選項不再逐字直排，同一題不能同時顯示多個已選答案。
2. Samsung Internet 已封鎖定位且 Permissions API 可辨識時，顯示權限遭拒提示；無法辨識時使用不誤導的通用提示。
3. 行政區候選狀態只有「確認並使用此地區」是主要按鈕。
4. 手動流程不需要輸入搜尋文字，未完成選擇時會立即得到明確回饋。
5. 既有行政區配對、保存、恢復、略過與 UV preference 行為不變。
