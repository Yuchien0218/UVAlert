# Sunshield Advisor

這個 repository 採用 Web／PWA first、Capacitor-ready 的 pnpm monorepo。

目前的可執行核心分為：

- `apps/web`：Vue 3＋Vite 的 PWA 前端，唯一的可執行應用。
- `packages/contracts`：跨 UI、domain、儲存層共用的版本化 Zod schema。
- `packages/domain`：不依賴 Vue、Dexie、瀏覽器 global 或系統時間的純 reducer。
- `packages/persistence-web`：Dexie／IndexedDB schema、原子 command transaction 與跨分頁 invalidation。
- `packages/platform`：domain 與瀏覽器之間的 port 介面（儲存、定位、連線、生命週期），實作在 `apps/web/src/adapters`。
- `packages/ui`：設計 token（`src/styles.css`）與主題識別，被 `apps/web` 匯入。
- `packages/test-fixtures`：跨套件共用的測試資料與契約測試。
- `tools/region-data`：將官方 NLSC 鄉鎮市區 SHP 固定版本轉成可重現的 WGS84 裝置端界線與索引。

## 地區設定與定位隱私

`/region` 支援目前位置、手動行政區與明確略過。精確經緯度只在使用者按下按鈕後短暫存在單次函式記憶體中，裝置內界線解析完成後不會保存、加入 URL、記錄或傳送到 UV API。IndexedDB 只保存官方 `TOWNCODE`、縣市／行政區名稱、界線版本與選擇方式。

官方界線重建與驗證方式請見 `tools/region-data/README.md`。

## 修改畫面之前

視覺樣式有兩份規範，**動任何畫面前先讀**：

- `DESIGN_SYSTEM.md`：字級、容器、對齊、動畫的四條核心規則，以及目前哪些畫面還沒套用。
- `docs/ICON_DESIGN_SYSTEM.md`：圖示的線條、尺寸、對齊與動畫規則。

這兩份是**說明「為什麼」的文件，不是真實來源**。現況的真實來源只有兩個檔案：

- `packages/ui/src/styles.css`：設計 token（字級、間距、顏色、圓角、動畫時間）
- `apps/web/src/assets/app.css`：共用類別（`.app-card`、`.button`、`.text-link`、`.stat-figure`）

文件與這兩個檔案衝突時以檔案為準，並回頭修文件。`apps/web/dist/` 是過期建置產物，不可當作現況參考。

## 本機驗證

```bash
pnpm install
pnpm check
```

規格依據：

- `防曬晴報員PRD.md`
- `P0_TECHNICAL_DESIGN_DOCUMENT.md`
- `P0_REMINDER_RULE_DECISION_TABLE.md`
- `P0_SCREEN_INVENTORY.md`（畫面、狀態與 route）
- `P0_COPY_DECK.md`（介面文案與審查狀態；改動畫面文字要走這裡的流程）

> 注意：P0 文件的部分內容已落後於程式碼（`P0_SCREEN_INVENTORY.md` 的首頁資訊順序與 route 總表、`P0_TECHNICAL_DESIGN_DOCUMENT.md` §7.2 的 component map），且與 `DESIGN_SYSTEM.md` 有兩處尚未裁決的衝突：**字級下限**（P0 要求內文至少 16px，現行 token 是 14px）與**狀態表達方式**（P0 要求顏色須搭配邊框／圖示，現行規則是結構性區塊無框）。引用 P0 的視覺規定前先確認這兩點。
