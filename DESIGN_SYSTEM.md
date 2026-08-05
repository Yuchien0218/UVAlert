# Sunshield Advisor 設計語言規範

這份文件整理專案這一路的視覺調整，是全站設計決策的**唯一權威來源**。任何人（包含 AI 助手）修改畫面前，先讀這份文件，不要憑印象或舊版畫面去猜規則。

**給 AI 助手的使用方式**：修改任何元件前，先問使用者拿「目前專案裡實際的檔案」，不要用你記憶中或先前對話裡的版本去改——這個專案已經發生多次「改好的東西過幾輪又跑掉」的狀況，起因都是在過時版本上疊修改。改完之後，對照這份文件的檢查清單（見文末）逐條確認，不要自己發明新樣式。

---

## 一、設計哲學

兩句話決定所有視覺判斷：

- **重量感極低**：線條構成，無厚度、無陰影、無重力壓迫感，穩定感來自中心對稱結構，不是靠粗重的實心色塊或投影。
- **材質感純淨**：純數位圖案，表面無紋理、無反光，純色平塗（flat color），屬於無機、非物理性的介面元素，不模擬真實世界的光影或材質。

任何新增或修改，先問：「這個做法有沒有違反上面兩條？」

**已知例外／未解決的衝突**：`.app-card` 目前仍使用 `box-shadow`（模擬物理光影），跟這個哲學矛盾，是全站唯一還沒決定要不要處理的系統性不一致，見文末「未解決事項」。

---

## 二、品牌符號：太陽

一個手繪的圓圈＋8 條放射光芒 SVG，是全站唯一的品牌符號，**不是裝飾用途，是承擔功能的符號**。

```html
<svg viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="11" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
  <line x1="24" y1="2" x2="24" y2="7" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
  <!-- 其餘 7 條用 transform="rotate(角度 24 24)" 複製，角度依序 45/90/135/180/225/270/315 -->
</svg>
```

**目前已套用的地方**（同一份圖形，不是各自畫的相似圖案）：

| 位置 | 用途 |
|---|---|
| `CountdownSunTime.vue` | 補擦倒數，光芒依剩餘時間比例明滅（`Math.max(1, ...)` 保底，永遠至少留 1 條，不會退化成空心圈） |
| `BrandHeader.vue` | 頁首 logo，顏色隨 `tone` prop（見第四節）反映全站最高急迫度 |
| `SunLoader.vue` | 全站 loading 指示器，8 條光芒依序 `opacity` 明滅 |
| `favicon.svg` / `apple-touch-icon.png` / `icon-*.png` | 網站圖示，內建 `prefers-color-scheme` 自動切換線條顏色 |
| `ThemeToggle.vue` | 深色模式切換鈕，深色時光芒 `opacity` 降到 0.15，圓心降到 0.6（太陽下山的隱喻，不是燈泡開關） |
| `HomePage.vue` 的 `.sun-divider` | 卡片之間的低調轉場裝飾，`opacity: 0.5`，極輕 |

**使用原則**：符號的力量來自稀有，不是無所不在。只用在真正代表「時間／狀態／核心功能」的地方（倒數、載入、完成回饋、favicon、主題切換），不要每個按鈕、每個圖示都塞一個太陽。

---

## 三、色彩系統

### 品牌中性色

| Token | 淺色 | 深色 |
|---|---|---|
| `--page-background` | `#f9f9f9` | `#0f0e0c`（暖色調近黑，不是純黑） |
| `--surface-primary` | `#ffffff` | `#1c1a17` |
| `--text-primary` | `#121212` | `#f5f3ef`（米白，不是純白） |
| `--text-secondary` | `#5a5a5a` | `#a8a29b`（暖灰，跟背景色調呼應） |
| `--border-subtle` | `#e3e3e3` | `rgb(255 250 240 / 12%)` |

**規則**：深色模式的背景/文字絕對不能是純黑 `#000`／純白 `#fff`，一定要帶一點暖色調，跟品牌識別綁在一起，避免變成「沒特別調過的預設深色模式」。

### 語意色（提醒狀態）：tracking / soon / due / untimed / success

每個狀態有一組「本色」跟「淡底色」：

| 狀態 | 淺色本色 | 淺色淡底 | 深色本色 | 深色淡底 |
|---|---|---|---|---|
| tracking（追蹤中） | `#2f6fbb` | `#eaf3fc` | `#6ba3e0` | `#17293d` |
| soon（即將） | `#a86100` | `#fff3d6` | `#e0a23f` | `#3a2a11` |
| due（已到期） | `#cc3333` | `#fdecea` | `#e2585f` | `#3c1c1e` |
| untimed（無計時） | `#5b3cc4` | `#f1edff` | `#a084e8` | `#271f42` |
| success（完成） | `#147d64` | `#e9f7f1` | `#35c19a` | `#143329` |

