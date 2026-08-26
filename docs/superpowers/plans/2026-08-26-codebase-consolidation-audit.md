# 程式碼收斂與秩序化：盤點清單

> **For agentic workers:** 這是一份**盤點清單**，不是單一線性計畫。每個 Task 彼此獨立，可以分多個 session、依優先序挑著做。動手前先讀 `Global Constraints` 與該 Task 的「驗證」欄。用 `superpowers:executing-plans` 逐項執行，做完把 `- [ ]` 改成 `- [x]` 並在項目後補上 commit / 結果。

**日期**：2026-08-26（Asia/Taipei）
**狀態**：盤點完成，尚未動工
**用途**：把 2026-08-25 五輪收斂之後仍散落的硬寫值、重複 UI，以及「沒有工具擋住重演」這個根因，整理成之後 session 可勾選的待辦
**範圍**：`apps/web`、`packages/ui`、根目錄工具設定、`DESIGN.md`。**不動** `packages/domain`／`packages/persistence-web`／`packages/platform` 的邏輯（那層工廠化良好、沒有這類問題）
**權威性**：本清單的「現況」欄是 2026-08-26 掃描結果，動工前請重新 grep 核對數量，可能已被其他 session 改動
**相關文件**：`docs/decisions/2026-08-25-typography-token-consolidation.md`、`2026-08-25-text-color-token-gap.md`、`2026-08-25-line-height-consolidation.md`、`2026-08-25-strong-line-height-fix.md`、`2026-08-25-hardcoded-style-final-sweep.md`、`2026-08-25-second-hardcode-sweep.md`、`docs/superpowers/plans/2026-08-25-shared-component-extraction.md`、`DESIGN.md` §5／§7／§10／§12／§13

---

## 根因（為什麼要做這份清單）

2026-08-25 的五輪收斂全部是**事後的、手動的考古**——先 grep 找散落值，再一個個收。收斂本身沒問題，問題是**沒有任何機制擋住它重新發生**：

1. **零 lint 工具**：沒有 ESLint／Prettier／Stylelint／oxlint／`.editorconfig`。
2. **零 CI／git hook**：`.git/hooks/` 只有 `.sample`，沒有 workflow，沒有東西自動跑 `pnpm check`。
3. **scoped `<style>` 是預設**：每個元件各自做微決策，「就寫在這」永遠比「找／建 token」便宜。
4. **token 三份真相、無同步機制**：`DESIGN.md` YAML／`packages/ui/src/styles.css`／`apps/web/src/assets/app.css`。（原本還有第四份——repo 內兩個 Claude Design 匯出資料夾的 `tokens/*.css`，已漂移；2026-08-26 裁決刪除，見 C2。之後靠 C1 的 drift 測試守住 `DESIGN.md`↔`styles.css`。）

**Task A（工具化）是治本，其餘是治標。** 建議先做 C2（刪匯出）＋ A，再做 B–G，否則 B–G 收完還會再長回來。

---

## Global Constraints

- 不改變任何使用者可見文案（繁中字串逐字不變），除非該文案本身就是重複且不一致——此時以目前程式碼實際顯示的版本為準。
- 不新增或修改路由。
- 不改變既有無障礙屬性語意（`role="status"`／`role="alert"`／`aria-live`／focus 行為不能因抽元件而消失或轉換）。
- 每個 Task 完成後跑 `pnpm --filter @sunshield/web typecheck` ＋ 相關測試，最後整體 `pnpm check`（目前基準：83 檔／485 測試）。
- **值不變的 token 化**優先於「順便調數值」；真的要改數值時單獨列出、明講差多少。
- 不提交 `.claude/settings.local.json` 或無關的未追蹤檔案。
- **本清單所有項目都尚未經瀏覽器視覺驗證**——2026-08-25 那批改動（全站內文 14→16px、行高 1.7→1.6、35 處文字色加深）也一樣。Task F5 專門處理這件事，其餘 Task 完成後若動到可見樣式，一併累積到 F5。

---

## 現況速查表（2026-08-26 掃描）

