---
version: alpha
name: 防曬晴報員設計系統
description: 防曬晴報員（UVAlert）是一個以防曬乳補擦倒數為核心的 Web／PWA。介面建立在暖象牙底色上，標題用文學感襯線體，行動色為深杏桃，倒數與資料面板使用濃縮咖啡色深色表面，狀態色使用藕紫。視覺個性來自象牙／杏桃／藕紫的組合——有陽光感與人文氣息，同時安靜到足以承載每日的健康指引。字體聲音是襯線標題搭配人文無襯線內文。
target-status: 色彩（2026-08-22）、字體（2026-08-23）與動效 token（2026-08-29）皆已套用；colors／rounded／spacing／layout／typography／motion 六個 frontmatter 區塊由 packages/ui/src/tokens.test.ts 自動比對 styles.css。仍有偏離的項目與衝突處理見第十節「與程式碼的落差」。

motion:
  duration-fast: 160ms
  duration-base: 320ms
  duration-slow: 450ms
  duration-loader-cycle: 1500ms
  duration-loader-delay: 250ms
  ease-out: cubic-bezier(0.25, 0.46, 0.45, 0.94)
  ease-in-out: cubic-bezier(0.65, 0, 0.35, 1)
  motion-rise: 4px

colors:
  primary: "#9F5E42"
  primary-active: "#804536"
  primary-disabled: "#E8D1C5"
  ink: "#2E2925"
  body: "#5A4540"
  body-strong: "#46342F"
  muted: "#6F5A54"
  hairline: "#E7D8CF"
  hairline-soft: "#F0E6DE"
  canvas: "#FAF5EC"
  surface-soft: "#F7EDE1"
  surface-card: "#F0E2D1"
  surface-cream-strong: "#EFD0BC"
  surface-dark: "#2E2925"
  surface-dark-elevated: "#493732"
  surface-dark-soft: "#241F1D"
  on-primary: "#FFF8F0"
  on-dark: "#FFF8F0"
  on-dark-soft: "#DCC7BC"
  accent-apricot: "#E8A477"
  accent-blush: "#D79A92"
  accent-mauve: "#8C6F7A"
  accent-amber: "#D9A35F"
  status-tracking: "#3F76A5"
  status-soon: "#BB6820"
  status-due: "#C1442F"
  status-untimed: "#9D9591"
  status-saved: "#8C6F7A"
  uvi-low: "#507AA8"
  uvi-moderate: "#BD8500"
  uvi-high: "#D16627"
  uvi-very-high: "#C43D3D"
  uvi-extreme: "#7D4BB3"

typography:
  page-title:
    fontFamily: '"Noto Serif TC Subset", "Noto Serif TC", "Noto Serif CJK TC", ui-serif, serif'
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.22
    letterSpacing: -0.01em
  section-title:
    fontFamily: '"Noto Serif TC Subset", "Noto Serif TC", "Noto Serif CJK TC", ui-serif, serif'
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0
  card-title:
    fontFamily: '"Inter Subset", Inter, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif'
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0
  body:
    fontFamily: '"Inter Subset", Inter, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif'
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0.01em
  supporting:
    fontFamily: '"Inter Subset", Inter, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif'
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0.01em
  caption:
    fontFamily: '"Inter Subset", Inter, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif'
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.01em
  nav-label:
    fontFamily: '"Inter Subset", Inter, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif'
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.01em

typography-cjk:
  display:
    fontFamily: "Noto Serif TC, Noto Serif CJK TC, ui-serif, serif"
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.02em
  body:
    fontFamily: "Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontWeight: 400
    lineHeight: 1.75
    letterSpacing: 0.01em
  label:
    fontFamily: "Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.01em
  button:
    fontFamily: "Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0.01em
  countdown:
    fontFamily: "Noto Sans Mono CJK TC, ui-monospace, SFMono-Regular, monospace"
    fontSize: 64px
    fontWeight: 600
    lineHeight: 0.95
    letterSpacing: -0.02em
    fontVariantNumeric: tabular-nums
  readout:
    fontFamily: "Noto Sans Mono CJK TC, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: -0.02em
    fontVariantNumeric: tabular-nums

rounded:
  xs: 4px
  sm: 8px
  md: 14px
  lg: 20px
  sheet: 24px
  pill: 999px

spacing:
  xxs: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 20px
  xl: 24px
  xxl: 32px
  section: 40px

layout:
  content-max: 752px
  tap-target: 44px

components:
  brand-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.card-title}"
  bottom-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.body-strong}"
    activePillColor: "{colors.surface-card}"
    typography: "{typography.nav-label}"
    height: 64px
  global-status-banner:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.body}"
    typography: "{typography.supporting}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  page-heading:
    textColor: "{colors.ink}"
    typography: "{typography.page-title}"
  page-heading-eyebrow:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  app-card:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.lg}"
    padding: 20px
  countdown-block:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography-cjk.countdown}"
  countdown-bar:
    trackColor: "{colors.surface-card}"
    fillColorTracking: "{colors.status-tracking}"
    fillColorSoon: "{colors.status-soon}"
    fillColorDue: "{colors.status-due}"
    height: 8px
    rounded: "{rounded.xs}"
  stat-figure:
    textColor: "{colors.ink}"
    typography: "{typography-cjk.readout}"
  status-card-tracking:
    backgroundColor: "color-mix(in srgb, {colors.status-tracking} 12%, {colors.canvas})"
    labelColor: "{colors.status-tracking}"
    rounded: "{rounded.lg}"
    padding: 16px
  status-card-soon:
    backgroundColor: "color-mix(in srgb, {colors.status-soon} 12%, {colors.canvas})"
    labelColor: "{colors.status-soon}"
    rounded: "{rounded.lg}"
    padding: 16px
  status-card-due:
    backgroundColor: "color-mix(in srgb, {colors.status-due} 12%, {colors.canvas})"
    labelColor: "{colors.status-due}"
    rounded: "{rounded.lg}"
    padding: 16px
  status-card-untimed:
    backgroundColor: "color-mix(in srgb, {colors.status-untimed} 12%, {colors.canvas})"
    labelColor: "{colors.status-untimed}"
    rounded: "{rounded.lg}"
    padding: 16px
  status-card-saved:
    backgroundColor: "color-mix(in srgb, {colors.status-saved} 12%, {colors.canvas})"
    labelColor: "{colors.status-saved}"
    rounded: "{rounded.lg}"
    padding: 16px
  zone-status-row:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    borderColor: "{colors.hairline-soft}"
  uvi-badge:
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 8px 16px
  five-day-uv-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.lg}"
    padding: 20px
  gear-list-item:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.card-title}"
    rounded: "{rounded.lg}"
    padding: 16px
  more-entry-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.card-title}"
    rounded: "{rounded.lg}"
    padding: 20px
  education-hero-card:
    backgroundColor: "{colors.surface-cream-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.page-title}"
    rounded: "{rounded.lg}"
    padding: 24px
  education-category-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.card-title}"
    rounded: "{rounded.lg}"
    padding: 20px
  education-source-block:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.muted}"
    typography: "{typography.supporting}"
    rounded: "{rounded.md}"
    padding: 16px
  setup-step-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  context-option:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.md}"
    padding: 16px
  context-option-selected:
    backgroundColor: "{colors.surface-cream-strong}"
    textColor: "{colors.ink}"
    borderColor: "{colors.primary}"
    rounded: "{rounded.md}"
  bottom-sheet:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: 24px
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    minHeight: 44px
  button-primary-active:
    backgroundColor: "{colors.primary-active}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
  button-primary-disabled:
    backgroundColor: "{colors.primary-disabled}"
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
  button-secondary:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    borderColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    minHeight: 44px
  button-quiet:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    minHeight: 44px
  button-on-dark:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.on-dark}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    minHeight: 44px
  icon-button:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.pill}"
    size: 44px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: 10px 14px
    minHeight: 44px
  text-input-focused:
    borderColor: "{colors.primary}"
    focusRing: "3px {colors.primary} at 15% alpha"
    rounded: "{rounded.md}"
  badge-pill:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  badge-unverified:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
    rounded: "{rounded.pill}"
    padding: 4px 12px
  safety-note:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  page-footer-meta:
    backgroundColor: transparent
    textColor: "{colors.muted}"
    typography: "{typography.supporting}"
---

## 一、品牌本質（Brand Essence）

**受眾**：在台灣日常需要防曬、但不想被醫療口吻說教的一般使用者。核心情境是「出門前後想知道現在該不該補擦」，不是慢性病管理，也不是美妝愛好者的收藏行為。

**角色**：防曬晴報員的品牌感受是「**懂防曬知識、用生活化方式播報的氣象情報員**」——不是醫療警告工具，也不是幼稚可愛的提醒 App。這個角色由兩個面向組成：

- **防曬氣象管家**：資料有來源、有時間、有風險層級。UV 色階要容易理解，數字要能被查證。
- **防曬生活編輯部**：衛教內容像經過編輯的生活專題，親切、整齊、有閱讀節奏。

**語調**：務實、有依據、不製造焦慮。說明狀況時先給結論再補條件；提到風險時給下一步而不是恐嚇。倒數到期說「該補擦了」，不說「你的皮膚正在受損」。允許溫度，不允許可愛化——防曬是健康行為，不是遊戲成就。

**外觀對比語調**：語調親切，但外觀維持成熟的編輯感。暖象牙底色與襯線標題負責「成熟」，杏桃與陽光細節負責「親切」。兩者不可偏廢：全暖色會變成生活風格部落格，全中性會變成醫療儀表板。

### 各區域的視覺任務

| 區域             | 視覺任務                         | 設計重點                                           |
| ---------------- | -------------------------------- | -------------------------------------------------- |
| 提醒             | 讓使用者立刻知道現在要做什麼     | 倒數、下一步 CTA、部位狀態優先；避免裝飾搶走注意力 |
| 裝備             | 讓使用者快速查看與記錄防曬裝備   | 清楚的清單、摘要與分享入口；不做購物商城感         |
| 更多             | 容納支援功能但保持整齊           | 同尺寸卡片、清楚分組、避免把次要功能做成警示牆     |
| 衛教首頁／分類頁 | 讓使用者像看生活專題一樣找到問題 | 編輯導讀、分類標題、短摘要與搜尋入口               |
| 衛教文章         | 讓健康資訊容易讀、容易查證       | 先給直接答案，再補條件、限制、來源與審閱資訊       |

## 二、色彩標記（Color Tokens）

系統的定義性選擇是**暖象牙底色**（`{colors.canvas}`）配**深咖文字**（`{colors.ink}`）——比純白更有溫度，比飽和的陽光黃更適合長時間閱讀。視覺個性來自**象牙＋杏桃＋藕紫**的組合。

三種表面模式在頁面之間交替：

1. **暖象牙底色**（`{colors.canvas}`）— 預設頁面地板
2. **杏桃奶油卡片**（`{colors.surface-card}`）— 裝備清單、衛教模組、更多頁入口卡
3. **濃縮咖啡深色表面**（`{colors.surface-dark}`）— 設定流程的步驟外框、產品標示編輯、五日預報的強調欄

