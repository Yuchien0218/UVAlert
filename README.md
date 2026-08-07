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
- `docs/decisions/`（裁決當下的規劃筆記與互動原型，規格回寫的依據）

> **注意：2026-08-06 的六項裁決已寫進 P0 文件，但尚未實作。** 這些段落的規格**超前**程式碼，不是現況描述：
>
> - 設定流程兩步（S-06 廢除併入 S-05）——程式碼仍是三步，`/setup/review` route 還在。
> - S-04 揭露層次（收合預設、0 個常駐單選鈕）——現況 20 個常駐單選鈕，違反 PRD §5.2.5。
> - S-11 防曬裝備清單（四品類、四個新欄位）——`SunscreenProducts` 尚未加 `gearCategory`。
> - S-15 `/help` Q&A 總覽——route 未建立。
>
> 裁決背景與互動原型見 `docs/decisions/`。實作前先讀那裡，不要只看規格條文。
>
> 另有兩項尚未裁決：**本機匯出是否進 P0**、**S-07 四個次要 CTA 的目的地**。