| 項目                                                            | 現況                                                                                                                                                                                                              | 對應 Task    |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| lint／format／CI                                                | Stylelint ✅（A1，已併進 `pnpm check`）；Prettier／ESLint／CI 還沒                                                                                                                                                | A            |
| `.form-error`                                                   | **9 檔各自 scoped**，已漂成 3 種寫法                                                                                                                                                                              | B1           |
| `.flow-heading`                                                 | `EventCorrectionPage`／`ReapplyPage`／`ReportContextEventPage` 三份逐字相同                                                                                                                                       | B2           |
| `.success-panel`                                                | 同上三檔，`border-top: 0.35rem solid var(--color-success)` + grid + margin reset                                                                                                                                  | B2           |
| bottom sheet 外殼（`.sheet`／`.sheet-layer`／`.sheet__header`） | `GearFormSheet` + `ProtectionAdjustmentSheet` 幾乎整個重複；`SessionEndControl` 是第三套類似 overlay + focus trap                                                                                                 | B3           |
| `min-height: 2.75rem`                                           | `RegionLocationPanel`(2)／`RegionManualSelector`(2)／`RegionPage`(1) 寫死，值＝`var(--tap-target)`。2026-08-22 DESIGN.md §10 修正記錄的同一種問題，當時漏掉這 5 處                                                | B4           |
| 日期／時間格式化                                                | `toLocaleString('zh-TW')`／`toLocaleTimeString`／`Intl.DateTimeFormat` 散在 ~13 處，無共用 helper                                                                                                                 | B5           |
| `.recovery-card`                                                | `ZoneProtectionForm` + `SetupPage` 兩份                                                                                                                                                                           | B6           |
| 斷點                                                            | ✅ **D3 已做**：DESIGN.md §12 改 rem 標注、補記 `24rem`／`31rem`。程式碼 0 改動                                                                                                                                   | D3           |
| `--shadow-card`／`--shadow-float`                               | ✅ **D5 已做**：從未被引用，已移除；§7 改「完全不用陰影」                                                                                                                                                         | D5           |
| `uvalert-design-system/` ＋ `防曬補擦流程設計/`                 | 兩個 Claude Design 匯出資料夾，271 檔約 47 MB。**✅ 已刪除**（commit `3f38a9d`）                                                                                                                                  | C2           |
| `DESIGN.md`↔`styles.css` 無 drift 守門                          | ✅ **C1 已完成**（`tokens.test.ts`）＋ **D2 已把 colors/rounded/spacing/layout 全對齊**（`saved` 改藕紫、刪 `warning`/`error`/`rounded.full`、page-gutter 移出 frontmatter）。typography 對照只文件化 → B8        | C1／D2       |
| `DESIGN.md` §10／§13                                            | ✅ **D1／D2 已更新**：§13 盲點對齊現況（焦點環已系統化、Lucide 剩 9 檔等）、§10 加字級量表對照表                                                                                                                  | D1／D2       |
| 字級量表                                                        | `DESIGN.md` 14 級 vs code 8 個 `--font-size-*` 命名／數值不 1:1，只 `body-md` 校準過。§10 有對照表                                                                                                                | **B8**（新） |
| `--text-tertiary` / `muted-soft`                                | ✅ **D4 已砍**：對比度 4.42:1 過不了 AA，`styles.css` 與 `DESIGN.md` 都移除，文字色定為 4 級                                                                                                                      | D4           |
| `@lucide/vue` 直接 import                                       | 9 檔（`ProductSnapshotEditor`、`SetupProcessBanner`、`RegionLocationPanel`、`RegionPreferenceSummary`、`QuickProtectionSummary`、`ZoneProtectionForm`、`FiveDayUvCard`、`SetupPage`）；wireframe 已凍結，阻塞解除 | E1           |
| `EducationArticlePage` 的 `:deep()` 區塊                        | 整個長文排版系統活在一個檔案的 scoped CSS，`max-width: 44rem` ×4、`0.9em`、行高 `1.85` 脫離 token                                                                                                                 | B7           |
| 使用者可見文案                                                  | 多數 inline 在 template，只有 `reminderPresentation.ts` 集中 labels；沒有字串目錄                                                                                                                                 | F1           |
| 測試脆弱耦合                                                    | `BottomNavigation.test.ts` 的 z-index regex 是改壞才發現的，可能還有其他把 CSS 字面值寫進斷言的測試                                                                                                               | F3           |

**已經乾淨、不需處理**：.vue scoped 裡零硬寫 hex/rgb（顏色掃很徹底）、`transition:` 已全部 token 化、`font-family` 只有 3 處全套 `--font-mono`、`letter-spacing` 只有一處集中定義、`packages/` domain 層工廠化良好。

---

## Task A：工具化（治本，最高優先）

**目標**：加上 lint／format／CI，讓 B–G 收完的東西不會再長回來。

**Global note**：這個專案 `pnpm-workspace.yaml` 只有 `apps/*` 與 `packages/*`；工具設定放根目錄。新增的 npm script 命名沿用既有慣例（`typecheck`／`test`／`check`）。

- [x] **A1：Stylelint** — 2026-08-26 完成（尚未 commit）
  - 加了 `stylelint@17` + `stylelint-config-standard@40` + `postcss` + `postcss-html`（`.vue` `<style>` 的 customSyntax）+ `stylelint-declaration-strict-value@1.12` + `stylelint-value-no-unknown-custom-properties@6`（root devDeps）。
  - `stylelint.config.mjs`：
    - **強制 token（`scale-unlimited/declaration-strict-value`，error）**：`/color$/`／`fill`／`stroke`／`background(-color)`／`z-index`／`border-radius`／`transition-duration`／`animation-duration` 只准 `var(--*)`（＋極少字面值 `0`／`50%`／`auto`／`0s`／gradient／url）。
    - **幽靈 token（`csstools/value-no-unknown-custom-properties`，error）**：引用未定義的 `--*` 就報錯，token 來源 = `styles.css` ＋ `app.css`；`SunLoader.vue` 由 `:style` 綁定的 `--ray-delay` 用 config 的 inline `importFrom` 物件放行。
    - `color-hex-length: "long"`（對齊 repo 與 DESIGN.md 的 6 位 hex 慣例）。
    - Vue 容錯（`:deep()`／`:slotted()`／`::v-deep`）、關掉一批 config-standard 的風格 nitpick（`declaration-block-single-line-max-declarations` 是 repo 刻意的 compact 風格、`media-feature-range-notation: "prefix"` 保留經典 `max-width:` 寫法、`property-no-deprecated` 因 `.screen-reader-only` 的 `clip` hack）。
  - **不含 `font-size` strict-value**：`EducationArticlePage` 的 `:deep()` 有 `0.9em`／`0.9rem`、`FiveDayUvCard` 有窄螢幕 `0.7rem`——這些是刻意的相對／響應式覆寫，規則要能區分需要更多 `ignoreValues` 調校。留給後續（跟 B7 / D2 typography 一起）。
  - 加 script `"lint:css": "stylelint \"{packages,apps}/**/*.{css,vue}\""`，並**併進 `pnpm check`**（`typecheck && test && lint:css`）。
  - **跑第一次的結果**：strict-value 與幽靈 token 規則**全過**——2026-08-25 的五輪收斂已經把顏色／圓角／z-index／duration 清乾淨了，這個規則的作用是「別再長回來」（已用 `color:#123456` 等做過負向測試，確認會擋）。config-standard 的 nitpick 修掉 1 個真的重複（`SessionEndControl.vue` 的 `.session-end__confirm-body` 定義兩次，已合併）＋ 1 個 `#ffffff`→改設 `color-hex-length:"long"`。
  - **BrandHeader.vue 的 Logo SVG hex**（`#33291F`／`#C1832E`）沒有觸發規則——那些 hex 是寫在 `<svg>` 的 `fill="..."` attribute 上（HTML 屬性，不是 CSS 宣告），stylelint 不管。不需要例外處理。

