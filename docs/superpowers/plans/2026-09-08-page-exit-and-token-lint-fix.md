# Page Exit Registry and Typography Token Lint Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 修正法律頁出口登記與首頁不存在的 typography token，讓 `pnpm check` 恢復全綠。

**Architecture:** 只調整既有守門測試的 `DRILL_DOWN` 語意白名單，以及首頁既有 CSS 宣告的 token 名稱。法律頁的返回路由、icon 元件與設計 token 定義均保持不變。

**Tech Stack:** Vue 3、TypeScript、Vitest、Stylelint、pnpm monorepo。

## Global Constraints

- 只修改 `apps/web/src/pages/pageExitIcons.test.ts` 與 `apps/web/src/pages/HomePage.vue`。
- `PrivacyPolicyPage.vue`、`TermsPage.vue` 的 `tool-arrow-left` 與返回更多行為不可改變。
- 使用現有 `--font-size-caption`；不得新增、重新命名或刪除 CSS token。
- 不修改私密摘要後端、Supabase、Resend、Cron、Vault、Vercel 或法律頁文案。
- 不觸碰 `apps/web/src/features/education/education-content.generated.ts` 的既有未提交修改。

---

### Task 1: 登記法律頁出口並修正首頁字體 token

**Files:**
- Modify: `apps/web/src/pages/pageExitIcons.test.ts:53-69`
- Modify: `apps/web/src/pages/HomePage.vue:744-750`
- Test: `apps/web/src/pages/pageExitIcons.test.ts`

**Interfaces:**
- Consumes: `PrivacyPolicyPage.vue` 與 `TermsPage.vue` 現有 `IconButton icon="tool-arrow-left"`。
- Produces: `DRILL_DOWN` 完整登記所有階層下鑽頁；首頁 CSS 僅引用已定義的 typography token。

- [ ] **Step 1: 驗證出口守門測試目前失敗**

Run: `pnpm test -- apps/web/src/pages/pageExitIcons.test.ts`  
Expected: FAIL；錯誤列出 `apps/web/src/pages/PrivacyPolicyPage.vue` 與 `apps/web/src/pages/TermsPage.vue` 尚未登記。

- [ ] **Step 2: 驗證 Stylelint 目前失敗**

Run: `pnpm lint`  
Expected: FAIL；Stylelint 指出 `apps/web/src/pages/HomePage.vue` 使用未知 custom property `--font-size-small`。

- [ ] **Step 3: 最小修正出口白名單**

在 `DRILL_DOWN` 陣列加入下列兩項，維持字母／頁面群組的既有排序：

```ts
  "pages/PrivacyPolicyPage.vue",
  "pages/TermsPage.vue",
```

不得把兩頁放入 `ABANDONABLE`，因為它們返回「更多」而非放棄未完成流程。

- [ ] **Step 4: 最小修正首頁 CSS token**

```css
.home__policy-links {
  font-size: var(--font-size-caption);
}
```

只取代 `--font-size-small`，保留 selector 的 layout、gap、wrap 與連結色彩。

- [ ] **Step 5: 重跑 focused 驗證**

Run: `pnpm test -- apps/web/src/pages/pageExitIcons.test.ts; pnpm lint`  
Expected: PASS；出口白名單測試與 Stylelint 皆成功。

- [ ] **Step 6: 執行完整驗證**

Run: `pnpm check`  
Expected: PASS；此結果會解除私密摘要 Task 4 的完整本機驗證阻塞。

- [ ] **Step 7: Commit**

```bash
git add -- apps/web/src/pages/pageExitIcons.test.ts apps/web/src/pages/HomePage.vue docs/superpowers/plans/2026-09-08-page-exit-and-token-lint-fix.md
git commit -m "fix(web): restore page exit and token checks"
```

## Review Gate

- 由獨立 reviewer 確認兩個最小改動不改變法律頁行為、不新增 token，且完整驗證證據真實。
- 通過後，回到 `2026-09-07-private-privacy-request-digest` 的 Task 4，重新執行其完整本機驗證；未完成前不得進行正式部署。
