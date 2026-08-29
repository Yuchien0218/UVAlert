# PR #4 與 current main 整合報告

日期：2026-08-29（Asia/Taipei）

## 範圍

以正常 merge 將 `origin/main` 的 `f40a87d` 併入 `codex/f1-f4-g2-g3`。未 rebase、未 force-push、未操作 GitHub；merge 前已確認沒有已追蹤檔案的未提交變更。原有 `.superpowers/sdd/pr4-main-integration/brief.md` 是未追蹤需求輸入，未納入提交。

## 衝突裁決

| 路徑 | 類型 | 裁決與原因 |
| --- | --- | --- |
| `apps/web/src/components/shell/AppShellLayout.test.ts` | HEAD 刪除／main 修改 | 維持刪除。main 新增的案例仍直接讀取 `.vue`／CSS 原始碼並斷言 `min-width: 0`，和 PR #4 的測試去耦目標相衝；B8 的字級與窄寬契約由 `typographyRoles.test.ts` 等現行測試承擔。 |
| `docs/superpowers/plans/2026-08-26-codebase-consolidation-audit.md` | 內容衝突 | 保留 main 的 B8、圖示、B9、Vercel 與 FiveDayUvCard 現況；保留 PR #4 的 F1–F3、G2–G3 完成紀錄。F4 改為完成，並記錄現行 `BroadcastLoader`。 |

## 自動合併稽核

- `DataSettingsPage`：PR #4 的具體 loading accessible name 與測試保留；已由已刪除的 `SunLoader` 改接主線 `BroadcastLoader`。
- `app.css`：PR #4 已確認的 `.status-card`／`.uvi-badge` 死 CSS 仍未回來；主線 B8 typography 與 B9 motion 規則均保留。
- `ContextSelector`：PR #4 移除原生 toggle 重複 focus rule 的清理保留；主線以換圖示名稱取代旋轉動畫的 B9 裁決保留。
- `ConfirmAction`、`RegionLocationPanel`、`BottomNavigation`、`AccountDataPage`：PR #4 的語意／行為測試去耦仍存在，未回復對 CSS class 或樣式字串的斷言。
- 稽核決策文件的現行規則已改稱 `BroadcastLoader`；歷史上的 `SunLoader` 名稱僅在明確註明為當時名稱的記錄中保留。

## 驗證

- 聚焦測試：8 個測試檔、232 個測試通過。
- 全量測試：91 個測試檔、735 個測試通過。
- 型別檢查：`pnpm -r typecheck` 通過。
- Lint：`pnpm lint`（ESLint + Stylelint）通過。
- 建置：`pnpm build` 通過。
- 以目標檔案執行 Prettier；`git diff --check` 需在最後暫存後再驗證。

## 環境與已知事項

- 這個 worktree 的合併前 `node_modules` 與主線 lockfile 不一致，且第一次重建後出現失效 Vitest junction；已刪除僅限本 worktree 的依賴目錄，並以 `pnpm install --frozen-lockfile` 完整重建。沒有修改追蹤檔案。
- `pnpm check` 的桌面 runtime wrapper 在啟動全量 Vitest 後未回傳終態；因此以它所組合的三個 fresh 關卡分別取得結果：`pnpm -r typecheck`、直接 Vitest 全量測試、`pnpm lint`，均通過。
- `pnpm build` 的 Vite 大型 chunk 提示與未設定 `VITE_PUBLIC_SITE_URL` 的 localhost canonical/sitemap 提示均為非阻擋既有建置訊息。