深色表面是產品露出「儀器感」的地方——倒數數值、狀態讀數。象牙與濃縮咖啡的對比就是頁面的節奏。

### 品牌與陽光

| Token                              | Hex       | HSL                  | 用途                                                      |
| ---------------------------------- | --------- | -------------------- | --------------------------------------------------------- |
| `{colors.primary}` 深杏桃          | `#9F5E42` | `hsl(18, 41%, 44%)`  | 主要行動色。用於主 CTA 與品牌字標；每個決策情境只出現一次 |
| `{colors.primary-active}`          | `#804536` | `hsl(12, 41%, 36%)`  | 按下狀態                                                  |
| `{colors.primary-disabled}`        | `#E8D1C5` | `hsl(21, 43%, 84%)`  | 停用狀態，仍看得出與主色的血緣                            |
| `{colors.accent-apricot}` 陽光杏桃 | `#E8A477` | `hsl(24, 71%, 69%)`  | 插圖筆觸、小面積高光。此色上必須用深咖文字（2026-08-30：拿掉「倒數進度環」，進度條 2026-08-29 起改用狀態色 `{colors.status-tracking}`／`soon`／`due`） |
| `{colors.accent-blush}` 腮紅       | `#D79A92` | `hsl(7, 46%, 71%)`   | 衛教引言與分類細節；永遠不作為行動色                      |
| `{colors.accent-mauve}` 藕紫       | `#8C6F7A` | `hsl(337, 12%, 49%)` | 已完成、安心狀態。裝備勾選與閱讀進度                      |
| `{colors.accent-amber}` 香檳金     | `#D9A35F` | `hsl(33, 62%, 61%)`  | 徽章、SPF 標記、陽光母題。不用於內文                      |

### 表面

| Token                            | Hex       | HSL                 | 用途                                                                      |
| -------------------------------- | --------- | ------------------- | ------------------------------------------------------------------------- |
| `{colors.canvas}`                | `#FAF5EC` | `hsl(39, 58%, 95%)` | 預設頁面地板                                                              |
| `{colors.surface-soft}`          | `#F7EDE1` | `hsl(33, 58%, 93%)` | 區塊分隔、衛教引言底、來源區塊                                            |
| `{colors.surface-card}`          | `#F0E2D1` | `hsl(33, 51%, 88%)` | 裝備卡、更多頁入口卡、衛教分類卡                                          |
| `{colors.surface-cream-strong}`  | `#EFD0BC` | `hsl(24, 61%, 84%)` | 最強暖光變體：已選取的情境選項、衛教首頁大卡片                            |
| `{colors.surface-dark}`          | `#2E2925` | `hsl(27, 11%, 16%)` | 主要深色表面。2026-08-23 起不再用於首頁倒數，改用於設定流程外框與資料強調 |
| `{colors.surface-dark-elevated}` | `#493732` | `hsl(13, 19%, 24%)` | 深色區塊內的控制項與進度環軌道                                            |
| `{colors.surface-dark-soft}`     | `#241F1D` | `hsl(17, 11%, 13%)` | 深色卡片內的資料區塊                                                      |
| `{colors.hairline}`              | `#E7D8CF` | `hsl(22, 33%, 86%)` | 暖色表面上的 1px 邊框。邊框像一階高度差，不是墨線                         |
| `{colors.hairline-soft}`         | `#F0E6DE` | `hsl(27, 37%, 91%)` | 同區塊內幾乎看不見的分隔線                                                |

### 文字

文字色只有 **4 級**（ink → body-strong → body → muted）。

| Token                   | Hex       | HSL                  | 用途                                                               |
| ----------------------- | --------- | -------------------- | ------------------------------------------------------------------ |
| `{colors.ink}`          | `#2E2925` | `hsl(27, 11%, 16%)`  | 所有標題與主要文字。深濃縮咖啡，比純黑柔和                         |
| `{colors.body-strong}`  | `#46342F` | `hsl(13, 20%, 23%)`  | 強調段落與導言                                                     |
| `{colors.body}`         | `#5A4540` | `hsl(12, 17%, 30%)`  | 預設內文                                                           |
| `{colors.muted}`        | `#6F5A54` | `hsl(13, 14%, 38%)`  | 副標、麵包屑、次要文字、**頁尾細則與補充說明**（不再有更淺的一級） |
| `{colors.on-primary}`   | `#FFF8F0` | `hsl(32, 100%, 97%)` | 深杏桃按鈕上的暖象牙文字                                           |
| `{colors.on-dark}`      | `#FFF8F0` | `hsl(32, 100%, 97%)` | 濃縮咖啡表面上的文字                                               |
| `{colors.on-dark-soft}` | `#DCC7BC` | `hsl(21, 31%, 80%)`  | 深色表面上的次要標籤                                               |

> **2026-08-26：刻意不設更淺的第 5 級文字色。** 原本有 `muted-soft`（`#856D65`）當「說明文字、頁尾細則」，但它對暖象牙底 `{colors.canvas}` 的對比度只有 **4.42:1**，過不了 WCAG AA 一般文字的 4.5:1，而所有候選用途都是一般字級、套不到「大字 3:1」例外。與其為了「細則稍微淡一點」多一個踩 AA 邊界的顏色，不如讓那些文字停在 `{colors.muted}`（5.93:1）。程式碼的 `--color-muted-soft`／`--text-tertiary` 已於同日移除。脈絡見 `docs/decisions/2026-08-25-text-color-token-gap.md`。

### 倒數與部位狀態

這五個狀態色**不使用品牌暖色系**，因為它們必須跨深淺模式維持相同語意，且不能與杏桃／藕紫的裝飾用法混淆。數值取自 `packages/ui/src/styles.css`。

| Token                      | Hex       | HSL                  | 語意                                                                                 |
| -------------------------- | --------- | -------------------- | ------------------------------------------------------------------------------------ |
| `{colors.status-tracking}` | `#3F76A5` | `hsl(208, 45%, 45%)` | 追蹤中（2026-08-24 加深一階，見上方色彩修正記錄）                                    |
| `{colors.status-soon}`     | `#BB6820` | `hsl(28, 71%, 43%)`  | 即將到期（2026-08-24 加深一階）                                                      |
| `{colors.status-due}`      | `#C1442F` | `hsl(9, 61%, 47%)`   | 已到期（2026-08-24 加深一階）                                                        |
| `{colors.status-untimed}`  | `#9D9591` | `hsl(19, 6%, 59%)`   | 未計時（2026-08-24 從專屬紫色改中性灰——沒有時間資訊，中性灰比紫色貼切）              |
| `{colors.status-saved}`    | `#8C6F7A` | `hsl(337, 12%, 49%)` | 已儲存（藕紫，與 accent-mauve 同值）。程式碼是 `--color-saved`／`--color-saved-soft` |

**「已儲存／這次記錄成功」刻意用藕紫而非綠色。** 專案規則明訂不使用綠色暗示「安全」或「防護有效」——防曬沒有「完成」狀態，只有「這次記錄成功」。藕紫傳達安心但不傳達安全。這條**涵蓋所有「操作成功」的回饋**：草稿已儲存、補擦紀錄已儲存、`.notice--ok` 等（2026-08-26 起程式碼一致，原本誤用綠色 `--color-success`）。

**沒有獨立的 `warning` / `error` 色。** 表單驗證錯誤沿用 `{colors.status-due}`（已到期紅），系統警示沿用 `{colors.status-soon}`（即將到期橙）——語意夠接近，不另立 token（2026-08-26：原 frontmatter 有 `warning #C78336` / `error #B84D4C` 兩個從未進 `styles.css` 的色，已移除）。系統的警示強度上限仍是 `{colors.status-due}` 的柔和底色卡（見第九節）。

### UV 五級風險色

風險色序列與品牌色盤分開管理，數值與 `packages/ui/src/styles.css` 一致：

| 等級        | Token                    | Hex       | HSL                  |
| ----------- | ------------------------ | --------- | -------------------- |
| 低量級 0–2  | `{colors.uvi-low}`       | `#507AA8` | `hsl(211, 35%, 49%)` |
| 中量級 3–5  | `{colors.uvi-moderate}`  | `#BD8500` | `hsl(42, 100%, 37%)` |
| 高量級 6–7  | `{colors.uvi-high}`      | `#D16627` | `hsl(22, 69%, 49%)`  |
| 過量級 8–10 | `{colors.uvi-very-high}` | `#C43D3D` | `hsl(0, 53%, 50%)`   |
| 危險級 11+  | `{colors.uvi-extreme}`   | `#7D4BB3` | `hsl(269, 41%, 50%)` |

低量級刻意用藍色而非慣例的綠色，理由同上。**永遠同時顯示數值與中文等級標示**，不讓顏色單獨承擔資訊。

### 色彩分佈

- **60% 暖象牙**：`{colors.canvas}` 與 `{colors.surface-soft}`，頁面地板與閱讀區。
- **20% 暖光表面**：`{colors.surface-card}` 與 `{colors.surface-cream-strong}`，裝備與衛教卡片。
- **12% 濃縮咖啡**：`{colors.surface-dark}` 與其變體，設定流程外框與資料強調區塊。
- **6% 深杏桃行動色**：`{colors.primary}`，每個決策情境只有一個主要行動。
- **2% 細節與狀態**：陽光杏桃、香檳金、腮紅、藕紫與風險色，只在語意明確處出現。

## 三、字體排版（Typography）

### 字體家族

> **2026-08-23 標題字體定案（歷經兩次修正）**：標題字最終定為 **Noto Serif TC 單獨使用**，不搭配任何西文顯示字體。
>
> 過程記錄，避免同樣的提案再來一次：
>
> 1. 原本是 **Cormorant Garamond ＋ Noto Serif TC** 的中西配對。Claude Design 的下游元件庫指出這個配對「兩種襯線調性不統一」，並自行改成 **霞鶩文楷 TC**，還在自己的 CSS 註解裡標成「DESIGN.md §3」——但本文件從未有過那條規定，原文其實把霞鶩文楷 TC 限定在「引言或反思型提示」。
> 2. 短暫套用霞鶩文楷 TC 後判定**不採用**：它是楷書／手寫傾向字，破壞了第一節指派給標題的任務。第一節原文：「暖象牙底色與**襯線標題**負責『成熟』，杏桃與陽光細節負責『親切』……全暖色會變成生活風格部落格」。標題改成手寫體後，全站沒有任何元素在承擔「成熟」，正好掉進那個失敗模式。第三節原本也已寫過霞鶩文楷 TC「個性太強不適合主要產品介面」。
> 3. 但 Claude Design 對配對的**診斷是對的**：Cormorant 是細緻高對比的西文襯線體，與紮實低對比的 Noto Serif TC 並置時明顯細一截。
>
> 最終解法是**把西文顯示字整支移除**，而不是換一支。依據是實測資料：54 個衛教文章標題中只有 11 個含拉丁字母，且**全部**是嵌在中文句子裡的縮寫（UV、UVA、UVB、SPF、PA、UPF、UV400），**沒有任何一個是連續拉丁文字**——這個產品根本沒有「拉丁標題排版」這個工作。Noto Serif TC 自帶的拉丁字形本來就是為搭配它的中文而設計，縮寫與中文的視覺重量一致。

