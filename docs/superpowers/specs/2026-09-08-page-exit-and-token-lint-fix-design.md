# Page Exit Registry and Typography Token Lint Fix Design

**日期：** 2026-09-08  
**狀態：** 設計已同意，待規格審閱後才建立實作計畫。

## 目標

修正阻擋 UVAlert 全專案 `pnpm check` 的兩個既有前端驗證錯誤，使私密隱私請求摘要功能可取得完整本機驗證，而不改變頁面行為或設計系統範圍。

## 根因

1. `PrivacyPolicyPage.vue` 與 `TermsPage.vue` 已使用階層下鑽語意的 `tool-arrow-left` 返回按鈕，但未登記到 `pageExitIcons.test.ts` 的 `DRILL_DOWN` 白名單，守門測試因此判定有未登記頁面。
2. `HomePage.vue` 的 `.home__policy-links` 使用不存在的 `--font-size-small` CSS custom property；設計系統現有的相同小型輔助文字 token 是 `--font-size-caption`。

## 選定修正

- 在 `DRILL_DOWN` 新增：
  - `pages/PrivacyPolicyPage.vue`
  - `pages/TermsPage.vue`
- 將 `.home__policy-links` 的 `font-size` 改成 `var(--font-size-caption)`。

## 不在範圍

- 不新增或重新命名 typography token。
- 不修改法律頁文字、路由、返回目的地或按鈕圖示。
- 不修改私密摘要 Edge Function、Supabase migration、Resend、Cron、Vault 或正式環境。
- 不觸碰 `apps/web/src/features/education/education-content.generated.ts` 的既有未提交修改。

## 驗證

1. 先執行 `pageExitIcons.test.ts`，確認法律頁缺少白名單登記而失敗。
2. 先執行 Stylelint／`pnpm lint`，確認 `--font-size-small` 是未知 property 而失敗。
3. 以最小修改修正兩項根因後，重跑兩項 focused checks。
4. 執行 `pnpm check`；只有全綠才解除私密摘要 Task 4 的完整本機驗證阻塞。

## 完成定義

- 所有使用 `tool-arrow-left`／`tool-close` 的頁面出口都在正確白名單中。
- 首頁不再引用不存在的字體大小 token。
- `pnpm check` 通過，且不造成任何私密摘要或法律頁功能變更。
