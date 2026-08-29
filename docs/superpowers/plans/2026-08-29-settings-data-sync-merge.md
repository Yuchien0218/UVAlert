# 「跨裝置同步」併入「本機資料與隱私」 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `/settings/sync` 併進 `/settings/data` 的次要區塊，移除「更多」頁的一張入口卡與 `DataSettingsPage` 上那張純導覽用的補救卡，讓實作回到 `DESIGN.md` 第五節與 Sitemap §2.4 本來就訂好的「單頁分區、本機備份第一層、Google 同步次要區塊」。

**Architecture:** 純粹的頁面組織調整。同步與本機資料的 controller、port、契約與資料模型**完全不動**——`createSyncController`、`createLocalDataController` 的介面與行為維持原樣，只是消費它們的模板從兩個頁面收斂成一個。`/settings/account-data` 維持獨立頁，改從同步區塊進入，層級不變。

**Tech Stack:** Vue 3 SFC `<script setup>`、TypeScript、Vue Router、Vitest、Vue Test Utils、Stylelint、Prettier、pnpm 11、Vite。

**前置條件：** `docs/decisions/2026-08-29-settings-data-sync-merge.md` 第九節的三個裁決都已確認。**未裁決前不要開工**——尤其是第 3 項（合併後的說明文字），它會觸發 B9 計畫「不新增文案」的約束。

## Global Constraints

- **不改變任何同步或本機資料的行為。** 匯出、清除、登入、同步開關、衝突處理的邏輯完全不動。
- **不留轉址。** `/settings/sync` 直接移除，沿用 2026-08-08 與 2026-08-24 移除路由的既有處理方式（P0 未上線、沒有外部連結要相容）。
- `/settings/account-data` **維持獨立頁**，不併進來——它含登出與清除雲端資料兩個不可逆操作，跟本機清除放同一頁會互相混淆。
- 合併後的頁面仍要守 `DESIGN.md` 第六節「每頁只保留一個最主要任務」：本機備份是主任務，同步是次要區塊，視覺層級要看得出來。
- 不新增文案；合併後的卡片說明文字用裁決 3 的結果。
- 每個 Task 結束時 `pnpm check` 必須全綠。
- 視覺改動一律用 Browser pane 實際跑起來看。

---

## File Structure and Responsibilities

- `apps/web/src/pages/settings/DataSettingsPage.vue`：合併後的唯一頁面。移除 `cloud-data-link` 卡、吸收同步區塊。
- `apps/web/src/pages/settings/SyncSettingsPage.vue`：刪除。
- `apps/web/src/pages/settings/SyncSettingsPage.test.ts`：斷言移進 `DataSettingsPage` 的測試後刪除。
- `apps/web/src/pages/settings/AccountDataPage.vue`：返回連結改指 `/settings/data`。其餘不動。
- `apps/web/src/pages/settings/AccountDataPage.test.ts`：若斷言到返回連結則同步更新。
- `apps/web/src/pages/MorePage.vue`：移除「跨裝置同步」卡；「本機資料管理」改名（依裁決 2）。
- `apps/web/src/router/index.ts`：移除 `/settings/sync` 路由。
- `DESIGN.md` 第五節、`docs/decisions/2026-08-15-redesign-sitemap-userflow-current.md` §2.4：回寫實際結構。
- `docs/superpowers/plans/2026-08-29-b9-icon-first-more-page.md`：更新分類表（兩列變一列）。

### 合併後的頁面分區

| 順序 | 區塊 | 來源 | 層級 |
| ---: | --- | --- | --- |
| 1 | 這台裝置儲存了什麼 | `DataSettingsPage`（`data-summary-title`） | 第一層 |
| 2 | 匯出 | `DataSettingsPage`（`data-export-title`） | 第一層 |
| 3 | 清除 | `DataSettingsPage`（`data-clear-title`） | 第一層 |
| 4 | 跨裝置同步 | `SyncSettingsPage` 全部三個區塊 | **次要區塊** |

`DataSettingsPage` 的第 4 張卡 `cloud-data-link-title`（「雲端資料請到另一頁管理」）**整張刪除**——它的存在理由就是這次要消掉的拆分。

---

### Task 1: 先把測試搬過來，再動模板

先寫測試是為了讓「同步功能沒有在搬家過程中掉東西」變成可驗證的，而不是靠肉眼比對兩個檔案。