系統以 **Noto Serif TC** 為標題顯示字，中英文由同一支字型負責；page title 使用字重 400，section title 使用字重 500。**Inter** 為拉丁人文無襯線內文字，搭配 **Noto Sans TC** 處理繁體中文內文、導覽與 UI 標籤。**Noto Sans Mono** 加系統等寬堆疊處理倒數數值與資料讀數——讀數只渲染純數字（見下方讀數字體備註），不需要 CJK 等寬覆蓋。

**標題不再搭配任何西文顯示字體。** 要加西文襯線體之前，先回頭看上面那段實測資料：沒有連續拉丁標題，就沒有它的工作。

runtime 堆疊：標題走 `"Noto Serif TC Subset", "Noto Serif TC", "Noto Serif CJK TC", ui-serif, serif`；內文走 `"Inter Subset", Inter, "Noto Sans TC", "PingFang TC", "Microsoft JhengHei", system-ui, sans-serif`。前兩個名稱是專案自行托管的 subset；後段才是載入失敗時的系統備援。

標題／內文的分工是編輯式的：

- Noto Serif TC（page title 400、section title 500）→ h1、h2、h3、頁面主標
- Inter ＋ Noto Sans TC（字重 400–500）→ 內文、導覽、按鈕、說明、標籤
- Noto Sans Mono ＋ 系統等寬 → 倒數數值、UV 指數、時間戳記

> **字標是例外（2026-08-22）**：Logo 的「防曬晴報員」五個字用**源泉圓體（GenSenRounded）TW 月版** Medium，不是襯線體。理由是字標緊鄰圖標，而圖標的造型語言是「實心圓點＋膠囊線條、端點全圓、**不使用尖角**」（第八節），明體的尖角收筆與它直接衝突。圓體保留黑體結構、只磨圓端點，呼應膠囊語言又不越過「不可愛化」那條線。
>
> 這個例外**不擴及標題與內文**——那兩者維持上表規則。Logo 有自己的字體是常見且正當的做法。
>
> 正式資產在 [`docs/design/logo/`](docs/design/logo/README.md)，**幾何真實來源是 Illustrator**，字標已轉外框、不依賴字體安裝。務必使用 TW（月版），日文版漢字字形不符台灣標準。

> **讀數字體的備註**：Google Fonts 不提供 `Noto Sans Mono CJK TC`。但實際檢查程式碼，`.stat-figure` 只套用在**純數字**上（倒數分鐘數、`20:15` 時刻、UV 指數），中文單位「分鐘」在相鄰的獨立元素裡用內文字體。因此 mono 不需要 CJK 覆蓋，拉丁等寬字體即可；中文本來就不該被強制等寬。做字體工作時不必為此卡住。

### 階層

| Token                        | 尺寸 | 字重 | 行高 | 字距    | 用途                                           |
| ---------------------------- | ---- | ---- | ---- | ------- | ---------------------------------------------- |
| `{typography.page-title}`    | 28px | 400  | 1.22 | -0.01em | 每頁唯一主標題、設定流程主標題 — Noto Serif TC |
| `{typography.section-title}` | 20px | 500  | 1.35 | 0       | 頁面區段、Dialog／Bottom Sheet、文章主要章節   |
| `{typography.card-title}`    | 18px | 500  | 1.45 | 0       | 卡片標題、欄位群組標題、文章次級標題           |
| `{typography.body}`          | 16px | 400  | 1.5  | 0.01em  | 正文、按鈕、輸入內容與一般操作文字             |
| `{typography.supporting}`    | 14px | 400  | 1.6  | 0.01em  | 欄位標籤、helper text、次要資訊與補充文字      |
| `{typography.caption}`       | 12px | 500  | 1.5  | 0.01em  | 短註腳、時間戳、eyebrow、badge                 |
| `{typography.nav-label}`     | 12px | 500  | 1.4  | 0.01em  | 主要底部導覽標籤                               |

倒數與資料讀數是元件級例外，保留在 `typography-cjk` 與下方的數字規則；它們不屬於一般文字字級量表。

### 繁體中文字體建議

**2026-08-23 更新**：標題改為單一字型負責中英文，不再需要「拉丁字體 ＋ 中文字體」兩件式配對——理由見上方標題字體定案。

| 角色                     | 建議字體                  | 為什麼合適                                                           | 授權                  |
| ------------------------ | ------------------------- | -------------------------------------------------------------------- | --------------------- |
| 中英文標題（唯一）       | **Noto Serif TC**         | 編輯感、安靜；自帶的拉丁字形即為搭配其中文而設計，縮寫與中文重量一致 | Google Fonts；SIL OFL |
| 中文內文／介面           | **Noto Sans TC**          | 小尺寸清晰、字符涵蓋廣，適合標籤與長閱讀                             | Google Fonts；SIL OFL |
| 替代介面聲音             | **IBM Plex Sans TC**      | 略偏技術與結構化；適合工具感更強的版本                               | IBM Plex；SIL OFL     |
| 若要更強的文氣（未採用） | **源流明體 GenRyuMin TW** | 思源宋體的 OFL 衍生版，比例偏傳統書籍排版；仍是明體，不帶手寫感      | GitHub；SIL OFL       |
| CJK 等寬／倒數備援       | **Noto Sans Mono**        | 讓中文字在資料與等寬表面中保持對齊                                   | Noto；SIL OFL         |

預設標題字是 **Noto Serif TC**，內文預設配對是 **Inter ＋ Noto Sans TC**。IBM Plex Sans TC 是替代介面方向，不要與 Inter 同時載入。

**不要把霞鶩文楷 TC 用在標題。** 它是楷書／手寫傾向字，會讓標題失去第一節指派的「成熟」任務——這點 2026-08-23 已實際套用後驗證並退回，不需要再試一次。

### 中文間距覆寫

元件內含繁體中文時套用以下覆寫，保留拉丁比例的同時給 CJK 字符足夠的垂直呼吸：

| 角色          | 尺寸 | CJK 行高 | 字距    | 備註                                                |
| ------------- | ---: | -------: | ------- | --------------------------------------------------- |
| Page title    | 28px |     1.22 | -0.01em | 每頁唯一主標題；兩行標題使用 `text-wrap: balance`   |
| Section title | 20px |     1.35 | 0       | 頁面區段、Dialog／Bottom Sheet、文章主要章節        |
| Card title    | 18px |     1.45 | 0       | 字重 500；不用假粗體                                |
| Body          | 16px |      1.6 | 0.01em  | 衛教內容與操作文字的預設；輸入內容避免 iOS 自動放大 |
| Supporting    | 14px |      1.6 | 0.01em  | 可跨行閱讀的次要資訊；重要指示不可降到 caption      |
| Caption       | 12px |      1.5 | 0.01em  | 短註腳、eyebrow、badge；不承載長段說明              |
| Nav label     | 12px |      1.4 | 0.01em  | 主要底部導覽標籤                                    |

中文衛教段落使用 `max-width: 38em` 避免行長過長。使用 `text-align: start`、`line-break: strict`、`word-break: normal`、`text-wrap: pretty`。不使用 `word-break: break-all` 或全文對齊。

### 倒數與數字規則

- 倒數、UV 指數、SPF 值與任何原地變動的數字都套用 `font-variant-numeric: tabular-nums`。
- 倒數數字在桌面維持 56–64px，行動端至少 40px；使用字重 600 而非纖細的標題字重。
- 變動數值使用 `letter-spacing: -0.02em` 讓讀數保持緊湊穩定。
- 單位與數值盡量不斷開：`30&nbsp;分鐘`、`SPF&nbsp;50`、`UV&nbsp;6`。
- 等寬字在此系統中是「儀器讀數」的角色，用在真實資料上，**不是**裝飾性的技術感標籤。

### 字體載入與語言規則

- 使用 `.woff2`，只載入系統實際用到的字重：400、500、600。
- 使用 `font-display: swap`，載入期間維持備援堆疊。
- 文件根節點設 `lang="zh-Hant-TW"`，讓瀏覽器選用台灣繁體字形、輔助科技正確發音。
- 每個字重都驗證載入前保留 `font-synthesis`，避免中文字重缺失導致強調消失。
- 定稿斷行前，至少在一種 Windows 系統備援與一種 Apple 系統備援下測試同一段文字。

### 原則

page title 使用字重 400 與 -0.01em 字距；section title 的字重 500 是區段層級所需的明確性。襯線字給產品一個文學性、經過思考的聲音；換成無襯線標題會讓體驗變得跟其他工具型 App 沒有差別。

內文段落維持字重 400，標籤與強調短語 500。無襯線內文是人文式的（Inter ＋ Noto Sans TC）——不是幾何式。Helvetica 或 Arial 過於中性，會破壞溫暖的編輯感。

### 替代字體註記

Noto Serif TC 是標題的唯一字型，沒有第二層自托管備援——載入失敗會落到系統襯線體（Windows 上是新細明體，品質差，見第十節）。若要更強的文氣，**源流明體 GenRyuMin TW** 是同為 OFL 的思源宋體衍生版，可作為風格對等的替換候選；但**不要換成楷體或圓體**。無襯線首選 **Inter ＋ Noto Sans TC**；**IBM Plex Sans TC** 是工具感更強的替代方向。

## 四、間距尺規（Spacing Scale）

- **基礎單位**：4px。
- **Token**：`{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 20px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px · `{spacing.section}` 40px。
- **區塊間距**：`{spacing.xl}`（24px）是頁面內主要區塊的預設間隔；`{spacing.section}`（40px）用於語意上分開的大段落。
- **卡片內距**：`{spacing.lg}`（20px）為預設；深色表面與 bottom sheet 用 `{spacing.xl}`（24px）；狀態卡與清單項目用 `{spacing.md}`（16px）。
- **頁面左右留白**：行動端 16px、桌面 24px。

這是行動優先的產品，間距尺規刻意比行銷網站緊湊——沒有 96px 的區塊節奏，因為單一畫面要在不捲動的情況下顯示倒數、狀態與下一步。

## 五、元件規範（Components）

### 外殼

**`brand-header`** — 頁面頂部的品牌列，承載正式橫式標誌（`docs/design/logo/uvalert-lockup-horizontal.svg`，播報印記圖標＋「防曬晴報員」字標）。背景 `{colors.canvas}`。不是導覽列——導覽在底部。

> **2026-08-23 使用者確認**：Logo 放大（原 1.75rem 高，改 2.5rem），並拿掉另外排版的英文副標「UVAlert」，只留正式橫式標誌本身。

> **2026-08-23 修正**：原文寫「地平線太陽字標」，是舊版 Logo 概念的敘述；實際採用的是 2026-08-22 定案的 06 播報印記（實心圓點＋膠囊線條），程式碼先前也還在用一個臨時畫的太陽圖示佔位。已換成內嵌正式 SVG，顏色是圖示／Logo 專用的墨咖 `#33291F` ＋ 琥珀金 `#C1832E`，不是介面的深杏桃 primary——兩套配色範圍不同，見第八節。

