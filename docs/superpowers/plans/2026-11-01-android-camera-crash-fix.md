# Android 相機拍攝防曬乳正反面閃退（白畫面重整與照片遺失）修復計畫

> **日期：** 2026-11-01
> **目標：** 徹底解決 Android Chrome／PWA 點擊「拍照」切換外部系統相機後，返回網頁瞬間發生白畫面重整（閃退）並導致已拍照片消失的問題。

**Global Constraints:**
- **設計遵守 Design Token**：所有樣式嚴格使用 `DESIGN.md`、`packages/ui/src/styles.css` 與 `apps/web/src/assets/app.css` 定義之 CSS 變數與共用類別，不寫死色碼、圓角、行高或過場秒數。
- **禁止使用 EMOJI**：介面文字、程式碼、註解與計畫文件嚴禁出現任何 Emoji。
- **勿造輪子硬寫**：直接採用瀏覽器原生 `navigator.mediaDevices.getUserMedia`、既有 `compressImageFile` 與 `gearFormDraft` 模組。
- **分批執行與每次檢查**：每一批次先寫可重現問題之紅燈測試（Red），實作修復轉綠（Green）後執行型別與 Lint 檢查，再進入下一批。

---

## 根因診斷紀錄

經與使用者確認重現環境與現象：
1. **環境**：Android Chrome 瀏覽器／桌面 PWA。
2. **現象**：選擇「拍照」開啟系統相機，拍完按「確定」返回瞬間，網頁發生白畫面重新整理，剛拍的照片全部消失。

對應底層機制共有三層問題：
1. **外部系統相機觸發背景分頁記憶體回收（主因）**：透過 `<input type="file" accept="image/*">` 選取「拍照」時，Android 會將 Chrome／PWA 退至背景並啟動原廠相機 Activity（ISP／HDR 管線常佔用 800MB 至 1.5GB RAM）。Android Low Memory Killer 隨即回收背景的瀏覽器 Renderer 程序；當使用者在相機按「確定」返回時，網頁被迫冷啟動重整，`change` 事件永遠無法送達，且頁面重新掛載。
2. **掃描器預覽照片未納入 `sessionStorage` 草稿暫存（次因 A）**：`GearPhotoScannerSheet.vue` 內的 `frontImageDataUrl` 與 `backImageDataUrl` 僅存於記憶體 `ref`，未同步寫入 `sessionStorage`；一旦分頁因任何切換重載，先前拍好的正面／背面預覽即全數歸零。
3. **高畫素原圖解碼與 Canvas GPU 緩衝未即時釋放（次因 B）**：`imageCompress.ts` 先前僅用 `new Image()` 載入原圖，轉繪後未立即呼叫 `ImageBitmap.close()` 或清空 `img.src = ""`，亦未將暫存 `canvas.width = 0; canvas.height = 0;` 歸零釋放 GPU 材質，且檔案 `<input>` 未清空 `input.value = ""`，使瀏覽器在拍完第一張後殘留大量原生點陣圖記憶體，進一步提高拍第二張時被系統回收的機率。

---

## 分批執行清單 (Batches)

### Batch 1: 原生／GPU 影像記憶體即時釋放與掃描照片 `sessionStorage` 暫存（TDD）
- [x] **Step 1.1**: 在 `apps/web/src/helpers/imageCompress.test.ts` 與 `apps/web/src/features/product/gearFormDraft.test.ts` 新增紅燈測試：
  - 驗證支援 `createImageBitmap` 時優先使用，並在繪製完成後立即呼叫 `bitmap.close()` 與歸零 `canvas.width`／`canvas.height` 釋放記憶體；`new Image()` 路徑亦同步清空 `img.src` 與 `canvas` 尺寸。
  - 驗證 `gearFormDraft.ts` 支援 `saveScannerPhotosDraft`、`loadScannerPhotosDraft` 與 `clearScannerPhotosDraft`，且呼叫 `clearGearFormDraft()` 時一併清除掃描照片暫存。
- [x] **Step 1.2**: 執行測試確認紅燈（Red）。
- [x] **Step 1.3**: 實作 `apps/web/src/helpers/imageCompress.ts` 與 `apps/web/src/features/product/gearFormDraft.ts`。
- [x] **Step 1.4**: 執行單元測試與 `typecheck` 確認全綠（20 項測試全數通過）。

### Batch 2: 頁內即時鏡頭拍攝（`getUserMedia`）避免跳出外部相機 ＋ 相簿選圖與草稿自動還原（TDD）
- [x] **Step 2.1**: 在 `apps/web/src/components/product/GearPhotoScannerSheet.test.ts` 新增紅燈測試：
  - 驗證支援 `navigator.mediaDevices.getUserMedia` 時，點擊拍攝按鈕在頁內開啟後鏡頭 `<video>` 即時取景（Chrome 維持前景運作、不啟動外部系統相機 App），拍完正面自動切換待拍背面，拍完背面、取消或元件卸載時立即呼叫 `track.stop()` 釋放鏡頭。
  - 驗證保留「從相簿選擇」按鈕供選取既有照片，選檔壓縮後立即清空 `input.value = ""`；若 `getUserMedia` 權限遭拒或不支援，自動退回檔案選擇流程並提示使用者。
  - 驗證拍攝或選圖後自動寫入 `sessionStorage`，元件重掛載時自動還原正面／背面預覽；辨識完成（`detected`）或取消（`cancel`）時清除照片暫存。
- [x] **Step 2.2**: 執行測試確認紅燈（Red）。
- [x] **Step 2.3**: 更新 `apps/web/src/components/product/GearPhotoScannerSheet.vue` 與 `apps/web/src/components/setup/GearFormSheet.vue`（關閉抽屜時同步清除草稿暫存）。
- [x] **Step 2.4**: 執行元件測試、`pnpm lint`（ESLint + Stylelint）與 `pnpm typecheck` 確認全綠（21 項元件測試與 21 組設計守門全數通過）。

### Batch 3: 全專案品質檢查、建置驗證與正式環境部署
- [x] **Step 3.1**: 執行 `pnpm check`（213 個測試檔、8,342 項測試、ESLint、Stylelint）與 `pnpm --filter @sunshield/web build`，確認所有測試、型別、CSS Token 守門與 Emoji 檢查 0 錯誤。
- [x] **Step 3.2**: 更新計畫打勾紀錄，Commit 並推送至 GitHub `main` 觸發 Vercel 正式站更新。
