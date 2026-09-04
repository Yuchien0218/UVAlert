# 切換／點選的互動動效：盤點、裁決與分批實作計畫

日期：2026-09-04
狀態：**批次 0 已完成（2026-09-04），批次 1–5 未動工。** 第六節是施作順序，一批一個 PR。

---

## 一、為什麼需要這份文件

`DESIGN.md` 第十二節（2026-08-29 重訂的五條動效規則）本身寫得夠好，**問題不在規範，在於落實得非常不平均**。

一個量化的結果：

> 全站有 **20 個 `cursor: pointer` 的可點表面，但只有 8 個地方有任何按壓或 hover 回饋** —— 六成的可點元素按下去完全沒反應。

而且缺回饋的地方，剛好就是點擊次數最多的地方（選部位、選情境、選裝備分類）。

## 二、現況盤點

| 表面 | 現在有什麼 | 缺口 |
| --- | --- | --- |
| `.choice-grid label` | 底色／文字／邊框 160ms 過渡 ＋ `:active` 變暗 0.85 | 這組最完整，可當基準 |
| `.time-option` | 160ms 過渡 ＋ `:active` 0.92 | 變暗檔位與上面不同 |
| `.button` | 160ms 過渡 ＋ `:active` 0.92 | OK |
| `.icon-button` | 只有 `:active` 變暗，**沒有 transition** | 按下與放開都是瞬變 |
| `.zone-chip`（部位藥丸） | **完全沒有** transition、沒有 `:active` | 選取瞬變、按下無回饋 |
| `.context-tile`（情境磁磚） | **完全沒有** transition、沒有 `:active` | 同上，且選取外觀與全站不一致 |
| `.category-option`（裝備分類） | 顏色 2026-09-01 已統一，但**沒有 transition** | 選取瞬變 |
| 底部導覽 | 藥丸底色 160ms 淡入 | 標籤 `font-weight: 700` 瞬間變粗；分頁之間沒有轉場 |
| 展開收合（chevron） | 換 icon name，瞬間切換 | 沒有交叉淡入；**收合完全沒有動畫**（`v-if` 直接消失） |
| `BottomSheet` | `<Transition>` 純 opacity 160ms | 進出同速 |
| `HomeCountdown` | 圖示交叉淡入 ＋ 進度條寬度 320ms ＋ 顏色 450ms | 全站做得最完整的一處，可當範本 |
| `FiveDayUvCard` `.uv-day` | `:hover` 改 border-color | **它是不可點的 `<li>`** —— 假可點 |
| `AppNotice`（操作成功） | `role="status"`，無任何進場 | 「已儲存」出現得毫無存在感 |

## 三、四個結構性問題

1. **全站有兩套「已選取」的長相。** 九處走 `.option-selected`（`--color-muted` 邊框 ＋ `--color-hairline` 底），`ContextSelector` 自己一套（`--color-primary` 邊框 ＋ `--color-surface-cream-strong` 底）。`GearForm` 2026-09-01 才因為相同理由被統一過去，`ContextSelector` 是漏掉的那一個。
2. **按下去沒回饋的地方，剛好是點擊最多的地方**（見第一節的量化結果）。
3. **換頁的動效是單向的。** `page-stack` 的分層淡入只處理進場，舊頁瞬間消失；而且**返回上一頁也會重跑階梯淡入**，讀起來像「重新載入」而不是「回來了」。
4. **展開收合缺一半。** `QuickProtectionSummary` 有進場沒離場，其餘四五個展開區塊連進場都沒有。

## 四、裁決（2026-09-04，使用者逐項確認）

| # | 議題 | 裁決 |
| --- | --- | --- |
| 1 | `ContextSelector` 的選取外觀 | **統一成 `.option-selected`**（muted 邊框 ＋ hairline 底），`DESIGN.md` 的 `context-option-selected` 一併回寫 |
| 2 | 收合時的高度塌陷 | **為了連續感，突破「只用 opacity」的規則** |
| 3 | 按壓變暗的檔位 | **開 `--press-dim` token 進 `DESIGN.md`**；預設值 `0.92`，**但要截圖比對 0.85／0.92 再定案** |
| 4 | 換頁離場轉場 | **接受多 120–160ms** |
| 5 | 底部導覽的選取態 | **拿掉字重變化，改成文字換色**（不再用粗體） |
| 6 | Google Play 的按壓手感 | **A ＋ B 都做**（換緩動曲線＋藥丸橫向展開） |
| 7 | 第一條流程 | **首頁 → 記錄補擦** |