**`bottom-nav`** — 固定在底部的三項導覽：**提醒**、**裝備**、**更多**。高度 64px，背景 `{colors.canvas}`。

> **2026-08-23 修正**：選取態原本規定「未選取文字 `{colors.muted}`、選取態 `{colors.primary}`」——是換色。但 Claude Design 的下游元件庫（`components/navigation/BottomNav.jsx`／`.prompt.md`）實際做的是**用形狀承載狀態，不換色**：選取態是圖示後面的奶油色藥丸底（`{colors.surface-card}`）加粗體（700）標籤，圖示與文字顏色（`{colors.body-strong}`）在任何狀態下都一樣，沒有頂部指示條。兩份文件曾經互相矛盾，使用者確認採用藥丸版，本節文字回寫為準。這也更符合本文件其他地方的一貫哲學——用形狀而非純色承載狀態（例如部位狀態用格數計量表，不單靠顏色）。

圖示在上、文字在下，標籤使用 `{typography.nav-label}`（12px，未選取 400／選取 700）。三項是固定的——不新增衛教專用入口，也不保留獨立「首頁」入口。

**`global-status-banner`** — 承載跨頁的系統狀態：「通知未開啟」「背景通知尚未完成」「目前離線」「背景通知已恢復」。背景 `{colors.surface-soft}`，圓角 `{rounded.md}`。這類狀態**永不阻擋**本機倒數與手動操作，因此樣式是提示而非警示——不使用任何警示底色。（系統沒有獨立的 error token，見第二節；警示強度上限是 `{colors.status-due}` 的柔和底色卡。）

### 頁面骨架

**`page-heading`** — 由三段組成：`eyebrow`（`{typography.caption}`，`{colors.muted}`）、`title`（`{typography.page-title}`，襯線）、`body`（`{typography.body}`，`{colors.body}`，`max-width: 38rem`）。eyebrow 與 body 都是選用的。

**`flow-heading`** — 全螢幕操作流程的標題列，標題與說明在左、關閉操作在右；內部以 12px 堆疊，兩側保留 16px 間距。共通實作位於 `apps/web/src/assets/app.css`，目前供重新塗抹、更正紀錄與回報事件三個流程使用。

**`app-card`** — 通用內容卡的**表面基元**。背景 `{colors.surface-soft}`（暖奶油，不透明），1px `{colors.hairline}` 邊框，圓角 `{rounded.lg}`。無陰影。

**它不提供內距。** 內距由具體的卡片 class 給（`question-card`、`install-card`、各頁自己的覆寫等），慣用值是 20px。

**2026-08-30 更正**：本節原本寫「內距 20px」，但 `app.css` 的 `.app-card` 從來沒有 padding——那 20px 被複製在 6 頁的 scoped 樣式裡。這裡改成描述實際行為（CLAUDE.md：文件與程式碼衝突時以程式碼為準）。

**為什麼不把內距收進 `.app-card`**：20 幾處用法已經由併用的 class 供應內距（`question-card app-card` 6 處、`install-card app-card` 4 處…），加進去會全部變成雙重內距。

**代價與守門**：這個分工的風險是「忘記補內距的用法會直接破圖，而且沒有任何東西會提醒」——2026-08-24 的 `.product-label` 就是這樣，樣式在重構中遺失後只剩 `.app-card`，內容貼著邊框六天沒被發現。`apps/web/src/assets/appCardPadding.test.ts` 現在守著每一處 `.app-card` 都有內距來源。可收合卡片（`quick-protection`、`context-group`）把內距放在整列寬的觸發器上，是測試裡具名的例外。

> **2026-08-29 更正**：這一段先前寫「半透明白 `rgba(255,255,255,0.6)` 疊在 canvas 上」，frontmatter 又寫 `{colors.canvas}`——**兩者都是舊版**，而且同一天的第十節註記還寫「改回 canvas」，三處互相矛盾。實際的 `--surface-primary` 是 `{colors.surface-soft}`，2026-08-24 當天演進過四個版本（canvas → 半透明白 0.6 → 0.4 → 暖奶油），完整脈絡記在 `packages/ui/src/styles.css` 該 token 上方的註解。
>
> 改成不透明色的理由值得留著：**半透明必須依賴「卡片背後真的是 canvas」，一旦蓋在別的東西上就破功**——兩個 bottom sheet 就因此透出背後的文字。所以不要再提案改回半透明。

**`page-footer-meta`** — 頁尾的版本、隱私政策、使用條款與資料說明。純文字連結列，`{colors.muted}`，`{typography.supporting}`。**刻意不做成功能卡片**，避免與「更多」頁的入口卡競爭。

**`control-rule-note`** — 貼著某個控制項的**規則**：說明「選了會發生什麼、不選會發生什麼」。文字 `{colors.body}`、`{typography.body}`、行高 1.6。**沒有任何裝飾——不加底色、不加外框、不加縱線。**

**綁定手段是距離，不是裝飾。** 與下方控制項的間距收緊到 8px、與上方標題拉開到 20px，靠鄰近律讓它讀成「這句話屬於下面那組」。這是配合系統性格的選擇：第七節訂的是「無陰影、無邊框」的完全平面，而 `status-card` 更明寫「無左側色條」——**裝飾線不是這個系統的語彙**，用它會讓表單看起來像別的產品。

2026-08-29 曾實作過左側縱線版本，因與上述立場衝突而改掉。

**它不是 helper text。** 第五節上面那句「`{typography.supporting}` 用於欄位標籤、helper text」講的是一般補充說明；這一類是**使用者做那個選擇的當下必須看到的條件**（B9 §3 的不可隱藏清單），所以維持內文字級，不縮到 14px。縮小它等於把規則從決策現場淡出。

與相鄰三種的分工：

| 元件 | 是什麼 | 視覺 |
| --- | --- | --- |
| `control-rule-note` | 附屬於下方控制項的規則 | 無裝飾，靠間距綁定 |
| `note-box` | 獨立的資訊區塊 | `{colors.surface-soft}` 底色，`{typography.supporting}` |
| `delivery-emphasis` | 需要框起來的能力邊界 | 完整 1px 外框 |
| `safety-note` | 頁級的健康邊界 | 無框，`{colors.muted}`，`{typography.supporting}` |

**不要用框。** 這種規則在單一表單頁可能出現 3–5 段（`ReportContextEventPage` 有 4 段、`EventCorrectionPage` 有 3 段），每段都套 `note-box` 或 `delivery-emphasis` 會把表單變成一串盒子，反而更難掃讀。縱線的作用是「把這句話綁在它下面那個控制項上」，不是把它變成獨立區塊。

### 提醒（核心）

**`countdown-block`** — 產品的核心。倒數數值直接放在暖象牙畫布上（`{colors.canvas}`），數字使用 `{typography-cjk.countdown}`（tabular-nums），文字 `{colors.ink}`。**不是卡片，沒有底色與邊框。**

> **2026-08-23 變更**：原本規定為濃縮咖啡深色卡片（`countdown-panel`）加進度環。wireframe 改為畫布上的平面版本，使用者裁決採用 wireframe。層級改由**字級**承擔——倒數數字是全頁最大的字，它的尺寸就是「這是最重要的東西」的訊號，不再依賴深色表面的對比。連帶影響見第七節與第十一節。

**`countdown-bar`** — 倒數進度條。水平線性，高 8px，圓角 `{rounded.xs}`，軌道 `{colors.surface-card}`。填色隨狀態變化：追蹤中 `{colors.status-tracking}`、即將到期 `{colors.status-soon}`、已到期 `{colors.status-due}`——但顏色永遠搭配明確的文字標示（剩餘分鐘、部位名稱、預計時間），不單獨承擔資訊。

沒有可信期限時**不畫進度條**，而不是畫 0%——空的進度條會被讀成「時間已經用完」。

**`stat-figure`** — 資料讀數樣式。等寬字、`tabular-nums`、字重 600、負字距。用於倒數分鐘、UV 指數、時間戳記。`--display` 變體放大到 `clamp(3rem, 18vw, 4.75rem)` 供主倒數使用。

**`status-card`** ＋ 五種變體 — 用柔和底色傳達急迫程度，純色塊填滿、無左側色條、無陰影。圓角 `{rounded.lg}`，內距 16px。

| 變體                   | 標籤色                     | 語意     |
| ---------------------- | -------------------------- | -------- |
| `status-card-tracking` | `{colors.status-tracking}` | 追蹤中   |
| `status-card-soon`     | `{colors.status-soon}`     | 即將到期 |
| `status-card-due`      | `{colors.status-due}`      | 已到期   |
| `status-card-untimed`  | `{colors.status-untimed}`  | 未計時   |
| `status-card-saved`    | `{colors.status-saved}`    | 已儲存   |

底色統一用 `color-mix(in srgb, <狀態色> 12%, {colors.canvas})` 產生，確保五張卡的視覺重量一致。

**`zone-status-row`** — 部位狀態列。透明底、`{colors.hairline-soft}` 分隔線。每列包含部位名稱、狀態圖示與剩餘時間。**16 個追蹤部位使用文字標籤加狀態圖示，不畫部位插圖**。

### UV

**`uvi-badge`** ＋ 五種等級變體 — 藥丸形徽章，圓角 `{rounded.pill}`，內距 8px × 16px。底色用 `color-mix(in srgb, <風險色> 14%, {colors.canvas})`，文字用對應風險色。當地區已設定時，這是首屏唯一的飽和色時刻。

**`five-day-uv-card`** — 五日預報卡。5 欄網格，每欄含日期、UV 指數（`stat-figure`）與等級徽章。卡片邊框顏色依當日風險等級變化。底部附資料來源、更新時間與「這是地區預報，不是即時測站觀測」的說明。

### 裝備

**`gear-list-item`** — 裝備清單項目。背景 `{colors.surface-card}`，圓角 `{rounded.lg}`，內距 16px。承載品類圖示、裝備名稱（`{typography.card-title}`）與摘要。點擊進入詳情頁。

**`badge-unverified`** — 標示資料尚未完整的防曬乳使用「標示尚未確認」徽章，背景 `{colors.surface-soft}`、文字 `{colors.muted}`。**這類產品仍列在「目前使用」**，不降級、不隱藏——只是明確標示不確定性。

### 更多

**`more-entry-card`** — 統一尺寸的入口卡。背景 `{colors.surface-card}`，圓角 `{rounded.lg}`，內距 20px。桌面 2 欄、手機 1 欄。**所有入口卡的尺寸、圖示位置、圓角與文字結構完全一致**，只用淡色分隔或小字提示做輕量分組。

**圖示 32px**（B9 第一輪，2026-08-29）。原本是 20px，只佔卡片面積 1.2–1.5%，實際上是「文字的附件」而不是掃讀入口；放大到 32px 後是 3.0–4.6%。圖示與文字用 `align-items: center` 對齊——這是唯一一條對「只有標題」與「標題＋雙行說明」都成立的規則，改成 start 對齊會讓純標題的卡片看起來歪掉。

