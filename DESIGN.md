---
version: alpha
name: 防曬晴報員設計系統
description: 防曬晴報員（UVAlert）是一個以防曬乳補擦倒數為核心的 Web／PWA。介面建立在暖象牙底色上，標題用文學感襯線體，行動色為深杏桃，倒數與資料面板使用濃縮咖啡色深色表面，狀態色使用藕紫。視覺個性來自象牙／杏桃／藕紫的組合——有陽光感與人文氣息，同時安靜到足以承載每日的健康指引。字體聲音是襯線標題搭配人文無襯線內文。
target-status: 本文件的色彩與字體是「目標方向」，前端程式碼尚未套用；衝突處理見下方「與程式碼的落差」。

colors:
  primary: "#9F5E42"
  primary-active: "#804536"
  primary-disabled: "#E8D1C5"
  ink: "#2E2925"
  body: "#5A4540"
  body-strong: "#46342F"
  muted: "#6F5A54"
  muted-soft: "#856D65"
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
  status-tracking: "#2F6FBB"
  status-soon: "#A86100"
  status-due: "#CC3333"
  status-untimed: "#5B3CC4"
  status-saved: "#8C6F7A"
  warning: "#C78336"
  error: "#B84D4C"
  uvi-low: "#507AA8"
  uvi-moderate: "#BD8500"
  uvi-high: "#D16627"
  uvi-very-high: "#C43D3D"
  uvi-extreme: "#7D4BB3"

typography:
  display-xl:
    fontFamily: "Cormorant Garamond, Noto Serif TC, Noto Serif CJK TC, ui-serif, serif"
    fontSize: 64px
    fontWeight: 400
    lineHeight: 1.05
    letterSpacing: -1.5px
  display-lg:
    fontFamily: "Cormorant Garamond, Noto Serif TC, Noto Serif CJK TC, ui-serif, serif"
    fontSize: 48px
    fontWeight: 400
    lineHeight: 1.1
    letterSpacing: -1px
  display-md:
    fontFamily: "Cormorant Garamond, Noto Serif TC, Noto Serif CJK TC, ui-serif, serif"
    fontSize: 36px
    fontWeight: 400
    lineHeight: 1.15
    letterSpacing: -0.5px
  display-sm:
    fontFamily: "Cormorant Garamond, Noto Serif TC, Noto Serif CJK TC, ui-serif, serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.3px
  title-lg:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 22px
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: 0
  title-md:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  title-sm:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 16px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  body-md:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  body-sm:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: 0
  caption:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 13px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0
  caption-uppercase:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 1.5px
  readout:
    fontFamily: "Noto Sans Mono CJK TC, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"
    fontSize: 14px
    fontWeight: 600
    lineHeight: 1.6
    letterSpacing: -0.02em
    fontVariantNumeric: tabular-nums
  button:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 14px
    fontWeight: 500
    lineHeight: 1
    letterSpacing: 0
  nav-label:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0

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

rounded:
  xs: 4px
  sm: 8px
  md: 14px
  lg: 20px
  pill: 999px
  full: 9999px

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
  page-gutter-mobile: 16px
  page-gutter-desktop: 24px

components:
  brand-header:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
  bottom-nav:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.muted}"
    activeTextColor: "{colors.primary}"
    typography: "{typography.nav-label}"
    height: 64px
  global-status-banner:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.body}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 12px 16px
  page-heading:
    textColor: "{colors.ink}"
    typography: "{typography.display-md}"
  page-heading-eyebrow:
    textColor: "{colors.muted}"
    typography: "{typography.caption}"
  app-card:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    rounded: "{rounded.lg}"
    padding: 20px
  countdown-panel:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography-cjk.countdown}"
    rounded: "{rounded.lg}"
    padding: 24px
  countdown-ring:
    strokeColor: "{colors.accent-apricot}"
    trackColor: "{colors.surface-dark-elevated}"
  stat-figure:
    textColor: "{colors.ink}"
    typography: "{typography.readout}"
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
    typography: "{typography.body-md}"
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
    typography: "{typography.title-sm}"
    rounded: "{rounded.lg}"
    padding: 16px
  more-entry-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.title-sm}"
    rounded: "{rounded.lg}"
    padding: 20px
  education-hero-card:
    backgroundColor: "{colors.surface-cream-strong}"
    textColor: "{colors.ink}"
    typography: "{typography.display-sm}"
    rounded: "{rounded.lg}"
    padding: 24px
  education-category-card:
    backgroundColor: "{colors.surface-card}"
    textColor: "{colors.ink}"
    typography: "{typography.title-md}"
    rounded: "{rounded.lg}"
    padding: 20px
  education-source-block:
    backgroundColor: "{colors.surface-soft}"
    textColor: "{colors.muted}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.md}"
    padding: 16px
  setup-step-shell:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.body-md}"
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
    typography: "{typography.button}"
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
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    minHeight: 44px
  button-quiet:
    backgroundColor: transparent
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    minHeight: 44px
  button-on-dark:
    backgroundColor: "{colors.surface-dark-elevated}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: 12px 20px
    minHeight: 44px
  text-link:
    backgroundColor: transparent
    textColor: "{colors.primary}"
    typography: "{typography.body-md}"
  text-input:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    borderColor: "{colors.hairline}"
    typography: "{typography.body-md}"
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
    textColor: "{colors.muted-soft}"
    typography: "{typography.body-sm}"
