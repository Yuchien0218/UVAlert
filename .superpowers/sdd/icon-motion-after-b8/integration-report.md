# Icon / motion after B8 integration report

日期：2026-08-29（Asia/Taipei）

## 範圍與基底

- Worktree：`C:\Users\yu\Coding Projects\UVAlert\.worktrees\icon-motion-after-b8`
- 分支：`codex/icon-motion-after-b8`
- 基底：`195bcf52651ca0f29ec7f7464b1203dada3030bf`（B8 PR #5 merge）
- 未 push、未建立或合併 PR、未 force。

## Cherry-pick 結果

依序完成：

1. `a1d0dcf` → `7ab8d53`：補完自訂圖示、替換 Lucide、加入兩個 loader。
2. `fafacfb` → `ef5531a`：倒數狀態圖示、motion tokens 與 token drift test。
3. `1cf0f02` → `006f61f`：動畫規則、`transition: all` stylelint guard、reduced-motion 規則。
4. `2ca6803` → `49cd008`：icon / motion decisions 文件。

實際 Git conflict：**0 檔**。四個 commit 都完成，沒有 abort。

## 自動合併重疊與裁決

雖然沒有 conflict marker，Git 曾自動合併下列 B8 重疊檔，已逐一檢查整合後 diff：

- `DESIGN.md`：保留 B8 七個 typography roles 與語意契約；疊加 icon 完成狀態、`motion` frontmatter 與 §12 動畫規則。
- `packages/ui/src/styles.css`：保留 B8 的 `--font-family-*`／`--font-size-*` role tokens；疊加 duration、easing、loader-cycle、motion-rise tokens。
- `packages/ui/src/tokens.test.ts`：保留 B8 typography drift tests；把 `motion` 加進同一個 DESIGN ↔ CSS drift gate。
- `apps/web/src/assets/app.css`：保留 `data-typography-role` selectors；page-stack 只疊加 tokenized fade/rise 與 reduced-motion。
- `ProductSnapshotEditor.vue`、`SetupProcessBanner.vue`、`RegionLocationPanel.vue`、`RegionPreferenceSummary.vue`、`QuickProtectionSummary.vue`、`ZoneProtectionForm.vue`、`FiveDayUvCard.vue`：保留 B8 semantic headings、`data-typography-role` 與窄寬 containment；只替換圖示或疊加 motion rule。
- `EventCorrectionPage.vue`、`HomePage.vue`、`ProductDetailPage.vue`、`ProductsPage.vue`、`ReportContextEventPage.vue`、`SetupPage.vue`：保留 B8 heading roles；只替換 loader／圖示。
- `docs/superpowers/plans/2026-08-26-codebase-consolidation-audit.md`：保留 B8 已完成紀錄並疊加 icon E1 結案。

語意核對證據：`data-typography-role` 仍有 118 處；七角色 CSS selectors 與 tokens 仍在；`AppShellLayout.test.ts`、`GearFormLayout.test.ts` 的 320px containment regression tests 仍在且 focused tests 通過。

## 來源 commit 內部不一致的最小修正

以下修正不改行為數值，也不改 SVG geometry／generated registry：

1. `BroadcastLoader.vue`、`InlineLoader.vue` 原本仍寫 `1.5s ease-in-out`，但同批 commit 已新增 `--duration-loader-cycle: 1500ms` 與 `--ease-in-out`。改為引用既有 token；`BroadcastLoader` 的出場曲線也從同值意圖的 CSS keyword 改用 `--ease-out`。
2. `docs/design/icon-system/README.md` 原本同時寫「Lucide 已移除」與「元件尚未替換、依賴不能移除」，並誤寫 `tool-loading` 正在使用。依實際程式碼與最新 decisions 文件校正：最後 8 處已替換，按鈕內使用 `InlineLoader`，`tool-loading` 目前未引用、去留未裁決。

## 靜態核對

- conflict markers：0。
- `@lucide/vue` 程式碼 import／package dependency：0；文件只保留歷史敘述與禁止新增的說明。
- `transition: all`／`transition-property: all`：0。
- DESIGN motion 值與 CSS tokens：逐項一致，並由 `tokens.test.ts` 驗證。
- infinite animations：`BroadcastLoader` 的 ray/core 與 `InlineLoader` segment 都有各自的 reduced-motion `animation: none`。
- generated icons／SVG geometry：未手改。`generate-icons.mjs` 成功處理 61 個圖示；Windows 執行只造成 CRLF→LF 行尾差異，`git diff --ignore-space-at-eol` 為空，因此還原該次行尾噪音，未把它納入整合 diff。

## 驗證

- Focused Vitest：**通過**，12 files / 187 tests。
- `pnpm check`：**通過**（sandbox 外重跑），7 workspace typechecks；91 test files / 671 tests；ESLint、Stylelint exit 0。
- `pnpm build`：**通過**，449 modules transformed。保留既有 chunk-size warning；未設定 `VITE_PUBLIC_SITE_URL` 時 public-site generator 使用 `http://localhost:4173`，不是 build failure。
- `pnpm format:check`：**未通過**，Prettier 對整個 Windows checkout 報 402 檔（含大量本輪未改檔案），屬 CRLF baseline/worktree-wide 問題。沒有把 402 檔全部重排進本整合。
- Targeted Prettier：**通過**，只格式化並檢查本輪 4 個 integration 檔。
- `git diff --check`：**通過**。

第一次在 sandbox 內跑 `pnpm check`／`format:check` 時分別遇到 esbuild parent-directory access denied 與 Prettier executable EPERM；均在 sandbox 外原樣重跑。前者取得完整成功結果，後者取得上述 402 檔真實格式結果。

## 尚存 concern

- 尚未做瀏覽器目視驗證：狀態跨門檻交叉淡入、`InlineLoader`、`BroadcastLoader` 與 `prefers-reduced-motion` 的畫面手感仍沿用 decisions 文件中的未完成項。
- `tool-loading` 已產生但未被引用，保留或移除尚未裁決，本次不擴張處理。
- `--ease-out`／`--duration-base` 的新手感仍需使用者目視確認；本次只驗證程式與 token 一致性。