**說明文字逐項分類，不做批次刪除。** B9 §5 明文禁止只靠字數決定收合，所以七張卡是逐項判定的：純重述標題的刪除、講涵蓋範圍的縮短、**決策條件與健康／安全邊界一律常駐**（`DESIGN.md` 第五節不可隱藏清單）。目前七張裡有四張屬於必須常駐，並且有測試守著（`MorePage.test.ts`）。沒有說明的卡片不渲染空的 `<small>`，不要用空元素撐間距。

第一輪**刻意不做 progressive disclosure**——逐項分類之後，可收的文字是零，為零段文字加一套展開控制項會讓這頁多出第二種互動模式（現在只有「整張卡可點進入」一種）。disclosure 留給設定頁。

排序固定為：通知設定 → 防曬衛教 → 本機資料與隱私 → 問題回報與意見回饋 → 安裝到主畫面 → 說明與關於。「通知設定」卡片顯示簡短狀態文字。

**2026-08-29：「跨裝置同步」已併回「本機資料與隱私」。** 實作原本把這一張拆成 `/settings/data` 與 `/settings/sync` 兩張卡兩個頁面，還在資料頁上放了一張純粹解釋「你要找的東西在另一頁」的補救卡。合併後 `/settings/data` 採單頁分區——本機概況／匯出／清除是第一層（`app-card`），跨裝置同步是次要區塊（無卡片外框，一條 hairline 起手），`/settings/account-data` 維持巢狀獨立頁，從同步區塊進入。**次要性做在「有沒有卡片外框」，不做在字級**：同步區塊裡有登入與上傳雲端的決策資訊，縮字會變成看不清楚而不是變次要。裁決與量測見 `docs/decisions/2026-08-29-settings-data-sync-merge.md`。

### 衛教

**`education-hero-card`** — 衛教首頁的「了解今天的 UV」大卡片，標示「先從這裡開始」。背景 `{colors.surface-cream-strong}`，標題 `{typography.page-title}`（襯線），圓角 `{rounded.lg}`，內距 24px。這是六個分類中唯一放大的一張。

**`education-category-card`** — 其餘五個分類卡。背景 `{colors.surface-card}`，標題 `{typography.card-title}`，圓角 `{rounded.lg}`，內距 20px。分類文章列表使用兩欄卡片網格。

**圖示 32px**（2026-08-30）。六個 `education-*` 圖示 2026-08-29 就已入註冊表、`label` 與分類 `title` 逐字相同，但一直沒接上畫面——2026-08-30 的介面稽核量到衛教首頁「0 個圖示」，B9 第一輪的 icon-first 只做了「更多」一頁。檔位沿用 B9 裁決 1 的 32px（卡片主視覺），不另立。

**對齊用 `align-items: start`，與 `more-entry-card` 的 `center` 不同。** 這不是不一致，是兩種卡片結構不同：更多頁的卡有的只有標題、有的標題加雙行說明，高度不一，start 會讓純標題的卡看起來歪掉；六張分類卡的結構完全相同（篇數、標題、說明、審閱狀態四行，實測高度都是 175px），改用 center 反而會把圖示推到說明文字旁邊，讀起來不像標題的圖示。

**`education-source-block`** — 文章底部的資料來源與審閱資訊。背景 `{colors.surface-soft}`，文字 `{colors.muted}`，`{typography.supporting}`，圓角 `{rounded.md}`。**來源與審閱狀態不能藏在互動之後**——這是健康內容可查證性的基礎。

文章頁另包含麵包屑、可展開段落目錄、2 篇相關文章與回到分類的入口。PWA 內開啟時保留下排導覽與收藏操作；從搜尋或外部分享進入時使用獨立公開閱讀版面，不顯示收藏、Session、產品或位置等個人資料。

### 開始提醒流程

**`setup-step-shell`** — 設定流程的外框。承載標題、內容區與底部行動列。整個流程在同一個外框內完成，**不因產品標示、部位調整或通知設定跳離到平行頁面**。

> **2026-08-29 更正**：先前寫「兩步驟設定流程（步驟 1 情境、步驟 2 塗抹時間與部位）」，但 `/setup/context` 與 `/setup/timing` 已於 2026-08-24 合併成單頁 `/setup`（理由是「減少跳轉的疲倦感」，見 `docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md` §2.2）。步驟指示器隨之失去對象。

**`context-option`** ／ **`context-option-selected`** — 情境選項。未選取：`{colors.canvas}` 底、`{colors.hairline}` 邊框。已選取：`{colors.surface-cream-strong}` 底、`{colors.primary}` 邊框。選取態同時有底色與邊框變化，不只靠顏色。

**`bottom-sheet`** — 需要在流程中調整細節時使用（如部位防護調整）。面板使用不透明的 `--surface-overlay`、頂角 `--radius-sheet`、內距 20px，搭配 `--overlay-backdrop` 遮罩。用 sheet 而非新頁面，維持流程不中斷。共通實作位於 `components/common/BottomSheet.vue`，並透過 `useOverlay` 統一 Escape 關閉、Tab 焦點循環、背景 inert、捲動鎖與關閉後焦點還原。

### 按鈕與表單

**`button-primary`** — 深杏桃主 CTA。背景 `{colors.primary}`，文字 `{colors.on-primary}`，內距 12px × 20px，最小高度 44px，圓角 `{rounded.md}`。按下時 `button-primary-active` 加深。**每頁只有一個主要 CTA**。

**`button-secondary`** — 描邊按鈕。透明底、`{colors.ink}` 邊框與文字。

**`button-quiet`** — 弱化描邊按鈕。透明底、`{colors.hairline}` 邊框。用於「再試一次」這類次要動作。

**`button-on-dark`** — 深色表面上的按鈕。背景 `{colors.surface-dark-elevated}`，文字 `{colors.on-dark}`。**系統永不在深色表面上反轉出淺色次要按鈕**。

**`icon-button`** — 44×44 圓形圖示鈕，透明底、`{colors.hairline}` 邊框，圓角 `{rounded.pill}`。用於次要流程頁（`/reminder/reapply`、記錄狀況、更正紀錄、新增／編輯裝備）與 sheet 的關閉／取消控制項。

> **2026-08-24 收斂**：這個樣式原本在 7 個地方各自實作（`.sheet__close`、`.back-link`、`.form-heading__close` 等），其中兩組還是「同名但分別 scoped」的重複定義。統一成 `apps/web/src/assets/app.css` 的 `.icon-button`。刻意不疊在 `button-primary`／`button-quiet` 之上——`.button` 在窄螢幕（<31rem）會 `width: 100%`，次要動作套上去會變成跟主要動作同等重量的滿版按鈕。

**`text-link`** — 內文連結，`{colors.primary}`。按下時加底線。

**`text-input`** — 背景 `{colors.canvas}`，1px `{colors.hairline}` 邊框，圓角 `{rounded.md}`，內距 10px × 14px，最小高度 44px。行動端字級 16px 避免 iOS 自動放大。

**`text-input-focused`** — 邊框轉為 `{colors.primary}`，外加 3px 深杏桃 15% 透明度的焦點環。

**`form-error`** — 行內欄位錯誤文字。使用 `{colors.status-due}`、行高 1.6，並清除段落預設 margin；共通實作位於 `apps/web/src/assets/app.css`。欄位錯誤邊框、圖示與訊息位置仍需配合完整表單流程定案。

### 頁面區塊間距（page-stack）

**2026-08-30 訂定。** 在此之前 5 個頁面各自把 `.page-stack` 的 gap 覆寫成 16／20／24／32 四種值，而本文件沒有任何規則說什麼時候該用哪個——「這頁太開」只能憑感覺判斷，沒有依據可以爭論。

三個檔位，**數值與收斂前完全相同**，只是給了名字與適用場合：

| Token | 值 | 用在 | 目前 |
| --- | ---: | --- | ---: |
| `--page-stack-gap-compact` | 16px | 區塊多、每塊短的設定頁 | 1 頁 |
| `--page-stack-gap` | 24px | **預設** | 18 頁 |
| `--page-stack-gap-prose` | 32px | 閱讀為主、區塊少而長的長文頁 | 3 頁 |

**要用第四種值就是新增一個檔位**，先在這裡寫清楚適用場合，不要在頁面裡直接寫別的數值。`apps/web/src/assets/pageStackRhythm.test.ts` 擋著。

**唯一的例外是首頁的 20px**：首屏「不捲動就要看完倒數、狀態與下一步」是第四節訂的實測約束，收進 compact（16px）或放大到預設（24px）都會動到核心畫面。那是視覺決定不是收斂決定，測試把它列為具名例外。

### 長文節奏（prose）

**2026-08-30 收斂。** 衛教文章正文原本行高 1.85、段落間距 16px、章節標題上緣 40px，全部是各頁寫死的值。1.85 從來沒有被裁決過——它來自更早的 SEO 頁 commit，2026-08-25 那次行距收斂用 sed 掃「1.7」所以整批漏掉，B8 也明寫「維持既有寬鬆行高」不碰。

現行值一律由 token 決定，改一次全站跟著動：

| Token | 值 | 用途 |
| --- | --- | --- |
| `--line-height-body` | 1.5 | 正文行高（與全站內文同一個 token） |
| `--prose-paragraph-gap` | 12px | 段落與清單的下緣間距 |
| `--prose-heading-gap-before` | 32px | 章節標題（h2）上緣 |
| `--prose-subheading-gap-before` | 24px | 次級標題（h3）上緣 |
| `--prose-heading-gap-after` | 12px | 標題下緣（兩級共用） |

標題「遠離上一段、靠近下一段」的歸屬節奏維持（32:12 與 24:12），只是絕對值收斂——手機上 40px 偏大。

**`.prose-block` 長文排版三件套**（`app.css`）：`text-align: justify`＋`text-wrap: pretty`＋`overflow-wrap: break-word`。

只給真的有多行段落的地方用——文章正文、文章摘要。**不要套在 UI 標籤、卡片描述或按鈕上**：兩端對齊在 2–3 個字的標籤上會把字距拉得很誇張。

**刻意不用 `word-break: break-all`。** 中文本來就逐字換行，不需要任何設定；`break-all` 唯一的實際作用是把英文單字從字母中間切開（UVAlert → UVAle/rt），而衛教文章滿是 UV／SPF／WHO 與英文來源標題。`overflow-wrap: break-word` 只在「一個詞自己就放不下整行」時才斷，例如長網址——那才是該斷的情況。

公開衛教靜態頁是獨立產生器、不吃 CSS 變數，數值只能手抄；`tools/education/publicSiteRhythm.test.ts` 守著兩邊不漂開。

### 展開收合（disclosure）

**2026-08-29（B9 裁決 2）統一。** 先前 5 個實作有四種做法，其中 3 個沒有 `aria-controls`。

允許**兩種**觸發器，依項目性質選一種，同一種元件內不可混用：

| 觸發器 | 用在 | 例子 |
| --- | --- | --- |
| **標籤化按鈕** | 按鈕文字本身說明會展開什麼 | 「填寫包裝標示（選填）」「查看其他 3 筆事件」「如何開啟」 |
| **整列可點** | 這一列就是那個項目本身 | 情境選擇的「室內活動」「水上活動」群組、快速防護摘要的 header |

不論哪一種，三條硬性要求：