### 裁決 1 的理由

1. 一比九。
2. 這個裁決 2026-09-01 已經做過一半（`GearForm`），留著等於只執行一半。
3. `--color-primary` 是**行動色**。拿它當選取邊框，等於讓「這裡可以按」跟「這個已經選了」共用一個訊號 —— 而情境磁磚本身就是可按的，兩個訊號疊在同一個元素上最容易混淆。
4. 對比度反而更好：muted 邊框 5.56、primary 4.37（SC 1.4.11 門檻 3:1）。

### 裁決 3 的理由（以及為什麼還要看一眼）

暖象牙 `#FAF5EC` 乘 0.85 約落到 `#D5D0C9` —— 那不是「被按下」，是「變成灰色」。這個配色本來就是低對比設計，暗 15% 會把暖色相壓掉。0.92 也已經是三比一的多數（`.button`／`.icon-button`／`.time-option`）。

**但按壓變暗在低彩度暖色上是典型的「數值看不出來、只有眼睛看得到」**，照 `CLAUDE.md` 的規矩要截圖比對後才定案。

### 裁決 5 的代價（必須記下來）

**這推翻了 2026-08-23 的裁決。** 當時 Claude Design 的下游元件庫明寫「用形狀承載狀態，**不換色** —— 選取態是圖示後面的奶油色藥丸底加粗體標籤，圖示與文字顏色在任何狀態下都一樣」，使用者確認要藥丸版，`DESIGN.md` 也一併回寫了。這段理由現在寫在 `BottomNavigation.vue` 的註解裡，**實作時要一併更新那段註解，不要留下互相矛盾的兩套說法。**

**只換標籤文字的顏色，不換圖示的顏色。** 理由是 nav 圖示是雙色系統：墨咖結構走 `currentColor`、**琥珀金重點寫死在 SVG 裡**。對圖示換色只會換掉一半，變成半邊變色。

**選取態的文字色（2026-09-04 定案）**：未選 `--text-secondary`（muted，對畫布 5.93:1）、選中 `--text-primary`（ink）。走**明暗階不走色相階** —— 不用 `--color-primary-text`，因為那與裁決 1 的理由直接衝突（行動色不當選取訊號）。

## 五、Google Play 的手感拆解

查了 Material 3 的 motion token。那個手感是四件事疊起來的：

| 組成 | 內容 | 處置 |
| --- | --- | --- |
| **A. 緩動曲線** | M3 standard `cubic-bezier(0.2, 0, 0, 1)` —— 起步快、尾巴長 | ✅ **做**。不必破任何規則 |
| **B. 藥丸橫向展開** | 指示器從中心撐開，不是直接淡入 | ✅ **做**。需要 `scaleX`，屬於突破 |
| **C. Ripple 漣漪** | 從觸點放射的水波 | ❌ **不做** |
| **D. 圖示 outlined→filled** | 未選空心、選中實心 | ❌ **做不到** |

**A 是差最多的一項，而且最便宜。** 這個專案的 `--ease-out` 是 `cubic-bezier(0.25, 0.46, 0.45, 0.94)`（溫和的 easeOutQuad，幾乎等速）；M3 的起步陡、尾段拖很長。**同樣 160ms、動同樣的東西，換這條曲線就有八成的差別。** 而 `DESIGN.md` 只寫「緩動一律 ease-out」，**沒有規定那顆 token 的數值**，所以加一顆 `--ease-emphasized` 只是補檔位，不是推翻規則。

**C 不做的理由**：漣漪的視覺語言是「擴散的能量」，與規範第一句寫的「情緒基調是**耐心**」直接相衝。

**D 做不到的理由**：nav 圖示沒有 outlined/filled 兩版，要做等於再畫 3 顆圖示，而**幾何真實來源在 Illustrator**，不是改 SVG 能解決的。這是圖示工作，不是動效工作。