- [ ] **A2：Prettier + `.editorconfig`** — 第一階段已於 2026-08-26 完成（尚未 commit）；待一次性格式化與 CI 轉 blocking
  - 加 `prettier` + `.prettierrc`（沿用現有程式碼風格：2 空格、雙引號、無分號？——先跑 `prettier --check` 看差異量再決定要不要一次格式化全檔）。
  - `.editorconfig`：`indent_style=space`、`indent_size=2`、`end_of_line=lf`、`charset=utf-8`、`insert_final_newline=true`、`trim_trailing_whitespace=true`。
  - script：`"format": "prettier --write ."`、`"format:check": "prettier --check ."`。
  - 第一階段精確鎖定 `prettier@3.9.6`；沿用現況的 2 空格、雙引號、分號、無 trailing comma。產生檔、lockfile、public 資產、歷史 archive、工作暫存與 SVG 不納入格式化。首次 `format:check` 確認 260 個正式來源檔尚待第二階段機械格式化；CI 暫時設為 `continue-on-error`。
  - **裁決（2026-08-26）：早做一次性格式化。** 順序：(1) 這個 Task 只加 `.prettierrc` + `.editorconfig` + `format:check`（CI 設 `continue-on-error`）；(2) 跑 `ListAgents` 確認沒有其他 session 在動，`pnpm format --write .`，**單獨一個 commit**，訊息「機械格式化，無邏輯變更」；(3) CI 的 `format:check` 轉 blocking。做在 Task B（會動很多檔）之前。

- [x] **A3：ESLint** — 2026-08-26 完成（尚未 commit）
  - `eslint` + `typescript-eslint` + `eslint-plugin-vue` + `eslint-config-prettier`（關掉跟 Prettier 打架的規則）。
  - 起手式規則集用 recommended 就好，不要一次開太嚴。重點抓：unused imports/vars、`vue/no-unused-components`、`@typescript-eslint/no-floating-promises`（這個 repo 大量 `void foo()`，開了要確認沒有漏網的 unhandled promise）。
  - script：`"lint": "eslint . && pnpm lint:css"`。
  - 第一版採非 type-aware recommended 規則；`no-floating-promises` 需要為 monorepo 設定 TypeScript program，且需逐一審核既有 `void foo()`，留待獨立一輪導入，避免在工具落地時混入大量非機械式修改。
  - **驗證**：`pnpm lint` 對現況跑，同 A1 的分類原則處理。

- [ ] **A4：CI** — workflow 已於 2026-08-26 實作，待 push／PR 遠端驗證後完成
  - `.github/workflows/ci.yml`：on pull_request + push to main。步驟：`pnpm install --frozen-lockfile` → `pnpm typecheck` → `pnpm test` → `pnpm lint`（→ `pnpm format:check`，先設 `continue-on-error: true` 直到 A2 決定一次性格式化）。
  - Node 24、pnpm 11（對齊 `package.json` engines）。
  - 採 `actions/checkout@v7`、`actions/setup-node@v7`、`pnpm/action-setup@v6`；pnpm 版本由 `package.json#packageManager` 讀取，並快取 pnpm store。A2 尚未實作，因此這一版不呼叫不存在的 `format:check`。
  - **驗證**：開一個測試 PR 確認 workflow 會跑、會擋。

- [ ] **A5（選配）：pre-commit hook**
  - `lefthook`（比 husky 輕）跑 `lint-staged`：暫存的 `.vue`/`.css`/`.ts` 跑 `eslint --fix` + `stylelint --fix` + `prettier --write`。
  - CI 才是真正的防線，這個只是提早回饋。若團隊覺得 hook 煩就跳過。

- [x] **A6：CLAUDE.md 補硬規則** — 2026-08-26 完成（跟 A1 一起）
  - 「設計與文件」一節加了「scoped `<style>` 不准寫死值……`pnpm lint:css` 會擋」的 bullet。順便把「Claude Design component library / 第四份真相」那條改寫成「三份真相 ＋ `tokens.test.ts` 自動守著 ＋ Claude Design 匯出已於 2026-08-26 移除」。

---

## Task B：結構性收斂（收重複的「區塊」，不是數值）

**前置**：最好等 A1 上線，這樣收完 lint 會幫忙守住。但 B1／B2／B4 零風險（值不變、已逐字相同），可以先做。

- [x] **B1：`.form-error` → 單一定義**（2026-08-26 完成）
  - 現況：9 檔各自 scoped，3 種寫法（純 `color` / `+line-height:1.6` / `+margin:0`）。檔案：`components/common/QuickTimePicker.vue`、`components/product/GearForm.vue`、`components/reapplication/ReapplicationProductAssignments.vue`、`components/reapplication/ReapplicationZoneSelector.vue`、`components/setup/ZoneProtectionForm.vue`、`pages/EventCorrectionPage.vue`、`pages/ReportContextEventPage.vue`、`pages/settings/NotificationSettingsPage.vue`、`pages/setup/SetupPage.vue`。
  - 做法：在 `app.css` 加共用 `.form-error { margin: 0; color: var(--color-due); line-height: 1.6; }`（取「最完整」版本），9 檔刪除各自 scoped 定義。比照 `app.css` 既有收斂註解慣例補日期與來源。
  - `DESIGN.md` §13 盲點 #4「錯誤與驗證狀態未展開」→ 至少把「inline 欄位錯誤文字」這一塊補進 §5，標明其餘（欄位邊框、圖示、訊息位置）仍待實際表單流程確認。
  - **驗證**：grep 確認 9 檔 scoped 定義都刪乾淨、無死碼；`pnpm check`。視覺上 margin:0 對前 6 個沒寫 margin 的檔案是新行為，累積到 F5。

