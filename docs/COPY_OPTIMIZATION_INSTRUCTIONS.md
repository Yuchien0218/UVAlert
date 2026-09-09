# 實機文案優化與修改執行手冊 (Copy Optimization & Refinement Guide)

> **給承接 AI 的執行說明**：
> 本文件整理了「防曬晴報員（原名 UVAlert）」全站實機文案的優化需求。本手冊全面導入認知心理學與人本設計大師**唐·諾曼（Don Norman）《設計的心理學》（The Design of Everyday Things）**之核心理念，將系統中的生硬報錯、責難口吻與消極阻擋，全面翻轉為「具有安全感、肯定進程與建設性引導」的人本對話。
> 請依據本手冊列出的具體項目逐一修改相關檔案，並嚴格遵循台灣繁體中文（zh-TW）的使用者習慣。修改完成後，請務必執行第六章之建置與測試指令以確保系統驗證通過。

---

## 核心修改原則：唐·諾曼人本設計（Human-Centered UX Writing）

在修改任何字串前，請務必深刻體會並遵循以下六大人本準則：

1. **零指責原則（No Blame）**：
   - 當使用者遇到問題時，絕不怪罪他們。
   - 全面刪除「你沒有允許...」、「你操作錯誤」等責怪或機械式的說法，改為說明功能效益與提供替代選擇（如：「開啟定位權限可自動取得即時 UV，亦可隨時在下方手動選擇地區」）。
2. **保護進程，絕不要求從頭開始（Preserve Progress & Continuity）**：
   - 當系統出狀況時，第一時間向使用者保證成果：「你的設定內容已妥善保留」、「既有紀錄與裝備已安全留存」。
   - 允許使用者就地修正問題並接續前進，絕不強迫重新整理或清空表單從頭來過。
3. **建設性引導取代報錯訊息（Helpful Guidance over Error Messages）**：
   - 拿掉單純宣告失敗的冷硬報錯（如「目前無法建立...」、「讀取失敗」）。
   - 將重點放在「如何完成目標」：明確告知目前處於什麼狀態、接下來可以怎麼做來啟用完整功能。
4. **部分肯定原則（Partial Correctness）**：
   - 預設使用者的操作大部分都是對的。
   - 例如：使用者記錄了一次防曬乳使用，即使該防曬乳尚未填妥標示，介面應先肯定「本次使用紀錄已完整保存」，再引導「確認包裝標示即可開啟倒數」，而非連續宣告兩次「無法建立倒數」。
5. **包容忘記與不確定（Graceful Fallback & Forgiveness）**：
   - 人在日常生活與戶外活動中，往往無法精確記住所有細節（如準確的幾點幾分入水）。
   - 遇到不確定性時，系統應體貼寬容並啟動安全防護，化解使用者的焦慮與自責（如：「若記不清楚也沒關係，選擇『不確定』系統將啟動安全保守防護」）。
6. **全面杜絕介面分號（；）與標點標準化**：
   - 介面短句一律不使用分號。後續行動與安全保證以「句號（。）」獨立斷開；連貫的因果短句改用「逗號（，）」。
   - 產品名稱一律統一為**「防曬晴報員」**，消滅所有外顯的 `UVAlert`。

---

## 一、產品名稱替換清單（UVAlert ➔ 防曬晴報員）

### 1. Web App 介面、條款、設定與錯誤提示

#### ① `apps/web/index.html`

- **L13**:
  - 原文：`<meta name="description" content="UVAlert 防曬晴報員：用提醒協助你記得補擦防曬，並保留本機紀錄。" />`
  - 改為：`<meta name="description" content="防曬晴報員：用提醒協助你記得補擦防曬，並保留本機紀錄。" />`

#### ② `apps/web/src/pages/TermsPage.vue`

- **L19**:
  - 原文：`使用 UVAlert 前，請先了解服務的用途與限制。`
  - 改為：`使用防曬晴報員前，請先了解服務的用途與限制。`
- **L27**:
  - 原文：`UVAlert 提供 UV、天氣、防曬裝備與補擦提醒資訊，協助你規劃日常防曬行動。`
  - 改為：`防曬晴報員提供 UV、天氣、防曬裝備與補擦提醒資訊，協助你規劃日常防曬行動。`
- **L35**:
  - 原文：`請依自身膚況、活動情境與專業醫療建議判斷是否曝曬、補擦或尋求協助。UVAlert 不提供疾病診斷或個人化醫療建議。`
  - 改為：`請依自身膚況、活動情境與專業醫療建議判斷是否曝曬、補擦或尋求協助。防曬晴報員不提供疾病診斷或個人化醫療建議。`

#### ③ `apps/web/src/pages/PrivacyPolicyPage.vue`