1. **必須用真實 `button`**，並同時設 `aria-expanded` 與 **`aria-controls`**。少了 `aria-controls`，螢幕閱讀器無法把觸發器跟被控制的區塊關聯起來。
2. **chevron 用換圖示 name**：收合 `tool-chevron-right`、展開 `tool-chevron-down`。**不要用 `transform: rotate(180deg)`**——那違反第十二節規則一「只用 opacity」，而且系統本來就有這兩個圖示，不需要 `chevron-up`。
3. **不加淡入淡出**：chevron 是「回應手指的直接操作」，依第十二節規則二該是即時的。交叉淡入留給「自己發生的」狀態變化（例如倒數跨過補擦門檻）。

收合不清除使用者的輸入、選擇或目前狀態。

**這份契約是給「確實需要收合的項目」用的，不是待辦清單。** 2026-08-29 結案：不再系統性地把既有說明文字改成可展開（兩輪逐項分類，48 個判定單位裡只有 2 個可收，且都是單句）。要不要收，依項目自己的性質判斷——健康／安全邊界、不可逆操作後果、採取動作前必須知道的條件、來源與審閱狀態一律常駐；**不要用「這頁段落很多」當理由**。裁決見 `docs/superpowers/specs/2026-08-27-b9-icon-first-progressive-disclosure-design.md` 第八節。

**`badge-pill`** — 分類標籤。背景 `{colors.surface-card}`，`{typography.caption}`，圓角 `{rounded.pill}`。

**`safety-note`** — 安全與限制說明的固定樣式。`{colors.muted}`、`{typography.caption}`、行高 1.6。

## 六、佈局慣例（Layout Conventions）

### 容器與網格

- **內容最大寬度**：752px（`47rem`）——閱讀寬度，不是行銷網站的 1200px。內容置中。
- **頁面左右留白**：行動端 16px、桌面 24px。
- **頁面堆疊**：主要內容用單欄垂直堆疊（`page-stack`），區塊間距 24px。
- **更多頁卡片網格**：桌面 2 欄、手機 1 欄。
- **衛教分類文章列表**：兩欄卡片網格，第一版一次顯示全部文章。
- **五日 UV 預報**：固定 5 欄，不因斷點改變欄數，改為縮小欄內字級。

### 資訊層級

- **每頁只保留一個最主要任務與一個主要 CTA。**
- 提醒頁採「先結論、後細節」：目前狀態 → 倒數／下一步 → 部位摘要 → 次要資訊。
- 衛教頁可有較強的編輯層次，但重要答案與來源不能藏在裝飾或互動後面。
- 使用留白、分隔線與文字層級建立秩序，**避免每一塊內容都變成同重量的卡片**。

### 留白哲學

暖象牙底色 ＋ 襯線標題 ＋ 適度內距形成一種安靜的編輯節奏。但這是行動優先的工具型產品——留白服務於「立刻看懂現在要做什麼」，不是服務於瀏覽體驗。倒數頁的留白比衛教頁緊湊。

## 七、高度與深度（Elevation & Depth）

| 層級     | 處理                               | 用途                                                                                                                  |
| -------- | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 平面     | 無陰影、無邊框                     | 頁面區塊、品牌列                                                                                                      |
| 細邊框   | 1px `{colors.hairline}`            | 輸入框、`app-card`、五日預報卡                                                                                        |
| 暖色卡片 | `{colors.surface-card}` 底、無陰影 | 裝備卡、更多頁入口卡、衛教分類卡                                                                                      |
| 深色表面 | `{colors.surface-dark}` 底、無陰影 | （2026-08-23 起首頁倒數不再使用；保留給未來需要深色資料表面的場合）                                                   |
| 浮層     | **目前無陰影**                     | bottom sheet 與確認彈窗——靠不透明底色（`--surface-overlay`）＋ 全螢幕遮罩（`--overlay-backdrop`）與內容區隔，不用陰影 |

高度哲學是**色塊優先、完全不用陰影**。深度主要來自象牙與濃縮咖啡的表面對比。

> **2026-08-26**：原本這裡寫「浮層 極淡陰影 `0 1px 3px rgba(20,20,19,0.08)`，罕用」，但 `styles.css` 的 `--shadow-card`／`--shadow-float` 從未被任何元件引用（全站唯一的 `box-shadow` 是 `AppShell` 的 `box-shadow: none`）。兩個 token 已移除。未來 bottom sheet 若真的要極淡浮層陰影，再依本節新建 `--shadow-overlay`。

## 八、圖示風格（Iconography）

圖示系統的完整規格在 [`docs/design/icon-system/README.md`](docs/design/icon-system/README.md)，此處為摘要。

**幾何的真實來源是 Illustrator。** 在 Illustrator 畫、匯出到 `docs/design/icon-system/icons/<id>.svg`，然後跑 `node tools/icon-system/generate-icons.mjs` 正規化（`#000` → `currentColor`、內聯 CSS class、注入 `<title>` 與 data 屬性）並重組預覽板。腳本不碰幾何，是冪等的。

### 造型語言

圖示的視覺 DNA 來自 06 播報印記 Logo：**實心圓點＋膠囊狀線條**。

- 畫布 24×24，四周保留約 2px 光學留白。
- 線條寬度固定 `2.5`，端點與轉角一律 `round`——渲染出來就是膠囊形。
- 需要強調的元素用實心填色，不用加粗線條製造層級。
- 不使用尖角、不使用陰影、不使用漸層、**不使用虛線**。

### 色彩制度

混合制：

- **雙色**（導覽、更多頁卡片、情境、事件、裝備、衛教）：墨咖結構 `#33291F` ＋ 琥珀金重點 `#C1832E`。琥珀金一律畫在下層、出現在上半部，且是重點而非結構。
- **單色**（狀態類）：一律 `currentColor`，讓圖示自動繼承外層語意色。狀態圖示若寫死強調色會與狀態色衝突——一份幾何走遍所有狀態。

### 尺寸

從 **16 / 20 / 24 / 32** 四個檔位選，不發明新數值。

| 檔位 | 角色 |
| ---: | --- |
| 16 | 文字行內的輔助圖示（按鈕內、標籤旁） |
| 20 | 清單列、次要位置 |
| 24 | 下排導覽、按鈕、區塊標題 |
| 32 | 卡片或功能入口的主要視覺 |

> **2026-08-29（B9 裁決 1）新增 32 檔位。** 原本只有三檔，24 同時扮演導覽、按鈕與卡片主視覺三種角色；「更多」頁入口卡實測圖示只佔卡片面積 **1.61%**，讀起來是項目符號不是視覺錨點。B9 規格原本另提 18px，**不採用**——它的角色（文字旁的輔助圖示）就是現有的 20，加了只是在小尺寸區塞成四檔。脈絡見 `docs/decisions/2026-08-29-b9-pre-decision.md`。

### 不依賴顏色的區分方式

- **倒數／部位四狀態**用剩餘量計量表：追蹤中（三格）→ 即將到期（一格）→ 已到期（空）→ 未計時（空＋斜線）。格數承載意義，灰階與色盲情況下仍可區分。
- **斜線一律代表「停用／不適用」**。
- **UV 五級不畫圖示**——預報已同時顯示指數數字與中文等級，格數圖示是重複資訊。

### 圖示庫政策：只用自訂圖示

**不使用任何第三方圖示素材庫。** 所有圖示都來自 `docs/design/icon-system/` 的自訂系統，以 inline SVG 進入程式碼。理由是圖示的造型語言直接繼承 Logo 的實心圓點＋膠囊線條，素材庫的圖示無法承載這個品牌訊號，混用會讓介面看起來像拼裝的。

**現況（2026-08-29 更新）**：**Lucide 已完全移除**。全部圖示都透過 `apps/web/src/components/icons/Icon.vue` 這個單一進入點消費自動產生的 `icons.generated.ts`，`apps/web/package.json` 的 `@lucide/vue` 依賴已刪除。最後一批 11 個（功能型 6、工具型 5）於 2026-08-29 補畫，清單與造型取捨見 `docs/design/icon-system/README.md` 第七、十節，預覽板是 `preview-new-icons.svg`。

## 九、圖像法則（Imagery Rules）

### 使用什麼

- **抽象幾何示意**：衛教的七部位示意、UV 強度曲線、補擦節奏線。線條式、與圖示系統同一造型語言。
- **簡單線條插畫**：陽光杏桃 ＋ 濃縮咖啡筆觸，畫在暖象牙底上。極簡、手感、絕不擬真。
- **產品截圖**：說明功能時使用真實的 App 畫面，不畫美化過的假介面。
- **使用者上傳的裝備照片**：裝備詳情頁與分享圖。這是系統中唯一的真實照片來源。

### 絕對不能出現

- **免版稅圖庫人像與 AI 生成的假人照片**。這個產品談的是真實的皮膚與真實的日曬，假人照片會直接摧毀可信度。
- **擬真的皮膚病灶或曬傷照片**。特殊情況頁只涵蓋防曬相關反應，使用簡短安全判斷流程，**不作疾病診斷或求助分級**，也不用衝擊性影像。
- **醫療警告視覺語彙**：紅色警示三角形滿版、驚嘆號牆、血紅底色。系統的警示強度上限是 `{colors.status-due}` 的柔和底色卡。
- **可愛擬人化**：太陽表情、卡通角色、吉祥物。品牌是情報員，不是玩伴。
- **裝飾性儀表板插畫**：假的圖表、無意義的資料視覺化。要顯示資料就顯示真的資料。
- **飽和的陽光黃大面積使用**。黃色是這個題材最俗套的選擇，系統刻意避開。
- **綠色暗示「安全」或「防護完成」**。防曬沒有完成狀態。

### 分享圖

裝備分享圖預設只放產品／品牌名稱、照片與使用心得。價格、購買日期、尺寸由使用者選擇是否包含，**私人備註預設不分享**。

## 十、與程式碼的落差

`README.md` 訂有「文件與程式碼衝突時以程式碼為準」的規則。**色彩已於 2026-08-22 套用、標題字體已於 2026-08-23 定案（Noto Serif TC 單一字型）。** 第二節的 `colors`／`rounded`／`spacing`／`layout`／`typography` frontmatter 與 `packages/ui/src/styles.css` 的一致性由 `packages/ui/src/tokens.test.ts` 自動守著。目前**刻意或暫時的偏離**：

| 項目         | 本文件（目標）       | 實作                                 | 狀態 / 為什麼                                                                                                 |
| ------------ | -------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| 中文內文字體 | Noto Sans TC         | 系統黑體（PingFang TC／微軟正黑）    | 刻意。內文會渲染使用者輸入的裝備名稱與備註，subset 會缺字，完整 CJK 字型好幾 MB。詳見 `tools/fonts/README.md` |
| **字級量表** | 第三節七角色語意量表 | 7 個 canonical `--font-size-*` token | **已對齊**。每個角色的值由 token drift test 比對；倒數與讀數是元件級例外。                                    |

### 字級量表 ↔ code token 對照（B8）