- [x] **B2：`.flow-heading` + `.success-panel` → `app.css`**（2026-08-26 完成）
  - 現況：`EventCorrectionPage`／`ReapplyPage`／`ReportContextEventPage` 三份**逐字相同**（`.flow-heading` 的 5 條規則；`.success-panel` 的 grid + `border-top: 0.35rem solid var(--color-success)` + margin reset）。
  - 做法：兩組都搬進 `app.css` 共用類別，三檔刪除 scoped。`0.35rem` 這個值只出現在這一處角色（成功卡上緣強調條），可留字面值或加一個 `--border-emphasis: 0.35rem`（傾向留字面值，單一用途不值得建 token）。
  - 順便：`.flow-heading` 跟 `DESIGN.md` §5 的 `page-heading` 是姊妹（全螢幕流程頁的標題列 vs 一般頁），在 §5 補一個 `flow-heading` 條目指向 `app.css`。
  - **驗證**：`pnpm check`；三頁的成功畫面與標題列視覺應零變化（本來就同一份）。

- [ ] **B3：bottom sheet 外殼 → `<BottomSheet>` 元件**
  - 現況：`components/setup/GearFormSheet.vue` + `components/setup/ProtectionAdjustmentSheet.vue` 的 `.sheet`／`.sheet-layer`／`.sheet__header`／開關淡入淡出／`min-height: 0` 幾乎整份重複（2026-08-25 只收了它們的 `border-radius` 與 transition，沒抽外殼）。`components/session/SessionEndControl.vue` 是第三套結構近似的 overlay（`.session-end__backdrop` + `.session-end__confirmation` + 自己的 focus 管理 + Escape）。
  - `DESIGN.md` §5 已經有 `bottom-sheet` 規範（背景 canvas、圓角 `--radius-sheet`、內距 24px）。
  - **裁決（2026-08-26）**：先抽 `apps/web/src/composables/useOverlay.ts`（focus trap ＋ Escape ＋ 捲動鎖 ＋ 焦點還原 ＋ `@click.self` 關閉的 callback），再抽 `components/common/BottomSheet.vue` 用它。props：`open`、`title`、`labelledById`；slot：default、`footer`（可選）。統一：遮罩 `--overlay-backdrop`、面板 `--surface-overlay`、頂角 `--radius-sheet`、`--z-overlay`。`GearFormSheet`／`ProtectionAdjustmentSheet` 改成只放內容。
  - `SessionEndControl` 的確認彈窗**是 dialog 不是 sheet**（置中、非底部），**不做成共用元件**（唯一呼叫端），但改用同一個 `useOverlay` composable，取代它現在自己寫的 focus 管理。
  - **測試**：`GearFormSheet`／`ProtectionAdjustmentSheet` 若有測試要更新選擇器；新元件要有 `.test.ts`（open/close、Escape、`@click.self`、focus 還原）。
  - **驗證**：`pnpm check`；手動確認兩個 sheet 開關手感與焦點行為不變（需要 preview 工具，累積到 F5）。

- [x] **B4：region 元件的 `min-height: 2.75rem` → `var(--tap-target)`**（2026-08-26 完成）
  - 現況：`components/region/RegionLocationPanel.vue`（2 處）、`components/region/RegionManualSelector.vue`（2 處）、`pages/RegionPage.vue`（1 處）。值就是 `--tap-target`。
  - `DESIGN.md` §10 的 2026-08-22 修正記錄明講「元件 scoped CSS 不要自己寫 min-height……要調整尺寸請改 padding 或 token」，當時修了 `OutdoorContextCard`／`EveningUvPrompt`／`FiveDayUvCard`，漏了這 5 處。
  - 做法：5 處改 `var(--tap-target)`，值不變。若這 5 處是套在 `.button` 或共用 class 上，直接刪掉這行（`.button` 本來就帶）——需逐處看選擇器。
  - 完成結果：3 處非 `.button` 控制項改用 `var(--tap-target)`；2 處 `.button` 覆寫直接刪除，回歸全域 `.button`。
  - **驗證**：`pnpm check`；視覺零變化。

- [x] **B5：日期／時間格式化 → `apps/web/src/helpers/datetime.ts`**（2026-08-26 完成）
  - 現況 ~13 處：`components/common/QuickTimePicker.vue`、`components/home/HomeNightSession.vue`、`components/reapplication/ReapplicationReview.vue`、`components/reminder/RecentEventsList.vue`（2 處）、`components/uv/FiveDayUvCard.vue`（2 處）、`features/reminder/homeReminderClockPresentation.ts`、`features/reminder/reminderPresentation.ts`、`pages/EventCorrectionPage.vue`、`pages/ReapplyPage.vue`、`pages/ReportContextEventPage.vue`、`pages/settings/DataSettingsPage.vue`。
  - 做法：建 `helpers/datetime.ts` 匯出 `formatDateTime(value)`、`formatTime(value)`、`formatMonthDayTime(value, options)`、`formatWeekday(value)`、`formatDate(value)`，內部統一 `new Intl.DateTimeFormat("zh-TW", {...})`、時分格式統一 `hour12: false`。**逐處核對現有 options**——`RecentEventsList` 與 `FiveDayUvCard` 的「月日＋時分」共用同一函式，但後者保留固定 `Asia/Taipei` 時區；近期事件是否為今天的判斷仍留在元件。
  - template 裡的 `{{ new Date(x).toLocaleString('zh-TW') }}` 改成 `{{ formatDateTime(x) }}`。
  - 完成結果：11 個呼叫端檔案改用 helper；`apps/web/src` 的 `toLocale*` 與 helper 外 `Intl.DateTimeFormat` 已歸零。新增 5 項 formatter 單元測試。
  - `DESIGN.md` §3「倒數與數字規則」有 tabular-nums、單位不斷行的要求——helper 是落實這些的地方，順便檢查有沒有漏。
  - **測試**：`datetime.test.ts` 固定時區跑（happy-dom / node 的 `Intl` 行為），至少涵蓋每個匯出函式。
  - **驗證**：`pnpm check`；每處輸出字串跟改動前逐字比對（這是唯一驗收標準）。