- **L19**:
  - 原文：`說明 UVAlert 如何處理提醒、登入、同步與聯絡資料。`
  - 改為：`說明防曬晴報員如何處理提醒、登入、同步與聯絡資料。`
- **L34**:
  - 原文：`Google 登入僅用於建立登入工作階段與跨裝置同步；UVAlert 不會讀取 Gmail、Google Drive、聯絡人或其他 Google 服務資料。`
  - 改為：`Google 登入僅用於建立登入工作階段與跨裝置同步。防曬晴報員不會讀取 Gmail、Google Drive、聯絡人或其他 Google 服務資料。`
- **L38**:
  - 原文：`同步功能為選用；你可停止同步或在登入與雲端資料設定中清除 UVAlert 雲端資料。`
  - 改為：`同步功能為選用，你可隨時停止同步，或在登入與雲端資料設定中清除防曬晴報員的雲端資料。`
- **L49**:
  - 原文：`位置只會在你主動允許時用於判斷目前地區的 UV 與天氣資訊；UVAlert 不會保存精確座標。`
  - 改為：`位置只會在你主動允許時用於判斷目前地區的 UV 與天氣資訊，防曬晴報員不會保存精確座標。`

#### ④ `apps/web/src/pages/settings/AccountDataPage.vue`

- **L55**:
  - 原文：`notice.value = "UVAlert 的雲端資料與登入資訊已清除；本機提醒與資料仍保留。";`
  - 改為：`notice.value = "防曬晴報員的雲端資料與登入資訊已清除，本機提醒與資料仍保留。";`
- **L138**:
  - 原文：`登出 UVAlert`
  - 改為：`登出防曬晴報員`
- **L145**:
  - 原文：`<span>清除 UVAlert 雲端資料</span>`
  - 改為：`<span>清除雲端資料</span>`
- **L148**:
  - 原文：`會刪除 UVAlert 雲端同步資料與 UVAlert 登入；不會刪除 Google 帳號。本機提醒與本機資料不受影響。`
  - 改為：`將刪除防曬晴報員的雲端同步資料與登入狀態，不會刪除 Google 帳號。本機提醒與資料不受影響。`

#### ⑤ `apps/web/src/adapters/SupabaseCloudSyncAdapter.ts`

- **L159, L162**:
  - 原文：`throw makeCloudError(401, "AUTH_REQUIRED", "請先登入 UVAlert", error);`
  - 原文：`throw makeCloudError(401, "AUTH_REQUIRED", "請先登入 UVAlert");`
  - 改為：`throw makeCloudError(401, "AUTH_REQUIRED", "請先登入防曬晴報員", error);`
  - 改為：`throw makeCloudError(401, "AUTH_REQUIRED", "請先登入防曬晴報員");`

#### ⑥ `packages/persistence-web/src/repositories/local-data-repository.ts`

- **L111**:
  - 原文：`application: "UVAlert 防曬晴報員",`
  - 改為：`application: "防曬晴報員",`

#### ⑦ `supabase/functions/account-delete/index.ts`

- **L88**:
  - 原文：`message: "UVAlert 帳號尚未刪除"`
  - 改為：`message: "防曬晴報員帳號尚未刪除"`

---

### 2. SEO 標題與公共站生成器

#### ① `apps/web/src/features/education/educationSeo.ts`

- **L21**:
  - 原文：`const BRAND_NAME = "UVAlert 防曬晴報員";`
  - 改為：`const BRAND_NAME = "防曬晴報員";`
- **L25**:
  - 原文：`const TITLE_SUFFIX = "UVAlert";`
  - 改為：`const TITLE_SUFFIX = "防曬晴報員";`

#### ② `tools/education/generate-public-site.mjs`

- **L263**:
  - 原文：`return [pageTitle, "防曬衛教", "UVAlert"]`
  - 改為：`return [pageTitle, "防曬衛教", "防曬晴報員"]`
- **L289, L313, L314, L327**:
  - 將包含 `name: "UVAlert 防曬晴報員"`、`og:site_name` 與頁首連結 `<a href="/">UVAlert 防曬晴報員</a>` 統一替換為 `"防曬晴報員"`。

---

### 3. 公開衛教文章（`docs/education/articles/`，共 20 篇）

請在下列 Markdown 檔案中，將所有 `UVAlert` 替換為 `防曬晴報員`：

1. `what-is-uv-index.md` (L43):
   - `UVAlert 的倒數是協助記住補擦的工具...` ➔ `防曬晴報員的倒數是協助記住補擦的工具...`
2. `when-is-uv-strongest.md` (L29):
   - `## UVAlert 顯示高峰時的限制` ➔ `## 防曬晴報員顯示高峰時的限制`
3. `uv-index-vs-temperature.md` (L26, L28):
   - `## UVAlert 應該怎麼提醒？` ➔ `## 防曬晴報員應該怎麼提醒？`
   - `UVAlert 可把氣溫和 UV 並列...` ➔ `防曬晴報員可把氣溫和 UV 並列...`
