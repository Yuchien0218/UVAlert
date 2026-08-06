# Sunshield Advisor 設計語言規範

## 這份文件的地位

**這份文件不是真實來源，程式碼才是。**

真實來源只有兩個檔案：

| 檔案 | 內容 |
|---|---|
| `packages/ui/src/styles.css` | 設計 token：字級、間距、顏色、圓角、動畫時間 |
| `apps/web/src/assets/app.css` | 共用類別：`.app-card`、`.button`、`.text-link`、`.stat-figure`、`.safety-note` |

這份文件的工作是記錄**為什麼**這樣寫，以及**哪些地方還沒照著寫**。任何時候文件與這兩個檔案衝突，以檔案為準，並回來修文件。

**給 AI 助手**：修改畫面前，先讀上面兩個檔案的實際內容，不要用記憶中或先前對話裡的版本。這個專案發生過多次「改好的東西過幾輪又跑掉」，起因都是在過時版本上疊修改。

**`apps/web/dist/` 是過期建置產物**，內容停留在設計整理之前（還有 `box-shadow`、藥丸按鈕、`.sun-divider`）。不要拿它當現況參考。

本次文件更新對照的程式碼範圍：commit `9f7eebe`（設計系統統一）到 `7883c27`（HEAD）。

---

## 一、四條核心規則

這輪整理確立的規則，依序是判斷任何視覺改動的第一準則。

### 規則 1：字級只用變數

```css
--font-size-page-title:    clamp(1.75rem, 6vw, 2rem);
--font-size-section-title: 1.15rem;
--font-size-body:          0.875rem;
--font-size-label:         0.8rem;
--font-size-caption:       0.75rem;
```

不要寫 `font-size: 0.95rem` 這種自己調出來的中間值。整理前全站有 `0.85 / 0.9 / 0.95 / 1.05 / 1.08 / 1.1 / 1.15 / 1.2 / 1.25 / 1.3 / 1.35 / 1.5rem` 十幾種字級並存，字級數量本身就是視覺雜訊。

**唯一允許的例外**是「資料讀數」的 `clamp()`：補擦倒數的分鐘數、UVI 數值、提醒卡主標題。這些字級隨視窗縮放，本來就不屬於文字階層，而是圖表元素。

### 規則 2：填色與邊框只給需要注意力的元素

整理前首頁同時存在三種容器寫法——主提醒卡（填色無框）、戶外資訊與五日 UV（`.app-card`：邊框＋底色）、各部位狀態（標題下一條線），整頁讀起來是等重量的盒子堆疊，沒有主次。

現在的規則：

| 類型 | 寫法 |
|---|---|
| 需要注意力：主提醒卡、警示提示 | 滿版淡底色填滿，**無邊框** |
| 結構性區塊：戶外資訊、五日 UV、各部位狀態 | **無框**，統一為「上緣細分隔線 → 標題 → 內容」 |

分隔線一律放在**區塊上緣**，不是標題下方——這樣所有區塊的起始位置對齊在同一種視覺信號上。

推論出來的禁令：不用色條／左邊框表達狀態。想標示狀態，改用滿版淡底色，或讓標題文字本身吃語意色。

### 規則 3：同一區塊內所有文字共用一條左對齊線

不要用 icon 在 flex row 裡佔一欄、把文字往右推。這個問題在兩處發生過並修掉：

- `OutdoorContextCard.vue` 的 `MapPin` 把地區文字推離區塊標題的左緣（commit `cb0ed2b`）
- `FiveDayUvCard.vue` 錯誤狀態的紅色狀態點把標題推右，與下方兩行不齊（commit `7883c27`）

兩處都是直接**移除 icon**，狀態語意改用文字顏色承擔。

區塊右上角的識別 icon（`Wind`、`CloudSun`）不違反這條——它們在 `justify-content: space-between` 的另一端，不影響左緣。

驗證方式：用 DevTools 量同一區塊內標題與各行內文的左邊界 x 座標，應完全相同（首頁目前為 34px）。

### 規則 4：無陰影、無漸層，動畫只用 opacity

- 全站沒有 `box-shadow`（`src/` 下僅存的兩處是 `box-shadow: none`）
- 沒有 `linear-gradient` / `radial-gradient`
- 動畫只改 `opacity`，不做位移或縮放