**深色模式規則**：語意色/UVI 色在深色模式底下，不能直接沿用淺色模式的 hex 值——同一個色值在近黑背景上會因為同時對比效應顯得洗白、沒力道。深色模式的每組本色都要**提高明度與飽和度**，淡底色也要重新調（見上表右側兩欄，這是已經調過、可直接用的值，不是隨便寫的）。

### UVI 風險色（low / moderate / high / very-high / extreme）

| 等級 | 淺色 | 深色 |
|---|---|---|
| low | `#507aa8` | `#6f9bd4` |
| moderate | `#bd8500` | `#e0ab35` |
| high | `#d16627` | `#e3803e` |
| very-high | `#c43d3d` | `#e0555a` |
| extreme | `#7d4bb3` | `#a878e0` |

同樣遵守「深色模式要重新調亮」的規則。

### 顏色使用原則

- **不用色條／描邊表達重要性或狀態**。這個模式已經在多處拿掉（`SessionEndControl.vue` 確認框的紅色頂條、`SetupReviewSummary.vue` 審查卡片的藍色左邊條、`QuickProtectionSummary.vue` 的橘色左邊條、`FiveDayUvCard.vue` 錯誤提示的紅色左邊線、`.safety-note` 的灰色左邊線），改用兩種替代做法：
  1. **滿版淡底色填色**（`tone-soft` 背景，無邊框無陰影）——用在真正需要視覺權重的主要內容，例如首頁 hero 卡片、`.clothing-summary--success`、`.quick-protection`。
  2. **小圓點**（呼應太陽符號家族的圓形語言）——用在標題文字前面標示狀態，例如部位狀態分組標題、`FiveDayUvCard.vue` 錯誤訊息前的紅點、頁首「本機提醒」旁的狀態點。
- 中性、非狀態性的審查/摘要內容，用中性的 `.app-card`（白底邊框，無色）或直接不用卡片（純文字＋分隔線），不要為了「看起來有設計感」硬套語意色。

---

## 四、Token 對照表（`styles.css` / `app.css`）

```css
/* 間距 */
--space-1: 0.25rem;  --space-2: 0.5rem;   --space-3: 0.75rem;
--space-4: 1rem;     --space-5: 1.25rem;  --space-6: 1.5rem;
--space-8: 2rem;     --space-10: 2.5rem;  --space-12: 3rem;

/* 圓角 */
--radius-sm: 0.5rem; --radius-md: 0.875rem; --radius-lg: 1.25rem; --radius-pill: 999px;

/* 版面 */
--content-max: 47rem;        /* 頁面寬度上限，套在 .page-stack，寬螢幕不會被拉爆 */
--tap-target: 2.75rem;       /* 最小可點擊尺寸 */
--bottom-nav-height: 4.5rem; /* 底部導覽列高度，AppShell 的 padding-bottom 靠這個對齊 */

/* icon（見 ICON_DESIGN_SYSTEM.md，這裡列常用值） */
--icon-stroke-width: 1.75;
--icon-size-sm: 1.25rem;
--icon-size-md: 1.5rem;
--icon-size-lg: 3.25rem;
```

**`--bottom-nav-height` 是一個曾經真實壞過的地雷**：這個變數如果沒被定義、或被意外刪掉，`BottomNavigation.vue` 跟 `AppShell.vue` 裡引用它的 `calc()` 會整條靜默失效（不報錯，但版面會壞），過去導致底部導覽列長期蓋住頁面內容，改了好幾輪都沒抓到根本原因。這個變數：
1. 一定要在 `styles.css` 的 `:root` 定義。
2. 兩處引用都要帶 fallback：`var(--bottom-nav-height, 4.5rem)`。
3. 改動前後都要用 DevTools 的 Computed 面板實測驗證，不要只看畫面猜。

---

## 五、字體排版

### 字體堆疊

```css
--font-sans: "Helvetica Neue", Inter, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif;
--font-mono: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
```

### `.stat-figure`：數字專用等寬字體

任何**純數字或時間顯示**（倒數分鐘數、時間戳如 `20:15`、UVI 數值、產品耐水分鐘數等）一律套用：

```css
.stat-figure {
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
  font-weight: 600; /* 不要用 700，太重，跟「低重量感」哲學衝突 */
  letter-spacing: -0.02em;
}
```