---

## 一、品牌本質（Brand Essence）

**受眾**：在台灣日常需要防曬、但不想被醫療口吻說教的一般使用者。核心情境是「出門前後想知道現在該不該補擦」，不是慢性病管理，也不是美妝愛好者的收藏行為。

**角色**：防曬晴報員的品牌感受是「**懂防曬知識、用生活化方式播報的氣象情報員**」——不是醫療警告工具，也不是幼稚可愛的提醒 App。這個角色由兩個面向組成：

- **防曬氣象管家**：資料有來源、有時間、有風險層級。UV 色階要容易理解，數字要能被查證。
- **防曬生活編輯部**：衛教內容像經過編輯的生活專題，親切、整齊、有閱讀節奏。

**語調**：務實、有依據、不製造焦慮。說明狀況時先給結論再補條件；提到風險時給下一步而不是恐嚇。倒數到期說「該補擦了」，不說「你的皮膚正在受損」。允許溫度，不允許可愛化——防曬是健康行為，不是遊戲成就。

**外觀對比語調**：語調親切，但外觀維持成熟的編輯感。暖象牙底色與襯線標題負責「成熟」，杏桃與陽光細節負責「親切」。兩者不可偏廢：全暖色會變成生活風格部落格，全中性會變成醫療儀表板。

### 各區域的視覺任務

| 區域 | 視覺任務 | 設計重點 |
|---|---|---|
| 提醒 | 讓使用者立刻知道現在要做什麼 | 倒數、下一步 CTA、部位狀態優先；避免裝飾搶走注意力 |
| 裝備 | 讓使用者快速查看與記錄防曬裝備 | 清楚的清單、摘要與分享入口；不做購物商城感 |
| 更多 | 容納支援功能但保持整齊 | 同尺寸卡片、清楚分組、避免把次要功能做成警示牆 |
| 衛教首頁／分類頁 | 讓使用者像看生活專題一樣找到問題 | 編輯導讀、分類標題、短摘要與搜尋入口 |
| 衛教文章 | 讓健康資訊容易讀、容易查證 | 先給直接答案，再補條件、限制、來源與審閱資訊 |

## 二、色彩標記（Color Tokens）

系統的定義性選擇是**暖象牙底色**（`{colors.canvas}`）配**深咖文字**（`{colors.ink}`）——比純白更有溫度，比飽和的陽光黃更適合長時間閱讀。視覺個性來自**象牙＋杏桃＋藕紫**的組合。

三種表面模式在頁面之間交替：

1. **暖象牙底色**（`{colors.canvas}`）— 預設頁面地板
2. **杏桃奶油卡片**（`{colors.surface-card}`）— 裝備清單、衛教模組、更多頁入口卡
3. **濃縮咖啡深色表面**（`{colors.surface-dark}`）— 倒數面板、資料區塊

深色表面是產品露出「儀器感」的地方——倒數數值、狀態讀數。象牙與濃縮咖啡的對比就是頁面的節奏。

### 品牌與陽光

| Token | Hex | HSL | 用途 |
|---|---|---|---|
| `{colors.primary}` 深杏桃 | `#9F5E42` | `hsl(18, 41%, 44%)` | 主要行動色。用於主 CTA 與品牌字標；每個決策情境只出現一次 |
| `{colors.primary-active}` | `#804536` | `hsl(12, 41%, 36%)` | 按下狀態 |
| `{colors.primary-disabled}` | `#E8D1C5` | `hsl(21, 43%, 84%)` | 停用狀態，仍看得出與主色的血緣 |
| `{colors.accent-apricot}` 陽光杏桃 | `#E8A477` | `hsl(24, 71%, 69%)` | 倒數進度環、插圖筆觸、小面積高光。此色上必須用深咖文字 |
| `{colors.accent-blush}` 腮紅 | `#D79A92` | `hsl(7, 46%, 71%)` | 衛教引言與分類細節；永遠不作為行動色 |
| `{colors.accent-mauve}` 藕紫 | `#8C6F7A` | `hsl(337, 12%, 49%)` | 已完成、安心狀態。裝備勾選與閱讀進度 |
| `{colors.accent-amber}` 香檳金 | `#D9A35F` | `hsl(33, 62%, 61%)` | 徽章、SPF 標記、陽光母題。不用於內文 |

### 表面

| Token | Hex | HSL | 用途 |
|---|---|---|---|
| `{colors.canvas}` | `#FAF5EC` | `hsl(39, 58%, 95%)` | 預設頁面地板 |
| `{colors.surface-soft}` | `#F7EDE1` | `hsl(33, 58%, 93%)` | 區塊分隔、衛教引言底、來源區塊 |
| `{colors.surface-card}` | `#F0E2D1` | `hsl(33, 51%, 88%)` | 裝備卡、更多頁入口卡、衛教分類卡 |
| `{colors.surface-cream-strong}` | `#EFD0BC` | `hsl(24, 61%, 84%)` | 最強暖光變體：已選取的情境選項、衛教首頁大卡片 |
| `{colors.surface-dark}` | `#2E2925` | `hsl(27, 11%, 16%)` | 倒數面板。主要深色表面 |
| `{colors.surface-dark-elevated}` | `#493732` | `hsl(13, 19%, 24%)` | 深色區塊內的控制項與進度環軌道 |
| `{colors.surface-dark-soft}` | `#241F1D` | `hsl(17, 11%, 13%)` | 深色卡片內的資料區塊 |
| `{colors.hairline}` | `#E7D8CF` | `hsl(22, 33%, 86%)` | 暖色表面上的 1px 邊框。邊框像一階高度差，不是墨線 |
| `{colors.hairline-soft}` | `#F0E6DE` | `hsl(27, 37%, 91%)` | 同區塊內幾乎看不見的分隔線 |