- [ ] **B6：`.recovery-card` → 收斂或註記**
  - 現況：`components/setup/ZoneProtectionForm.vue` + `pages/setup/SetupPage.vue` 兩份「繼續未完成的草稿？」卡片。
  - 做法：確認兩份是否真的同一個角色（都是 setup 流程的「recovery」卡）。若是 → 收進 `app.css` 或跟 `EmptyStateCard` 合併考量；若職責不同 → 至少改名區分、加註解說明為何不合併。**低優先**，兩份而已。

- [ ] **B7：`EducationArticlePage` 的 `:deep()` 長文排版系統 —— 最低干預**
  - 現況：h2/h3/p/li/blockquote/table/th/td/code/hr/a 的樣式全在 `pages/education/EducationArticlePage.vue` 的 scoped `:deep()` 區塊，`max-width: 44rem` 出現 4 次、`0.9em`、行高 `1.85`（刻意，有註解）脫離 token 系統。
  - **裁決（2026-08-26）：(a) 最低干預。** 只把 `44rem`（×4）抽成一個檔案級 CSS 變數（`--article-measure: 44rem`），`0.9em` 等相對倍率留著。**不做** `prose.css`——衛教內容目前 100% 是草稿、卡在審查閘門，正式收系統是提早投資。等內容真的核准發布再開範圍評估 (b)。
  - **驗證**：`pnpm check`；視覺零變化。

---

## Task C：token 真相數量

- [x] **C1：`DESIGN.md` ↔ `styles.css` drift 測試** — 2026-08-26 完成（尚未 commit）
  - 新增 `packages/ui/src/tokens.test.ts`（54 個測試）——parse `DESIGN.md` frontmatter 的 `colors`／`rounded`／`spacing`／`layout`，逐項比對 `styles.css` `:root` 的對應 token。命名規則：colors `accent-X`／`status-X` → `--color-X`，其餘 1:1；rounded → `--radius-X`；spacing `xxs..section` → `--space-1..10`；layout → `--content-max`／`--tap-target`。值比對：hex 大小寫無關、px↔rem 以 16px 換算。
  - **不含 typography**（14 級量表 ↔ 8 個 `--font-size-*` 命名太亂，是 D2 的範圍）——只驗證唯一校準過的 `body-md`(16px) ↔ `--font-size-body`。
  - **KNOWN_DRIFT 機制**：已知對不上的項目列在測試檔的 `KNOWN_DRIFT` 物件（附中文說明），per-key 測試放行；另有一個守門測試斷言「這些項目現在仍然真的有落差」——修好一項後那個測試會失敗，逼你把它從清單移除。
  - **抓到 5 類現存落差（→ 全部丟給 D2 裁決）**：
    1. **`colors.status-saved`**：`DESIGN.md` §2 訂藕紫 `#8C6F7A`，並**明文**「刻意用藕紫而非綠色……只有『這次記錄成功』」。但 code 沒有 `--color-saved`，「已儲存／成功」一律用綠色 `--color-success` `#147d64`（`SetupStepShell` 草稿已儲存、3 個 flow 頁的 `.success-panel` 上緣、`.notice--ok`、`SetupPage` 更新提示）。**這是方向性違反設計系統的落差**，最該優先裁。
    2. **`colors.warning`**：`DESIGN.md` `#C78336`；`styles.css` 沒有 `--color-warning`（實作用 `--color-soon` 兼表警示）。
    3. **`colors.error`**：`DESIGN.md` `#B84D4C`；沒有 `--color-error`（實作一律 `--color-due`）。
    4. **`rounded.full`**：`DESIGN.md` 有 `pill:999px` 與 `full:9999px` 兩級；`styles.css` 只有 `--radius-pill`，`full` 從沒用過。
    5. **`layout.page-gutter-mobile`／`page-gutter-desktop`**（16px／24px）：沒有 token，`AppShell` 用 `clamp(1rem, 5vw, 2.75rem)`。跟 D3 斷點一起處理。
  - `pnpm check` 通過（84 檔／539 測試）。
  - **D2 的「DESIGN.md key → token 名」完整對照表**：`tokens.test.ts` 的 `tokenFor()` ＋ `SPACING_MAP`／`LAYOUT_MAP` 就是 colors/rounded/spacing/layout 那半份；typography 那半份還要補。

