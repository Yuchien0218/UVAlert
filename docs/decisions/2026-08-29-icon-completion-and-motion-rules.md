# 圖示補完與動畫規則重訂（2026-08-29）

一次 session 內做完的兩件事：把最後 11 個圖示畫完並移除 `@lucide/vue`，以及重訂動畫規則。兩件事會放在同一份紀錄，是因為第二件是第一件的副產品——換掉按鈕 spinner 時才發現專案的動畫規則跟實際程式碼牴觸。

**這份文件記的是裁決與理由。** 每個圖示的造型取捨（試過什麼、為什麼不用）記在 `docs/design/icon-system/README.md` 第十節，不在這裡重複。

commit：`a1d0dcf`（圖示）、`fafacfb`（狀態圖示接線＋動效 token）、`1cf0f02`（動畫規則）

## 一、圖示：@lucide/vue 移除

程式碼裡最後 8 處 Lucide import 全部換成 `<Icon name="..." />`，依賴已從 `apps/web/package.json` 刪除。

`docs/design/icon-system/README.md` 第八節原本列了「10 個刻意延後」的功能型圖示，實際盤點後**只需要 8 個**——`Moon` 與 `MoonStar` 對應的 `NightWindDownPrompt`、`EveningUvPrompt` 在現行程式碼已不存在，那份清單是 2026-08-22 的快照。

### 使用者逐個審過並改掉的造型

| 圖示                          | 第一版           | 定案             | 改的理由                                                                             |
| ----------------------------- | ---------------- | ---------------- | -------------------------------------------------------------------------------------- |
| `feature-uv-forecast`         | 雲＋琥珀金太陽   | 純太陽（6 道射線） | 雲會跟每頁都在的 `state-offline` 同框；而且多雲讀起來像「紫外線弱」，語意反了         |
| `feature-protection-summary`  | 閃亮星星         | 實心切半閃電     | 星星講的是「魔法／自動生成」，跟「幫你選好的部位組」無關                              |
| `feature-session-product`     | 瓶＋勾           | 吊牌             | 原名 `state-product-confirmed` 沿用 Lucide 的 `PackageCheck`，但那張卡片是區塊標題不是狀態 |
| `feature-locate`              | 準心             | 實心導航箭頭     | 準心是 Lucide 的造型，且落在已經很擁擠的圓形家族裡                                    |
| `tool-share`                  | 線與圓點分離     | 線接進圓心、圓點放大 | 分離讀不出連接關係；太近又會在 16px 讀成 `tool-chevron-right`                        |

`tool-edit` 與 `tool-delete` 的最終幾何是**使用者自己在 Illustrator 重畫的**，不是 AGENT 版本。

### 兩個「不畫」的裁決

- **搜尋**：不畫。`education-uv-basics`（了解今天的 UV）已經是放大鏡＋琥珀金核心，再畫一個放大鏡當搜尋，兩者在 18px 只差顏色。目前程式碼也沒有搜尋功能。
- **調整要提醒的部位**：不畫新圖示，沿用既有的 `tool-edit`。原本規劃的 `feature-adjust`（兩軌滑桿）已刪除。

第二條的理由值得留下來：**系統的價值來自克制而不是數量**——少一份幾何要維護，也少一個撞剪影的風險。往後遇到新的圖示需求，先問「有沒有既有的可以用」，再問「要畫成什麼樣子」。

### 兩個規則例外（都是造型逼出來的，不是偏好）

1. **`feature-protection-summary` 是系統唯一的實心雙色圖示。** 閃電在 24 格內用 2.5 線寬描邊之後，內部可填面積不到 0.4，琥珀金填進去在 36px 以下就看不見。要嘛放棄重點色，要嘛讓它承擔一半的形。使用者選了後者。
2. **`feature-uv-forecast` 是唯一一個琥珀金落在畫布中央而非上半部的圖示**——太陽的核心就在中心。圓心已上移到 y=11.8 略作補償。

**兩個例外都不可以當作先例。** 要比照辦理前，先確認該造型真的無法用既有規則達成。

### 管線變更

`tools/icon-system/generate-icons.mjs` 新增：

- **`feature` 群**：綁定特定元件的功能型圖示
- **`board: "new"` 欄位**：分板原本只看 group，但一批新圖示常橫跨多個 group（這批跨 tool／feature），照 group 分會讓待確認板長到 42 個看不完。標記過的圖示只出現在 `preview-new-icons.svg`，審查通過後拿掉標記即自動歸位

## 二、動畫規則重訂

### 起因：文件與程式碼直接牴觸

`DESIGN.md` §12 訂「動畫只用 `opacity`，不用位移或縮放」，但實際程式碼裡到處是 `transform`、`width`、`all` 的 transition。這條規則從來沒有工具在守。

### 更嚴重的發現：動效投資在錯的地方

`page-stack` 每個區塊進場都有 0.45 秒的階梯淡入，但**補擦倒數跨過門檻**——這個 App 存在的理由——的視覺切換是瞬間的。

而且 `state-tracking` / `soon` / `due` 三顆剩餘量計量表圖示**畫好了卻沒有任何地方引用**（整個 `apps/web/src` 查無，動態組名也沒有）。那組圖示的造型是為了這個位置收斂的，README 第十節記了五個被否決的概念。