### 文字

| Token | Hex | HSL | 用途 |
|---|---|---|---|
| `{colors.ink}` | `#2E2925` | `hsl(27, 11%, 16%)` | 所有標題與主要文字。深濃縮咖啡，比純黑柔和 |
| `{colors.body-strong}` | `#46342F` | `hsl(13, 20%, 23%)` | 強調段落與導言 |
| `{colors.body}` | `#5A4540` | `hsl(12, 17%, 30%)` | 預設內文 |
| `{colors.muted}` | `#6F5A54` | `hsl(13, 14%, 38%)` | 副標、麵包屑、次要文字 |
| `{colors.muted-soft}` | `#856D65` | `hsl(15, 14%, 46%)` | 說明文字、頁尾細則 |
| `{colors.on-primary}` | `#FFF8F0` | `hsl(32, 100%, 97%)` | 深杏桃按鈕上的暖象牙文字 |
| `{colors.on-dark}` | `#FFF8F0` | `hsl(32, 100%, 97%)` | 濃縮咖啡表面上的文字 |
| `{colors.on-dark-soft}` | `#DCC7BC` | `hsl(21, 31%, 80%)` | 深色表面上的次要標籤 |

### 倒數與部位狀態

這五個狀態色**不使用品牌暖色系**，因為它們必須跨深淺模式維持相同語意，且不能與杏桃／藕紫的裝飾用法混淆。數值取自 `packages/ui/src/styles.css`。

| Token | Hex | HSL | 語意 |
|---|---|---|---|
| `{colors.status-tracking}` | `#2F6FBB` | `hsl(211, 59%, 46%)` | 追蹤中 |
| `{colors.status-soon}` | `#A86100` | `hsl(35, 100%, 33%)` | 即將到期 |
| `{colors.status-due}` | `#CC3333` | `hsl(0, 60%, 50%)` | 已到期 |
| `{colors.status-untimed}` | `#5B3CC4` | `hsl(255, 53%, 50%)` | 未計時 |
| `{colors.status-saved}` | `#8C6F7A` | `hsl(337, 12%, 49%)` | 已儲存（藕紫，與 accent-mauve 同值） |

**「已儲存」刻意用藕紫而非綠色。** 專案規則明訂不使用綠色暗示「安全」或「防護有效」——防曬沒有「完成」狀態，只有「這次記錄成功」。藕紫傳達安心但不傳達安全。

### UV 五級風險色

風險色序列與品牌色盤分開管理，數值與 `packages/ui/src/styles.css` 一致：

| 等級 | Token | Hex | HSL |
|---|---|---|---|
| 低量級 0–2 | `{colors.uvi-low}` | `#507AA8` | `hsl(211, 35%, 49%)` |
| 中量級 3–5 | `{colors.uvi-moderate}` | `#BD8500` | `hsl(42, 100%, 37%)` |
| 高量級 6–7 | `{colors.uvi-high}` | `#D16627` | `hsl(22, 69%, 49%)` |
| 過量級 8–10 | `{colors.uvi-very-high}` | `#C43D3D` | `hsl(0, 53%, 50%)` |
| 危險級 11+ | `{colors.uvi-extreme}` | `#7D4BB3` | `hsl(269, 41%, 50%)` |

低量級刻意用藍色而非慣例的綠色，理由同上。**永遠同時顯示數值與中文等級標示**，不讓顏色單獨承擔資訊。

### 色彩分佈

- **60% 暖象牙**：`{colors.canvas}` 與 `{colors.surface-soft}`，頁面地板與閱讀區。
- **20% 暖光表面**：`{colors.surface-card}` 與 `{colors.surface-cream-strong}`，裝備與衛教卡片。
- **12% 濃縮咖啡**：`{colors.surface-dark}` 與其變體，倒數面板與資料區塊。
- **6% 深杏桃行動色**：`{colors.primary}`，每個決策情境只有一個主要行動。
- **2% 細節與狀態**：陽光杏桃、香檳金、腮紅、藕紫與風險色，只在語意明確處出現。

## 三、字體排版（Typography）

### 字體家族

系統以 **Cormorant Garamond**（或 **EB Garamond** 作為替代）為拉丁襯線標題字，搭配 **Noto Serif TC** 作為繁體中文標題字。**Inter** 為拉丁人文無襯線內文字，搭配 **Noto Sans TC** 處理繁體中文內文、導覽與 UI 標籤。**Noto Sans Mono CJK TC** 加系統等寬堆疊處理倒數數值與資料讀數。

備援堆疊：標題走 `Cormorant Garamond, Noto Serif TC, Noto Serif CJK TC, ui-serif, serif`，內文走 `Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif`。

標題／內文的分工是編輯式的：