- [x] **C2：刪除 repo 內的 Claude Design 匯出資料夾** — 2026-08-26 執行（尚未 commit）
  - **裁決（2026-08-26）：刪除。** 使用者確認不再用 Claude Design 做設計往返。
  - `git rm -r uvalert-design-system/ "防曬補擦流程設計/"` — 已執行，280 個檔案刪除已 staged，工作區已無這兩個資料夾。含 `LXGWWenKaiTC-Regular.ttf`（15.3 MB，`DESIGN.md` §3 已退回的字型）。`.gitignore` 已加 `*.dc.html` ＋ `design-exports/`。`2026-08-23-hifi-redesign-handoff.md` 的相關段落已加註「已移除」。`pnpm check` 通過（83 檔／485 測試，零影響——兩個資料夾無任何程式碼引用）。
  - 兩者都**完全沒有被程式碼／build／workspace／測試引用**（grep 只在 docs 裡當「下游產物」提到），`uvalert-design-system/README.md` 自己寫「不是權威」，且已漂移（`--color-accent-mauve` `#a08792` vs styles.css `#8c6f7a`；命名 `--color-accent-apricot` vs `--color-apricot`）。
  - `.gitignore` 加：`*.dc.html`（Claude Design canvas 檔）＋ 一行註解建議之後匯出放 repo 外或 `design-exports/`（並把 `design-exports/` 也加進 ignore）。
  - **注意**：`git rm` 只從 HEAD 移除，15 MB 字型的 blob 仍留在 git 歷史（commit `6a9697f`）。**不做 history rewrite**（`filter-repo` 對多 session／多 remote 太具破壞性）——接受 `.git` 不會縮小，只讓未來 clone 的工作區變小。
  - 之後 `docs/decisions/2026-08-23-hifi-redesign-handoff.md`／`round2-closeout.md`／`2026-08-25-hardcoded-style-final-sweep.md` 裡提到 `uvalert-design-system/` 的段落加一句「已於 2026-08-26 移除」。
  - **驗證**：`pnpm check`（不該有任何變化，因為沒被引用）；`git grep uvalert-design-system` 只剩 docs 的歷史提及。

---

## Task D：`DESIGN.md` 校準 pass — 2026-08-26 完成（尚未 commit），typography 例外

- [x] **D1：§13 規格盲點更新** ✅
  - #1 Lucide → 「剩 9 檔直接 import」＋ 列出檔名 ＋ 指向 E1。
  - #2 焦點環 → 改成「**已系統化**」＋ 全域規則內容，殘留缺口只剩「卡片／自訂 widget 的鍵盤焦點樣式」。
  - #3 停用狀態 → 主／次按鈕已定義，輸入框／清單項目仍未定義。
  - #4 錯誤驗證 → 「色已定（沿用 status-due／soon），視覺結構未展開」。
  - 「已清除」段落 → 補上 `--color-muted-soft`／`--text-tertiary`／`--shadow-*`／`warning`／`error`／`rounded.full`。

- [x] **D2：§10 重建 ＋ 裁決 5 類落差** ✅（typography 只文件化，不重新對齊）
  - §10 加了「字級量表 ↔ code token 對照表」——documented 6 類 typography 漂移，**不改字級**（重新對齊會動全站，是獨立的視覺工作，見下方新增的 B8）。
  - 5 類落差裁決（使用者 2026-08-26 確認）：
    1. **`status-saved` 綠 → 藕紫**：`--color-success #147d64` → `--color-saved #8c6f7a`（＋`--color-saved-soft` color-mix）。8 處 usage 改（`styles.css`、`app.css` 的 `.status-card--saved`＋`.notice--ok`、`SetupStepShell`、3 個 `.success-panel`、`SetupPage` `.update-notice`）。**有視覺變化**：成功卡上緣色條、「草稿已儲存」文字、`.notice--ok` 底色從綠變藕紫。
    2. **`warning` / `error`**：刪 DESIGN.md frontmatter 兩列，§2 註明沿用 `status-due` / `status-soon`。
    3. **`rounded.full`**：刪 frontmatter（改補 `rounded.sheet: 24px`，那是 `--radius-sheet` 一直有、文件沒記的）。
    4. **`page-gutter-*`**：從 frontmatter 移除（是流動 `clamp()` 不是 token），只留 §12 prose。
  - `tokens.test.ts`：`KNOWN_DRIFT` 清空、`LAYOUT_MAP` 拿掉 page-gutter、新增 `rounded.sheet` 覆蓋、`colors.status-saved` 現在對齊。55 測試通過。

- [x] **D3：§12 斷點改 rem 標注 ＋ 補元件斷點** ✅
  - §12 頁面斷點改 `48rem (768px)` / `64rem (1024px)`；元件層級斷點表補 `24rem`（FiveDayUvCard）、`31rem`（按鈕堆疊）。程式碼 0 改動。

- [x] **D4：砍第 5 級文字色** ✅
  - `styles.css` 移除 `--text-tertiary` ＋ `--color-muted-soft`（grep 確認只有註解引用），註解區塊改寫成「4 級 + 為什麼沒有第 5 級」。
  - `DESIGN.md` §2 文字表刪 `muted-soft` 列、frontmatter 刪 `muted-soft`、加「刻意不設第 5 級」blockquote。
  - `2026-08-25-text-color-token-gap.md` 的「降級候選」段落標記為確定維持 `--text-secondary`、不再是待辦。
  - 視覺零變化（token 本來零使用）。

- [x] **D5：§7 陰影** ✅
  - `styles.css` 移除 `--shadow-card` / `--shadow-float`（從未被引用）。§7 「浮層 極淡陰影」列改成「**目前無陰影**」，加 blockquote 說明未來要陰影再建 `--shadow-overlay`。

### D2 衍生 — 新增待辦