4. `uv-forecast-and-observation.md` (L24):
   - `## 使用 UVAlert 時檢查三件事` ➔ `## 使用防曬晴報員時檢查三件事`
5. `uva-through-windows.md` (L32):
   - `UVAlert 也無法僅靠定位判斷你隔著哪一種玻璃。` ➔ `防曬晴報員也無法僅靠定位判斷你隔著哪一種玻璃。`
6. `uva-uvb-and-sunscreen-labels.md` (L42):
   - `UVAlert 的 120 分鐘提醒是保守的補擦提醒...` ➔ `防曬晴報員的 120 分鐘提醒是保守的補擦提醒...`
7. `how-much-and-when-to-apply.md` (L39):
   - `UVAlert 的倒數只協助你記得一般補擦節奏...` ➔ `防曬晴報員的倒數只協助你記得一般補擦節奏...`
8. `how-often-to-reapply-sunscreen.md` (L27, L29):
   - `## UVAlert 的 120 分鐘提醒代表什麼？` ➔ `## 防曬晴報員的 120 分鐘提醒代表什麼？`
   - `UVAlert 將「不知道間隔」的情境設定為 120 分鐘...` ➔ `防曬晴報員將「不知道間隔」的情境設定為 120 分鐘...`
9. `easy-to-miss-sunscreen-areas.md` (L18, L44):
   - `UVAlert 的提醒部位分成七區...` ➔ `防曬晴報員的提醒部位分成七區...`
   - `UVAlert 的部位紀錄是幫助你回想與提醒...` ➔ `防曬晴報員的部位紀錄是幫助你回想與提醒...`
10. `reapply-before-going-back-outdoors.md` (L28):
    - `## 和 UVAlert 倒數怎麼配合？` ➔ `## 和防曬晴報員倒數怎麼配合？`
11. `forgot-to-reapply-sunscreen.md` (L35):
    - `...並使用 UVAlert 做記憶輔助。` ➔ `...並使用防曬晴報員做記憶輔助。`
12. `what-water-resistant-means.md` (L27):
    - `...因此 UVAlert 只把 40／80 分鐘當作閱讀標籤的例子...` ➔ `...因此防曬晴報員只把 40／80 分鐘當作閱讀標籤的例子...`
13. `after-sweating-swimming-or-rain.md` (L34):
    - `## UVAlert 怎麼記錄比較有用？` ➔ `## 防曬晴報員怎麼記錄比較有用？`
14. `sunscreen-on-damaged-skin.md` (L14, L27, L29):
    - `不要為了讓 UVAlert 倒數繼續而...` ➔ `不要為了讓防曬晴報員倒數繼續而...`
    - `## UVAlert 應該怎麼處理？` ➔ `## 防曬晴報員應該怎麼處理？`
    - `UVAlert 應允許記錄這類事件...` ➔ `防曬晴報員應允許記錄這類事件...`
15. `sun-protection-for-babies.md` (L18):
    - `...因此 UVAlert 不應把它寫成...` ➔ `...因此防曬晴報員不應把它寫成...`
16. `medications-and-sun-sensitivity.md` (L25, L27):
    - `## UVAlert 怎麼配合？` ➔ `## 防曬晴報員怎麼配合？`
    - `UVAlert 提供的是日常防曬與補擦提醒...` ➔ `防曬晴報員提供的是日常防曬與補擦提醒...`
17. `red-stinging-itchy-skin-three-steps.md` (L14):
    - `...UVAlert 不應替你做診斷。` ➔ `...防曬晴報員不應替你做診斷。`
18. `record-sunscreen-reaction-for-care.md` (L28, L30):
    - `## UVAlert 可以怎麼支援？` ➔ `## 防曬晴報員可以怎麼支援？`
    - `UVAlert 可保留「使用後有紅、刺或癢」等客觀事實紀錄...` ➔ `防曬晴報員可保留「使用後有紅、刺或癢」等客觀事實紀錄...`
19. `when-sunburn-needs-medical-care.md` (L14):
    - `不要讓 UVAlert 的補擦倒數取代就醫判斷。` ➔ `不要讓防曬晴報員的補擦倒數取代就醫判斷。`
20. `when-to-return-to-sun-after-sunburn.md` (L25):
    - `UVAlert 不會用固定天數替你判定已恢復。` ➔ `防曬晴報員不會用固定天數替你判定已恢復。`

---

## 二、圖示前置文字優化清單（Icon-Adjacent Copy Optimizations）

本組修改專注於「文字前已有圖示」的介面組件，確保圖示視覺意涵與相鄰文字精簡呼應、避免冗長與重複。