- Cormorant Garamond ＋ Noto Serif TC（字重 400，負字距）→ h1、h2、h3、頁面主標
- Inter ＋ Noto Sans TC（字重 400–500）→ 內文、導覽、按鈕、說明、標籤
- Noto Sans Mono CJK TC ＋ 系統等寬 → 倒數數值、UV 指數、時間戳記

### 階層

| Token | 尺寸 | 字重 | 行高 | 字距 | 用途 |
|---|---|---|---|---|---|
| `{typography.display-xl}` | 64px | 400 | 1.05 | -1.5px | 衛教首頁主標 — Cormorant Garamond |
| `{typography.display-lg}` | 48px | 400 | 1.1 | -1px | 衛教分類頁主標 |
| `{typography.display-md}` | 36px | 400 | 1.15 | -0.5px | 頁面標題（`page-heading__title`） |
| `{typography.display-sm}` | 28px | 400 | 1.2 | -0.3px | 衛教首頁大卡片標題、區塊標題 |
| `{typography.title-lg}` | 22px | 500 | 1.3 | 0 | 文章章節標題 — Inter |
| `{typography.title-md}` | 18px | 500 | 1.4 | 0 | 卡片標題、導言段落 |
| `{typography.title-sm}` | 16px | 500 | 1.4 | 0 | 裝備卡標題、清單標籤 |
| `{typography.body-md}` | 16px | 400 | 1.55 | 0 | 預設內文 — Inter |
| `{typography.body-sm}` | 14px | 400 | 1.55 | 0 | 次要說明、頁尾 |
| `{typography.caption}` | 13px | 500 | 1.4 | 0 | 徽章標籤、eyebrow、安全提示 |
| `{typography.caption-uppercase}` | 12px | 500 | 1.4 | 1.5px | 分類標記 |
| `{typography.readout}` | 14px | 600 | 1.6 | -0.02em | 資料讀數（UV 指數、時間戳記） |
| `{typography.button}` | 14px | 500 | 1.0 | 0 | 按鈕標籤 |
| `{typography.nav-label}` | 12px | 500 | 1.4 | 0 | 下排導覽標籤 |

### 繁體中文字體建議

| 角色 | 建議字體 | 為什麼合適 | 授權 |
|---|---|---|---|
| 中文標題／衛教標題 | **Noto Serif TC** | 編輯感、安靜，與襯線主導的視覺聲音相容 | Google Fonts；SIL OFL |
| 中文內文／介面 | **Noto Sans TC** | 小尺寸清晰、字符涵蓋廣，適合標籤與長閱讀 | Google Fonts；SIL OFL |
| 替代介面聲音 | **IBM Plex Sans TC** | 略偏技術與結構化；適合工具感更強的版本 | IBM Plex；SIL OFL |
| 衛教限定點綴 | **LXGW WenKai TC** | 更溫暖personal；只用於引言或反思型提示，不用於倒數或導覽 | GitHub；SIL OFL |
| CJK 等寬／倒數備援 | **Noto Sans Mono CJK TC** | 讓中文字在資料與等寬表面中保持對齊 | Noto；SIL OFL |

預設配對是 **Noto Serif TC ＋ Noto Sans TC**。IBM Plex Sans TC 是替代方向，不要與 Inter 同時載入。LXGW WenKai TC 只用於小段編輯時刻，個性太強不適合主要產品介面。

### 中文間距覆寫

元件內含繁體中文時套用以下覆寫，保留拉丁比例的同時給 CJK 字符足夠的垂直呼吸：

| 角色 | 尺寸 | CJK 行高 | 字距 | 備註 |
|---|---:|---:|---:|---|
| Display XL | 64px | 1.15 | -0.02em | 兩行標題使用 `text-wrap: balance` |
| Display LG | 48px | 1.18 | -0.015em | 標題控制在兩到三行 |
| Display MD | 36px | 1.22 | -0.01em | 頁面標題 |
| Display SM | 28px | 1.28 | 0 | 短中文標籤避免緊字距 |
| 卡片標題 | 18–22px | 1.45 | 0 | 字重 500；不用假粗體 |
| Body MD | 16px | 1.75 | 0.01em | 倒數說明與衛教內容的預設 |
| Body SM | 14px | 1.7 | 0.01em | 僅細則；重要指示不用這級 |
| 說明／標籤 | 12–13px | 1.5 | 0.01–0.02em | 標籤保持簡短、盡量一行 |
| 按鈕／導覽 | 14–16px | 1.3–1.45 | 0.01em | 行動端輸入框用 16px 避免 iOS 自動放大 |

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

標題尺寸使用字重 400（regular），永不加粗。負字距（拉丁 -0.3 到 -1.5px；中文覆寫 -0.02em 到 0）是必要的——襯線標題失去負字距就失去沉穩的編輯節奏。襯線字給產品一個文學性、經過思考的聲音；換成無襯線標題會讓體驗變得跟其他工具型 App 沒有差別。

內文段落維持字重 400，標籤與強調短語 500。無襯線內文是人文式的（Inter ＋ Noto Sans TC）——不是幾何式。Helvetica 或 Arial 過於中性，會破壞溫暖的編輯感。

### 替代字體註記

