# 2026-09-02 台灣在地化文案優化與精簡建議清單

**日期**：2026-09-02（Asia/Taipei）  
**用途**：供 AI / 開發者檢閱並執行全站台灣繁體中文文案之精簡與在地化調整。  
**核心目標**：

1. **消除工程與領域術語外露**（如「保守狀態」、「部位集合」、「時鐘校準」、「資料集編號」等）。
2. **減輕沉重的法規/切結書腔調**（精簡過度防禦性的「不代表...也不代表...」重複長句）。
3. **名詞貼近台灣日常生活習慣**（如「鼻部」改「鼻子」、「追蹤部位」改「常曬部位」）。
4. **手機易讀性排版**（將未分點的 100+ 字長句拆解為清楚步驟）。

---

## 執行注意事項（給接手修改的 AI）

- **測試同步更新**：本專案有守門測試掃描畫面文字（如 `productIdentityCopy.test.ts`、`typographyRoles.test.ts`、`ReportContextEventPage.test.ts` 等）。修改文案時請一併同步更新對應的測試斷言。
- **保留動態插值**：變數（如 `${absoluteTime}`、`${zoneLabel}`、`{{ candidate.displayName }}`）需保留，並確保詞組連接自然。
- **第二人稱慣例**：全站統一使用「你」，**不使用「您」**（依 `2026-08-17-copy-audit.md` 規範）。
- **修改後檢驗**：修改完成後務必執行 `pnpm check` 確保所有測試與 lint 全數通過。

---

## 優化項目詳細對照表

### 類別一：消除內部工程與領域術語（Domain Jargon）

#### 1.1 離線與時鐘異常提示（首頁倒數狀態）