| #      | 檔案路徑與行號                                                         | 原有文案                                                                                       | 建議修改為                                                                 | 修改說明與效益                                                                         |
| ------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| **1**  | `apps/web/src/components/setup/QuickProtectionSummary.vue` (L101-L103) | `<Icon name="tool-edit" :size="16" /> 調整要提醒的部位`                                        | `<Icon name="tool-edit" :size="16" /> 調整提醒部位`                        | 鉛筆編輯圖示後接 8 字口語太長，精簡為 6 字，且與 `ZoneProtectionForm` 的按鈕風格一致。 |
| **2**  | `apps/web/src/pages/setup/SetupPage.vue` (L562-L564)                   | `改為填寫完整的防曬乳包裝標示 <Icon name="tool-arrow-right" :size="20" />`                     | `改填完整包裝標示 <Icon name="tool-arrow-right" :size="20" />`             | 長達 14 字易折行，箭頭已有引導意涵，減少 6 字大幅減輕視覺負擔。                        |
| **3**  | `apps/web/src/components/home/HomeNightSession.vue` (L89-L92)          | `<Icon name="state-night" :size="20" /> 提醒仍在進行`                                          | `<Icon name="state-night" :size="20" /> 夜間・提醒仍在進行`                | 月亮星芒圖示代表夜間脈絡，文字補上「夜間」更能呼應底下「現在不需要防曬」的理由。       |
| **4**  | `apps/web/src/components/region/RegionPreferenceSummary.vue` (L32)     | `<h2 id="region-summary-title" ...>目前設定</h2>`                                              | `<h2 id="region-summary-title" ...>目前地區</h2>`                          | 前置圖示是專門代表地區的地標針（`feature-region`），改為「目前地區」圖文緊密對齊。     |
| **5**  | `apps/web/src/pages/HomePage.vue` (L458)                               | `<Icon name="context-water" :size="20" /> 水上活動（下水／離水）`                              | `<Icon name="context-water" :size="20" /> 水上活動記錄`                    | 波浪圖示已有情境意涵，移除冗長全形括號「（下水／離水）」，行動連結更加乾淨俐落。       |
| **6**  | `apps/web/src/components/setup/ProductEligibilityNotice.vue` (L33-L35) | 標題：`這瓶防曬乳已超過記錄的有效期限`<br>內文：`這瓶防曬乳已過期，無法用來建立新的補擦提醒。` | 標題：**`防曬乳已超過有效期限`**<br>內文：**`無法用來建立新的補擦提醒。`** | 警告圖示旁連續兩行重複「這瓶防曬乳已...」「過期/超過有效期限」，消除行間重述。         |
| **7a** | `apps/web/src/pages/MorePage.vue` (L60)                                | `label: "安裝到手機桌面"`                                                                      | `label: "安裝到主畫面"`                                                    | 統一專有名詞，對齊圖示標籤 `more-install`（安裝到主畫面）與 PWA 標準習慣。             |
| **7b** | `apps/web/src/pages/MorePage.vue` (L71)                                | `label: "問題回報與意見回饋"`                                                                  | `label: "問題回報"`                                                        | 由 9 個字縮減為 4 個字，消除「回報與回饋」的同義重複，與其他選單項目的長度取得平衡。   |
| **8**  | `apps/web/src/pages/settings/NotificationSettingsPage.vue` (L168)      | `<span>目前狀態：<strong>{{ statusLabel }}</strong></span>`                                    | `<span>通知權限：<strong>{{ statusLabel }}</strong></span>`                | 左側已有 32px 狀態圖示，移除機械式的「目前狀態：」欄位感，改為明確的「通知權限：」。   |

---

## 三、分號（；）全面清理與人本化標點對照表

本章落實「以人為本」的溝通方式：**在告知系統限制前，永遠優先保障使用者成果（先給安心，再給指引）**，並徹底杜絕行動介面冷硬的分號。