Cormorant Garamond 不可用時，**EB Garamond** 字重 500 加 -0.02em 字距是最接近的開源近似。繁體中文標題使用 **Noto Serif TC**。無襯線首選 **Inter ＋ Noto Sans TC**；**IBM Plex Sans TC** 是工具感更強的替代方向。任何替代字體都要維持相同的人文比例。

## 四、間距尺規（Spacing Scale）

- **基礎單位**：4px。
- **Token**：`{spacing.xxs}` 4px · `{spacing.xs}` 8px · `{spacing.sm}` 12px · `{spacing.md}` 16px · `{spacing.lg}` 20px · `{spacing.xl}` 24px · `{spacing.xxl}` 32px · `{spacing.section}` 40px。
- **區塊間距**：`{spacing.xl}`（24px）是頁面內主要區塊的預設間隔；`{spacing.section}`（40px）用於語意上分開的大段落。
- **卡片內距**：`{spacing.lg}`（20px）為預設；深色倒數面板與 bottom sheet 用 `{spacing.xl}`（24px）；狀態卡與清單項目用 `{spacing.md}`（16px）。
- **頁面左右留白**：行動端 16px、桌面 24px。

這是行動優先的產品，間距尺規刻意比行銷網站緊湊——沒有 96px 的區塊節奏，因為單一畫面要在不捲動的情況下顯示倒數、狀態與下一步。

## 五、元件規範（Components）

### 外殼

**`brand-header`** — 頁面頂部的品牌列，承載地平線太陽字標與「防曬晴報員」。背景 `{colors.canvas}`。不是導覽列——導覽在底部。

**`bottom-nav`** — 固定在底部的三項導覽：**提醒**、**裝備**、**更多**。高度 64px，背景 `{colors.canvas}`，未選取文字 `{colors.muted}`，選取態 `{colors.primary}`。標籤使用 `{typography.nav-label}`（12px / 500），圖示在上、文字在下。三項是固定的——不新增衛教專用入口，也不保留獨立「首頁」入口。

**`global-status-banner`** — 承載跨頁的系統狀態：「通知未開啟」「背景通知尚未完成」「目前離線」「背景通知已恢復」。背景 `{colors.surface-soft}`，圓角 `{rounded.md}`。這類狀態**永不阻擋**本機倒數與手動操作，因此樣式是提示而非警示——不使用 `{colors.error}` 底色。

### 頁面骨架

**`page-heading`** — 由三段組成：`eyebrow`（`{typography.caption}`，`{colors.muted}`）、`title`（`{typography.display-md}`，襯線）、`body`（`{typography.body-md}`，`{colors.body}`，`max-width: 38rem`）。eyebrow 與 body 都是選用的。

**`app-card`** — 通用內容卡。背景 `{colors.canvas}`，1px `{colors.hairline}` 邊框，圓角 `{rounded.lg}`，內距 20px。無陰影。

**`page-footer-meta`** — 頁尾的版本、隱私政策、使用條款與資料說明。純文字連結列，`{colors.muted-soft}`，`{typography.body-sm}`。**刻意不做成功能卡片**，避免與「更多」頁的入口卡競爭。

### 提醒（核心）

**`countdown-panel`** — 產品的核心。濃縮咖啡深色卡片（`{colors.surface-dark}`）承載倒數數值，數字使用 `{typography-cjk.countdown}`（64px / 600 / tabular-nums），文字 `{colors.on-dark}`。圓角 `{rounded.lg}`，內距 24px。這是整個 App 唯一的大型深色表面——它的視覺重量就是「這是最重要的東西」的訊號。

**`countdown-ring`** — 倒數進度環。進度筆觸 `{colors.accent-apricot}`，軌道 `{colors.surface-dark-elevated}`。即將到期時筆觸轉為 `{colors.status-soon}`，已到期轉為 `{colors.status-due}`——但顏色永遠搭配明確的文字標示（「即將到期」「該補擦了」），不單獨承擔資訊。

**`stat-figure`** — 資料讀數樣式。等寬字、`tabular-nums`、字重 600、負字距。用於倒數分鐘、UV 指數、時間戳記。`--display` 變體放大到 `clamp(3rem, 18vw, 4.75rem)` 供主倒數使用。

**`status-card`** ＋ 五種變體 — 用柔和底色傳達急迫程度，純色塊填滿、無左側色條、無陰影。圓角 `{rounded.lg}`，內距 16px。

| 變體 | 標籤色 | 語意 |
|---|---|---|
| `status-card-tracking` | `{colors.status-tracking}` | 追蹤中 |
| `status-card-soon` | `{colors.status-soon}` | 即將到期 |
| `status-card-due` | `{colors.status-due}` | 已到期 |
| `status-card-untimed` | `{colors.status-untimed}` | 未計時 |
| `status-card-saved` | `{colors.status-saved}` | 已儲存 |

底色統一用 `color-mix(in srgb, <狀態色> 12%, {colors.canvas})` 產生，確保五張卡的視覺重量一致。

**`zone-status-row`** — 部位狀態列。透明底、`{colors.hairline-soft}` 分隔線。每列包含部位名稱、狀態圖示與剩餘時間。**16 個追蹤部位使用文字標籤加狀態圖示，不畫部位插圖**。

### UV

**`uvi-badge`** ＋ 五種等級變體 — 藥丸形徽章，圓角 `{rounded.pill}`，內距 8px × 16px。底色用 `color-mix(in srgb, <風險色> 14%, {colors.canvas})`，文字用對應風險色。當地區已設定時，這是首屏唯一的飽和色時刻。

