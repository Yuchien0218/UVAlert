# 硬寫樣式第二輪盤點：字型／圓角／間距／版面

**日期**：2026-08-25（Asia/Taipei）
**狀態**：已完成
**用途**：接續同日稍早四輪盤點（[[2026-08-25-typography-token-consolidation]]、[[2026-08-25-line-height-consolidation]]、[[2026-08-25-text-color-token-gap]]、[[2026-08-25-hardcoded-style-final-sweep]]），那四輪涵蓋字級／行高／文字顏色，這輪補查**字型（font-family）、圓角（border-radius）、間距（padding/margin/gap）魔術數字、以及版面收斂有沒有漏網之魚**。同時驗證同日稍早「手刻頁面共用元件抽取」（`docs/superpowers/plans/2026-08-25-shared-component-extraction.md`）新增的 5 個共用元件沒有引入新的硬寫值。
**相關文件**：上述四份姊妹文件、`docs/superpowers/plans/2026-08-25-shared-component-extraction.md`

## 結果

**字型**：乾淨，沒有發現問題。全站 `font-family:` 只有 3 處，全部套 `var(--font-mono)`，沒有元件自己寫死字型名稱。

**顏色**：沒有新發現。`BrandHeader.vue` 的 `#33291F`／`#C1832E` 維持 final-sweep 文件的既有結論（圖示系統獨立範圍，刻意保留）。逐一讀過同日新增的 5 個共用元件（`AppNotice.vue`、`ConfirmAction.vue`、`EmptyStateCard.vue`、`QuickTimePicker.vue`、`ZoneSelectorGrid.vue`），沒有引入硬寫色碼。

**圓角**：找到 2 類問題，都已修正：

1. `GearFormSheet.vue`、`ProtectionAdjustmentSheet.vue` 逐字重複 `border-radius: 1.5rem 1.5rem 0 0`（bottom sheet 頂角），沒有對應 token（`--radius-lg` 只到 1.25rem）。使用者確認新增 `--radius-sheet: 1.5rem`，兩檔改用 `var(--radius-sheet)`。
2. `GearForm.vue`、`GearListItem.vue`、`ZoneSelectorGrid.vue` 都寫 `var(--radius-pill, 999px)`——`--radius-pill` 全域一定有定義，這個 fallback 沒有意義，屬於跟 `--color-body-strong` fallback（見 text-color-token-gap 文件）同一種問題。三處改成 `var(--radius-pill)`，純清理，數值不變。

**間距**：找到並修正 4 類問題：

1. `EducationArticlePage.vue` 的 `padding-left: 1.5rem` → `var(--space-6)`（數值相同，純套 token）。
2. `HomeUvHeadline.vue` 的 `padding-bottom: 0.25rem` → `var(--space-1)`（數值相同）。
3. `.education-card-status`（衛教分類／文章卡片的「已發布」「審閱中」徽章）在 `EducationIndexPage.vue` 與 `EducationCategoryPage.vue` 逐字重複，連「跟 kicker 共用 color/font-size」的切法都一模一樣——收斂成 `app.css` 共用類別。
4. `InstallPage.vue`、`ReapplyPage.vue`、`ReapplicationReview.vue` 三處清單縮排 `padding-inline-start: 1.3rem`，跟同日新建的 `ConfirmAction.vue` 用 `var(--space-5)`（1.25rem）做同一件事，只差 0.05rem。使用者確認統一成 `var(--space-5)`，三處改動。

**刻意不動**：`HomeCountdown.vue` 的 `0.375rem`、`EducationArticlePage.vue` 行內 `code` 的 `0.1rem/0.3rem`——低於最小 token 級距（`--space-1`=0.25rem），信心不足以判斷是疏漏還是刻意的細緻微調，這次不動。`ContextSelector.vue` 局部重覆宣告的 focus outline（跟全域規則數值相同）判斷為無害死碼，不影響畫面，不在這次範圍內處理。

## 版面收斂：漏網之魚

`ProductsPage.vue`（`loadFailed`）與 `DataSettingsPage.vue`（`localData.error.value === 'load_failed'`）各有一個「讀取失敗」錯誤卡（標題＋說明＋`role="alert"`），結構跟同日剛建的 `EmptyStateCard` 幾乎一樣，只是原本沒套 `.empty-state` class、也沒有 actions slot，所以那次共用元件重構沒抓到。使用者確認語意上跟「空狀態」同屬「標題＋說明」的卡片，併入 `EmptyStateCard`（`role="alert"`）。

重新 grep 過 `notice--ok`／`confirm-note`／`zone-grid`／`zone-chip`／`empty-state` 這幾類已收斂的模式，確認除了上述兩處之外沒有其他頁面還在手刻。

## 套用的變更