| 檔案路徑與行號                                                         | 原始文案（含不當分號）                                                                               | 人本潤飾建議                                                                                       | 人本原則與效益                                             |
| :--------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------- | :--------------------------------------------------------- |
| `apps/web/src/components/shell/GlobalStatusBanner.vue` (L40)           | `目前離線；這台裝置上已儲存的提醒仍可查看。`                                                         | `目前離線。這台裝置上已儲存的提醒仍可隨時查看。`                                                   | 肯定本機資料安全，以句號自然開展                           |
| `apps/web/src/pages/setup/SetupPage.vue` (L418)                        | `讀取這台裝置上的設定草稿時發生問題。已經記錄的提醒與裝備不會受影響；請重新整理後再試一次。`         | `裝置上的設定草稿暫時無法讀取。既有的提醒與裝備已安全留存，點選下方重新整理即可繼續。`             | 諾曼心法：先肯定進程安全，給予行動指引                     |
| `apps/web/src/pages/setup/SetupPage.vue` (L504)                        | `設定目前無法儲存；輸入仍會保留，可以再試一次。`                                                     | `你的設定內容已妥善保留。系統暫時無法寫入，請稍後再試一次。`                                       | 諾曼心法：先宣告輸入已保留，消除重來焦慮                   |
| `apps/web/src/pages/setup/SetupPage.vue` (L625)                        | `另一個提醒已經開始；請先查看目前提醒。`                                                             | `已有進行中的提醒，請先查看目前提醒狀態。`                                                         | 肯定現有狀態，引導接續查看                                 |
| `apps/web/src/components/setup/ZoneProtectionForm.vue` (L163)          | `這只是建議組合；確認前不會建立任何提醒資料。`                                                       | `已預先為你搭配推薦部位，可依個人習慣自由調整，確認後才會正式啟用。`                               | 諾曼心法：展現主動貼心，賦予完全掌控權                     |
| `apps/web/src/components/setup/ContextSelector.vue` (L93)              | `稍後需要確認實際入水時間；不確定也能繼續。`                                                         | `稍後需確認實際入水時間，若不確定亦可繼續。`                                                       | 包容不確定性，平順銜接                                     |
| `apps/web/src/components/setup/WaterStartPicker.vue` (L247)            | `請選擇實際入水時間；若無法確認，可以選擇不確定，系統會保守處理，不會猜測入水時間。`                 | `請選擇實際入水時間。若記不清楚也沒關係，選擇「不確定」系統會啟動安全保守防護，不會隨意猜測。`     | 諾曼心法：體貼使用者的忘記，消除自責（保留開頭以滿足測試） |
| `apps/web/src/components/reapplication/ReapplyReasonPicker.vue` (L52)  | `選了原因會一起記錄下來；只是時間到了就不用選。`                                                     | `選取原因將一併儲存，例行補擦無需選取。`                                                           | 精煉繁體中文句式，改用逗號銜接                             |
| `apps/web/src/components/session/SessionEndControl.vue` (L99)          | `結束後會停止所有待處理提示；裝備紀錄與既有資料不會受影響。`                                         | `結束後會停止所有待處理提示，裝備紀錄與既有資料不受影響。`                                         | 改為平順逗號（務必保留前半句以滿足測試）                   |
| `apps/web/src/components/product/ProductSnapshotEditor.vue` (L274-275) | `請確認包裝上是否有 SPF、PA 等防曬標示；僅有品牌、成分或「天然」宣稱，無法確認這是防曬乳。`          | `請確認包裝上是否有 SPF、PA 等防曬標示。若僅有品牌或「天然」宣稱，無法確認為防曬乳。`              | 拆分為檢查指示與輔助說明                                   |
| `apps/web/src/components/product/ProductSnapshotEditor.vue` (L345)     | `只填包裝上可確認的內容；看不清楚時請選擇「不確定」。`                                               | `請依包裝可確認之內容填寫，若標示不清請選擇「不確定」。`                                           | 提供寬容的替代選項                                         |
| `apps/web/src/pages/settings/NotificationSettingsPage.vue` (L36)       | `此瀏覽器或環境無法使用背景推播；本機倒數與分頁仍開啟時的提醒仍可使用。`                             | `此瀏覽器或環境無法使用背景推播。本機倒數與分頁開啟時的提醒仍可正常使用。`                         | 明確區隔限制與可用功能                                     |
| `apps/web/src/pages/settings/NotificationSettingsPage.vue` (L78)       | `背景推播設定失效，或舊版關閉紀錄無法安全確認；本機倒數仍是依據。`                                   | `背景推播設定失效，或舊版關閉紀錄無法安全確認，本機倒數仍是依據。`                                 | 去除突兀分號，保持語氣連貫                                 |
| `apps/web/src/pages/settings/NotificationSettingsPage.vue` (L295)      | `分頁仍開啟時，本機提醒可作為倒數的輔助；背景送達則需另行啟用上方的背景推播。`                       | `分頁仍開啟時，本機提醒可作為倒數的輔助。背景送達則需啟用上方的背景推播。`                         | 獨立兩項功能說明                                           |
| `apps/web/src/pages/settings/DataSettingsPage.vue` (L170)              | `目前無法讀取這台裝置上的資料。這不代表資料已經消失，請稍後再試；在讀取成功之前建議先不要執行清除。` | `目前無法讀取這台裝置上的資料。既有資料仍妥善保存中，請稍後重試。在讀取成功前建議先不要執行清除。` | 諾曼心法：先肯定資料安全，給予理性的防護引導               |
| `apps/web/src/pages/settings/DataSettingsPage.vue` (L362)              | `進行中的提醒<strong>不會</strong>被刪除；要結束它請到提醒頁明確結束，或使用下方的清除全部。`        | `進行中的提醒<strong>不會</strong>被刪除。如需結束請至提醒頁明確結束，或使用下方的清除全部。`      | 將警示與操作路徑拆開獨立                                   |
| `apps/web/src/pages/settings/DataSettingsPage.vue` (L380)              | `裝備清單與已結束的提醒會消失，<strong>無法復原</strong>；之後建立提醒要重新填寫包裝標示。`          | `裝備清單與已結束的提醒會消失且<strong>無法復原</strong>。之後建立提醒需重新填寫包裝標示。`        | 後果說明獨立成句，清楚交代後續影響                         |
| `apps/web/src/pages/settings/DataSettingsPage.vue` (L464)              | `登入 Google 帳號可跨裝置同步提醒、裝備與設定；不登入不影響本機倒數與資料。`                         | `登入 Google 帳號可跨裝置同步提醒、裝備與設定。不登入亦不影響本機倒數與資料。`                     | 尊重使用者自由選擇，正反並陳                               |
| `apps/web/src/pages/settings/DataSettingsPage.vue` (L499)              | `雲端資料仍保留；重新開啟同步前，不會再讀取或上傳雲端資料。`                                         | `雲端資料仍保留。重新開啟同步前，不會再讀取或上傳雲端資料。`                                       | 先肯定雲端狀態安全，再交代同步規則                         |
| `apps/web/src/pages/settings/DataSettingsPage.vue` (L509)              | `確認後才會上傳或下載；遇到版本不同時，系統不會自動覆蓋任何一邊。`                                   | `確認後才會上傳或下載。遇到版本不同時，系統不會自動覆蓋任何一邊。`                                 | 雙向操作與防護承諾獨立成句                                 |
| `apps/web/src/pages/settings/AccountDataPage.vue` (L106)               | `同步已停止；雲端資料保留中。`                                                                       | `同步已停止，雲端資料保留中。`                                                                     | 短句改用逗號流暢銜接                                       |
| `apps/web/src/pages/settings/AccountDataPage.vue` (L107)               | `同步已開啟；每次同步前會先顯示預覽。`                                                               | `同步已開啟，每次同步前會先顯示預覽。`                                                             | 短句改用逗號流暢銜接                                       |
| `apps/web/src/components/setup/ProductEligibilityNotice.vue` (L42)     | `請停止使用並依包裝警語處理；需要時尋求醫療協助。`                                                   | `請停止使用並依包裝警語處理，必要時尋求醫療協助。`                                                 | 警示指引自然銜接                                           |
| `apps/web/src/pages/ProductsPage.vue` (L240)                           | `這些裝備不會用於新的提醒；點一下可以恢復使用。`                                                     | `這些裝備不會用於新的提醒，點選即可恢復使用。`                                                     | 簡短操作說明改用逗號                                       |
| `apps/web/src/pages/ReapplyPage.vue` (L165)                            | `若紀錄有誤，稍後可從事件更正功能處理；本頁目前不會直接改寫已提交紀錄。`                             | `若紀錄有誤，稍後可至事件更正功能處理。本頁不會直接改寫已提交之紀錄。`                             | 指引與限制以句號拆開                                       |
| `apps/web/src/pages/ReportContextEventPage.vue` (L241)                 | `如果紀錄有誤，稍後可以從最近事件更正；本頁不會改寫已提交紀錄。`                                     | `若紀錄有誤，稍後可由最近事件更正。本頁不會改寫已提交之紀錄。`                                     | 指引與限制以句號拆開                                       |
| `apps/web/src/pages/ReportContextEventPage.vue` (L301)                 | `只勾選這次實際受影響的部位；未勾選的部位狀態不會改變。`                                             | `僅需勾選本次受影響的部位，未勾選的部位狀態不受影響。`                                             | 消除機械語氣，改用逗號                                     |
| `apps/web/src/pages/TermsPage.vue` (L47)                               | `如需提出隱私或帳號資料請求，請使用站內回饋表單；送出回饋不會自動執行資料匯出、刪除或帳號操作。`     | `如需提出隱私或帳號資料請求，請使用站內回饋表單。送出回饋不會自動執行資料匯出、刪除或帳號操作。`   | 管道說明與免責分開獨立                                     |
| `apps/web/src/pages/PrivacyPolicyPage.vue` (L57)                       | `如需提出隱私或帳號資料請求，請使用站內回饋表單；送出回饋不會自動執行資料匯出、刪除或帳號操作。`     | `如需提出隱私或帳號資料請求，請使用站內回饋表單。送出回饋不會自動執行資料匯出、刪除或帳號操作。`   | 管道說明與免責分開獨立                                     |
| `apps/web/src/pages/education/EducationIndexPage.vue` (L69)            | `description="用白話讀懂 UV、防曬乳、補擦、碰水與曬後照護；每篇文章列出官方來源與使用界線。"`        | `description="用白話讀懂 UV、防曬乳、補擦、碰水與曬後照護，每篇文章皆列出官方來源與使用界線。"`    | 描述短句改用逗號                                           |
| `tools/education/generate-public-site.mjs` (L176)                      | `"用白話讀懂 UV、防曬乳、補擦、碰水與曬後照護；每篇文章列出官方來源與使用界線。",`                   | `"用白話讀懂 UV、防曬乳、補擦、碰水與曬後照護，每篇文章皆列出官方來源與使用界線。",`               | 保持與 SPA 頁面一致                                        |
| `tools/education/generate-public-site.mjs` (L327)                      | `<footer>一般衛教內容；若有持續或加重的不適，請尋求醫療專業協助。</footer>`                          | `<footer>一般衛教內容。若有持續或加重的不適，請尋求醫療專業協助。</footer>`                        | 頁尾宣告以句號斷開                                         |
| `apps/web/src/router/index.ts` (L179)                                  | `查看、匯出與清除本機資料；匯出不上傳、不經後端。`                                                   | `查看、匯出與清除本機資料。匯出資料不上傳、不經後端。`                                             | 路由說明以句號斷開                                         |

