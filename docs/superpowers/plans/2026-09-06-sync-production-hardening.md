# Sync Production Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓 Vercel 正式站可安全呼叫 Supabase 四支跨裝置同步 Function，並以正式環境證據確認路徑、CORS、JWT、payload validation 與資料隔離。

**Architecture:** 前端仍直接使用 Supabase Auth access token；`VITE_API_BASE_URL` 指向 Supabase `/functions/v1`。Adapter 將產品層操作明確映射到 `sync-manifest`、`sync-read`、`sync-commit`、`sync-delete`。正式 smoke 已證明平台 JWT 開啟時 OPTIONS 仍可抵達 handler，因此保留平台 JWT 與 `_shared/auth.ts` 的雙層驗證。Edge payload validation 必須與 `packages/contracts` 的公開 contract 等價。

**Tech Stack:** Vue 3、TypeScript、Vitest、Zod、Supabase Auth/PostgreSQL/Edge Functions、Vercel。

## Global Constraints

- 不登入仍可使用本機提醒；同步失敗不得刪除或覆蓋 IndexedDB 資料。
- 瀏覽器只能取得 Supabase URL、publishable key 與 API base；service-role key 不得出現在 `VITE_*`、bundle、response 或 log。
- 四支同步 Function 保留平台 JWT 驗證，且 handler 的非 OPTIONS 路徑仍必須由 `_shared/auth.ts` 驗證永久使用者；匿名或未登入不可讀寫同步資料。
- `ALLOWED_ORIGINS` 必須精確包含 `https://uv-alert-web.vercel.app`，不得使用萬用字元。
- revision conflict 必須回 `409 SYNC_CONFLICT` 且整批不提交；相同 idempotency key 只回放原結果。
- 不修改另一個 AI 的 UI、Logo、教育內容或提醒流程。
- 每個 Task 必須先有失敗測試、最小修正、聚焦測試與獨立審查，完成後才勾選。

---

### Task 1: 對齊前端操作與 Supabase Function 原生路徑

**Files:**

- Modify: `apps/web/src/adapters/SupabaseCloudSyncAdapter.ts`
- Modify: `apps/web/src/adapters/SupabaseCloudSyncAdapter.test.ts`
- Test: `apps/web/src/app/createWebAppServices.test.ts`

**Interfaces:**

- Consumes: `VITE_API_BASE_URL=https://ykfdnltaqpdytmrszbbk.supabase.co/functions/v1`
- Produces: `manifest -> /sync-manifest`、`read -> /sync-read`、`commit -> /sync-commit`、`delete -> /sync-delete`、`deleteAccount -> /account-delete`

- [x] **Step 1: 補上五個原生 Function URL 的 failing tests**
- [x] **Step 2: 執行聚焦測試並確認舊 `/sync/...` 路徑使測試失敗**
- [x] **Step 3: 以單一 operation-to-slug mapping 實作，避免呼叫端自行拼字**
- [x] **Step 4: 執行 adapter 與 service composition 測試**
- [x] **Step 5: 獨立規格與品質審查通過後提交**

### Task 2: 鎖定 CORS preflight 與雙層 JWT 驗證邊界

**Files:**

- Modify: `supabase/config.toml`
- Modify: `supabase/functions/sync-manifest/index.test.ts`
- Modify: `supabase/functions/sync-commit/index.test.ts`
- Create or Modify: `supabase/functions/sync-read/index.test.ts`
- Create or Modify: `supabase/functions/sync-delete/index.test.ts`

**Interfaces:**

- Consumes: production `ALLOWED_ORIGINS` 與 Supabase Auth Bearer token
- Produces: 四支 Function 保留平台 `verify_jwt=true`；approved-origin OPTIONS 204；無 token 的實際請求回 401，前端依 HTTP status 映射為 `AUTH_REQUIRED`

- [x] **Step 1: 補四支 Function 的 OPTIONS、method 與 handler 未登入 failing tests**
- [x] **Step 2: 在 `supabase/config.toml` 明確加入四個 `[functions.sync-*] verify_jwt = true`，避免部署預設值漂移**
- [x] **Step 3: 確認非 OPTIONS 路徑仍先呼叫 `requirePermanentUser`，且 adapter 可將平台 401 映射為 `AUTH_REQUIRED`**
- [x] **Step 4: 執行四支 handler 測試、config guard test，並保留正式 OPTIONS 204／未登入 401 證據**
- [x] **Step 5: 獨立安全審查通過後提交**

### Task 3: 使 Edge payload validation 與共用 contract 等價

**Files:**

- Modify: `supabase/functions/_shared/sync.ts`
- Modify: `supabase/functions/sync-commit/index.test.ts`
- Test: `packages/contracts/src/sync.test.ts`

**Interfaces:**

- Consumes: `SyncCommitRequestV1Schema` 對四種 `recordKind` 的完整限制
- Produces: Edge 在 RPC 前拒絕所有共用 schema 會拒絕的 payload，回 `422 VALIDATION_ERROR`

- [x] **Step 1: 以合法 fixture 逐欄變異，加入共用 schema 拒絕但 Edge 舊版接受的 failing matrix**
- [x] **Step 2: 收斂 Edge schema，完整檢查 active session/event stream、product snapshot、region preference 與 user preferences**
- [x] **Step 3: 執行 Edge、contracts 與 sync controller 聚焦測試**
- [ ] **Step 4: 執行 `pnpm check`、`pnpm build`、`supabase db reset`、`supabase test db`**
- [x] **Step 5: 獨立規格與品質審查通過後提交**

### Task 4: 重新部署並驗證正式同步服務

**Files:**

- Modify: `docs/backend/deployment-checklist.md`
- Modify: `docs/backend/preview-deployment.md`

**Interfaces:**

- Consumes: Tasks 1–3 已審查的 commits、正式 Supabase project `ykfdnltaqpdytmrszbbk`
- Produces: 四支 ACTIVE Function、正式 CORS/JWT smoke 證據、Vercel intended commit 與不含 secret 的部署紀錄

- [x] **Step 1: 唯讀確認 project、migration、secret 名稱與待部署 diff**
- [x] **Step 2: 依序部署 `sync-manifest`、`sync-read`、`sync-commit`、`sync-delete`**
- [x] **Step 3: 驗證 approved-origin OPTIONS 204、未登入 401 JSON、錯誤 method/validation 不寫資料**
- [ ] **Step 4: 以永久測試帳號驗證 manifest、commit、idempotency replay、read、409 conflict、delete 與帳號隔離**
- [ ] **Step 5: 更新 Vercel production、執行 bundle secret scan 與登入後瀏覽器 smoke**
- [ ] **Step 6: 回填部署紀錄、完成整體審查；只有具備證據的項目才勾選**

### Follow-up: Sync table role privileges

**Root cause:** 2026-09-06 production PostgreSQL logs showed that the
`authenticated` role lacked table-level `SELECT` on `sync_records` and
`sync_tombstones`. RLS policies existed, but PostgreSQL evaluates table
privileges before RLS policies.

- [x] **Step 1: Add regression tests for authenticated sync access and anon denial**
- [x] **Step 2: Add a least-privilege migration: revoke sync table access from public/anon and grant authenticated CRUD**
- [x] **Step 3: Reset local Supabase and run all 171 SQL tests**
- [x] **Step 4: Apply `20260906000000_sync_table_privileges.sql` to production Supabase**
- [x] **Step 5: Verify production signed-in sync preview reads successfully without uploading local data**