連帶後果：倒數狀態一直只有色彩與文字，違反 `docs/design/current-direction.md` 的「**狀態必須同時有色彩、圖示與文字**」。

已接進 `HomeCountdown.vue` 並補上狀態切換的交叉淡入。

### 五條規則（已寫進 `DESIGN.md` §12）

1. **只用 `opacity`，唯一例外是內容進場**可加 `--motion-rise`（4px）上移。理由是在 `#FAF5EC` 這種低對比暖底上，純 0→1 淡入幾乎察覺不到。**例外不擴張到其他情境**——狀態切換、圖示內部、hover、loader 一律純 opacity。
2. **時距分兩類**：回應手指的維持 160ms，自己發生的用 320／450ms。直接操作放慢會讀成延遲；自己發生的事沒有人在等。
3. **禁止 `transition: all`**，stylelint 會擋。
4. **無限循環動畫必須自己寫 `animation: none` 的 reduced-motion 覆寫**。全域規則把動畫壓到 `0.01ms`、`iteration-count: 1`，配 `infinite` 會變成極速閃爍，比不動更糟。
5. **一次只有一個元素在動**。來源是 `BroadcastLoader`：初版讓圓點全程靜止，整顆讀起來像卡住——畫面上最大、最飽和的元素靜止不動時，其他元素再怎麼動都會被讀成靜止。

### 動效個性的調整

`--ease-out` 從 `cubic-bezier(0.22, 1, 0.36, 1)` 換成 easeOutQuad，`--duration-base` 240ms → 320ms。

原曲線的第二個控制點是 `1`，會產生輕微彈射感——那是爽快的 SaaS 產品手感，跟這個設計系統「安靜到足以承載每日的健康指引」的定位相反。產品的情緒基調是**耐心**：核心機制是兩小時的等待，文案也刻意寫「這是協助你記得補擦的提醒，不是安全曝曬時間保證」。

**這是全站性的改動**，影響每一個 transition。

### 載入動畫

| 舊                                     | 新                  | 理由                                            |
| -------------------------------------- | ------------------- | ------------------------------------------------- |
| `SunLoader.vue`（8 道對稱太陽，已刪除） | `BroadcastLoader.vue` | 改用播報印記——射線依序掃出、圓點在停頓期接手蓄能 |
| `SetupPage` 的 `transform: rotate` spinner | `InlineLoader.vue`  | 旋轉違反規則一，且是最通用的那種轉圈            |

### 順帶修掉三處既有牴觸

- `FiveDayUvCard` 的 `transition: all`（實際只有 `border-color` 會變）
- **`page-stack` 進場寫死 `0.45s ease-out`**——`ease-out` 是 CSS 關鍵字不是 `--ease-out`，所以整個頁面進場一直用瀏覽器預設曲線，跟其他轉場不同調，而且沒有任何機制會發現
- `page-stack` 與 `QuickProtectionSummary` 的進場補上 `--motion-rise`

### 讓工具擋得住

- **stylelint 新增 `declaration-property-value-disallowed-list`** 擋 `transition: all`。加完先寫了一個違規驗證它會失敗——**第一版的正規表達式跳脫寫錯（`"\s"` 在字串裡變成 `s`），是空包彈**。修正後再驗一次才確認會報錯。規則加了不驗，比沒有規則更危險。
- **動效 token 納入 `packages/ui/src/tokens.test.ts` 的漂移守門**（原本只守 colors／rounded／spacing／layout）。`DESIGN.md` frontmatter 新增 `motion:` 區塊，只改一邊會讓測試失敗。

## 三、未完成

- **目視驗證只做了一部分。** 已確認：倒數狀態圖示、`/region` 兩顆圖示、`/forecast` 太陽、新 token 的 computed style、`page-stack` keyframes。**未確認**：狀態切換的交叉淡入（要等倒數跨門檻才觸發）、`InlineLoader`、`BroadcastLoader`、`prefers-reduced-motion`。
- **衛教部位示意圖示仍未畫**，因為規格未定：`icon-system/README.md` 第七節寫 7 個，`setupCatalog.ts` 實際是 10 個部位，數量對不上。**需要先裁決要畫幾個、抽象到什麼程度。**
- **`tool-loading` 目前沒有任何地方使用**（原本的用途被 `InlineLoader` 取代）。要刪還是留尚未決定——它跟 `feature-adjust` 不同，後者是被更好的既有圖示取代，前者是被動畫元件取代，未來若有靜態的「載入中」圖示需求仍可能用到。
- **`--ease-out` 與 `--duration-base` 的新值只有 AGENT 看過**，手感需要使用者自行確認。不滿意的話 `git revert fafacfb`，或只改那兩個值。

## 四、與其他分支的衝突風險

這批 commit 在 `claude/pre-redesign-p0-work`，**尚未 push**。同時有兩個 open PR：

- **PR #5**（`codex/b8-typography-scale`）動 70 個檔案，其中 **15 個與這批重疊**，包括 `DESIGN.md` 與 8 個換過圖示的元件中的 7 個
- **PR #4**（`codex/f1-f4-g2-g3`）另外重疊 `apps/web/src/assets/app.css`

兩個 PR 當時都是 MERGEABLE / CLEAN。合併順序會決定誰要 rebase。
