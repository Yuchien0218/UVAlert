# 頁內相機畫面與拍攝清晰度最佳化計畫（對焦、主鏡頭選取與 1080p 解析度）

> **日期：** 2026-11-01
> **目標：** 解決 Android 頁內即時鏡頭畫面「霧霧的（失焦／畫質偏糊）」問題，同時維持前景拍攝不閃退的穩定性。

**Global Constraints:**
- **設計遵守 Design Token**：嚴格使用 `DESIGN.md`、`packages/ui/src/styles.css` 與 `apps/web/src/assets/app.css` 既有變數，通過 Stylelint 與所有版面守門測試。
- **禁止使用 EMOJI**：介面文案、程式碼、註解與計畫文件嚴禁任何 Emoji。
- **邏輯抽離與勿造輪子**：使用標準 W3C MediaStream Image Capture 擴充屬性（`getCapabilities`／`applyConstraints`），將鏡頭選取與對焦控制抽離至獨立 helper 模組測試。
- **分批執行與每次檢查**：每批先寫紅燈測試（Red），實作轉綠（Green）並檢查型別與 Lint 後再推進。

---

## 模糊（霧感）根因分析

1. **串流解析度偏低（720p 裁切）**：先前請求 `1280x960`（4:3），Android Camera2 WebRTC 常落回 `1280x720`，直向取景裁切為 3:4 後實際寬度僅約 `720px`，在高解析度手機螢幕上呈現明顯模糊感。
2. **未強制啟用連續自動對焦（`focusMode: "continuous"`）**：部分 Android 機型預設以泛焦或單次對焦啟動串流，近拍防曬乳瓶身小字時無法即時合焦。
3. **多鏡頭手機誤選固定焦距超廣角鏡頭**：部分 Android 機型（如 Samsung 等多後鏡頭機種）在 `facingMode: "environment"` 下可能預設選到不具自動對焦的 `0.6x` 超廣角鏡，近拍必糊。
4. **大感光元件最近對焦距離限制**：主鏡頭物理最近對焦距離約 15 公分，貼太近拍背面細字會失焦；提供硬體變焦切換（`1x`／`2x`）讓使用者保持約 15～20 公分距離即可拍出銳利字體。

---

## 分批執行清單 (Batches)

### Batch 1: 清晰後鏡頭選取、連續自動對焦與硬體變焦 Helper（TDD）
- [x] **Step 1.1**: 建立 `apps/web/src/helpers/liveCameraStream.test.ts` 紅燈測試：
  - 驗證預設以 Full HD（`width: { ideal: 1920 }, height: { ideal: 1080 }`）請求後鏡頭。
  - 驗證若首顆開啟之後鏡頭不支援 `continuous` 自動對焦，會自動透過 `enumerateDevices` 尋找並切換至支援 `continuous` 自動對焦的後置主鏡頭，且立即 `stop()` 舊串流。
  - 驗證開啟後自動套用 `focusMode: "continuous"`，並回傳是否支援 `2x` 硬體變焦以及變焦切換函式。
- [x] **Step 1.2**: 執行測試確認紅燈（Red）。
- [x] **Step 1.3**: 實作 `apps/web/src/helpers/liveCameraStream.ts`，並將擷取輸出上限微調至 `1440px`、品質 `0.85`（單張僅約 150KB，兼顧文字銳利度與低記憶體）。
- [x] **Step 1.4**: 執行單元測試與 `typecheck` 確認全綠。

### Batch 2: `GearPhotoScannerSheet.vue` 整合自動對焦鏡頭與 `1x`／`2x` 近拍變焦控制（TDD）
- [x] **Step 2.1**: 在 `apps/web/src/components/product/GearPhotoScannerSheet.test.ts` 新增紅燈測試：
  - 驗證開啟鏡頭時委派 `openSharpRearCameraStream` 取得具備連續對焦之高畫質串流。
  - 驗證當裝置支援硬體變焦時顯示 `1x`／`2x` 切換控制，點擊 `2x` 可觸發硬體變焦以利近拍小字對焦。
- [x] **Step 2.2**: 執行測試確認紅燈（Red）。
- [x] **Step 2.3**: 更新 `apps/web/src/components/product/GearPhotoScannerSheet.vue`（遵守 Design Token、無 Emoji）。
- [x] **Step 2.4**: 執行元件測試、`pnpm lint` 與 `pnpm typecheck` 確認全綠。

### Batch 3: 全站守門檢查、建置與部署上線
- [x] **Step 3.1**: 執行 `pnpm check` 與 `pnpm --filter @sunshield/web build` 確認 0 錯誤。
- [x] **Step 3.2**: 更新計畫進度、Commit 並推送至 GitHub `main` 部署正式站。