**`five-day-uv-card`** — 五日預報卡。5 欄網格，每欄含日期、UV 指數（`stat-figure`）與等級徽章。卡片邊框顏色依當日風險等級變化。底部附資料來源、更新時間與「這是地區預報，不是即時測站觀測」的說明。

### 裝備

**`gear-list-item`** — 裝備清單項目。背景 `{colors.surface-card}`，圓角 `{rounded.lg}`，內距 16px。承載品類圖示、裝備名稱（`{typography.title-sm}`）與摘要。點擊進入詳情頁。

**`badge-unverified`** — 標示資料尚未完整的防曬乳使用「標示尚未確認」徽章，背景 `{colors.surface-soft}`、文字 `{colors.muted}`。**這類產品仍列在「目前使用」**，不降級、不隱藏——只是明確標示不確定性。

### 更多

**`more-entry-card`** — 統一尺寸的入口卡。背景 `{colors.surface-card}`，圓角 `{rounded.lg}`，內距 20px。桌面 2 欄、手機 1 欄。**所有入口卡的尺寸、圖示位置、圓角與文字結構完全一致**，只用淡色分隔或小字提示做輕量分組。

排序固定為：通知設定 → 防曬衛教 → 本機資料與隱私 → 問題回報與意見回饋 → 安裝到主畫面 → 說明與關於。「通知設定」卡片顯示簡短狀態文字。

### 衛教

**`education-hero-card`** — 衛教首頁的「了解今天的 UV」大卡片，標示「先從這裡開始」。背景 `{colors.surface-cream-strong}`，標題 `{typography.display-sm}`（襯線），圓角 `{rounded.lg}`，內距 24px。這是六個分類中唯一放大的一張。

**`education-category-card`** — 其餘五個分類卡。背景 `{colors.surface-card}`，標題 `{typography.title-md}`，圓角 `{rounded.lg}`，內距 20px。分類文章列表使用兩欄卡片網格。

**`education-source-block`** — 文章底部的資料來源與審閱資訊。背景 `{colors.surface-soft}`，文字 `{colors.muted}`，`{typography.body-sm}`，圓角 `{rounded.md}`。**來源與審閱狀態不能藏在互動之後**——這是健康內容可查證性的基礎。

文章頁另包含麵包屑、可展開段落目錄、2 篇相關文章與回到分類的入口。PWA 內開啟時保留下排導覽與收藏操作；從搜尋或外部分享進入時使用獨立公開閱讀版面，不顯示收藏、Session、產品或位置等個人資料。

### 開始提醒流程

**`setup-step-shell`** — 兩步驟設定流程的外框（步驟 1 情境、步驟 2 塗抹時間與部位）。承載步驟指示、內容區與底部行動列。整個流程在同一個外框內完成，**不因產品標示、部位調整或通知設定跳離到平行頁面**。

**`context-option`** ／ **`context-option-selected`** — 情境選項。未選取：`{colors.canvas}` 底、`{colors.hairline}` 邊框。已選取：`{colors.surface-cream-strong}` 底、`{colors.primary}` 邊框。選取態同時有底色與邊框變化，不只靠顏色。

**`bottom-sheet`** — 需要在流程中調整細節時使用（如部位防護調整）。背景 `{colors.canvas}`，圓角 `{rounded.lg}`，內距 24px。用 sheet 而非新頁面，維持流程不中斷。

### 按鈕與表單

**`button-primary`** — 深杏桃主 CTA。背景 `{colors.primary}`，文字 `{colors.on-primary}`，內距 12px × 20px，最小高度 44px，圓角 `{rounded.md}`。按下時 `button-primary-active` 加深。**每頁只有一個主要 CTA**。

**`button-secondary`** — 描邊按鈕。透明底、`{colors.ink}` 邊框與文字。

**`button-quiet`** — 弱化描邊按鈕。透明底、`{colors.hairline}` 邊框。用於「再試一次」這類次要動作。

**`button-on-dark`** — 深色表面上的按鈕。背景 `{colors.surface-dark-elevated}`，文字 `{colors.on-dark}`。**系統永不在深色表面上反轉出淺色次要按鈕**。

**`text-link`** — 內文連結，`{colors.primary}`。按下時加底線。

**`text-input`** — 背景 `{colors.canvas}`，1px `{colors.hairline}` 邊框，圓角 `{rounded.md}`，內距 10px × 14px，最小高度 44px。行動端字級 16px 避免 iOS 自動放大。

**`text-input-focused`** — 邊框轉為 `{colors.primary}`，外加 3px 深杏桃 15% 透明度的焦點環。

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

| 層級 | 處理 | 用途 |
|---|---|---|
| 平面 | 無陰影、無邊框 | 頁面區塊、品牌列 |
| 細邊框 | 1px `{colors.hairline}` | 輸入框、`app-card`、五日預報卡 |
| 暖色卡片 | `{colors.surface-card}` 底、無陰影 | 裝備卡、更多頁入口卡、衛教分類卡 |
| 深色表面 | `{colors.surface-dark}` 底、無陰影 | 倒數面板 |
| 浮層 | 極淡陰影 | bottom sheet 與浮動元素（`0 1px 3px rgba(20,20,19,0.08)`，罕用）|