| 語意角色        | 基準值 | code token                  | code 值    | 狀態               |
| --------------- | -----: | --------------------------- | ---------- | ------------------ |
| `page-title`    |   28px | `--font-size-page-title`    | `1.75rem`  | ✅ drift test 守門 |
| `section-title` |   20px | `--font-size-section-title` | `1.25rem`  | ✅ drift test 守門 |
| `card-title`    |   18px | `--font-size-card-title`    | `1.125rem` | ✅ drift test 守門 |
| `body`          |   16px | `--font-size-body`          | `1rem`     | ✅ drift test 守門 |
| `supporting`    |   14px | `--font-size-supporting`    | `0.875rem` | ✅ drift test 守門 |
| `caption`       |   12px | `--font-size-caption`       | `0.75rem`  | ✅ drift test 守門 |
| `nav-label`     |   12px | `--font-size-nav-label`     | `0.75rem`  | ✅ drift test 守門 |

B8 遷移期間使用的四個臨時字級別名已移除；目前元件只使用上表七個 canonical token 與經規範保留的讀數例外。

**已對齊的部分**：品牌與表面色票、行動色、4 級文字色、拉丁內文字體、**標題顯示字體**、圓角（xs 4px 到 sheet 24px、pill）、UV 五級風險色、倒數五狀態語意色（含 `saved` 藕紫，2026-08-26 修正）、內容最大寬度 752px、點擊目標 44px、間距尺規（`--space-1..12`）、斷點（rem）、單一亮色主題、自訂圖示系統為唯一來源。

> **2026-08-22 色彩套用**：`packages/ui/src/styles.css` 已改為本文件第二節的完整色票——品牌（primary／active／disabled ＋ 四個 accent）、表面（canvas 到三階深色）、文字與分隔線。語意別名一併重新指向：`--page-background` → canvas、`--text-primary` → ink、`--text-secondary` → muted、`--surface-primary` → surface-card、`--border-subtle` → hairline、`--focus-ring` → primary。`manifest.webmanifest` 的 `theme_color`／`background_color` 也換成 `#faf5ec`。
>
> **關鍵修正**：`.button--primary` 原本借用 `--color-tracking`（藍色，那其實是「追蹤中」的狀態色），已改用 `--color-primary`，並補上 active／disabled 狀態。`--color-tracking` 現在只剩狀態色用途。四個元件的「選取／連結／裝飾」用途也一併從 tracking 改為 primary。
>
> 對比度實測（暖象牙底）：主要按鈕 4.80:1、文字連結 4.66:1、焦點環 4.66:1、次要文字 5.92:1、標題 12.8–13.2:1，全數通過 WCAG AA。

> **2026-08-24 色彩與卡片背景修正**：核對 Claude Design 下游元件庫時發現兩處落差，使用者確認後套用：
>
> 1. **`--surface-primary` 改回 `{colors.canvas}`**，取代 2026-08-22 一度指向的 `{colors.surface-card}`。本節第五節的 `app-card` 規範本來就寫「背景 canvas、1px hairline 邊框」（見上方 654 行），2026-08-22 那次色彩套用其實是改錯方向；Claude Design 的下游元件庫一直維持 canvas＋hairline 版本。這次改動會讓 `app-card`、輸入框、bottom sheet 等所有引用 `--surface-primary` 的元件變成跟頁面同色，只靠 hairline 分隔——`HomeCountdown`／`ReminderPanel`／`BottomNavigation` 三處直接引用 `{colors.surface-card}`，不受影響。
> 2. **`{colors.status-tracking}`／`{colors.status-soon}`／`{colors.status-due}` 加深一階**（`#2F6FBB`→`#3F76A5`、`#A86100`→`#BB6820`、`#CC3333`→`#C1442F`），**`{colors.status-untimed}` 從紫色 `#5B3CC4` 改成中性灰 `#9D9591`**——untimed 語意是「沒有時間資訊」，中性灰比專屬紫色貼切，也是 Claude Design 已經套用的方向。
>
> 同時引進 Claude Design 定義的 stack 間距 token。**2026-08-30 更正**：原本引進三個，但只有 `--space-stack-title-body`（8px，等於 `--space-2`）真的被用在 `question-card` 的 legend→內文間距；`--space-stack-body-note` 與 `--space-stack-block` 從未被任何地方引用，已移除——留著的 token 會讓人以為某處正在用它。`.page-heading`／`.flow-heading` 維持原本的 `--space-3`（12px）單一 gap，語意不同，不套用。

> **2026-08-22 更正**：「點擊目標 44px」先前寫成已對齊，但實際有三個元件用區域 CSS 覆寫把共用 `.button` 的 `min-height: var(--tap-target)` 壓成 `2.5rem`（40px）——`OutdoorContextCard`、`EveningUvPrompt`、`FiveDayUvCard`。三處皆已改為刪除該行、回歸共用 token（不是改寫成 44px，避免再寫死數值）。
>
> 教訓：`.button` 已經帶 `min-height: var(--tap-target)`，**元件的 scoped CSS 不要再自己寫 `min-height`**——scoped 樣式的 attribute selector 特異性高於共用類別，一定會蓋過去。要調整尺寸請改 padding 或 token，不要覆寫 min-height。

> **2026-08-23 字體套用（初版，已被同日稍晚的霞鶩文楷 TC 版本取代）**：新增 `--font-serif`，並在 `packages/ui/src/styles.css` 加全域規則讓 `h1`／`h2`／`h3` 走 Cormorant Garamond ＋ Noto Serif TC、字重 400。字型自行托管於 `apps/web/public/fonts/`，由 `node tools/fonts/build-fonts.mjs` 從完整字型 subset 產生（合計 748 KB，取代 26 MB 的原檔）。不使用 Google Fonts CDN——理由與其他取捨見 `tools/fonts/README.md`。
>
> **2026-08-23 同日稍晚兩次修正，最終定案為 Noto Serif TC 單獨使用。** 中間曾短暫換成霞鶩文楷 TC（LXGW WenKai TC）並實際上線，隨後因手寫感破壞「襯線標題負責成熟」的角色分工而退回，完整過程見第三節「標題字體定案」。
>
> 最終實作：移除 Cormorant Garamond 與霞鶩文楷 TC，標題只留 Noto Serif TC subset，由它同時負責中英文。自托管政策不變。合計 **722 KB**（Cormorant 版本 748 KB、霞鶩文楷版本 1,033 KB），是三個版本裡最小的——因為不再需要第二支標題字型。
>
> **一併移除 31 個檔案裡的 36 條標題字重覆寫。** Noto Serif TC subset 只有 400 字重，元件若寫 `font-weight: 600` 會觸發瀏覽器合成假粗（faux bold），把筆畫無差別加厚，中文字會糊。這就是第十一節「不要把襯線標題加粗」的技術理由，不只是風格偏好。
>
> **webfont 是必要條件不是加分項**：Windows 系統沒有 Noto Serif CJK，中文襯線體只會落到新細明體——那是為 12px 點陣設計的字，放到 28–64px 標題品質很差。只加 token 不載入字型會讓標題比原本更難看。

> **2026-08-26 token 校準（audit 清單 C1/D1–D5）**：
>
> - 新增 `packages/ui/src/tokens.test.ts`——自動比對本文件 frontmatter 與 `styles.css`。
> - **文字色砍到 4 級**：移除 `muted-soft`／`--color-muted-soft`／`--text-tertiary`（對比度 4.42:1 過不了 AA）。頁尾細則停在 `{colors.muted}`。
> - **`saved` 狀態色從綠改藕紫**：程式碼原本誤用綠色 `--color-success #147d64` 做「已儲存／成功」回饋，違反第二節「不用綠色」原則。改成 `--color-saved #8c6f7a`（藕紫），6 處回饋（草稿已儲存、`.success-panel`、`.notice--ok` 等）跟著變。
> - **移除從未被引用的 token**：`--shadow-card`／`--shadow-float`（§7 改為「完全不用陰影」）、frontmatter 的 `warning`／`error`（驗證錯誤沿用 `status-due`、警示沿用 `status-soon`）、`rounded.full`。
> - **新增 `rounded.sheet: 24px`**（`--radius-sheet`，bottom sheet 頂角，2026-08-25 就有 token、本文件沒記）。
> - **斷點改用 rem 標注**（§12），補記 `24rem`／`31rem` 兩個元件層級斷點。
> - §13 規格盲點更新：焦點環其實早已系統化、Lucide 剩 9 檔。

### 深色模式：不做（已從程式碼移除）

**本系統只有一套暖色亮色主題。** 整套色票——暖象牙地板、杏桃奶油卡片、濃縮咖啡強調面——是為單一亮色情境調出來的，深色模式等於要重新設計一套層級語言，而不是把顏色反轉。

> **2026-08-23 註**：這條理由原本寫的是「倒數面板之所以突出，是因為它是整頁唯一的深色表面」。首頁倒數改為平面版本後（見第五節），那個例子不再成立，但結論不變——理由改以整體色票的單一情境設計為依據。

2026-08-19 已移除舊 demo 版的深色模式實作，包含 `:root[data-theme]` 與 `prefers-color-scheme` token 組、`/settings/display` 路由與頁面、`AppearanceSettings` 元件、`useAppearance` composable、`createAppearanceController`、`toggleThemeWithReveal` helper，以及 `UserPreferencesV1Schema` 的 `appearance` 欄位（含 Supabase 同步驗證）。schema 版本維持 `user-preferences-v1`——Zod 預設 strip 未知欄位，舊資料含 `appearance` 也能正常解析，不需要遷移。

**套用進度**：色彩 token（2026-08-22）與字體（2026-08-23）皆已完成。剩下元件層 token——`DESIGN.md` 第五節的元件規範目前仍靠 `apps/web/src/assets/app.css` 的共用類別實現，尚未抽成 token。

## 十一、Do's and Don'ts

### Do

- 每一頁都錨定在暖象牙底色上。純白讀起來像通用工具軟體，暖色調是這個系統的差異點。
- 所有標題使用襯線體（Noto Serif TC，單一字型負責中英文）。負字距不可省略。
- 把 `{colors.primary}` 留給主 CTA。每個決策情境只有一個。
- 倒數數值用全頁最大的字級。它的尺寸就是「這是最重要的東西」的訊號（2026-08-23 起改由字級承擔，不再依賴深色面板）。
- 狀態同時用色彩、圖示與文字表達。
- 風險與狀態色搭配數值與中文標示一起出現。
- 藕紫只用於已完成、安心的狀態。
- 每頁只有一個最主要任務。

### Don't

- 不要用冷灰或純白當底色。
- 不要把襯線標題加粗。subset 只有字重 400，瀏覽器合成假粗會把筆畫無差別加厚。
- 不要用鮮黃或飽和紅當品牌主色。深杏桃是行動色，高強度顏色留給風險狀態。
- 不要把深杏桃到處塗。
- 不要用無襯線字當標題，也不要用楷體或圓體（霞鶩文楷 TC 已於 2026-08-23 試過並退回，理由見第三節）。
- 不要單靠顏色傳達狀態。
- 不要用綠色暗示安全或防護完成。
- 不要在提醒頁以外的頁面顯示迷你倒數或 Session 狀態——那會產生第二個提醒頁。
- 不要記錄 hover 狀態。系統只定義預設與按下／選取狀態。

## 十二、響應式行為