**理由**：中文字體（Noto Sans TC / PingFang TC）跟英文字體（Helvetica Neue，排在字體堆疊第一位）的數字粗細、高度不一定對得齊，混排在同一行會有微妙的不協調感。讓所有數字統一走 mono，等於直接繞過這個問題，同時 mono 字體本身有「儀器讀數」的個性，符合「測站觀測」的產品調性。

### CJK 內文排版規則

- **內文不加正值 `letter-spacing`**。中文字本身每個字是等寬方塊，額外加字距只會讓字距顯得鬆散不自然。這個問題已經在多處修過：`.page-heading__eyebrow`、`.session-end__eyebrow`、`.context-card__eyebrow`、`.zone-list__eyebrow`、`.uv-forecast__eyebrow`、`.home-summary__eyebrow`、`.quick-protection__eyebrow`、`.review-card__eyebrow`，全部拿掉了 `font-family: var(--font-mono)` + `letter-spacing: 0.12em` + `text-transform: uppercase` 這組舊樣板。
- **大標題（page title 等級）可以用負字距**，例如 `.page-heading__title { letter-spacing: -0.055em; }`，這是對的，不用改。這條規則只針對「一般內文/標籤」，不適用大標題。
- **內文 `line-height` 至少 1.7**，中文字視覺筆畫密度高，需要比英文更寬的行距。
- **Eyebrow（小標籤）不是預設要有的裝飾**。如果一個 eyebrow 純粹是重複翻譯旁邊的 h1/h2 標題（零額外資訊），直接刪掉，不要留著（已在 `OutdoorContextCard.vue`、`ZoneStatusList.vue`、`FiveDayUvCard.vue` 這樣處理）。只有在 eyebrow 真的帶有標題沒有的資訊時才保留，且样式只用：
  ```css
  font-size: 0.8rem;
  font-weight: 500;
  color: var(--text-secondary);
  /* 不要 font-family: mono，不要 letter-spacing，不要 uppercase */
  ```

### 免責聲明／次要說明文字（`.safety-note`）

```css
.safety-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.72rem;
  line-height: 1.6;
  opacity: 0.8;
}
```

不用邊框線或色條圈起來，純粹靠字級縮小＋透明度降低，讓它自然「退到背景」——這是「用 opacity 表達重要程度」這條動畫哲學延伸到靜態排版的例子。

---

## 六、Icon 規則摘要

完整規則在 `ICON_DESIGN_SYSTEM.md`，重點：

- `stroke-width: 1.75`（24 或 48 viewBox 為基準）、`stroke-linecap/linejoin: round`、預設 `fill: none`，只有選取／啟用狀態才允許實心填色。
- 顏色預設 `currentColor`，只有代表「狀態」的圖示（太陽、狀態點）才吃語意色變數。
- 對稱造型用 `transform="rotate(...)"` 複製單一元素畫出來，不要手繪每一份。
- 尺寸從 `--icon-size-sm/md/lg` 三個 token 選，不寫死 px。
- 動畫只允許 `opacity`，不做位移／縮放（**唯一的例外**是主題切換的圓形揭露過場，屬於「揭露機制」而非「物體位移」，判斷邏輯見第七節）。
- 圖示＋文字組合時，多行文字先包成同一個 `grid` 直排區塊再跟圖示對齊，不要用 `margin-left` 手動算縮排（不同元素的 `em` 基準不一樣，容易算錯）；圖示與文字的垂直對齊預設用 `align-items: flex-end`（對齊底線），不要用 `center`，避免圖示視覺重心偏高、跟文字顯得漂浮不平衡。

---

## 七、動畫規則

### 只用 opacity，不用位移／縮放

- 太陽光芒明滅（倒數、loading）：純 `opacity` transition/animation。
- 卡片按下回饋：`filter: brightness(0.92)`（純色彩變化），不做 `scale()` 彈跳，也不要保留 hover 的位移殘留（按下時要把 `transform` 重設回 `translateY(0)`）。
- 頁面內容分層淡入（`.page-stack > *`）：純 `opacity` + `animation-delay` 錯開，`fill-mode: backwards`，套用在 `.page-stack` 上會全站生效。

### 主題切換的圓形揭露：唯一被允許的例外

亮/暗模式切換用 View Transitions API + `clip-path: circle()` 從觸發按鈕位置展開，是刻意的例外，因為：
1. 概念上是「揭露（reveal）」而非「移動一個物體」，比較接近光圈開合，不是模擬物理慣性。
2. 呼應太陽符號「日出／日落」的品牌隱喻。
3. 不支援的瀏覽器會直接無動畫切換，是漸進增強，不影響基本體驗。