參考來源：
[Material 3 — Easing and duration tokens](https://m3.material.io/styles/motion/easing-and-duration/tokens-specs) ·
[material-components-android — Motion tokens](https://github.com/material-components/material-components-android/blob/master/docs/theming/Motion.md)

## 六、分批實作順序

一批一個 PR，每批跑 `pnpm check`。**動共用檔（`app.css`／`styles.css`／`DESIGN.md`）前先跑 `ListAgents`** —— 這個 repo 已經因為併行 session 弄丟過工作。

### 批次 0：token 與規則（不動畫面）— ✅ 已完成 2026-09-04

- `DESIGN.md` frontmatter 的 `motion:` 加 `press-dim: 0.92`、`ease-emphasized: cubic-bezier(0.2, 0, 0, 1)`
- `packages/ui/src/styles.css` 加同兩顆
- **改寫第十二節第一條**（見第七節）
- 守門：`packages/ui/src/tokens.test.ts` 會自動比對兩邊，不必另寫

風險低，但會動三個共用檔，所以單獨一批先落地。

**完成紀錄**：兩顆 token 已進 `DESIGN.md` frontmatter 與 `styles.css`；第十二節第一條改寫成原則式（附「已核可的非 opacity 動效」封閉清單），第二條補 `ease-emphasized` 的適用範圍，並新增第六條「可點的東西按下去要有回饋」。`tokens.test.ts` 會自動為每顆新 token 生成一組測試——**已刻意改壞兩顆確認會紅**（2 failed / 141 passed），再還原。畫面零變化。

### 批次 1：觸壓層（第一條流程）— ✅ 已完成 2026-09-04

- `.zone-chip`、`.context-tile`、`.category-option` 補 transition ＋ `:active` 用 `--press-dim`
- `.icon-button` 補 transition
- `.choice-grid label:active` 的 0.85 → `var(--press-dim)`
- `.button:active`、`.time-option:active` 改用 token
- **驗證：截圖比對 0.92 與 0.85，定案裁決 3**

**完成紀錄與一個推翻原設計的發現。**

裁決 3 定案 **0.92**：三檔並排（0.92／0.88／0.85）比對後，0.85 會讓已選取藥丸整個轉成灰紫、暖色相消失，0.92 在有填色的表面上已經清楚可辨且保得住暖調。

**但比 0.92／0.85 更關鍵的是：原本的做法在這個專案根本沒作用。**

`filter: brightness()` 只能把已經畫出來的像素變暗，而這些可點表面**幾乎全都沒有自己的底色**——`.icon-button`、未選取的部位藥丸、`.button--quiet`、`.choice-grid` 選項、裝備分類、`.context-suboption` 全是透明的，直接坐在畫布上。沒有填色可暗，brightness 就只動到 1px 邊框與文字。**截圖並排確認：透明藥丸套 0.92 與完全沒套，螢幕上分不出來。**

這代表 `.icon-button` 那個「按下去變暗」從寫下來的那天起就是無效的，而不是 2026-09-04 才壞掉。

修正成兩件事一起做：透明表面補 `--color-hairline` 底，有填色的表面（primary 按鈕、已選取狀態）由 brightness 負責。`DESIGN.md` 第六條已改寫成這個兩段式規則。

實際落地七處：`.button`、`.icon-button`（順帶補上它從來沒有的 `transition`）、`.choice-grid label`、`.time-option`、`.zone-chip`、`.context-tile`／`.context-suboption`、`.category-option`。鎖定的部位藥丸與停用的裝備分類用 `:not()` 排除——它們的 input 是 disabled，不該回應。

在 `/products/new` 實機驗證：按壓態明顯深於未選與已選兩種靜止態。`pnpm check` 全過。

### 批次 2：選取層一致性 — ✅ 已完成 2026-09-04

- `ContextSelector` 改用 `.option-selected`
- `DESIGN.md` 的 `context-option-selected` 回寫
- 守門測試：全站只有一種選取外觀。**寫守門的兩個坑照 `CLAUDE.md`**——掃原始碼前先剝註解、比對完整宣告而不是子字串，而且**寫完先破壞一次確認它會紅**

**完成紀錄——守門測試原本就存在，而且它守了空氣。**

原本以為要新寫守門，結果 `apps/web/src/assets/selectedOptionStyle.test.ts` 2026-09-01 就寫好了，而且註解、剝註解、比對完整宣告全都做對了。**但它從來沒抓到 `ContextSelector`**——也就是唯一還沒統一的那一個。

兩個洞疊在一起：

1. pattern 只認字面上的 `:has(input:checked)`，認不得 `:has(.context-tile__input:checked)` 這種帶 class 的寫法。
2. pattern 要求 `:has()` 後面**緊接** `{`，於是 `:has(…:checked),
.context-tile--active {` 這種多重選擇器直接滑掉。

放寬成 `/:has\([^)]*:checked\)[^{}]*\{([^}]*)\}/`（`[^{}]*` 不跨區塊，不會誤吞下一條規則）之後，測試數從 3 條變 4 條，`ContextSelector` 才進到守備範圍。**改壞驗證過會紅**，再還原。

這是 `CLAUDE.md`「守門可能全綠但守空氣」的又一個實例，而且是**寫得很用心的守門**仍然漏掉——漏的不是紀律，是比對範圍。

CSS 與 `DESIGN.md`（frontmatter `context-option-selected` ＋ 第五節 prose）一併回寫。實機驗證計算值：選取態 `rgb(231,216,207)`／`rgb(111,90,84)` ＝ hairline／muted，未選取不變。

### 批次 3：底部導覽（Google Play A＋B）— ✅ 已完成 2026-09-04

- 拿掉 `font-weight: 700`，標籤改 `--text-secondary` →（選中）`--text-primary`
- 藥丸改用 `--ease-emphasized`，加 `scaleX` 展開
- **實作地雷**：`scaleX` 直接加在 `.bottom-nav__icon-wrapper` 上**會把圖示一起縮**。藥丸要拆成獨立的 `::before`，圖示疊在上層（`.icon-button--compact` 已有同樣的 grid cell 疊法可抄）
- **規則五檢查**：藥丸展開 ＋ 文字換色是兩個元素同時動。要嘛視為同一件事，要嘛錯開 —— 畫出來看再決定
- 一併更新 `BottomNavigation.vue` 裡 2026-08-23 那段註解

**完成紀錄。**

落地：拿掉 `font-weight: 700`；標籤 `--text-secondary` →（選中）`--text-primary`，**圖示色兩態不變**；藥丸移到 `::before`，用 `--ease-emphasized` 從 `scaleX(0.4)` 展開到 1 並同步淡入。`DESIGN.md` 的 `bottom-nav` frontmatter 與第五節 prose 一併回寫（含「700 不再是允許的量表外字重」）。

**規則五（一次只有一個元素在動）的處置**：藥丸展開與標籤換色視為**同一件事**，同時跑、同樣的 duration 與 easing。規則五的來源是 `BroadcastLoader` 那種兩個**互相獨立**的元素各動各的；這裡是同一個導覽項的單一狀態改變，錯開反而會讀成兩件事。

**踩到一個只有截圖看得到的 bug。** `scaleX` 拆到 `::before` 之後，選取那一項的**圖示整個不見了**，只剩一顆空藥丸——藥丸的背景蓋掉了圖示。

值得記的是它有多難抓：實測 svg 仍然是 `24×24`、`visibility: visible`、`opacity: 1`、`color` 正確、`getBoundingClientRect()` 位置正確、`childCount` 正確。**DOM 全對、數值全對，只有畫面是錯的。**

原因是我抄 `.icon-button--compact` 的 grid-area 1/1 疊法時漏了一個前提：**那裡的 `::before` 只有邊框、背景是透明的**，所以從來沒有東西可以蓋。加上 `position: relative` 讓圖示成為已定位元素、排在未定位的 `::before` 背景之後才修好。不能用負的 z-index——`.bottom-nav` 有 `z-index` 所以是一個堆疊脈絡，藥丸會沉到它的 background 底下直接消失。

**守門三條**（`BottomNavigation.test.ts`）：不用字重承載選取狀態、標籤走明暗階不借用行動色、藥丸在 `::before` 且圖示疊在其上。**三條各自破壞一次都確認會紅**，而且是各自獨立失敗，沒有互相掩護。第三條守的就是上面那個 bug 的修法。

### 批次 4：揭露層 — ✅ 已完成 2026-09-04

- chevron 兩顆圖示疊 grid cell 交叉淡入 160ms（手法抄 `HomeCountdown`）
- 展開／收合 opacity 進出，高度用 `interpolate-size: allow-keywords` 做連續（裁決 2）
- **動工前要查 `interpolate-size` 的瀏覽器支援度並準備 fallback**

**完成紀錄。**

**`interpolate-size` 查證後否決。** 它只有 Chromium 支援（Chrome/Edge 129+），Firefox 與 Safari 都沒有。這是給台灣使用者的行動優先 PWA，iOS Safari 佔比很高——用它等於多數人看不到動畫。改用 `grid-template-rows: 0fr → 1fr`（Chrome 107+／Firefox 66+／Safari 16+），一樣能動到「內容的自然高度」而不必寫死像素。

收成兩個共用元件而不是各處各寫一次：`DisclosureChevron`（兩顆圖示疊 grid cell 交叉淡入）與 `DisclosurePanel`（高度 ＋ opacity）。

**從 `v-if` 改成常駐 DOM，要自己補回它免費提供的兩件事**——這是這批最容易漏掉的部分：

1. **`inert`**：收合的內容仍在焦點順序與無障礙樹裡，高度是 0、看不見，但 Tab 得進去、螢幕閱讀器照讀（SC 2.4.3）。
2. **裁切只在收合期間存在**：`overflow: hidden` 是 `0fr` 成立的前提，但一直開著會裁掉焦點框（`outline` ＋ `outline-offset` 畫在邊界外面，SC 2.4.7）。展開動畫跑完就解除。

**推翻了 2026-08-29 裁決 2 的第三條。** 那條明訂「chevron **不加淡入淡出**——它是回應手指的直接操作，依第十二節規則二該是即時的」。推翻的理由是那句話**誤讀了自己引用的規則**：規則二說直接操作用 `--duration-fast`（160ms），**沒有說 0ms**。「快」跟「瞬間」不是同一件事。`DESIGN.md` 第五節已改寫並標明。

**`ContextSelector` 不做高度動畫**（只換 chevron）。它的展開區是**跨群組共用、內容會換的**同一個面板，包進 `DisclosurePanel` 會讓 `activeGroup` 為 undefined 時直接炸掉，而且切換群組也會跟著跑高度動畫。這是元件結構問題，不是動效問題，留給之後單獨處理。

**四條既有守門釘的是舊契約，跟著更新**（不是放寬）：三條把「比對圖示 name」改成「比對元件／狀態類別」——name 已經被收進共用元件裡；一條把「DOM 裡只有一個面板」改成「只有一個面板是展開的」，因為面板現在常駐。

另外修了兩條會**默默失去意義**的測試：`wrapper.get('input[value="yes"]')` 在四個面板都常駐之後會抓到第一題的「有」，而不是測試想操作的那一題。這種誤抓不報錯，只會讓斷言變成空的——已一律改成先鎖定所屬面板。

**新守門六條**（`disclosurePanel.test.ts`）：`data-open`、收合時 `inert`、裁切的解除與恢復時機、只認 `grid-template-rows` 的 `transitionend`、用 `grid-template-rows` 不用 `interpolate-size`、內層有 `min-height: 0`。**四條各自破壞一次確認會紅且互不掩護。**

**驗證的限制**：Browser pane 當時是隱藏的，`requestAnimationFrame` 不推進，所以**過渡的中間過程與截圖都拿不到**（opacity 卡在 0，畫面全白）。停用過渡後量到目標值正確：收合 `0px`／`opacity 0`／`inert`，展開 `602px`／`opacity 1`／非 inert，且外層高度等於內容高度（沒有多出間距）、父層 `grid gap: 12px` 不變。**動畫實際跑起來的樣子沒有目視確認過。**

### 批次 5：場景層

- `RouterView` 離場轉場 120–160ms（裁決 4）
- 返回時不跑 `page-stack` 階梯淡入，只單純淡入
- `AppNotice` 進場 320ms（自己發生的事，不是手指造成的）
- 拿掉 `.uv-day:hover` 的假可點

## 七、`DESIGN.md` 第十二節第一條的改寫（已於批次 0 完成）

原本的寫法是白名單，而且**這次之後會有三個例外**，「唯一例外」那句話就假了：

> 只用 `opacity`，**唯一例外**是內容進場

已改成原則（實際落地的版本另附「已核可的非 opacity 動效」封閉清單與四項明確禁止）：

> 動效只做兩件事：**讓轉場被看見**（opacity），以及**讓版面的改變是連續的**（高度塌陷、指示器位移）。不做表演 —— 不彈跳、不旋轉、不漣漪、不裝飾性縮放。

這條同時容得下裁決 2 與批次 3 的藥丸，又仍然擋掉 ripple 與彈跳，而且它是**可以拿來判斷新案例的判準**，不是一張會愈長愈長的白名單。

## 八、未定案

1. ~~底部導覽選取態的文字色~~ —— **2026-09-04 已定案**：未選 `--text-secondary`、選中 `--text-primary`。見裁決 5。
2. **`--press-dim` 的最終值**（0.92 vs 0.85），批次 1 截圖後定案。
3. ~~批次 3 的規則五處置~~ —— **2026-09-04 已定案**：視為同一件事，同時跑。
4. **`.uv-day` 的 hover**：直接拿掉，還是讓五日卡的某一天可以點開？目前計畫是拿掉。