`transform` 允許用在**靜態幾何**（`rotate(180deg)` 翻轉箭頭、`translateY(-50%)` 置中定位），不允許用在**進出場動畫**。

一律加 `@media (prefers-reduced-motion: reduce)`；全域 reset 已在 `styles.css` 把 duration 壓到 0.01ms。

---

## 二、設計哲學

兩句話，是上面四條規則的來源：

- **重量感極低**：線條構成，無厚度、無陰影、無重力壓迫感。穩定感來自中心對稱結構，不是粗重色塊或投影。
- **材質感純淨**：純數位圖案，無紋理、無反光、純色平塗，不模擬真實世界的光影或材質。

---

## 三、品牌符號：太陽

一個圓圈＋8 條放射光芒的 SVG，全站唯一品牌符號，**承擔功能，不是裝飾**。

```html
<svg viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="11" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
  <line x1="24" y1="2" x2="24" y2="7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
  <!-- 其餘 7 條用 transform="rotate(角度 24 24)" 複製，角度 45/90/135/180/225/270/315 -->
</svg>
```

目前實際套用的位置（同一份圖形，不是各自畫的相似圖案）：

| 檔案 | 用途 |
|---|---|
| `CountdownSunTime.vue` | 補擦倒數，光芒依剩餘時間比例明滅 |
| `BrandHeader.vue` | 頁首 logo，顏色隨 `tone` prop 反映全站最高急迫度 |
| `SunLoader.vue` | 全站 loading，8 條光芒依序 opacity 明滅 |
| `favicon.svg` / `apple-touch-icon.png` / `icon-*.png` | 網站圖示，內建 `prefers-color-scheme` 切換線條顏色 |

**符號的力量來自稀有。** `HomePage.vue` 的裝飾性太陽分隔線（`.sun-divider`）已在 commit `d53fa3b` 移除——它不承擔任何功能。不要讓每個按鈕、每個區塊都出現太陽。

---

## 四、Token 對照（`packages/ui/src/styles.css`）

### 中性色

| Token | 淺色 | 深色 |
|---|---|---|
| `--page-background` | `#f9f9f9` | `#0f0e0c` |
| `--surface-primary` | `#ffffff` | `#1c1a17` |
| `--text-primary` | `#121212` | `#f5f3ef` |
| `--text-secondary` | `#5a5a5a` | `#a8a29b` |
| `--border-subtle` | `#e3e3e3` | `rgb(255 250 240 / 12%)` |

深色模式的背景與文字**不能**是純黑 `#000` / 純白 `#fff`，一定帶暖色調，否則會變成「沒調過的預設深色模式」。

### 語意色（提醒狀態）

| 狀態 | 淺色本色 | 淺色淡底 | 深色本色 | 深色淡底 |
|---|---|---|---|---|
| tracking | `#2f6fbb` | `#eaf3fc` | `#6ba3e0` | `#17293d` |
| soon | `#a86100` | `#fff3d6` | `#e0a23f` | `#3a2a11` |
| due | `#cc3333` | `#fdecea` | `#e2585f` | `#3c1c1e` |
| untimed | `#5b3cc4` | `#f1edff` | `#a084e8` | `#271f42` |
| success | `#147d64` | `#e9f7f1` | `#35c19a` | `#143329` |

### UVI 風險色

| 等級 | 淺色 | 深色 |
|---|---|---|
| low | `#507aa8` | `#6f9bd4` |
| moderate | `#bd8500` | `#e0ab35` |
| high | `#d16627` | `#e3803e` |
| very-high | `#c43d3d` | `#e0555a` |
| extreme | `#7d4bb3` | `#a878e0` |

**深色模式規則**：語意色與 UVI 色在深色模式下不能沿用淺色 hex——同一色值在近黑背景上會因同時對比效應顯得洗白。上表右側兩欄是已經調過明度／飽和度的值，直接用。

### 版面與動態

