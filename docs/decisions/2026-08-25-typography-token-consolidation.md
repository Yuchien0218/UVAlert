# 字級 token 收斂（第二輪）

**日期**：2026-08-25（Asia/Taipei）
**狀態**：已完成
**裁決**：`--font-size-body` 從 0.875rem（14px）改為 1rem（16px），配合 `DESIGN.md` 第三節 body-md 的 16px 目標；另收斂 6 處散落的字級魔術數字。
**影響範圍**：`packages/ui/src/styles.css`、`apps/web/src/assets/app.css`，以及套用 `--font-size-body` 的全站頁面（內文變大 2px）。

## 背景

盤點全站 `font-size` 用法時發現兩層問題：

1. 17 處直接寫死數字、沒套用 `styles.css` 既有的 8 個 `--font-size-*` token。
2. `DESIGN.md` 第三節定義的字級階層是 14 級編輯量表（`display-xl`…`nav-label`），跟程式碼實際的 8 個 token 命名對不上，其中 `body-md` 文件寫 16px，程式碼的 `--font-size-body` 卻是 14px（實際套用的是文件定義的 `body-sm`「次要說明」那一級）——全站主要內文因此比文件規格小一號。第十節「與程式碼的落差」沒有記錄到這個落差。

使用者確認方向：**改程式碼配合文件**（14px → 16px），且針對散落數字直接拍板收斂,不用逐項再確認。

## 套用的變更

| 位置                                                              | 變更前                                           | 變更後                                                          | 理由                                                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `styles.css` `--font-size-body`                                   | 0.875rem                                         | 1rem                                                            | 配合 DESIGN.md body-md 16px 目標                                                                                            |
| `app.css` `.stat-figure--display`                                 | `clamp(3rem,18vw,4.75rem)`（沒有元件在用的死碼） | `clamp(3rem,15vw,3.75rem)`                                      | 採用 `HomeCountdown`／`HomeUvHeadline` 逐字重複的實際值，兩元件改套用這個 class 而非各自覆寫                                |
| `HomeCountdown.vue` `.countdown__unit`                            | `1rem`（魔術數字）                               | `var(--font-size-body)`                                         | body 調整後數值相同，零視覺變化，去除魔術數字                                                                               |
| `HomeUvHeadline.vue` `.uv-headline__level`／`.uv-headline__empty` | `1.25rem`（魔術數字）                            | `var(--font-size-title)`                                        | 與既有 token 數值完全相同，零視覺變化                                                                                       |
| `GearListItem.vue` `.gear-item__name`                             | `1.0625rem`                                      | `var(--font-size-title-sm)`                                     | 落在 `styles.css` 2026-08-24 註解已標記、尚未掃完的「1.05–1.2rem 卡片標題」群集內                                           |
| `RegionPreferenceSummary.vue` `.region-summary__value`            | `1.2rem`                                         | `var(--font-size-title-sm)`                                     | 同上                                                                                                                        |
| `ZoneProtectionForm.vue` `.preset-card__title`                    | 固定 `1.5rem`                                    | `clamp(1.5rem,7vw,2.35rem)` ＋ `var(--letter-spacing-headline)` | 該卡是單一推薦（`v-if`，非清單重複項），跟 `SetupPage.vue` `.recovery-card h2` 同屬「單一句子大標題」角色，改用同一套 clamp |
| `EducationArticlePage.vue` `.education-article-summary`           | `1rem`                                           | `var(--font-size-body)`                                         | body 調整後數值相同                                                                                                         |
| `EducationArticlePage.vue` `:deep(h2)`                            | `1.25rem`                                        | `var(--font-size-title)`                                        | 與既有 token 數值完全相同                                                                                                   |

## 刻意不動的部分

- `FiveDayUvCard.vue` 窄螢幕 media query 內的 `0.7rem`／`0.65rem`（桌面版對應 `--font-size-label`／`--font-size-caption`）：屬於刻意的手機版縮小覆寫，非「沒有依附角色」的問題，維持原樣。
- `EducationArticlePage.vue` 的 `0.9em`（`code`）、`0.9rem`（`table`）：相對於當下情境縮小的排版慣例，不是重複的獨立角色，不併入 token。
- `DESIGN.md` 14 級量表與程式碼 8 個 token 的命名落差本身：這次只處理 `body-md` 一項的數值落差，其餘（`title-sm`／`title`／`title-md` 等）跟文件命名／數值的對應關係未逐一校準，需要時再另開範圍處理。

## 驗證

- `pnpm check`（typecheck + 全部 78 個測試檔、466 筆測試）全數通過。
- 未執行瀏覽器視覺驗證——本機沒有可用的 preview 工具，且直接用 Bash 起 dev server 有跟其他 session 搶 port 5173 的風險（見 `CLAUDE.md` session 衛生一節），這次改動又牽涉全站絕大多數頁面。**建議下一個有 preview 工具可用的 session 或人工檢查以下頁面**：首頁（倒數／UV headline 兩種狀態）、裝備清單、地區設定摘要、單頁設定流程（`/setup` 推薦卡）、衛教文章頁——確認 16px 內文沒有造成預期外的換行或版面擠壓。
