# 字型管線

**日期**：2026-08-23（Asia/Taipei，**同日稍晚更新**：標題字體由 Cormorant Garamond ＋ Noto Serif TC 換成霞鶩文楷 TC）
**用途**：把完整字型裁成專案實際會渲染的字元，自行托管
**權威性**：字型角色的設計規範在根目錄 `DESIGN.md` 第三節；這份文件記錄實作與取捨
**產物**：`apps/web/public/fonts/*.woff2`（會 commit）

## 重新產生

```bash
node tools/fonts/build-fonts.mjs
```

原始字型檔**不進 repo**（`.gitignore` 排除 `tools/fonts/source/`），因為完整 Noto Serif TC 就有 24MB、霞鶩文楷 TC 有 15MB。要重新產生得先下載到 `tools/fonts/source/`：

| 檔名 | 來源 | 授權 |
|---|---|---|
| `LXGWWenKaiTC-Regular.ttf` | [lxgw/LxgwWenkaiTC](https://github.com/lxgw/LxgwWenkaiTC) release → `LXGWWenKaiTC-Regular.ttf`（只取 Regular，Light／Medium 不需要——DESIGN.md 規定字重僅 400） | SIL OFL 1.1 |
| `NotoSerifTC-Regular.otf` | [notofonts/noto-cjk](https://github.com/notofonts/noto-cjk) → `Serif/OTF/TraditionalChinese/NotoSerifCJKtc-Regular.otf` | SIL OFL 1.1 |
| `Inter.ttf` | [google/fonts](https://github.com/google/fonts) → `ofl/inter/Inter[opsz,wght].ttf` | SIL OFL 1.1 |

## 目前的產出

| 檔案 | 大小 | 原檔 | 比例 |
|---|---|---|---|
| `lxgw-wenkai-tc-subset.woff2` | 311 KB | 15 MB | 2.1% |
| `noto-serif-tc-subset.woff2` | 649 KB | 24 MB | 2.7% |
| `inter-subset.woff2` | 73 KB | 856 KB | 8.5% |
| **合計** | **1,033 KB** | | |

**體積比 Cormorant 版本（748 KB）多了 285 KB，這是刻意的取捨，不是疏漏。** 霞鶩文楷 TC 單一字型就涵蓋中英文，本身已經不再需要「拉丁字體 ＋ 中文字體」兩件式配對；但 Noto Serif TC 現在保留純粹是**備援**角色——霞鶩文楷 TC 載入失敗時的自托管 CJK 備援，見下方「為什麼 webfont 是必要條件」。兩支字型都需要覆蓋同一組 948 個漢字，所以合計比單純的「主字體 ＋ 拉丁備援」組合重。如果之後想省這 649 KB，可以評估拿掉 Noto Serif TC、讓備援鏈直接落到系統襯線體——但要接受 Windows 上會退回新細明體的畫質風險。

## 三個取捨，都是刻意的

### 一、自行托管，不用 Google Fonts CDN

CDN 只要兩行 `<link>` 就好，但每個使用者每次開頁都會把 IP 送給 Google。這個產品免登入、本機優先，`/region` 甚至為了不外傳精確座標而在裝置端解析行政區界線（見 `README.md`「地區設定與定位隱私」）。為了省事把使用者 IP 送給第三方，跟這個定位互相矛盾。

自行托管也順帶讓字型能離線使用。

### 二、襯線體只收標題用字，不收文章內文

衛教內容檔有 1,056 個漢字，但那大多是**文章內文**——而內文是無襯線體，不需要襯線字型覆蓋。所以 `build-fonts.mjs` 對 `education-content.generated.ts` 特別處理，只取 `"title"` 欄位。

襯線體 subset 因此從 1,228 字降到 928 字，檔案從 827 KB 降到 635 KB。

這樣裁是安全的，因為**標題只渲染固定字串**：UI 標籤與文章標題。使用者輸入（裝備名稱、備註）只出現在內文的 `<strong>` 與 `<p>`，不會進 `h1`／`h2`／`h3`。

### 三、中文內文用系統黑體，不載入 Noto Sans TC

這與 `DESIGN.md` 第三節「內文用 Noto Sans TC」有出入。理由是內文會渲染**使用者輸入**：

- subset 會缺字。使用者取的裝備名稱可能有任何漢字，缺字就會 fallback，變成一句話裡兩種字體。
- 完整 CJK 字型是好幾 MB，對本機優先的 PWA 不可接受。

PingFang TC（Apple）與微軟正黑（Windows）在台灣裝置上品質都夠好，而且零下載。等哪天有動態 subset 或字型串流的方案，再重新評估。

## 為什麼 webfont 是必要條件，不是加分項

Windows 系統只有 `mingliu.ttc`（新細明體）、`kaiu.ttf`（標楷體）、`simsun.ttc`（SimSun），**沒有霞鶩文楷 TC**，也沒有 Noto Serif CJK。CSS 的泛用 `serif` 關鍵字在 Windows 上會解析到新細明體，那是為 12px 點陣顯示設計的字，放到 `DESIGN.md` 要求的 28–64px 標題會很糟。

也就是說：只加 `--font-serif` token 而不載入 webfont，在 Windows 上會讓標題變得比原本的黑體**更難看**。所以這兩件事必須一起做，不要為了省流量把 webfont 拿掉。

## 為什麼標題不能加粗

`DESIGN.md` 第十一節「不要把標題加粗，字重 400 是規則」不只是風格偏好。霞鶩文楷 TC 完全沒有 bold 字重（來源 repo 只提供 Light／Regular／Medium，DESIGN.md 只採用 Regular），元件若寫 `font-weight: 600`，瀏覽器會合成假粗（faux bold）——把筆畫無差別加厚，中文字會糊掉。

2026-08-23（首次套用 Cormorant 版本時）已移除 31 個檔案裡的 36 條標題字重覆寫，換字體不影響這項清理的有效性。要強調請放大字級，不要加粗。

例外：`SessionEndControl` 的 `.session-end__confirm-title` 是 `<p>` 而不是標題元素（對話框標題靠 `aria-labelledby` 關聯），不吃 `h1/h2/h3` 的襯線體規則，字重保留。