```css
--space-1..12: 0.25 / 0.5 / 0.75 / 1 / 1.25 / 1.5 / 2 / 2.5 / 3 rem
--radius-sm: 0.5rem;  --radius-md: 0.875rem;
--radius-lg: 1.25rem; --radius-pill: 999px;

--content-max: 47rem;         /* 套在 .page-stack 與 .app-shell */
--tap-target: 2.75rem;
--bottom-nav-height: 4.5rem;
--duration-fast: 160ms; --duration-base: 240ms;
--ease-out: cubic-bezier(0.22, 1, 0.36, 1);
```

**`--bottom-nav-height` 是曾經真實壞過的地雷**：這個變數如果沒定義或被刪掉，`BottomNavigation.vue` 與 `AppShell.vue` 裡的 `calc()` 會整條靜默失效（不報錯，但底部導覽列會蓋住內容）。它必須在 `:root` 定義，兩處引用都要帶 fallback，改動前後用 DevTools Computed 面板實測。

### 已定義但無人使用的 token

`--shadow-card`、`--shadow-float`（規則 4 之後沒有任何使用者）、`--color-deep`、`--color-decoration-muted`。留著會誘導下一個人重新引入陰影，建議刪除。

---

## 五、共用類別（`apps/web/src/assets/app.css`）

| 類別 | 現況 |
|---|---|
| `.page-stack` | `--content-max` 寬度上限；子元素依序 opacity 淡入（0 / 0.08 / …／0.4s） |
| `.app-card` | 1px 邊框 + `--surface-primary` 底 + `--radius-lg`，**無陰影**。依規則 2，只用在需要注意力的元素 |
| `.button` | `--radius-md`（不是藥丸）、1px `--text-primary` 邊框、`:active` 用 `filter: brightness(0.92)` |
| `.button--primary` | 填 `--color-tracking`，白字 |
| `.button--quiet` | 邊框降為 `--border-subtle` |
| `.text-link` | `--color-tracking` 著色（commit `176bdad` 改在共用類別上，6 個檔案共用） |
| `.stat-figure` | 見下節 |
| `.safety-note` | 純字級縮小＋`opacity: 0.8`，**無左邊框** |

### `.stat-figure`：數字專用等寬字體

任何純數字或時間顯示（倒數分鐘、時間戳 `20:15`、UVI 值、耐水分鐘數）一律套用：

```css
font-family: var(--font-mono);
font-variant-numeric: tabular-nums;
font-weight: 600;   /* 不用 700，太重，與低重量感衝突 */
letter-spacing: -0.02em;
```

理由：中文字體（Noto Sans TC / PingFang TC）與英文字體（Helvetica Neue，堆疊第一位）的數字粗細、高度對不齊，混排會有微妙的不協調。全部走 mono 直接繞過這個問題，同時 mono 本身有「儀器讀數」的個性，符合測站觀測的產品調性。

### 死類別

`.status-card`（含五個 modifier）與 `.uvi-badge`（含五個 modifier）在 `app.css` 有完整定義，但 `src/` 下沒有任何使用者。它們是規則 2 確立前的產物，建議刪除。

---

## 六、CJK 排版

- **內文不加正值 `letter-spacing`**。中文本身是等寬方塊，加字距只會鬆散。舊樣板「`font-family: mono` + `letter-spacing: 0.12em` + `text-transform: uppercase`」已在 commit `9f7eebe` 全站移除。
- **大標題可以用負字距**（`.page-heading__title` 的 `-0.055em`），這條規則只針對一般內文與標籤。
- **內文 `line-height` 至少 1.6**；相鄰兩行刻意做層次時可用 1.4 / 1.6 的組合（`OutdoorContextCard.vue` 的 label 1.4 / description 1.6）。
- **Eyebrow 不是預設裝飾**。零資訊量（純粹重複旁邊標題）的 eyebrow 直接刪。保留時只用 `--font-size-label` + `font-weight: 500` + `--text-secondary`，不加 mono、不加字距、不轉大寫。

---

## 七、標題層級

整理前頁面上最不重要的區塊標題（戶外資訊、未來 5 天 UV，2rem）比最重要的補擦提醒標題還大。現在：

| 層級 | 字級 |
|---|---|
| 提醒卡主標題（首頁 `<h1>`） | `clamp(1.3rem, 5vw, 1.8rem)` — 全頁最大 |
| 區塊標題（`<h2>`） | `--font-size-section-title` + `font-weight: 600` |
| 內文 | `--font-size-body` |