**不要**因為這個例外就開始允許其他位移/縮放動畫——這是唯一被論證過、跟品牌隱喻掛鉤才成立的特例。

### 明確被拒絕的動畫語言（曾經參考過但判斷不採用）

- **躁點／雲霧過場**：跟「無紋理、非物理性」哲學正面衝突，紋理與霧氣模擬都是物理質感語言，不採用。
- **圖示位移重組動畫**（旋轉＋位移做出圖示變形）：本質是物理性移動，不採用；如果想要按鈕圖示有反饋感，改用 opacity 交替顯示。
- **按鈕按下彈跳**（scale 彈跳＋icon 晃動）：暗示重量與慣性，不採用；用純色彩變化取代。

一律加 `@media (prefers-reduced-motion: reduce)` 處理，把動畫關閉或縮到極短。

---

## 八、元件模式

### Hero 卡片（首頁補擦倒數）

- **不用 `.app-card`**（沒有邊框、沒有陰影），改用滿版 `tone-soft` 底色填滿。這是全頁唯一該有「填色背景」的地方，建立主次視覺層級。
- 依狀態（tracking/soon/due）動態切換 `--home-summary-tone` / `--home-summary-tone-soft` 兩個 CSS 變數。
- 太陽圖示＋數字＋預計時間的排列：圖示獨立一欄（固定 rem 尺寸，不用會受字級影響的 `em`），數字＋預計時間包成同一個 grid 直排欄位，兩者 `align-items: flex-end` 對齊底部。

### 中性審查／摘要卡片

- 內容量大、需要掃描的：`.app-card`（白底邊框，無色，無陰影爭議見「未解決事項」）。
- 內容量小（2-3 行）：不用卡片框，純文字＋`border-bottom` 分隔線，避免跟旁邊內容量大很多的卡片比高度、造成比例失衡（`SetupReviewSummary.vue` 的「目前情境」就是這樣處理）。
- 有明確「推薦／完成」語意的：滿版淡色底填色（`--color-soon-soft` / `--color-success-soft`），無邊框（`QuickProtectionSummary.vue`、`.clothing-summary--success`）。

### 部位／分類狀態清單

不要用「一個部位一列，逐列重複顯示狀態」的長列表（同狀態時會有大量重複、零資訊量的列）。改用**依狀態分組＋橫向可換行的 chip 群組**：狀態文字當群組標題（吃語意色），底下的部位名稱是一排藥丸標籤（`background: var(--tone-soft)`）。同狀態的部位收進同一組，只有狀態真的不同才會分成多組、占用更多垂直空間。

### 表單選項（產品標示問卷等）

- **2-3 個短選項**：橫向 segmented control（`grid-auto-flow: column`），不要每個選項都是獨立的滿版寬大按鈕。
- **超過 3 個選項**：兩欄緊湊網格（`grid-template-columns: repeat(2, minmax(0, 1fr))`）。
- **後續題目依賴前面答案時，條件式隱藏**：如果某個答案會讓後面幾題在邏輯上完全不影響結果（例如「沒有防曬宣稱」時，等待時間／補擦時間／耐水標示都不會拿去算提醒），直接用 `v-if` 整組隱藏，不要不管答案永遠攤開全部題目。

### 確認／危險動作

不開獨立卡片或彈窗，用「原地文字替換」：預設顯示摘要文字＋一個文字連結（底線，不是按鈕），點擊後同一個位置換成確認文字＋兩個按鈕（危險動作用實色按鈕＋文字說清楚後果，取消用 `button--quiet`）。不用色條、不用陰影框，純文字排版，跟頁面其他內容視覺語言一致（`SessionEndControl.vue`）。

### 空狀態／載入狀態

- Loading：`SunLoader.vue`（太陽光芒依序 opacity 明滅），不用通用 spinner。
- 空狀態（例如「尚未建立提醒」）：可以有低調的太陽裝飾背景（`opacity` 極低，例如 0.08，且要確保 SVG 有完整的 `fill: none` 與尺寸限制樣式，否則會變成實心黑色大圓餅——這是真實發生過的 bug，樣式規則寫在元件的 `<style scoped>` 裡一定要跟 template 同步存在，不能只改一邊）。主要行動按鈕跟裝飾圖形要分開，不要疊在一起互相遮擋；按鈕預設靠左（跟主要內文對齊），不要無故靠右跟裝飾圖形打架。
- 錯誤狀態：不用色條框住整塊，純文字＋按鈕，如果需要顏色提示用小圓點或按鈕本身的顏色，不用整塊邊框變色。

---

## 九、版面結構