- **檔案**：[`apps/web/src/features/reminder/reminderPresentation.ts`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/features/reminder/reminderPresentation.ts#L259-L261)
- **現行文案**：
  > `body`: `online ? "為避免錯誤延長提醒，請重新連線校準。目前採較短的保守狀態。" : "目前離線，無法確認可信時間。系統不會因此延長期限，請查看保守提醒。"`
- **問題分析**：「保守狀態」、「保守提醒」為內部 domain 術語（conservative reminder），一般使用者無法理解其涵義。
- **建議改為**：
  > `body`: `online ? "請重新連線校對時間。離線期間系統已自動縮短提醒間隔。" : "目前離線無法校對時間，系統已自動縮短提醒間隔以維護防護安全。"`

#### 1.2 防護方式未記錄（首頁倒數狀態）

- **檔案**：[`apps/web/src/features/reminder/reminderPresentation.ts`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/features/reminder/reminderPresentation.ts#L284)
- **現行文案**：
  > `body`: `"防護方式尚未確認，目前會採用保守提醒，暫不顯示補擦倒數。確認防護方式後，即可建立對應的提醒時間。"`
- **問題分析**：句式冗長且重複「保守提醒」、「防護方式尚未確認」，讀起來像系統拋錯紀錄。
- **建議改為**：
  > `body`: `"尚未記錄防曬方式，暫不啟動倒數。記錄防曬方式後即可開始計時。"`

#### 1.3 離線部位不可調整提示（記錄狀況頁）

- **檔案**：[`apps/web/src/pages/ReportContextEventPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/ReportContextEventPage.vue#L167)
- **現行文案**：
  > `<p v-if="contextEvent.zoneSelectionLocked.value" class="control-rule-note">離水必須沿用入水時的部位集合，因此這裡不可調整。</p>`
- **問題分析**：「部位集合」是集合論/資料庫工程術語，極為生硬。
- **建議改為**：
  > `<p v-if="contextEvent.zoneSelectionLocked.value" class="control-rule-note">離水會直接套用下水時選取的部位，無法在此修改。</p>`

#### 1.4 氣象資料來源與代號（五日預報卡）

- **檔案**：[`apps/web/src/components/uv/FiveDayUvCard.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/components/uv/FiveDayUvCard.vue#L153)
- **現行文案**：
  > `{{ forecast.sourceDisplayName }}・F-D0047-091・白日時段`
- **問題分析**：「F-D0047-091」是氣象署 API 資料集編號，對一般大眾無意義且干擾閱讀。
- **建議改為**：
  > `{{ forecast.sourceDisplayName }}・日間紫外線預報`

#### 1.5 時鐘校準紀錄（本機資料設定頁）

- **檔案**：[`apps/web/src/pages/settings/DataSettingsPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/settings/DataSettingsPage.vue#L189)
- **現行文案**：
  > `<dt>最後一次時鐘校準</dt>`
- **問題分析**：「時鐘校準」聽起來像實驗室精密儀器，生活化語感應為「時間校對」。
- **建議改為**：
  > `<dt>上次時間校對</dt>`

---

### 類別二：精簡免責聲明與沉重防禦口吻（Legalistic Tone）

#### 2.1 提醒結束說明（首頁倒數狀態）

- **檔案**：[`apps/web/src/features/reminder/reminderPresentation.ts`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/features/reminder/reminderPresentation.ts#L408)
- **現行文案**：
  > `body`: `"結束不代表已完成補擦，也不代表防護完成或可以放心待在陽光下。需要時可以重新開始新的提醒。"`
- **問題分析**：連續「不代表...也不代表...」，防禦性過重，像切結書。
- **建議改為**：
  > `body`: `"本次提醒已結束。若仍在戶外，請記得補擦防曬或至陰涼處防曬。"`

#### 2.2 標示等待期說明（首頁倒數狀態）

- **檔案**：[`apps/web/src/features/reminder/reminderPresentation.ts`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/features/reminder/reminderPresentation.ts#L367)
- **現行文案**：
  > `body`: `"依包裝標示等待至 ${absoluteTime}。期間請搭配衣物或遮蔭；等待結束不代表系統已確認防護效果，也不代表可以放心待在陽光下。"`
- **問題分析**：句型繁瑣，重述「不代表...」。
- **建議改為**：
  > `body`: `"建議依包裝等待至 ${absoluteTime}。出門前可搭配帽子、長袖或至陰涼處防護。"`

#### 2.3 通知限制說明（通知設定頁）

- **檔案**：[`apps/web/src/pages/settings/NotificationSettingsPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/settings/NotificationSettingsPage.vue#L232)
- **現行文案**：
  > `<p class="delivery-note">重複提醒跟單次提醒受同一個限制：只在分頁還活著時有效，不是新的送達保證。</p>`
- **問題分析**：「分頁還活著」、「不是新的送達保證」帶有工程師碎念口吻，不夠專業友善。
- **建議改為**：
  > `<p class="delivery-note">注意事項：分頁若關閉將無法收到提醒，請保持網頁開啟。</p>`

---

### 類別三：名詞與選項生活化（台灣日常習慣）

#### 3.1 部位預設組合名稱

- **檔案**：[`apps/web/src/features/setup/setupCatalog.ts`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/features/setup/setupCatalog.ts#L110)
- **現行文案**：
  > `label`: `"通勤常見追蹤部位"`
- **問題分析**：「追蹤部位」過於生硬官僚。
- **建議改為**：
  > `label`: `"通勤常曬部位"`

#### 3.2 身體部位名稱

- **檔案**：[`apps/web/src/features/setup/setupCatalog.ts`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/features/setup/setupCatalog.ts#L171, #L184)
- **現行文案**：
  > - `face_nose_cheeks`: `"鼻部與雙頰"`
  > - `feet`: `"腳背／外露腳部"`
- **問題分析**：「鼻部」過於醫美病理報告感；斜線「／」像資料庫欄位。
- **建議改為**：
  > - `face_nose_cheeks`: `"鼻子與雙頰"`
  > - `feet`: `"腳背"`

#### 3.3 情境選項標籤

- **檔案**：[`apps/web/src/features/setup/setupCatalog.ts`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/features/setup/setupCatalog.ts#L138-L139)
- **現行文案**：
  > - `indoor_away`: `"室內遠離直射陽光"`
  > - `indoor_window`: `"室內近直射窗邊"`
- **問題分析**：文字冗長，手機按鈕易換行擁擠。
- **建議改為**：
  > - `indoor_away`: `"室內（遠離窗戶）"`
  > - `indoor_window`: `"室內（靠窗邊）"`

---

### 類別四：操作提示與說明精簡

#### 4.1 記錄狀況輔助說明

- **檔案**：[`apps/web/src/pages/ReportContextEventPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/ReportContextEventPage.vue#L129)
- **現行文案**：
  > `<p class="control-rule-note">選擇最符合的一項。沒有可以結束的水上活動時，不會顯示「離水」。</p>`
- **問題分析**：把內部程式碼 `v-if` 的顯示邏輯直接寫給使用者看，使用者讀了莫名其妙。
- **建議改為**：
  > `<p class="control-rule-note">請選擇剛才發生的狀況（例如大量流汗或碰水）。</p>`

#### 4.2 定義結果提示

- **檔案**：[`apps/web/src/components/region/RegionLocationPanel.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/components/region/RegionLocationPanel.vue#L91-L95)
- **現行文案**：
  > `系統配對為 {{ candidate.displayName }}，這次定位精度約 {{ approximateAccuracyMeters }} 公尺。請確認後再儲存。`
- **問題分析**：「系統配對為」、「定位精度約」非常像感測器硬體輸出。
- **建議改為**：
  > `目前定位在 {{ candidate.displayName }}（誤差約 {{ approximateAccuracyMeters }} 公尺），請確認是否正確。`

#### 4.3 瀏覽器通知權限開啟指引（超長段落拆解）

- **檔案**：[`apps/web/src/pages/settings/NotificationSettingsPage.vue`](file:///c:/Users/yu/Coding%20Projects/UVAlert/apps/web/src/pages/settings/NotificationSettingsPage.vue#L134-L137)
- **現行文案**：
  > `"開啟位置依瀏覽器而異，通常在網址列左側的鎖頭或資訊圖示裡找到「網站設定」或「權限」，把通知改為允許；也可以到瀏覽器的「設定 → 隱私權與安全性 → 網站設定 → 通知」找到本網站調整。若系統整體關閉了通知，還需要到作業系統的通知設定裡一併打開。"`
- **問題分析**：長達 130 字且未換行的長句，手機上形成壓迫感文字塊。
- **建議改為結構化列表**：
  > 1. 點擊網址列左側的「鎖頭」或「資訊」圖示
  > 2. 找到「權限」並將「通知」改為「允許」
  > 3. 若仍無法接收，請檢查手機作業系統的通知設定