高度哲學是**色塊優先、陰影罕用**。深度主要來自象牙與濃縮咖啡的表面對比。

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

從 16 / 20 / 24 三個檔位選，不發明新數值。

### 不依賴顏色的區分方式

- **倒數／部位四狀態**用剩餘量計量表：追蹤中（三格）→ 即將到期（一格）→ 已到期（空）→ 未計時（空＋斜線）。格數承載意義，灰階與色盲情況下仍可區分。
- **斜線一律代表「停用／不適用」**。
- **UV 五級不畫圖示**——預報已同時顯示指數數字與中文等級，格數圖示是重複資訊。

### 圖示庫政策：只用自訂圖示

**不使用任何第三方圖示素材庫。** 所有圖示都來自 `docs/design/icon-system/` 的自訂系統，以 inline SVG 進入程式碼。理由是圖示的造型語言直接繼承 Logo 的實心圓點＋膠囊線條，素材庫的圖示無法承載這個品牌訊號，混用會讓介面看起來像拼裝的。

**現況**：`apps/web/src` 仍有 20 多個元件在 `import { ... } from "@lucide/vue"`，這是舊 demo 版的做法。這些引用要隨著自訂圖示逐步替換掉，全部替換完成後從 `apps/web/package.json` 移除 `@lucide/vue` 依賴。替換進度與尚未涵蓋的圖示需求見 `docs/design/icon-system/README.md` 的待補清單。

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

`README.md` 訂有「文件與程式碼衝突時以程式碼為準」的規則。本文件的色彩與字體是**目標方向**，尚未套用到程式碼，因此以下落差是已知且刻意的：

| 項目 | 本文件（目標） | `packages/ui/src/styles.css`（現況） |
|---|---|---|
| 底色 | `#FAF5EC` 暖象牙 | `#f9f9f9` 中性灰白 |
| 主文字 | `#2E2925` 深咖 | `#121212` 近黑 |
| 行動色 | `#9F5E42` 深杏桃 | 無 primary token，`.button--primary` 借用 `--color-tracking` 藍 |
| 標題字體 | Cormorant Garamond ＋ Noto Serif TC | 無 serif token |
| 內文字體 | Inter ＋ Noto Sans TC | `--font-sans` 首位是 Helvetica Neue |
| 圓角 | 4 / 8 / 14 / 20 / pill | 8 / 14 / 20 / pill（無 xs） |

**已對齊的部分**：UV 五級風險色、倒數五狀態語意色、內容最大寬度 752px、點擊目標 44px、間距基礎單位 4px、單一亮色主題、自訂圖示系統為唯一來源。

> **2026-08-22 更正**：「點擊目標 44px」先前寫成已對齊，但實際有三個元件用區域 CSS 覆寫把共用 `.button` 的 `min-height: var(--tap-target)` 壓成 `2.5rem`（40px）——`OutdoorContextCard`、`EveningUvPrompt`、`FiveDayUvCard`。三處皆已改為刪除該行、回歸共用 token（不是改寫成 44px，避免再寫死數值）。
>
> 教訓：`.button` 已經帶 `min-height: var(--tap-target)`，**元件的 scoped CSS 不要再自己寫 `min-height`**——scoped 樣式的 attribute selector 特異性高於共用類別，一定會蓋過去。要調整尺寸請改 padding 或 token，不要覆寫 min-height。

### 深色模式：不做（已從程式碼移除）

**本系統只有一套暖色亮色主題。** 理由是暖象牙 ＋ 濃縮咖啡的對比本身就是這個系統的層級機制——倒數面板之所以突出，是因為它是整頁唯一的深色表面。深色模式會讓這個對比失效，等於要重新設計一套層級語言。

2026-08-19 已移除舊 demo 版的深色模式實作，包含 `:root[data-theme]` 與 `prefers-color-scheme` token 組、`/settings/display` 路由與頁面、`AppearanceSettings` 元件、`useAppearance` composable、`createAppearanceController`、`toggleThemeWithReveal` helper，以及 `UserPreferencesV1Schema` 的 `appearance` 欄位（含 Supabase 同步驗證）。schema 版本維持 `user-preferences-v1`——Zod 預設 strip 未知欄位，舊資料含 `appearance` 也能正常解析，不需要遷移。

**套用順序建議**：色彩 token 先行（影響最大、風險最低），字體其次（需先解決 web font 載入與 CJK 備援測試），元件層 token 最後。

## 十一、Do's and Don'ts

### Do

- 每一頁都錨定在暖象牙底色上。純白讀起來像通用工具軟體，暖色調是這個系統的差異點。
- 所有標題使用襯線字。負字距不可省略。
- 把 `{colors.primary}` 留給主 CTA。每個決策情境只有一個。
- 倒數面板用濃縮咖啡深色表面。它的視覺重量就是「這是最重要的東西」的訊號。
- 狀態同時用色彩、圖示與文字表達。
- 風險與狀態色搭配數值與中文標示一起出現。
- 藕紫只用於已完成、安心的狀態。
- 每頁只有一個最主要任務。

### Don't