### 斷點

程式碼一律用 `rem`（尊重使用者字級設定），本節同步用 rem 標注（括號為 16px 基準的 px）。

| 名稱 | 寬度                   | 主要變化                                              |
| ---- | ---------------------- | ----------------------------------------------------- |
| 行動 | < 48rem（768px）       | 單欄；更多頁卡片 1 欄；左右留白 16px；倒數數字 ≥ 40px |
| 平板 | 48–64rem（768–1024px） | 更多頁卡片 2 欄；衛教文章列表 2 欄；左右留白 24px     |
| 桌面 | > 64rem（1024px）      | 內容維持 752px 置中；左右留白由容器吸收               |

這是行動優先的 PWA。桌面版不是另一套版面，只是同一套版面在更寬的視窗中置中。左右留白程式碼是流動的 `clamp(1rem, 5vw, 2.75rem)`，不是固定 16／24px 的 token。

### 元件層級斷點

上表是頁面／版面層級的斷點。除此之外，程式碼裡還有幾個**元件層級**、內容驅動的斷點，跟頁面版面無關，是單一元件自己夠不夠寬決定要不要換排列方式：

| 寬度           | 用途                                                                     | 出現位置                                                                                      |
| -------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| 24rem（384px） | 五日 UV 預報卡在極窄螢幕縮小欄內字級                                     | `FiveDayUvCard`                                                                               |
| 31rem（496px） | 主要按鈕從並排改成滿版堆疊（`.button` / `.button-group`）                | `app.css`、`SessionEndControl`、`QuickProtectionSummary`、`SetupStepShell`                    |
| 36rem（576px） | 送出／取消按鈕列從堆疊改成並排（`.submit-actions`）                      | `EventCorrectionPage`、`ReportContextEventPage`、`ReapplyPage`（已收斂進 `app.css` 共用類別） |
| 42rem（672px） | 選項格從單欄改成 2／3 欄（`.choice-grid--row`／`.choice-grid--compact`） | `app.css`                                                                                     |

**2026-08-25／08-26 補記**：稽核時發現這些斷點沒被記錄，補上說明它們是刻意的元件層級設計，不是該併入上方 48rem／64rem 頁面斷點的落差。

### 觸控目標

- 所有按鈕、輸入框與可點擊清單項目最小 44 × 44px（`{layout.tap-target}`）。
- 下排導覽三項各佔 1/3 寬，高度 64px。
- 裝備卡與更多頁入口卡整張可點擊。

### 動畫

動效的定位：這個產品的情緒基調是**耐心**——核心機制是兩小時的等待，文案也刻意寫「這是協助你記得補擦的提醒，不是安全曝曬時間保證」。動效要支撐這個 tone，不是展示流暢度。2026-08-29 重訂為以下五條。

#### 一、只用 `opacity`，唯一例外是內容進場

狀態切換、圖示內部、hover、loader 一律**純 `opacity`**，不位移、不縮放、不旋轉。

**唯一例外**：內容進場可以加上 `{motion.motion-rise}`（4px）的上移。理由是在 `{colors.canvas}` 這種低對比暖底上，純 0→1 淡入幾乎察覺不到；4px 小到不構成「位移動畫」，只是讓轉場被看見。這個例外**不擴張到其他情境**。

#### 二、時距分兩類

| 類型 | Token | 用在 |
| --- | --- | --- |
| 回應手指的 | `{motion.duration-fast}`（160ms） | 按鈕、chevron 展開、遮罩 |
| 自己發生的 | `{motion.duration-base}`（320ms）／`{motion.duration-slow}`（450ms） | 內容進場、狀態切換 |

**直接操作放慢會讀成延遲；自己發生的事沒有人在等，慢一點才安靜。**

緩動一律 `{motion.ease-out}`；需要對稱進出的循環動畫（loader）用 `{motion.ease-in-out}`，循環長度用 `{motion.duration-loader-cycle}`。

**loader 出現前先靜默 `{motion.duration-loader-delay}`（250ms）。** 本機優先的讀取多半幾十毫秒就回來，沒有這段延遲的話 loader 會閃一下再消失——那個閃動本身就是最廉價的觀感，跟圖案畫得多好無關。

#### 三、禁止 `transition: all`

一律列出要動的屬性。`all` 會連帶動到之後新增的任何屬性——加一個 `background` 就多一個沒人決定過的動畫。**stylelint 會擋**（`declaration-property-value-disallowed-list`）。

#### 四、無限循環動畫必須自己關掉

`packages/ui/src/styles.css` 有全域 `prefers-reduced-motion` 規則，把所有動畫壓到 `0.01ms`、`iteration-count: 1`。一般元件因此**不需要**各自再寫一份。

但**無限循環的動畫必須自己寫 `animation: none` 的覆寫**——`0.01ms` 配 `infinite` 會變成極速閃爍，比不動更糟，對前庭敏感的使用者是反效果。目前適用於 `BroadcastLoader` 與 `InlineLoader`。

#### 五、一次只有一個元素在動

同一個畫面區塊裡不要讓兩個元素同時動——會讀成「整體閃爍」而不是「某件事發生了」。

`BroadcastLoader` 是這條的來源：射線掃完之後圓點才接手蓄能，兩者刻意錯開。初版讓圓點全程靜止，結果整顆讀起來像卡住——**畫面上最大、最飽和的元素靜止不動時，其他元素再怎麼動都會被讀成靜止**。

#### 進場的實作細節

- `page-stack` 的直接子區塊依序淡入（每項延遲 0.08s，上限 0.4s），使用 `fill-mode: backwards` 避免內容先閃現，並帶 `{motion.motion-rise}` 的上移。
- 完整支援 `prefers-reduced-motion: reduce`——該設定開啟時所有動畫直接關閉（無限循環動畫另見規則四）。

## 十三、規格盲點（Gaps）

以下項目尚未定義或無法驗證，**實作時不要自行填補，先確認**：

1. **Lucide 已移除（2026-08-29 結案）。** 8 個檔案的 `import ... from "@lucide/vue"` 全部換成 `<Icon name="..." />`，依賴也已從 `apps/web/package.json` 刪除。替換時順帶把散落的尺寸（25／26／22／18／17）收斂回系統的 16／20／24 三檔。剩下的唯一圖示待辦是衛教部位示意，但它的規格（要畫幾個、抽象到什麼程度）尚未裁決——`docs/design/icon-system/README.md` 第七節寫 7 個、`setupCatalog.ts` 實際是 10 個部位，數量對不上。
2. **焦點環已系統化**（2026-08-25 前就已完成，此處補記）。`packages/ui/src/styles.css` 全域規則：`button, a, input, select, textarea` 的 `:focus-visible` → `outline: 0.15rem solid var(--focus-ring); outline-offset: 0.2rem;`。2026-08-26 已統一 bottom sheet／確認 dialog 的焦點循環與還原。**殘留缺口**：卡片、自訂 widget（如 `.choice-grid` 選項）的鍵盤焦點樣式未逐一規範。
3. **停用狀態**：主按鈕（`--color-primary-disabled`）、次要按鈕（`.button--quiet:disabled`：`opacity: 0.55` + `cursor: not-allowed`，2026-08-25 補）皆已定義。**輸入框、清單項目的停用樣式仍未定義。**
4. **錯誤與驗證狀態：行內錯誤文字已統一，其餘視覺結構未展開。** 顏色沿用 `{colors.status-due}`（驗證錯誤）／`{colors.status-soon}`（系統警示），見第二節。2026-08-26 已將 9 個檔案的 `.form-error` 收斂至 `app.css`；欄位邊框、訊息位置與是否加圖示仍需配合實際表單流程確認。
5. **橫式標誌缺深色底版本。** 正式資產在 `docs/design/logo/`（2026-08-22 定案），但墨咖字標在濃縮咖啡深色面板上幾乎看不見，需要另做反白版。圖標本身已有 `06-broadcast-mark-dark-surface.svg`。
6. **衛教部位示意尚未設計，而且數量還沒定。** 規格 4.6 與圖示系統都提到「七部位」，但 `apps/web/src/features/setup/setupCatalog.ts` 實際是 10 個部位（臉部／耳朵／頸部／手臂／手背／肩膀與身體／腿部／腳背／頭皮／嘴唇）。**動手前要先裁決畫幾個、抽象到什麼程度**，不要照「七」這個數字開工。
7. ~~功能型圖示尚未設計~~ **已完成（2026-08-29）。** 這一項原本列了十個待設計的功能型圖示，現在全部有著落：載入中改用 `InlineLoader` 元件而非圖示；調整設定沿用既有的 `tool-edit`，不另畫；夜間與傍晚對應的元件在現行程式碼已不存在；其餘六個是 `feature` 群。對照表見 `docs/design/icon-system/README.md` 第七、八節。
8. **分享圖版面未定義。** 裝備分享圖的內容規則已確認（見第九節），但版面、尺寸與品牌標示位置未定。
9. **`/reminder/reapply` 的最終顯示形式未定**，Sitemap 文件標註仍需在 wireframe 階段確認。

**已清除**：`packages/ui/src/index.ts` 的 `SUNSHIELD_THEME`（2026-08-25）、`--color-muted-soft`／`--text-tertiary`（2026-08-26，見第二節）、`--shadow-card`／`--shadow-float`（2026-08-26，從未被引用）、frontmatter 的 `warning`／`error`／`rounded.full`（2026-08-26）。

## 十四、迭代指引

1. 一次專注一個元件。引用它的 YAML key（`{component.countdown-block}`、`{component.status-card-due}`）。
2. 元件變體（`-active`、`-disabled`、`-selected`、`-focused`）在 `components:` 中各佔一個獨立條目。
3. 到處使用 `{token.refs}`，不寫死 hex。
4. 不記錄 hover。只定義預設與 Active／Pressed／Selected 狀態。
5. 標題維持襯線 400 加負字距，內文維持 Inter 400。這個分工不可打破。
6. 暖象牙 ＋ 深杏桃 ＋ 濃縮咖啡是品牌三元組。藕紫保留給安心狀態；UV 風險色維持標準化與資訊性。
7. 拿不定強調程度時：先放大襯線字，而不是加粗。
8. **修改此文件時，同步檢查第十節「與程式碼的落差」是否仍然準確。**

## 參考文件

| 文件                                                                                                                               | 內容                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| [`docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`](docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md) | 現行 Sitemap、User Flow、頁面任務與產品結構的唯一基準 |
| [`docs/design/current-direction.md`](docs/design/current-direction.md)                                                             | 已確認的視覺方向與品牌角色                            |
| [`docs/design/icon-system/README.md`](docs/design/icon-system/README.md)                                                           | 圖示系統完整規格與取捨紀錄                            |
| [`packages/ui/src/styles.css`](packages/ui/src/styles.css)                                                                         | 設計 token 的程式碼真實來源                           |
| [`apps/web/src/assets/app.css`](apps/web/src/assets/app.css)                                                                       | 共用類別的程式碼真實來源                              |
| [`docs/education/public-seo-implementation.md`](docs/education/public-seo-implementation.md)                                       | 公開衛教頁的發布閘門與結構化資料規則                  |
