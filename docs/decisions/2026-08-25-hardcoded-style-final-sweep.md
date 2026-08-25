# 寫死字級／字距／顏色最終盤點

**日期**：2026-08-25（Asia/Taipei）
**狀態**：已完成
**用途**：接續同日的字級收斂與文字顏色重新分類，做一次收尾盤點——確認還有沒有寫死的 `font-size`、`letter-spacing`、顏色（hex／rgb／hsl，不限文字，含背景與遮罩）。
**相關文件**：[[2026-08-25-typography-token-consolidation.md]]、[[2026-08-25-text-color-token-gap.md]]

## 結果

**字級**：全站掃過一輪，沒有新發現。剩下的寫死數字全部是前兩份文件已經記錄、刻意保留的：`.stat-figure--display`／`.preset-card__title`／`.recovery-card h2` 的 clamp（headline 群組共用同一組值）、`FiveDayUvCard` 窄螢幕的響應式縮小、`.stat-figure--inline`（1.05em，相對倍率不是等級）、`EducationArticlePage` 的 `code`／`table`（0.9em／0.9rem，排版慣例的相對縮小，不是獨立角色）。

**字距**：**很乾淨**。全站只有一處真的寫死數字——`packages/ui/src/styles.css` 全域 `h1, h2, h3 { letter-spacing: -0.01em; }`，這本來就是唯一、集中定義的規則，不是散落重複，不需要改。

**顏色**：找到兩類。

1. **`rgb(0 0 0 / 42%)` 遮罩色，3 個檔案逐字重複**（`GearFormSheet.vue`、`ProtectionAdjustmentSheet.vue`、`SessionEndControl.vue`）——跟今天稍早修過的好幾個「重複魔術數字」同一種問題，已收斂成 `packages/ui/src/styles.css` 的 `--overlay-backdrop`，三個檔案改用這個 token。**視覺零變化**。
2. **`BrandHeader.vue` 的 Logo SVG 寫死 `#33291F`／`#C1832E`**（4 處）——**刻意不動**。這是圖示／Logo 專屬色系（DESIGN.md 第八節，墨咖＋琥珀金，跟介面配色是不同範圍，見專案記憶 `uvalert-design-system-authority`），元件裡的註解已經寫明「寫死在路徑上、不用 currentColor」是設計決定，且只出現在這一個檔案（沒有跨檔案重複），不符合這次「重複值收斂」的問題形狀。若之後想幫它建 token（例如 `--icon-ink`／`--icon-amber`），是獨立的、範圍更大的圖示系統決定，不在這次盤點內。

## 套用的變更

| 位置 | 變更 |
|---|---|
| `packages/ui/src/styles.css` | 新增 `--overlay-backdrop: rgb(0 0 0 / 42%)` |
| `GearFormSheet.vue`／`ProtectionAdjustmentSheet.vue`／`SessionEndControl.vue` | `rgb(0 0 0 / 42%)` → `var(--overlay-backdrop)` |

## 驗證

`pnpm check`（typecheck + 78 個測試檔、466 筆測試）全數通過。這次唯一的程式碼改動是值完全相同的 token 替換，不需要額外視覺驗證。

## 累計現況（2026-08-25 三份文件合計）

字級、字距、文字顏色、遮罩色四個維度都已經盤點過一輪。仍然刻意留著、需要之後判斷的：`--text-tertiary` 未啟用（色票對比度過不了 AA，見 text-color-token-gap 文件）、既有約 89 處 `--text-secondary` 與 31 處 `--text-primary` 未逐一重新分類、`DESIGN.md` 14 級字級量表跟程式碼 8 個 token 的命名對應（僅校準了 body-md 一項）。這些都不是遺漏，是留白的後續工作，清單見上述兩份姊妹文件。
