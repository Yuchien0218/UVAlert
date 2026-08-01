# Sunshield Advisor

這個 repository 採用 Web／PWA first、Capacitor-ready 的 pnpm monorepo。

目前的可執行核心分為：

- `packages/contracts`：跨 UI、domain、儲存層共用的版本化 Zod schema。
- `packages/domain`：不依賴 Vue、Dexie、瀏覽器 global 或系統時間的純 reducer。
- `packages/persistence-web`：Dexie／IndexedDB schema、原子 command transaction 與跨分頁 invalidation。
- `tools/region-data`：將官方 NLSC 鄉鎮市區 SHP 固定版本轉成可重現的 WGS84 裝置端界線與索引。

## 地區設定與定位隱私

`/region` 支援目前位置、手動行政區與明確略過。精確經緯度只在使用者按下按鈕後短暫存在單次函式記憶體中，裝置內界線解析完成後不會保存、加入 URL、記錄或傳送到 UV API。IndexedDB 只保存官方 `TOWNCODE`、縣市／行政區名稱、界線版本與選擇方式。

官方界線重建與驗證方式請見 `tools/region-data/README.md`。

## 本機驗證

```bash
pnpm install
pnpm check
```

規格依據：

- `防曬晴報員PRD.md`
- `P0_TECHNICAL_DESIGN_DOCUMENT.md`
- `P0_REMINDER_RULE_DECISION_TABLE.md`