---

## 四、消除重複贅詞與落實人本引導

### 1. `apps/web/src/components/product/ProductSnapshotEditor.vue` (L645-648)

- **核心理念**：落實**「部分肯定原則」**。翻轉電腦負面報錯心態，先肯定使用者的記錄成果，再指引如何啟用倒數。
- **原文**：
  ```html
  <strong>目前無法建立防曬乳補擦時間</strong>
  <p>標示確認前，系統暫時無法建立防曬乳補擦倒數；仍會保留這次使用紀錄。</p>
  ```
- **建議改為**：
  ```html
  <strong>本次使用已完整記錄</strong>
  <p>對照並確認包裝防曬標示後即可開啟補擦倒數，本次紀錄已為你妥善保留。</p>
  ```

### 2. `apps/web/src/pages/ProductsPage.vue` (L173-180)

- **核心理念**：消除「雙重否定」與負面打擊。保留動態裝備類別，說明現有用途並正向引導新增防曬乳。
- **原文**：
  `目前沒有可以建立補擦倒數的防曬乳。清單裡的 {{ categories }} 都不會產生倒數。`
- **建議改為**：
  `清單中的 {{ categories }} 僅供防護紀錄。新增具備標示的防曬乳即可為你建立補擦倒數。`

### 3. `apps/web/src/pages/ReportContextEventPage.vue` (L162)