| 位置                                                            | 變更前                                                    | 變更後                                                       |
| --------------------------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/ui/src/styles.css`                                    | 無 `--radius-sheet`                                       | 新增 `--radius-sheet: 1.5rem`                                |
| `GearFormSheet.vue`／`ProtectionAdjustmentSheet.vue`            | `border-radius: 1.5rem 1.5rem 0 0`                        | `border-radius: var(--radius-sheet) var(--radius-sheet) 0 0` |
| `GearForm.vue`／`GearListItem.vue`／`ZoneSelectorGrid.vue`      | `var(--radius-pill, 999px)`                               | `var(--radius-pill)`                                         |
| `EducationArticlePage.vue`                                      | `padding-left: 1.5rem`                                    | `padding-left: var(--space-6)`                               |
| `HomeUvHeadline.vue`                                            | `padding-bottom: 0.25rem`                                 | `padding-bottom: var(--space-1)`                             |
| `EducationIndexPage.vue`／`EducationCategoryPage.vue`           | 各自 scoped 定義 `.education-card-status`                 | 刪除，改用 `app.css` 新增的共用 `.education-card-status`     |
| `InstallPage.vue`／`ReapplyPage.vue`／`ReapplicationReview.vue` | `padding-inline-start: 1.3rem`                            | `padding-inline-start: var(--space-5)`                       |
| `ProductsPage.vue`／`DataSettingsPage.vue`                      | 手刻 `<section class="app-card" role="alert">` 讀取失敗卡 | 改用 `<EmptyStateCard role="alert">`                         |

## 順便發現、這次沒處理的事

`DataSettingsPage.vue` 的 loading 狀態仍是手寫 `<p role="status">正在讀取本機資料概況…</p>`，沒有採用同日 Task 3 已經導入的 `SunLoader`（Task 3 當時只涵蓋 `EventCorrectionPage`、`ReportContextEventPage`、`ProductDetailPage`、`ProductsPage`，沒有把 `DataSettingsPage` 納入範圍）。這不是硬寫樣式問題，是共用元件採用範圍的遺漏，留給下次處理 `SunLoader` 採用範圍時一併納入。

## 驗證

`pnpm --filter @sunshield/web typecheck` 與全專案 `pnpm vitest run`（83 個測試檔、485 筆測試）在每一批變更後都跑過，全數通過。**未經瀏覽器視覺驗證**，理由同稍早幾份文件——本機沒有可用的 preview 工具。這次改動裡唯一可能有感知得到的視覺差異是：`ProductsPage.vue`／`DataSettingsPage.vue` 的讀取失敗卡從手刻 `<section class="app-card">`（沒有 `justify-items: start`）換成 `EmptyStateCard`（有 `justify-items: start`），理論上文字區塊視覺不變（block 元素本來就滿版），但建議下次有瀏覽器可用時順手看一眼。

## 第二輪：動畫／轉場稽核（同日追加）

第一輪只查了字型／圓角／間距／版面，接著補查動畫／轉場、z-index、響應式斷點，同樣是「有沒有硬寫魔術數字、跟現有 token 系統對不上」這個問題形狀。

**發現並修正**：

1. `HomeCountdown.vue` 的倒數條轉場：`transition: width var(--motion-base, 240ms) cubic-bezier(0.22, 1, 0.36, 1);`——`--motion-base` 這個 token **從未定義過**，永遠 fallback 到寫死的 `240ms`；後面的 cubic-bezier 也是寫死，但數值剛好等於已存在的 `--ease-out`。改成 `transition: width var(--duration-base) var(--ease-out);`，**數值完全不變**，純粹去除幽靈 token 與魔術數字。
2. `GearFormSheet.vue`、`ProtectionAdjustmentSheet.vue` 的 sheet 開關淡入淡出：兩檔逐字重複 `transition: opacity 180ms ease;`，不對應 `--duration-fast`（160ms）／`--duration-base`（240ms）任何一個，`ease` 也不是全站其他 10 處轉場在用的 `--ease-out`。使用者確認改成 `--duration-fast`＋`--ease-out`——**這是唯一有實際數值變化的改動**（180ms→160ms，差 20ms，肉眼不易察覺）。

**發現但這次不動、留給你判斷的**：

- **z-index 沒有分層 token**：`BottomNavigation.vue`（20）、`GearFormSheet.vue`／`ProtectionAdjustmentSheet.vue`／`SessionEndControl.vue`（都是 100）。目前彼此不衝突，但沒有 scale，之後加新浮層元件容易隨手撞值。
- **響應式斷點跟 DESIGN.md 對不上**：文件第十二節只定義 768px／1024px，程式碼裡另外有 `36rem`（576px）、`42rem`（672px）兩個沒被記錄的斷點，散落在 `EventCorrectionPage`、`ReapplyPage`、`ReportContextEventPage`、`app.css`。這是文件規格沒跟上實作，不是「硬寫」問題，需要先確認這兩個斷點是刻意的中間尺寸調整還是該併入既有兩級。
- **DESIGN.md 第十三節「焦點環未系統化」這句話已經跟現況不符**：`styles.css` 全域早就有 `button/a/input/select/textarea:focus-visible` 統一規則，文件沒跟上。建議之後回寫文件時一併更正。

## 驗證（第二輪）

`pnpm --filter @sunshield/web typecheck` 與全專案 `pnpm vitest run`（83 檔／485 測試）通過。**未經瀏覽器視覺驗證**——sheet 轉場從 180ms 縮到 160ms 是這次唯一真的改變數值的地方，建議下次有瀏覽器可用時順手感受一下開關 sheet 的手感。

## 第三輪：z-index token 化與斷點文件回寫（同日追加）

使用者確認繼續處理第二輪列為「留給你判斷」的兩項。

**z-index token 化**：4 處硬寫數字分兩層——`BottomNavigation.vue`（20，常駐導覽列）與三個全螢幕浮層 `GearFormSheet.vue`／`ProtectionAdjustmentSheet.vue`／`SessionEndControl.vue`（都是 100）。新增 `--z-nav: 20`／`--z-overlay: 100` 兩個 token，4 個檔案改用 token，**數值完全不變**。

過程中順手發現並收斂了另一組重複：`.submit-actions`（送出／取消按鈕列，含同一個 36rem 斷點）在 `EventCorrectionPage.vue`、`ReportContextEventPage.vue`、`ReapplyPage.vue` 三個檔案逐字重複，收斂進 `app.css` 共用類別。

**抓到一個測試耦合問題**：`BottomNavigation.test.ts` 用 `/z-index:\s*\d+/` 檢查有沒有設定 z-index，只接受純數字，換成 `var(--z-nav)` 後直接判定失敗。這不是行為改變，是測試斷言寫得比實際需要嚴格（它真正該驗證的是「有沒有設定 z-index 讓導覽列蓋在內容上」，不是「z-index 是不是字面數字」）。改成 `/z-index:\s*(\d+|var\(--[\w-]+\))/`，同時接受兩種寫法。

**斷點文件回寫**：使用者確認 36rem（576px）／42rem（672px）是刻意的元件層級內容驅動斷點（按鈕列夠不夠寬並排、選項格幾欄），跟頁面層級的 768px／1024px 不同性質，不需要合併或改值。`DESIGN.md` 第十二節新增「元件層級斷點」小節記錄這兩個值與出現位置。

## 驗證（第三輪）

`pnpm check`（typecheck + 全部 83 個測試檔、485 筆測試，含修正後的 `BottomNavigation.test.ts`）全數通過。這輪的程式碼改動全部是數值不變的 token 化與重複收斂，唯一的文字變化是 `DESIGN.md` 新增說明段落，無需視覺驗證。

## 第四輪：`.button--quiet` 補上 disabled 樣式（同日追加）

`app.css` 只定義了 `.button--primary:disabled`／`.button--primary[aria-disabled="true"]`，`.button--quiet` 完全沒有 disabled 樣式——停用時看起來跟平常一樣可以點。這不只是美觀落差：`ReapplyPage.vue`、`AccountDataPage.vue`、`SyncSettingsPage.vue`，以及當天稍早新建的 `ConfirmAction.vue`，都有 `.button--quiet` 搭配 `:disabled`。`DESIGN.md` 第十三節規格盲點第 3 點原本就寫著「次要按鈕...停用樣式未定義」，這次找到具體會影響使用者的案例。

沒有發明新數值：`GearForm.vue` 的 `.category-option--disabled` 與 `SetupStepShell.vue` 的 `.icon-button:disabled` 已經在用 `opacity: 0.55` + `cursor: not-allowed` 表示停用態，這次直接沿用同一組數值，新增 `.button--quiet:disabled, .button--quiet[aria-disabled="true"]` 規則。`DESIGN.md` 第十三節第 3 點同步更新，註記次要按鈕已補上。

## 驗證（第四輪）

`pnpm check`（typecheck + 83 檔／485 測試）全數通過。這是這輪唯一有實際視覺變化的修正——4 個檔案裡本來看不出差異的停用按鈕，現在會變淡、游標變成 not-allowed。

## 第五輪：`SUNSHIELD_THEME` 死碼清除（同日追加）

`packages/ui/src/index.ts` 的 `export const SUNSHIELD_THEME = "studio-mono"` 是 `DESIGN.md` 第十三節自己標記過的死碼。確認全 repo（包含 `.ts`／`.vue`）沒有任何地方 import `@sunshield/ui`（不含 `/styles.css` 子路徑）後移除，`index.ts` 改成 `export {};`——`package.json` 的 `"."` export 仍指向這個檔案，保留檔案本身只清空內容，不動套件結構。`DESIGN.md` 第十三節該項標記為已清除。

## 收尾：沒有做的事

這次沒有做瀏覽器視覺驗證——環境裡沒有 CLAUDE.md 提到的 preview 工具，`webapp-testing`（Playwright）雖然可行但需要用 Bash 啟動 dev server，跟「不要用 Bash 直接跑 vite」的指示衝突，使用者確認先不處理，留給下一個有 preview 工具可用的 session。

## 最終驗證

`pnpm check`（typecheck + 全部 83 個測試檔、485 筆測試）全數通過。五輪累計動了 packages/ui、apps/web 共約 25 個檔案 + DESIGN.md，全部是 token 化、重複收斂或補齊既有慣例，只有兩處真的改變數值（sheet 轉場 180ms→160ms、`.button--quiet:disabled` 從無樣式變成 0.55 透明度）。