- 不要用冷灰或純白當底色。
- 不要把襯線標題加粗。字重 400 是規則。
- 不要用鮮黃或飽和紅當品牌主色。深杏桃是行動色，高強度顏色留給風險狀態。
- 不要把深杏桃到處塗。
- 不要用無襯線字當標題。
- 不要單靠顏色傳達狀態。
- 不要用綠色暗示安全或防護完成。
- 不要在提醒頁以外的頁面顯示迷你倒數或 Session 狀態——那會產生第二個提醒頁。
- 不要記錄 hover 狀態。系統只定義預設與按下／選取狀態。

## 十二、響應式行為

### 斷點

| 名稱 | 寬度 | 主要變化 |
|---|---|---|
| 行動 | < 768px | 單欄；更多頁卡片 1 欄；左右留白 16px；倒數數字 ≥ 40px |
| 平板 | 768–1024px | 更多頁卡片 2 欄；衛教文章列表 2 欄；左右留白 24px |
| 桌面 | > 1024px | 內容維持 752px 置中；左右留白由容器吸收 |

這是行動優先的 PWA。桌面版不是另一套版面，只是同一套版面在更寬的視窗中置中。

### 觸控目標

- 所有按鈕、輸入框與可點擊清單項目最小 44 × 44px（`{layout.tap-target}`）。
- 下排導覽三項各佔 1/3 寬，高度 64px。
- 裝備卡與更多頁入口卡整張可點擊。

### 動畫

- **只用 `opacity`，不用位移或縮放。**
- `page-stack` 的直接子區塊依序淡入（每項延遲 0.08s，上限 0.4s），使用 `fill-mode: backwards` 避免內容先閃現。
- 轉場時間 `160ms`（快）／ `240ms`（基本），緩動 `cubic-bezier(0.22, 1, 0.36, 1)`。
- 完整支援 `prefers-reduced-motion: reduce`——該設定開啟時所有動畫直接關閉。

## 十三、規格盲點（Gaps）

以下項目尚未定義或無法驗證，**實作時不要自行填補，先確認**：

1. **Lucide 尚未從程式碼移除。** 政策已定（只用自訂圖示），但 20 多個元件仍在 import `@lucide/vue`。需要盤點這些引用實際用到哪些圖示，對照自訂系統目前的 40 個涵蓋範圍，補齊缺口後才能整批替換。
2. **焦點環未系統化。** 只有 `text-input-focused` 有定義。程式碼有 `--focus-ring` token，但按鈕、連結、卡片的鍵盤焦點樣式未在此文件規範。可及性要求焦點環，這是缺口。
3. **停用狀態只定義了主按鈕。** 次要按鈕、輸入框、清單項目的停用樣式未定義。
4. **錯誤與驗證狀態未展開。** 表單驗證錯誤的視覺（欄位邊框、訊息位置、圖示）需要一個實際的表單流程才能確認。
5. **地平線太陽字標未形式化為 token。** 它目前是 inline SVG 資產，尚未納入系統 token。
6. **衛教七部位示意尚未設計。** 規格 4.6 有提到，圖示系統中列為待補。
7. **工具型圖示尚未設計**：返回、關閉、展開收合、新增、編輯、刪除、分享、搜尋、收藏、重新整理。這批是替換 Lucide 的前置條件。
8. **分享圖版面未定義。** 裝備分享圖的內容規則已確認（見第九節），但版面、尺寸與品牌標示位置未定。
9. **`/reminder/reapply` 的最終顯示形式未定**，Sitemap 文件標註仍需在 wireframe 階段確認。
10. **`packages/ui/src/index.ts` 的 `SUNSHIELD_THEME = "studio-mono"` 是死碼**，沒有任何地方引用，且名稱屬於已淘汰的視覺方向。導入新色盤時一併清掉或改成新的主題識別。

## 十四、迭代指引

1. 一次專注一個元件。引用它的 YAML key（`{component.countdown-panel}`、`{component.status-card-due}`）。
2. 元件變體（`-active`、`-disabled`、`-selected`、`-focused`）在 `components:` 中各佔一個獨立條目。
3. 到處使用 `{token.refs}`，不寫死 hex。
4. 不記錄 hover。只定義預設與 Active／Pressed／Selected 狀態。
5. 標題維持襯線 400 加負字距，內文維持 Inter 400。這個分工不可打破。
6. 暖象牙 ＋ 深杏桃 ＋ 濃縮咖啡是品牌三元組。藕紫保留給安心狀態；UV 風險色維持標準化與資訊性。
7. 拿不定強調程度時：先放大襯線字，而不是加粗。
8. **修改此文件時，同步檢查第十節「與程式碼的落差」是否仍然準確。**

## 參考文件

| 文件 | 內容 |
|---|---|
| [`docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md`](docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md) | 現行 Sitemap、User Flow、頁面任務與產品結構的唯一基準 |
| [`docs/design/current-direction.md`](docs/design/current-direction.md) | 已確認的視覺方向與品牌角色 |
| [`docs/design/icon-system/README.md`](docs/design/icon-system/README.md) | 圖示系統完整規格與取捨紀錄 |
| [`packages/ui/src/styles.css`](packages/ui/src/styles.css) | 設計 token 的程式碼真實來源 |
| [`apps/web/src/assets/app.css`](apps/web/src/assets/app.css) | 共用類別的程式碼真實來源 |
| [`docs/education/public-seo-implementation.md`](docs/education/public-seo-implementation.md) | 公開衛教頁的發布閘門與結構化資料規則 |