區塊標題縮小後靠字重維持辨識度，掃讀順序因此符合資訊重要性。

首頁 DOM 順序：提醒 hero（`<h1>`）→ 各部位狀態 → 戶外資訊 → 五日 UV → 免責聲明，視覺順序與 DOM 語意順序一致。

---

## 八、Icon 規則摘要

完整規則見 `docs/ICON_DESIGN_SYSTEM.md`，重點：

- `stroke-width: 1.75`、`stroke-linecap/linejoin: round`、預設 `fill: none`
- 顏色預設 `currentColor`，只有代表狀態的圖示吃語意色變數
- 對稱造型用 `transform="rotate(...)"` 複製單一元素，不手繪每一份
- 動畫只用 `opacity`
- **不承擔資訊的 icon 直接刪**，不要為了「標題旁邊要有東西」而放
- 依規則 3，icon 不得插在文字左側把文字推開

---

## 九、元件模式

### Hero 卡片（首頁補擦倒數）

滿版 tone-soft 底色填滿，無邊框無陰影——全頁唯一該有填色背景的地方。依狀態切換 `--home-summary-tone` / `--home-summary-tone-soft`。

### 結構性區塊

無框，上緣 `1px solid var(--border-subtle)` 分隔線 → `<h2>` → 內容。

### 部位／分類狀態清單

不要「一個部位一列」的長列表（同狀態時會有大量零資訊量的重複列）。改用**依狀態分組＋橫向可換行 chip**：狀態文字當群組標題（吃語意色），部位名稱是一排藥丸標籤（`background: var(--tone-soft)`）。

### 表單選項

- 2-3 個短選項：橫向 segmented control
- 超過 3 個：兩欄緊湊網格
- 後續題目依賴前面答案時，用 `v-if` 整組隱藏，不要永遠攤開

### 確認／危險動作

不開獨立卡片或彈窗，用**原地文字替換**：預設是摘要文字＋一個文字連結，點擊後同一位置換成確認文字＋兩個按鈕（危險動作用實色，取消用 `.button--quiet`）。

### 空狀態／載入／錯誤

- Loading：`SunLoader.vue`，不用通用 spinner
- 空狀態：可有低調太陽裝飾（極低 opacity），SVG 必須有完整的 `fill: none` 與尺寸限制，否則會變成實心黑色圓餅（真實發生過的 bug）
- 錯誤：不用色框圈住整塊，改讓標題文字吃 `--color-due`，間距一律交給 grid `gap` 控制，不要疊加 margin

---

## 十、已知未套用範圍（誠實清單）

四條規則**只在首頁完整套用**。以下是實際用 grep 驗證出來、尚未收斂的地方：

### 規則 1（字級變數）未套用

以下檔案仍有硬寫字級，且多數是非 token 的中間值（`0.85 / 0.9 / 0.95 / 1.05 / 1.08 / 1.1 / 1.2 / 1.25 / 1.3 / 1.35 / 1.5rem`）：

- Setup 流程全部：`SetupStepShell.vue`、`SetupContextPage.vue`、`ContextSelector.vue`、`ApplicationTimePicker.vue`、`WaterStartPicker.vue`、`ZoneProtectionForm.vue`、`SetupReviewSummary.vue`、`QuickProtectionSummary.vue`、`ProtectionAdjustmentSheet.vue`
- 地區：`RegionLocationPanel.vue`、`RegionManualSelector.vue`、`RegionPreferenceSummary.vue`、`RegionPage.vue`
- 其他：`ProductSnapshotEditor.vue`、`SetupProcessBanner.vue`、`AppearanceSettings.vue`、`SessionEndControl.vue`、`EveningUvPrompt.vue`、`BrandHeader.vue`、`BottomNavigation.vue`、`GlobalStatusBanner.vue`
- **連 `app.css` 自己也有兩處**：`.page-heading__eyebrow` 寫死 `0.8rem`（應改用 `--font-size-label`）、`.safety-note` 寫死 `0.72rem`（沒有對應 token，需決定是收進 `--font-size-caption` 還是新增 token）

### 規則 2（填色／邊框）未套用