- **問題**：一句話連續出現兩次「提醒」，且語音重複生硬。
- **原文**：`記下這次狀況後，相關部位的提醒會更新；確認前不會改變提醒。`
- **建議改為**：`記錄狀況後將更新相關部位狀態，確認前不會變更現有提醒。`

### 4. `apps/web/src/components/home/HomeLocationPrompt.vue` (L26)

- **原文**：`尚未設定地區，所以沒有 UV 資料。`
- **建議改為**：`尚未設定地區，暫無 UV 資料。`（去除口語連詞「所以」）

### 5. `apps/web/src/components/region/RegionLocationPanel.vue` (L27, L31)

- **核心理念**：落實**「零指責原則」**。不指責使用者「沒有允許」，而是說明開啟優勢並提供平等備援途徑。
- **L27 原文**：`你沒有允許定位。可以改用下方手動選擇地區。`
  - **改為**：`開啟定位權限可自動取得即時 UV，亦可隨時在下方手動選擇地區。`
- **L31 原文**：`無法取得位置。請確認定位權限，或移到訊號較好的地方重試；你也可以手動選擇地區。`
  - **改為**：`暫時無法取得位置。請確認定位權限或至訊號良好處重試，亦可手動選擇地區。`

### 6. `apps/web/src/pages/EventCorrectionPage.vue` (L90, L161, L244)

- **核心理念**：消滅責難口氣，體現人本關懷。
- **L90 原文**：`原本的紀錄會保留下來，你會在後面新增一筆更正。送出前不會改變目前提醒。`
  - **改為**：`原紀錄將完整保留，並於其後新增更正紀錄。送出前不會變更目前提醒。`
- **L161 原文**：`這段水上活動已經有對應的離水紀錄。改動入水的部位會讓那筆離水失去配對，因此這裡不可調整；需要改的話請先更正離水那一筆。`
  - **改為**：`此水上活動已有對應的離水紀錄。若調整入水部位將導致離水紀錄失去配對，如需修改請先更正該筆離水紀錄。`
- **L244 原文**：`如果這筆紀錄根本不該存在，可以作廢它。原紀錄仍會留在事件歷史中，只是不再影響提醒。`
  - **改為**：`若無需保留此筆紀錄，可將其作廢。原紀錄仍會留存於歷史清單備查，且不再影響目前的提醒倒數。`（消滅「根本不該存在」的責怪感）