- [ ] 讀 `SyncSettingsPage.test.ts`，列出它斷言的每一項行為
- [ ] 在 `DataSettingsPage` 的測試檔（若不存在則新建 `DataSettingsPage.test.ts`）加入同樣的斷言，先讓它們**失敗**（模板還沒搬）
- [ ] 記錄失敗清單，作為 Task 2 的完成條件

### Task 2: 把同步區塊搬進 `DataSettingsPage`

- [ ] 把 `SyncSettingsPage.vue` 的三個區塊（目前使用免登入模式／同步已停止／先看同步內容）搬進 `DataSettingsPage.vue`，放在清除區塊之後
- [ ] 一併搬 `createSyncController` 的接線與相關 scoped 樣式
- [ ] 用視覺層級把「次要區塊」做出來（`DESIGN.md` 第六節：每頁一個主任務）——**具體做法留給實作者，但必須說明選擇理由**，不要只是接在後面
- [ ] 同步區塊裡指向 `/settings/account-data` 的連結保留
- [ ] **刪除 `cloud-data-link` 那張卡**（標題、說明、按鈕整張）
- [ ] Task 1 記錄的失敗斷言全部轉綠
- [ ] `pnpm check` 全綠

### Task 3: 收掉舊路由與舊頁面

- [ ] 刪除 `SyncSettingsPage.vue` 與 `SyncSettingsPage.test.ts`
- [ ] `router/index.ts` 移除 `/settings/sync`，不留轉址
- [ ] `AccountDataPage.vue` 的返回連結 `/settings/sync` → `/settings/data`；若 `AccountDataPage.test.ts` 有斷言到，同步更新
- [ ] 全域搜尋 `settings/sync` 與 `SyncSettingsPage`，確認沒有殘留引用
- [ ] `pnpm check` 全綠

### Task 4: 「更多」頁收一張卡

- [ ] 移除「跨裝置同步」入口卡
- [ ] 依裁決 2 決定「本機資料管理」是否改名為「本機資料與隱私」
- [ ] 依裁決 3 套用合併後的說明文字
- [ ] 確認 `entries` 的 publishable gate 邏輯不受影響（`/help`、`/special-situation` 的過濾）
- [ ] `pnpm check` 全綠

### Task 5: 驗證

- [ ] Browser pane 走一遍：`/more` → 本機資料與隱私 → 同步區塊 → 登入與雲端資料 → 返回
- [ ] 確認同步的四種狀態（未登入／已登入未同步／同步中／同步已停止）在新頁面都顯示正確
- [ ] 確認清除操作的三個範圍與確認彈窗行為未變
- [ ] 390×844 量測「更多」頁：卡片數與版面高度，跟合併前的數字並列
- [ ] 200% zoom 確認合併後的長頁面不破

**驗收標準**：`/more` 少一張卡；合併後的頁面沒有任何「請到另一頁」的導覽補救文字；同步的所有功能都還在。

### Task 6: 回寫文件

- [ ] `DESIGN.md` 第五節：`more-entry-card` 的排序與 `/settings/*` 結構回寫成合併後的實際狀態
- [ ] Sitemap §2.4：更新那張「實際是八張卡」的表，並註明這次是**把落差收回文件的方向**，不是又一次漂移
- [ ] `docs/decisions/2026-08-29-settings-data-sync-merge.md`：回寫三個裁決的結果與實際完成狀態
- [ ] `docs/superpowers/plans/2026-08-29-b9-icon-first-more-page.md`：分類表兩列併一列，並更新「實際渲染幾張卡」的數字
- [ ] `docs/superpowers/plans/README.md`、`docs/decisions/README.md`：狀態更新

---

## Final Self-Review Checklist

- [ ] 同步與本機資料的行為完全沒變，只有頁面組織變了
- [ ] `cloud-data-link` 那張純導覽卡已消失，而且沒有用別的形式復活
- [ ] `/settings/sync` 已移除且沒有殘留引用；沒有留轉址
- [ ] `/settings/account-data` 仍是獨立頁，從同步區塊進得去、回得來
- [ ] 合併後的頁面看得出「本機備份是主任務、同步是次要區塊」，而不是四個等重的區塊接在一起
- [ ] 「更多」頁確實少一張卡，而且合併後的說明文字經過裁決、不是實作時自己寫的
- [ ] B9 計畫的分類表已同步更新
- [ ] `pnpm check` 全綠
- [ ] 390px、200% zoom 都實際看過