- `SessionEndControl.vue:193` 錯誤訊息用 `border-left: 3px solid var(--color-due)` — 正是規則禁止的色條
- `EveningUvPrompt.vue:77` 同時有 `border` 和 `background`，需判斷它算不算「需要注意力的元素」；若算，應拿掉邊框只留填色
- `FiveDayUvCard.vue` 每格用 `border-color` 表達 UVI 風險等級，且同一資料被編碼三次（彩色邊框＋大數字＋實色藥丸徽章）
- `.app-card` 仍被 10 個檔案使用（Setup、地區、產品、設定），這些畫面尚未依規則 2 判斷過哪些該保留框

### 規則 4（動畫）未套用

- `QuickProtectionSummary.vue:196` 與 `SetupReviewSummary.vue:427` 的 `@keyframes slideDown` 含 `transform: translateY(-0.5rem)` — 進出場位移
- `CountdownSunTime.vue` 的 `sun-ray-pulse-success` 動畫 `stroke-width` 從 1.75 變 2.5；此外它的 keyframes `0%` 與 `100%` 是空 block，行為是意外正確而非設計正確
- `SetupReviewPage.vue:125` 的 `@keyframes spin`（`rotate(360deg)`）是持續旋轉動畫，需判斷是否改用 `SunLoader.vue`

### 其他待處理

0. **首頁底部免責聲明尚未調整**（`.safety-note`）。方向已確定：加細分隔線、字級降到 `--font-size-caption`、與底部導覽列拉近。**刻意留給獨立 session 處理**——這個改動會動到 `.page-stack` 的間距，而 `.page-stack` 是全站共用容器（MorePage、RegionPage、ReminderPage 等都在用），動手前要先確認對其他頁面的影響。順帶處理上面「規則 1 未套用」提到的 `.safety-note` 字級硬寫問題（目前 `0.72rem`，無對應 token）。

1. `BrandHeader.vue` 的 wordmark 仍有 `letter-spacing: 0.24em`，但內容是中英混排「UVAlert 防曬晴報員」，違反第六節的 CJK 規則。
2. **無障礙對比度從未實測**。commit `9f7eebe` 的訊息宣稱「深色模式已驗證 WCAG AA+」，但沒有留下驗證方法或數據，不應視為已完成。
3. **中等寬度（平板 ~768px）斷點沒驗證過**，只確認過手機窄螢幕與寬桌面。`.app-shell` 的 `border-inline` 在這個寬度會形成一個空的「手機殼」外框。
4. **文案未走審查流程**。`P0_COPY_DECK.md` 定義了 `PRODUCT_DRAFT → APPROVED` 的狀態機制；這輪改了不少畫面文字，這些改動要補走流程。
5. 整體文案偏向過度解釋與預先防禦（「不影響已保存的本機提醒」「不會影響目前的本機補擦提醒」），是獨立於視覺的另一個問題，尚未處理。

---

## 十一、檢查清單

改動任何畫面前後，逐條過：

- [ ] 字級是否只用五個 `--font-size-*` 變數？（資料讀數的 `clamp()` 除外）
- [ ] 這個容器需要注意力嗎？不需要就無框，用「上緣分隔線 → 標題 → 內容」
- [ ] 有沒有用色條／左邊框／彩色描邊表達狀態？改用滿版淡底色或文字著色
- [ ] 同一區塊內每一行文字的左緣是否對齊？有沒有 icon 把文字推開？
- [ ] 有沒有新增 `box-shadow` 或 gradient？
- [ ] 動畫是否只改 `opacity`？`transform` 是否只用於靜態幾何？
- [ ] 純數字／時間有沒有套 `.stat-figure`？
- [ ] 間距是否統一由 grid `gap` 控制，而非 gap 與多處 margin 疊加？
- [ ] Eyebrow 是否帶有標題沒有的資訊？沒有就刪
- [ ] icon 是否承擔資訊？純裝飾就刪
- [ ] 深色模式的新色票是否重新調過明度／飽和度，不是複製淺色 hex？
- [ ] 改完是否用 DevTools 實測（左緣 x 座標、computed font-size、`--bottom-nav-height`），而不是只看畫面？

改完後：列出用了清單裡哪幾條、跳過哪些並說明原因，附上實測數據。