---

## 五、相關單元測試同步修改（重要！嚴防斷言失敗）

程式庫中有數個單元測試直接對特定中文字串做斷言（assertion），修改文案時請務必同步更新以下測試檔案中的比對文字，否則測試會報錯：

### 1. `apps/web/src/components/setup/SetupFlowComponents.test.ts`

- **L246**:
  - 原斷言：`expect(wrapper.text()).toContain("調整要提醒的部位");`
  - 同步改為：`expect(wrapper.text()).toContain("調整提醒部位");`

### 2. `apps/web/src/pages/MorePage.test.ts`

- **L72, L74**:
  - 原清單斷言：
    ```ts
    ("安裝到手機桌面", "本機資料與隱私", "問題回報與意見回饋");
    ```
  - 同步改為：
    ```ts
    ("安裝到主畫面", "本機資料與隱私", "問題回報");
    ```

### 3. `apps/web/src/pages/settings/AccountDataPage.test.ts`

- **L127**:
  - 原斷言：`expect(headings.map((heading) => heading.get("span").text())).toEqual(["同步狀態", "登出", "清除 UVAlert 雲端資料"]);`
  - 同步改為：`expect(headings.map((heading) => heading.get("span").text())).toEqual(["同步狀態", "登出", "清除雲端資料"]);`

### 4. `apps/web/src/pages/settings/NotificationSettingsPage.test.ts`

- **L93, L98, L99, L100, L104**:
  - 原測試案例陣列皆以 `"目前狀態："` 開頭（如 `"目前狀態：通知已開啟"`、`"目前狀態：未開啟"`、`"目前狀態：通知已被拒絕"`、`"目前狀態：這個瀏覽器不支援通知"`）。
  - 同步改為以 `"通知權限："` 開頭（例如 `"通知權限：通知已開啟"`、`"通知權限：未開啟"`、`"通知權限：通知已被拒絕"`、`"通知權限：這個瀏覽器不支援通知"`）。

### 5. `apps/web/src/components/setup/ProductEligibilityNotice.test.ts`

- **L25**:
  - 原斷言：`expect(alert.text()).toContain("已超過記錄的有效期限");`
  - 同步改為：`expect(alert.text()).toContain("已超過有效期限");`

### 6. `apps/web/src/pages/PrivacyPolicyPage.test.ts`

- **L12**:
  - 原斷言：
    ```ts
    "Google 登入僅用於建立登入工作階段與跨裝置同步；UVAlert 不會讀取 Gmail、Google Drive、聯絡人或其他 Google 服務資料。";
    ```
  - 同步改為（注意分號變句號、UVAlert 變防曬晴報員）：
    ```ts
    "Google 登入僅用於建立登入工作階段與跨裝置同步。防曬晴報員不會讀取 Gmail、Google Drive、聯絡人或其他 Google 服務資料。";
    ```

### 7. `apps/web/src/pages/education/EducationPages.test.ts`

- **L403, L408, L417**:
  - 原斷言：`toBe("防曬衛教｜UVAlert")` 等
  - 同步改為：`toBe("防曬衛教｜防曬晴報員")` 與 `toBe("流汗或碰水後｜防曬衛教｜防曬晴報員")`

### 8. `apps/web/src/components/region/RegionPreferenceSummary.test.ts`

- **L8**:
  - 原測試描述：`it("目前設定是摘要卡片標題", () => {`
  - 同步改為：`it("目前地區是摘要卡片標題", () => {`

> **守門測試特別防禦提示**：
>
> - `SessionEndControl.vue` (L99) 改為「結束後會停止所有待處理提示，裝備紀錄與既有資料不受影響。」，請務必保留前半句「結束後會停止所有待處理提示」，因為 `SessionEndControl.test.ts` (L46) 斷言了這段子字串。
> - `WaterStartPicker.vue` (L247) 改為「請選擇實際入水時間。若記不清楚也沒關係...」，請務必保留開頭「請選擇實際入水時間」，因為 `setupFormFeedback.test.ts` (L155) 斷言了這段子字串。

---

## 六、修改後必備建置與驗證流程

當承接 AI 完成上述文案與測試檔案修改後，請在專案根目錄依序執行以下指令進行驗證：

```bash
# 1. 重新從 docs/education/articles/ 產生靜態 TypeScript 衛教資料
pnpm run education:generate

# 2. 執行全專案單元測試，確認所有文案斷言皆通過
pnpm run test

# 3. 執行 TypeScript 形態檢查
pnpm run typecheck

# 4. 格式檢查與代碼風格驗證
pnpm run check
```

確認所有檢查皆為綠燈（Pass），即圓滿完成本次文案優化任務。