- [ ] **B8：字級量表重新對齊（獨立視覺工作）**
  - `DESIGN.md` §10 新的「字級量表對照表」列了 6 類 typography 漂移：`display-md` 目標 36px 但 `--font-size-page-title` 是 28–32px 的 clamp；`--font-size-title`/`title-sm`/`title-md`/`section-title` 4 個 token 是 2026-08-24 從散落卡片標題收斂的桶、不對應 DESIGN.md `title-*`；`body-sm`/`caption` 偏小；`display-xl/lg/sm` 沒 token。
  - 這是**跨全站的字級調整**，會動很多頁面的視覺，需要獨立一輪（可能還要重新想 DESIGN.md 的 14 級量表對這個 8-token 產品是不是太細）。跟 B7（衛教長文排版）性質類似。
  - 也要把 typography 對照補進 `tokens.test.ts`（目前只驗 `body-md`）。

- [ ] **G3：`.status-card` 死碼**
  - `app.css` 的 `.status-card` ＋ 5 個變體（含 D2 剛改名的 `.status-card--saved`）沒有任何元件 template 用到——DESIGN.md §5 的 `status-card` 規範實際由 `ZoneStatusList.vue` 的 `.zone-group` 實現。約 40 行死碼，併進死碼掃描。同場加映：`.uvi-badge`（app.css）grep 也查不到 .vue 使用，一起確認。

---

## Task E：完成 icon 遷移

- [ ] **E1：9 個 `@lucide/vue` 殘留改用自訂 Icon 系統**
  - 檔案：`components/product/ProductSnapshotEditor.vue`（`PackageCheck`）、`components/product/SetupProcessBanner.vue`（`ClipboardList`）、`components/region/RegionLocationPanel.vue`（`LocateFixed`）、`components/region/RegionPreferenceSummary.vue`（`MapPin`）、`components/setup/QuickProtectionSummary.vue`（`SlidersHorizontal`、`Sparkles`）、`components/setup/ZoneProtectionForm.vue`（`Sparkles`）、`components/uv/FiveDayUvCard.vue`（`CloudSun`）、`pages/setup/SetupPage.vue`（`LoaderCircle`）。
  - `DESIGN.md` §13 #7 列的 10 個功能型圖示（載入中、快速摘要、調整設定、流程橫幅、產品確認、地區、定位、UV 預報、夜間、傍晚）對應這批。
  - **裁決（2026-08-26）：(c) 先 defer。** 使用者稍後產出草稿 SVG，屆時流程為：使用者提供草稿 → AGENT 放進 `docs/design/icon-system/icons/<id>.svg`、跑 `node tools/icon-system/generate-icons.mjs` 正規化（`#000`→`currentColor`、內聯 class、注入 `<title>`／data 屬性）→ 確認 `icons.generated.ts` 有新條目 → 逐檔把 `import { X } from "@lucide/vue"` 換成 `<Icon name="...">` → 9 檔全換完才從 `apps/web/package.json` 移除 `@lucide/vue`。
  - 在那之前**不阻塞其他 Task**；`@lucide/vue` 依賴保留。優先序最低。

---

## Task F：尚未被稽核的面向

- [ ] **F1：使用者可見文案的集中度**
  - 現況：多數字串 inline 在 template；只有 `features/reminder/reminderPresentation.ts` 集中了 `ACTION_LABELS`／`BODY_ZONE_LABELS`。`docs/decisions/2026-08-17-copy-audit.md` 查了**用詞**，沒查**重複與結構**。
  - 做法：先**盤點**（不急著改）——grep 重複字串（「取消」「返回更多」「正在讀取…」變體、錯誤訊息）。判斷哪些值得抽成 `apps/web/src/copy/` 目錄或就近的常數。**不要為了假設性的 i18n 需求全部抽**（這個產品只有繁中）；只抽「真的重複且改一個要 grep 全站」的。
  - 產出：一份「文案重複清單」，本清單再開子項目。

- [ ] **F2：無障礙一致性稽核**
  - `role="status"` ×24、`role="alert"` ×39、`role="note"` ×3——沒稽核過語意是否用對（例如「操作結果提示」該用 status 還是 alert，全站是否一致）。
  - 三套 overlay（B3）的 focus trap 目前各寫各的——B3 收 sheet 時一併統一，`SessionEndControl` 的 dialog 也要有 focus trap（目前看起來只有開啟時 focus 標題，沒有 trap）。
  - 產出：一份 a11y 一致性 checklist，可能引用 `better-accessibility` skill。

- [ ] **F3：測試的脆弱耦合掃描**
  - 起因：`BottomNavigation.test.ts` 的 `/z-index:\s*\d+/` 是改壞才發現的。
  - 做法：grep 所有 `.test.ts` 裡直接比對 CSS 字面值 / class 名 / 內聯 style 的斷言（`toContain("px")`、`attributes("style")`、`.classes()`、硬寫 class selector）。判斷哪些該改成「驗證行為」而非「驗證實作字串」。
  - `docs/superpowers/plans/2026-08-25-shared-component-extraction.md` 的 Global Constraints 已經點名 `AccountDataPage.test.ts:48` 的 `.confirm-note button.button--primary` 這類——順著查。

- [ ] **F4：`DataSettingsPage` 的 loading 狀態採用 `SunLoader`**
  - `docs/decisions/2026-08-25-second-hardcode-sweep.md` 結尾點名的遺漏：`DataSettingsPage.vue` 仍是手寫 `<p role="status">正在讀取本機資料概況…</p>`，沒用 2026-08-25 Task 3 導入的 `SunLoader`。小改動，順手做。

- [ ] **F5：瀏覽器視覺驗證（累積債）**
  - **每一輪 2026-08-25 sweep 都寫「未經瀏覽器視覺驗證」。** 累計約 25 檔、全站內文 14→16px、行高 1.7→1.6、35 處文字色加深，加上本清單 B1–B4 的收斂。
  - 做法：用 preview 工具（`.claude/launch.json` 的 `web-dev`，**不要用 Bash 直接跑 vite**，見 CLAUDE.md）或 `webapp-testing` skill，逐頁目視：首頁（有／無 session、日／夜）、`/setup`、`/products`、`/products/:id`、`/region`、`/forecast`、衛教文章頁、`DataSettingsPage`、`EventCorrectionPage` 作廢區塊、通知設定。確認 16px 內文沒造成預期外換行、深色內文跟卡片底色搭配正常、sheet 開關手感正常。
  - 這是**目前最大的單一未驗證風險**，建議獨立一個 session 專門做。