- `.page-stack` 是共用容器：`max-width: var(--content-max)` + `margin-inline: auto`，避免寬螢幕內容被拉爆、元素之間距離失控。
- 首頁排列順序：倒數 hero（`<h1>`，語意上的頁面主標題）→ 部位狀態 → 戶外資訊（`<h2>`）→ 提醒控制 → 五日 UV → 免責聲明。Hero 移到最前面後，記得同步把原本在「戶外資訊」上的 `<h1>` 降成 `<h2>`，維持視覺順序與 DOM 語意順序一致，不要讓螢幕閱讀器唸出的標題順序跟畫面顯示順序不一樣。
- 底部導覽列 `position: fixed`，主要內容容器要留出等高的 `padding-bottom`（見第四節 `--bottom-nav-height`）。

---

## 十、目前設計上不足、建議後續處理的地方

依優先度排序：

1. **`.app-card` 的 `box-shadow` 跟「非物理性、無重力壓迫感」哲學矛盾**，是全站唯一還沒決定方向的系統性不一致。建議團隊二選一貫徹到底：拿掉陰影改純邊框分隔，或者明確定義太陽符號是唯一的「無陰影特例」，其他都可以有陰影。目前是懸而未決狀態。

2. **「戶外資訊」跟「未來 5 天 UV」職責重疊**：兩者都在催促使用者設定地區，訴求重複。建議整合成一個共用的行動入口，沒設定地區時只在其中一處完整說明+CTA，另一處只用一行簡短文字＋連結指過去。

3. **Setup 流程（`SetupContextPage.vue`、`SetupTimingPage.vue`、`SetupProtectionPage.vue` 等）從未被 audit 過**，只有 `SetupReviewSummary.vue`、`QuickProtectionSummary.vue` 被實際修過。這幾頁很可能還停留在最舊的版本（例如稍早截圖看到的橘色邊框大按鈕選項），需要照第八節的表單規則重新檢查。

4. **無障礙對比度從未實際驗證**：深色模式的新色票、五種語意色，這幾輪只顧著調視覺沒有用工具實測是否通過 WCAG AA。

5. **中等寬度（平板，~768px）斷點沒驗證過**，只確認過手機窄螢幕跟很寬的桌面。

6. **文案審查流程**：專案本身有 `P0_COPY_DECK.md` 定義的審查狀態機制（`PRODUCT_DRAFT → APPROVED`），這幾輪改了不少畫面文字（例如把「現在」改成「已於 20:15 到期」這類建議），這些文字改動要走一遍既有審查流程，不能因為是 AI 建議的就跳過。

7. **`BottomNavigation.vue` 的選中狀態、頁首狀態反映機制**還在概念階段：討論過「選中分頁用 opacity 差異取代底線」「提醒分頁掛小圓點反映急迫度」，但實際程式碼還沒動手做，只完成了頁首 logo／狀態點的部分（`AppShell.vue` 算出 `highestUrgencyTone` 傳給 `BrandHeader.vue`）。

8. **`ReminderEmptyState.vue` 的圖示拿掉打勾後，目前留白**，如果之後想要有個小圖示，鈴鐺是合理備案，但還沒實作。

---

## 十一、給 AI 助手的檢查清單

改動任何畫面前後，過一遍：

- [ ] 有沒有「英文/中文 eyebrow 標籤 + letter-spacing + mono 字體」的舊樣板？是不是該直接刪掉 eyebrow（如果它零資訊量）？
- [ ] 有沒有用色條／描邊表達重要性或狀態？改成滿版底色或小圓點。
- [ ] 純數字/時間有沒有套用 `.stat-figure`？
- [ ] 2-3 個短選項是不是該用 segmented control，而不是滿版大按鈕？
- [ ] 按鈕有沒有純色 `:active` 回饋，沒有殘留 hover 的位移？
- [ ] 圖示是否符合 `ICON_DESIGN_SYSTEM.md`（線條、留白比例、opacity-only 動畫、對齊邏輯）？
- [ ] 頁面寬度有沒有受 `--content-max` 限制？
- [ ] SVG 裝飾元素的 CSS 是否跟 template 同步存在（避免黑色實心圖形 bug）？
- [ ] 深色模式的新增色票是否重新調過明度/飽和度，不是直接複製淺色模式的 hex？
- [ ] `--bottom-nav-height` 等關鍵變數改動後，是否用 DevTools Computed 面板實測驗證？
- [ ] 如果不確定某個檔案的目前狀態，是否已經跟使用者要了「目前專案裡實際的版本」，而不是憑記憶或先前對話的版本去改？

改完後：列出用了清單裡的哪幾條、跳過哪些並說明原因，附上修改前後的畫面或程式碼片段給使用者確認。
