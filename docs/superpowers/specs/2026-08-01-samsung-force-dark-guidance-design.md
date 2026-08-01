# Samsung Internet 強制深色提示設計

## 目的

當使用者在 Samsung Internet 中明確選擇「淺色」，但瀏覽器仍可能強制轉換網頁顏色時，提供可立即採取行動的說明。此功能只負責解釋瀏覽器層級限制，不改變現有 `light | dark | system` 外觀狀態，也不宣稱能偵測 Force Dark 是否實際啟用。

## 採用方案

在「更多設定 → 外觀設定」卡片內加入情境式資訊提示，顯示條件必須同時符合：

1. 瀏覽器 User-Agent 可辨識為 Samsung Internet；
2. 使用者的外觀偏好是明確的 `light`，而不是 `system` 的解析結果。

深色、跟隨系統、Google Chrome 與其他瀏覽器不顯示此提示。

## 文案

> Samsung Internet 可能優先套用網頁深色模式。若畫面仍是深色，請至瀏覽器「設定 → 網頁檢視與捲動 → 深色模式」改為淺色。

此提示使用資訊性語氣與 `role="status"`，不使用錯誤警示或危險色，因為 App 的設定與資料並未出錯。

## 程式邊界

- 新增純函式 `isSamsungInternet(userAgent: string): boolean`，只負責辨識包含 `SamsungBrowser/` token 的 User-Agent。
- `MorePage.vue` 讀取瀏覽器 User-Agent，將布林值以 prop 傳給 `AppearanceSettings.vue`。
- `AppearanceSettings.vue` 依 Samsung Internet prop 與目前 `v-model` preference 決定是否顯示提示。
- 不修改 `createAppearanceController`、localStorage key、Design Tokens、IndexedDB、contracts 或 reducer。

## 測試

- 純函式測試 Samsung Internet User-Agent 回傳 `true`，Chrome User-Agent 回傳 `false`。
- 元件測試驗證 Samsung Internet＋`light` 顯示提示。
- 元件測試驗證 Samsung Internet＋`system`、Samsung Internet＋`dark`、其他瀏覽器＋`light` 不顯示提示。
- 完成後執行完整 `pnpm typecheck`、`pnpm test` 與 `pnpm build`。

## 限制

網頁無法可靠讀取 Samsung Internet 的「強制網頁深色」開關，因此不能只在該開關實際開啟時顯示。提示採條件式說明，不把瀏覽器類型當成實際錯誤狀態。