---

## Task G：死碼

- [ ] **G1：`--shadow-card` / `--shadow-float`**
  - `packages/ui/src/styles.css` 定義了，全站零使用（只有 `AppShell.vue` 的 `box-shadow: none`）。
  - 跟 D5 一起決定：刪除 token（傾向），或改值 + 實際套用。

- [ ] **G2：其他死碼順手清**
  - `ContextSelector.vue` 局部重覆宣告的 focus outline（`docs/decisions/2026-08-25-second-hardcode-sweep.md` 判斷為無害死碼，沒清）。
  - A1/A3 上線後，lint 會自己列出 unused imports / dead CSS。

---

## Open Questions — 已於 2026-08-26 由使用者裁決

| #   | 問題                                                                 | 裁決                                                                                                                                                                                                                                                                                                                                         |
| --- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **A2**：Prettier 一次性 `--write` 全 repo？                          | **早做**。挑無其他 session 的時間窗，`pnpm format --write .` 單獨一個 commit（訊息「機械格式化，無邏輯變更」），做在 Task B 之前。CI 的 `format:check` 先 `continue-on-error`，格式化完再轉 blocking。                                                                                                                                       |
| 2   | **B3**：`SessionEndControl` 的確認彈窗要不要做成 `<ConfirmDialog>`？ | **不做元件**（唯一呼叫端，過度抽象）。改抽 `apps/web/src/composables/useOverlay.ts`——focus trap ＋ Escape ＋ 捲動鎖 ＋ 焦點還原 ＋ `@click.self`；`<BottomSheet>` 與 `SessionEndControl` 共用它，各自保留版面。                                                                                                                              |
| 3   | **B7**：長文排版最低干預還是 `prose.css`？                           | **(a) 最低干預**。只把 `44rem`（×4）抽成檔案級 `--article-measure`，`0.9em`／行高 `1.85` 留著。等衛教內容真的核准發布再評估 (b)。                                                                                                                                                                                                            |
| 4   | **C2**：`uvalert-design-system/` 去留？                              | **刪除**。連同 repo 根目錄的 `防曬補擦流程設計/`（第二個 Claude Design 匯出）。兩者共 271 檔約 47 MB（含 15 MB 的霞鶩文楷 TC 字型——那支字型 DESIGN.md §3 已退回），完全沒被程式碼引用，README 自己寫「不是權威」。`.gitignore` 加 pattern 擋未來的匯出。C2 的「寫 generator (b)」子項目取消。使用者確認**不再用 Claude Design 做設計往返**。 |
| 5   | **D3**：`48rem` 改 rem 還是改回 px？                                 | **§12 改用 rem**（`48rem (768px)` / `64rem (1024px)` 標注），程式碼 4 處不動。零行為變更。                                                                                                                                                                                                                                                   |
| 6   | **D4**：`--color-muted-soft` 新色票？                                | **砍第 5 級**。移除 `--text-tertiary`（及 `--color-muted-soft`，若無他處使用），`DESIGN.md` §2 文字色階改成 4 級（ink / body-strong / body / muted），加註「刻意不設更淺的文字色——象牙底上過不了 WCAG AA 4.5:1」。`text-color-token-gap.md` 的 ~25 處「降級候選」標記為「維持 `--text-secondary`（5.93:1），不採用」。                       |
| 7   | **E1**：9 個功能型圖示誰畫？                                         | **(c) 先 defer**。使用者稍後產草稿 SVG，屆時由 AGENT 正規化（跑 `tools/icon-system/generate-icons.mjs`）＋接進 `Icon.vue`／`icons.generated.ts`，替換對應的 `@lucide/vue` import。E1 維持最低優先，不阻塞其他 Task。                                                                                                                         |

---

## 建議執行順序（依 2026-08-26 裁決更新）

- ~~**C2**（刪兩個匯出資料夾 ＋ `.gitignore`）~~ ✅ commit `3f38a9d`
- ~~**C1**（drift 測試）~~ ✅ commit `b1cf1db`
- ~~**A1 + A6**（Stylelint ＋ CLAUDE.md 硬規則，已併進 `pnpm check`）~~ ✅ commit `fd54628`
- ~~**D1–D5**（`DESIGN.md` 校準 ＋ 斷點 rem ＋ 砍第 5 級文字色 ＋ 砍 shadow token ＋ `saved` 色改藕紫）~~ ✅ 2026-08-26 完成（尚未 commit）。typography 對照只文件化，重新對齊拆成 **B8**。

1. **A3 → A4**（ESLint / CI，治本；`pnpm lint` = eslint + 既有的 lint:css）
2. **A2 一次性格式化**（挑安靜時間窗，單獨 commit）
3. **B1 + B2 + B4**（`.form-error` / `.flow-heading`+`.success-panel` / region `min-height`——零風險、值不變）
4. **B5**（datetime helper）／ **B3 + useOverlay**（bottom sheet，需測試工作）
5. **F5**（累積的視覺驗證，獨立 session）
6. **G1 + G2 + G3**（死碼：shadow 已於 D5 清；剩 `.status-card` / `.uvi-badge` / ContextSelector focus / unused imports）
7. **B6 / B7 / B8 / F1 / F2 / F3 / F4**（次要收斂、字級重新對齊、未稽核面向）
8. **E1**（等使用者產出草稿 SVG）
