# UVAlert v1 Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 建立不影響免登入本機提醒的 Supabase 後端，提供可選 Google 登入／跨裝置同步、UV 預報代理、問題回報與雲端資料清除。

**Architecture:** PWA 繼續以 IndexedDB 作為提醒與離線資料來源；Supabase Auth 只在使用者主動選擇同步後建立永久登入身份。Supabase Edge Functions 是所有需要授權、版本衝突檢查、CWA secret 或限流的伺服器邏輯入口，PostgreSQL 以版本化 JSON records 保存第一版同步資料，RLS 限制每個帳號只能存取自己的資料。

**Tech Stack:** Vue 3、TypeScript、pnpm monorepo、Zod contracts、Supabase Auth、Supabase PostgreSQL、Supabase Edge Functions、Vitest、Supabase CLI。

## Global Constraints

- 核心仍是防曬乳補擦倒數，不是雲端帳號或歷史紀錄。
- 使用者可免註冊直接使用；本機 IndexedDB 是提醒與離線操作的必要基礎。
- Google 登入與跨裝置同步是選配，不是開始提醒的前置條件。
- 第一版只同步進行中提醒、裝備、行政區與使用者偏好；已結束 Session／完整歷史事件留在本機。
- 不建立自動雲端匿名帳號；OAuth 取消、失敗或離線時本機資料完全不變。
- 不同步精確座標、裝置識別碼、瀏覽器通知權限、UV 快取與未完成設定草稿。
- 第一版不建立裝備照片 Storage；分享圖片在使用者裝置上產生。
- UV API 授權碼、Supabase service role key 與其它 secret 不得進入前端 bundle、git 或 API response。
- 所有 sync payload 必須通過 `packages/contracts` 的 Zod schema；所有同步寫入使用每筆 record 的 `expectedRevision` 與 `idempotencyKey`。
- revision 衝突回傳 `409 SYNC_CONFLICT`，整批不提交，不自動覆蓋本機或雲端資料。
- 後端不可取代本機倒數；PWA 在後端不可用時仍須能倒數、補擦、結束 Session 與使用本機快取。
- 第一版不建立專用管理員前台；回報先透過 Supabase Dashboard 查看。
- 每個完成的任務都要執行相關測試，並以小型 commit 保存。

---

## 檔案地圖與責任分界

### 將新增的共用／後端檔案

- `supabase/config.toml`：Supabase 本機服務設定。
- `supabase/migrations/20260817000100_backend_foundation.sql`：同步、UV 快取、回報資料表、索引與 RLS。
- `supabase/functions/_shared/cors.ts`：允許網域與 CORS response headers。
- `supabase/functions/_shared/http.ts`：統一錯誤 response、JSON body 與 request id。
- `supabase/functions/_shared/auth.ts`：從 Authorization header 取得並驗證永久使用者。
- `supabase/functions/_shared/contracts.ts`：Edge Function 端 payload 驗證與 safe error mapping。
- `supabase/functions/_shared/cwa.ts`：中央氣象署 request、ETag／快取與資料轉換。
- `supabase/functions/sync-manifest/index.ts`：雲端摘要。
- `supabase/functions/sync-read/index.ts`：確認後讀取 records。
- `supabase/functions/sync-commit/index.ts`：revision／冪等同步提交。
- `supabase/functions/sync-delete/index.ts`：同步 tombstone。
- `supabase/functions/uv-forecast/index.ts`：UV 代理 API。
- `supabase/functions/feedback/index.ts`：匿名回報 API。
- `supabase/functions/account-delete/index.ts`：刪除 UVAlert 雲端帳號與同步資料。
- `packages/contracts/src/sync.ts`：sync record、manifest、commit 與 conflict schemas。
- `packages/contracts/src/feedback.ts`：feedback request／response schemas。
- `packages/platform/src/cloud.ts`：Auth、CloudSync、Feedback ports。
- `apps/web/src/adapters/SupabaseAuthAdapter.ts`：Supabase Auth 封裝。
- `apps/web/src/adapters/SupabaseCloudSyncAdapter.ts`：manifest／read／commit／delete HTTP adapter。
- `apps/web/src/adapters/BrowserFeedbackClient.ts`：feedback HTTP adapter。
- `apps/web/src/features/sync/createSyncController.ts`：預覽、確認、衝突與本機不變保證。
- `apps/web/src/features/sync/createSyncController.test.ts`：同步行為測試。
- `apps/web/src/features/auth/createAuthController.ts`：登入、登出與帳號狀態。
- `apps/web/src/features/auth/createAuthController.test.ts`：Auth 行為測試。
- `apps/web/src/features/feedback/createFeedbackController.ts`：回報狀態與限流錯誤轉譯。
- `apps/web/src/features/feedback/createFeedbackController.test.ts`：回報行為測試。
- `apps/web/src/pages/settings/SyncSettingsPage.vue`：同步預覽、確認與狀態 UI。
- `apps/web/src/pages/settings/SyncSettingsPage.test.ts`：同步頁面測試。
- `apps/web/src/pages/settings/AccountDataPage.vue`：停止同步、清除雲端資料 UI。
- `apps/web/src/pages/settings/AccountDataPage.test.ts`：帳號資料操作測試。
- `apps/web/.env.example`：前端公開 Supabase URL、publishable key 與 API base URL 名稱。
- `supabase/.env.example`：本機／部署所需 CWA secret 名稱，不放實值。

### 將修改的現有檔案

- `package.json`：Supabase CLI／本機服務與驗證 scripts。
- `apps/web/package.json`：加入 `@supabase/supabase-js`。
- `packages/contracts/src/index.ts`：輸出 sync／feedback schemas。
- `packages/platform/src/index.ts`：輸出 cloud ports 與同步型別。
- `apps/web/src/app/createWebAppServices.ts`：建立 adapter／controller 並注入服務。
- `apps/web/src/app/injection.ts`：提供 Auth、Sync、Feedback controller 給頁面。
- `apps/web/src/router/index.ts`：加入同步與帳號資料路由。
- `apps/web/src/pages/MorePage.vue`：加入同步與問題回報入口，不改變提醒主入口。
- `apps/web/src/pages/settings/DataSettingsPage.vue`：保留本機匯出／清除，連結雲端資料操作。

---

## Task 1: 建立 Supabase 本機 scaffold 與環境邊界

**Files:**
- Create: `supabase/config.toml`
- Create: `supabase/.env.example`
- Create: `apps/web/.env.example`
- Modify: `package.json`
- Modify: `apps/web/package.json`
- Test: `supabase/functions/_shared/http.test.ts`

**Interfaces:**
- Consumes: 現有 pnpm workspace 與 Vite app。
- Produces: 可啟動 Supabase 本機服務的設定、前端公開環境變數名稱、統一 JSON error response helper。

- [ ] **Step 1: 建立 Supabase 設定與公開／秘密環境變數範例**

  `apps/web/.env.example` 只列出：

  ```dotenv
  VITE_SUPABASE_URL=
  VITE_SUPABASE_PUBLISHABLE_KEY=
  VITE_API_BASE_URL=/v1
  ```

  `supabase/.env.example` 只列出：

  ```dotenv
  CWA_API_KEY=
  ALLOWED_ORIGINS=http://localhost:5173
  ```

  不放任何可用 token、API key 或資料庫密碼。

- [ ] **Step 2: 建立 Supabase CLI 設定**

  在 `supabase/config.toml` 啟用 Auth、functions 與本機資料庫；Google provider 的 client ID／secret 只以環境變數或 Supabase secrets 讀取，不寫入 toml。

- [ ] **Step 3: 加入依賴與最小 scripts**

  在 `apps/web/package.json` 加入 `@supabase/supabase-js`；root `package.json` 加入：

  ```json
  {
    "supabase:start": "supabase start",
    "supabase:reset": "supabase db reset",
    "supabase:functions:serve": "supabase functions serve"
  }
  ```

- [ ] **Step 4: 建立共用 HTTP error helper 的 failing test**

  在 `supabase/functions/_shared/http.test.ts` 使用 Node-compatible純函式測試：

  ```ts
  it("maps a typed error to stable JSON without exposing stack details", () => {
    const response = errorResponse({
      status: 422,
      code: "VALIDATION_ERROR",
      message: "資料格式不正確"
    });

    expect(response.status).toBe(422);
    expect(response.json).toEqual({
      error: { code: "VALIDATION_ERROR", message: "資料格式不正確" }
    });
    expect(response.json).not.toHaveProperty("stack");
  });
  ```

- [ ] **Step 5: 實作 helper 並執行測試**

  `errorResponse` 必須回傳 `{ status, headers, json }` 的純資料結構，Edge Function handler 再將它轉成 `Response`；讓錯誤 mapping 能在 Vitest 測試而不用啟動 Deno。

  同一階段建立 `_shared/auth.ts` 的 client factory：同步 functions 使用帶入使用者 Authorization header 的 user-scoped client，UV／feedback 使用只在 server-side 可取得的 service-role client 並由各自 handler 做嚴格欄位驗證；service role 不得由共用 browser adapter 讀取。

  Run: `pnpm vitest run supabase/functions/_shared/http.test.ts`

  Expected: PASS。

- [ ] **Step 6: 執行現有型別檢查並提交**

  Run: `pnpm typecheck`

  Expected: PASS；commit `chore: scaffold supabase backend boundary`。

## Task 2: 建立版本化 sync／feedback contracts 與 platform ports

**Files:**
- Create: `packages/contracts/src/sync.ts`
- Create: `packages/contracts/src/feedback.ts`
- Create: `packages/contracts/src/sync.test.ts`
- Create: `packages/contracts/src/feedback.test.ts`
- Create: `packages/test-fixtures/src/sync.ts`
- Create: `packages/platform/src/cloud.ts`
- Modify: `packages/contracts/src/index.ts`
- Modify: `packages/platform/src/index.ts`
- Modify: `packages/test-fixtures/src/index.ts`

**Interfaces:**
- Consumes: `SessionEventStreamV1Schema`、`SessionProjectionSchema`、`ProductCatalogRecordV1Schema`、`RegionPreferenceV1Schema` 與現有 Zod conventions。
- Produces: `SyncRecordEnvelopeV1Schema`、`SyncManifestV1Schema`、`SyncCommitRequestV1Schema`、`SyncConflictV1Schema`、`FeedbackRequestV1Schema`、`AuthPort`、`CloudSyncPort` 與 `FeedbackPort`。

- [ ] **Step 1: 先寫 sync schema failing tests**

  `packages/test-fixtures/src/sync.ts` 先提供 `makeActiveSessionRecord()` 與 `makeTombstone()`，兩者都回傳通過正式 schema 的 fixture；再由 `packages/test-fixtures/src/index.ts` export。`packages/contracts/src/sync.test.ts` 至少涵蓋：

  ```ts
  it("accepts an active session record with a per-record revision", () => {
    const parsed = SyncRecordEnvelopeV1Schema.parse(makeActiveSessionRecord());
    expect(parsed.recordKind).toBe("active_session");
    expect(parsed.revision).toBe(3);
  });

  it("rejects a payload whose record kind and payload schema disagree", () => {
    expect(() =>
      SyncRecordEnvelopeV1Schema.parse({
        recordKind: "region_preference",
        recordId: "region-1",
        schemaVersion: "region-preference-v1",
        revision: 1,
        payload: { schemaVersion: "not-a-region" }
      })
    ).toThrow();
  });

  it("accepts a tombstone without a payload", () => {
    expect(SyncTombstoneV1Schema.parse(makeTombstone())).toMatchObject({
      recordId: "product-1",
      revision: 4
    });
  });
  ```

- [ ] **Step 2: 實作 sync schemas**

  `sync.ts` 定義：

  - `SYNC_SCHEMA_VERSION = "sync-v1"`。
  - `SyncRecordKindSchema`：`active_session`、`product_catalog`、`region_preference`、`user_preferences`。
  - `UserPreferencesV1Schema`：`schemaVersion`、`appearance`、`reminderFrequencyMinutes`（`null` 或 1–120 的整數）、`soundEnabled`、`vibrationEnabled`；不放瀏覽器 permission 或 capability。
  - `SyncRecordEnvelopeV1Schema`：`recordKind`、`recordId`、`schemaVersion`、`revision`、`payload`、`payloadFingerprint`、`updatedAt`。
  - `SyncTombstoneV1Schema`：`recordKind`、`recordId`、`revision`、`deletedAt`。
  - `SyncManifestV1Schema`：record summaries、tombstone summaries、manifest fetched time。
  - `SyncReadRequestV1Schema`、`SyncCommitRequestV1Schema`、`SyncDeleteRequestV1Schema`。
  - `SyncConflictV1Schema`：record key、local summary、remote summary、remote revision。

  `active_session` payload 必須包含 `ProtectionSessionRecord` 與 `SessionEventStreamV1`；`product_catalog` 每筆 payload 必須是 `ProductCatalogRecordV1`；`region_preference` 使用 `RegionPreferenceV1`。

- [ ] **Step 3: 實作 feedback schemas 與 failing tests**

  `FeedbackRequestV1Schema` 的欄位為 `feedbackType`、`message`、`contactEmail`、`appVersion`、`route`、`userAgentSummary`；message 長度限制 1–4000，email 使用 Zod email validation，user agent 只允許短摘要。

  測試必須確認：缺 message、錯誤 email、過長 user agent 皆被拒絕；正常回報可 parse。

- [ ] **Step 4: 建立 platform ports**

  `packages/platform/src/cloud.ts` 定義下列介面：

  ```ts
  export interface AuthPort {
    getState(): Promise<AuthState>;
    signInWithGoogle(): Promise<void>;
    signOut(): Promise<void>;
  }

  export interface CloudSyncPort {
    getManifest(): Promise<SyncManifestV1>;
    read(request: SyncReadRequestV1): Promise<SyncRecordEnvelopeV1[]>;
    commit(request: SyncCommitRequestV1): Promise<SyncCommitResultV1>;
    delete(request: SyncDeleteRequestV1): Promise<SyncDeleteResultV1>;
    deleteAccount(): Promise<void>;
  }

  export interface FeedbackPort {
    submit(request: FeedbackRequestV1): Promise<FeedbackReceiptV1>;
  }
  ```

  同一檔案同時定義 `AuthState = { kind: "signed_out" } | { kind: "signed_in"; userId: string; accessTokenExpiresAt: string | null }`、`CloudError`（`AUTH_REQUIRED`、`FORBIDDEN`、`SYNC_CONFLICT`、`VALIDATION_ERROR`、`RATE_LIMITED`、`UPSTREAM_UNAVAILABLE`、`SERVER_ERROR`）與 `SyncCommitResultV1`／`SyncDeleteResultV1`。Port 不得暴露 Supabase SDK type；錯誤統一轉成 `CloudError` union。

- [ ] **Step 5: 執行 contract／platform tests 與 commit**

  Run: `pnpm vitest run packages/contracts/src/sync.test.ts packages/contracts/src/feedback.test.ts`

  Expected: PASS；Run `pnpm typecheck`，Expected: PASS；commit `feat: add backend sync contracts and ports`。

## Task 3: 建立本機 sync snapshot 與同步 metadata

**Files:**
- Create: `packages/persistence-web/src/repositories/local-sync-repository.ts`
- Create: `packages/persistence-web/src/repositories/local-sync-repository.test.ts`
- Modify: `packages/persistence-web/src/db/database.ts`
- Modify: `packages/persistence-web/src/index.ts`
- Modify: `packages/platform/src/index.ts`

  **Interfaces:**
- Consumes: 現有 `LocalSessionRepository`、`LocalProductCatalogRepository`、`LocalRegionPreferenceRepository`、`LocalDataRepository` 與 Task 2 contracts。
- Produces: `LocalSyncRepository`，可收集第一版允許同步的本機 snapshot、套用使用者選定的雲端 records，以及保存每筆本機 sync metadata。

- [ ] **Step 1: 擴充 Dexie schema 並先寫 transaction tests**

  新增 `syncMetadata` table，key 為 `[recordKind+recordId]`，欄位包含本機 payload fingerprint、最後已確認 cloud revision、lastSyncedAt 與 tombstone flag。

  測試：

  ```ts
  it("snapshot excludes ended sessions, UV cache, drafts and device identity", async () => {
    const snapshot = await repository.collectSyncSnapshot();
    expect(snapshot.records.map(({ recordKind }) => recordKind)).not.toContain(
      "ended_session"
    );
    expect(JSON.stringify(snapshot)).not.toContain("deviceLocalId");
    expect(JSON.stringify(snapshot)).not.toContain("exactLatitude");
  });
  ```

- [ ] **Step 2: 實作 `collectSyncSnapshot`**

  讀取 active session、所有裝備紀錄、行政區 preference 與明確定義的 user preferences；對每筆資料依 contract parse、計算 fingerprint、附上本機 revision。不得讀取或輸出已結束歷史、UV cache、setup draft、device ID、精確座標或 notification permission。

- [ ] **Step 3: 實作 `applySelectedRecords`**

  套用前先將輸入 records 依 payload contract parse；所有本機寫入放在單一 IndexedDB transaction。任一 record 失敗時整批 rollback，並保留原本本機 snapshot。

- [ ] **Step 4: 實作 `applyTombstones` 與 metadata 更新**

  tombstone 套用後刪除本機對應的同步 record，並保存本機已看過的 remote revision，避免下一次 manifest 又把刪除當成未知資料。

- [ ] **Step 5: 執行 persistence tests、完整檢查與 commit**

  Run: `pnpm vitest run packages/persistence-web/src/repositories/local-sync-repository.test.ts`

  Expected: PASS；Run `pnpm check`，Expected: PASS；commit `feat: add local sync snapshot repository`。

## Task 4: 建立 Supabase Auth adapter 與同步控制器

**Files:**
- Create: `apps/web/src/adapters/SupabaseAuthAdapter.ts`
- Create: `apps/web/src/adapters/SupabaseCloudSyncAdapter.ts`
- Create: `apps/web/src/features/auth/createAuthController.ts`
- Create: `apps/web/src/features/auth/createAuthController.test.ts`
- Create: `apps/web/src/features/sync/createSyncController.ts`
- Create: `apps/web/src/features/sync/createSyncController.test.ts`
- Modify: `apps/web/src/app/createWebAppServices.ts`
- Modify: `apps/web/src/app/injection.ts`

**Interfaces:**
- Consumes: Task 2 `AuthPort`／`CloudSyncPort`、Task 3 `LocalSyncRepository`、現有 boot／connectivity controller。
- Produces: Auth state、sync preview state、confirm／cancel／conflict actions，且在任何 cloud error 時不改本機資料。

- [ ] **Step 1: 寫 Auth controller failing tests**

  測試檔案頂端定義 test-only 的 `makeLocalSyncRepositoryWithActiveSession()` 與 `makeAuthPortThatRejects(code)` fixture；兩者不進 production bundle。

  測試登入成功、OAuth 取消、登入失敗、登出不影響 local repository：

  ```ts
  it("keeps local data when Google OAuth is cancelled", async () => {
    const local = makeLocalSyncRepositoryWithActiveSession();
    const auth = makeAuthPortThatRejects("AUTH_CANCELLED");
    const controller = createAuthController({ auth, local });

    await expect(controller.signInWithGoogle()).resolves.toBe(false);
    expect(await local.getActiveSession()).toEqual(
      expect.objectContaining({ sessionId: "local-session-1" })
    );
  });
  ```

- [ ] **Step 2: 實作 `SupabaseAuthAdapter`**

  使用 `createClient(VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY)`；只實作 Google OAuth redirect、session state subscription 與 sign out。不得在 adapter 內建立匿名使用者，也不得把 service role key 讀進 browser。

- [ ] **Step 3: 寫 Sync controller preview／confirm／conflict tests**

  測試四種情境：雲端空白、本機空白、雙方有資料且無衝突、revision conflict；另測取消預覽與 network error 均不呼叫 local apply。

- [ ] **Step 4: 實作 `SupabaseCloudSyncAdapter`**

  封裝 `GET /v1/sync/manifest`、`POST /v1/sync/read`、`POST /v1/sync/commit`、`POST /v1/sync/delete`、`POST /v1/account/delete`；所有 response 先用 contract parse，再轉成 platform `CloudError`。

- [ ] **Step 5: 實作 `createSyncController`**

  controller 流程固定為：collect local snapshot → get manifest → 建立 preview → 等待 user action → read 或 commit → 成功後 apply local records／metadata。任何步驟失敗都只更新錯誤狀態，不呼叫 destructive local operation。

- [ ] **Step 6: 注入 services 並執行前端測試**

  在 `createWebAppServices.ts` 建立 Auth、LocalSync、CloudSync、Sync controller；未設定 Supabase env 時提供 disabled adapter，讓既有免登入測試與離線開發仍能啟動。

  Run: `pnpm vitest run apps/web/src/features/auth/createAuthController.test.ts apps/web/src/features/sync/createSyncController.test.ts`

  Expected: PASS；Run `pnpm check`，Expected: PASS；commit `feat: add optional google sync client flow`。

## Task 5: 建立 PostgreSQL migration、索引與 RLS

**Files:**
- Create: `supabase/migrations/20260817000100_backend_foundation.sql`
- Create: `supabase/tests/backend_foundation.sql`
- Create: `supabase/seed.sql`

**Interfaces:**
- Consumes: Task 2 的 record kinds、revision、tombstone 與 feedback 欄位。
- Produces: `sync_records`、`sync_tombstones`、`uv_forecast_cache`、`feedback_submissions` tables；RLS policy；Edge Functions 可使用的 indexes。

- [ ] **Step 1: 寫 migration 驗收 SQL**

  `supabase/tests/backend_foundation.sql` 先檢查四張表、必要 unique constraints、foreign keys、`updated_at` indexes 與 RLS enabled flags 存在；測試用 service role seed 建立兩個 user 的 records。

- [ ] **Step 2: 建立四張資料表與 constraints**

  `sync_records` 與 `sync_tombstones` 使用 `(user_id, record_kind, record_id)` unique key；revision 為正整數；payload 為非空 JSONB；`feedback_submissions.contact_email` 可為 null；`uv_forecast_cache.region_code` 為 primary key。

- [ ] **Step 3: 建立 RLS policies**

  sync tables 的 select／insert／update／delete 只允許 `auth.uid() = user_id` 且 JWT 的 `is_anonymous` 不是 true；UV cache 與 feedback tables 不授予 anon／authenticated 直接任意寫入，改由 Edge Function 使用受控 client。

- [ ] **Step 4: 建立索引與 seed**

  建立 `sync_records(user_id, updated_at)`、`sync_tombstones(user_id, deleted_at)` 與 `feedback_submissions(created_at, status)`；seed 只放測試用 fake forecast，不放 CWA secret 或真實使用者資料。

- [ ] **Step 5: 啟動本機 DB 並執行 SQL test**

  Run: `supabase start`；Run: `supabase db reset`；Run: `supabase test db`

  Expected: migration 成功、RLS 測試通過、不同 user 讀不到彼此 records；commit `feat: add backend database schema and rls`。

## Task 6: 實作同步 Edge Functions

**Files:**
- Create: `supabase/functions/_shared/sync.ts`
- Create: `supabase/functions/_shared/idempotency.ts`
- Create: `supabase/functions/sync-manifest/index.ts`
- Create: `supabase/functions/sync-read/index.ts`
- Create: `supabase/functions/sync-commit/index.ts`
- Create: `supabase/functions/sync-delete/index.ts`
- Create: `supabase/functions/sync-manifest/index.test.ts`
- Create: `supabase/functions/sync-commit/index.test.ts`

**Interfaces:**
- Consumes: Task 2 contracts、Task 5 tables／RLS、Task 1 HTTP／auth helpers。
- Produces: `/v1/sync/manifest`、`/v1/sync/read`、`/v1/sync/commit`、`/v1/sync/delete` 的穩定 JSON API。

- [ ] **Step 1: 寫 manifest handler tests**

  測試永久 user 可取得自己的摘要、另一 user 不會出現在 response、匿名／無 token 回 `401 AUTH_REQUIRED`，且 response 不含 payload。

- [ ] **Step 2: 實作 `_shared/sync.ts`**

  提供 `parseOwnedRecordKey`、`readManifestForUser`、`readSelectedRecords`、`validateRecordPayload` 與 `buildConflict`。每個 record kind 都呼叫對應 Zod schema，不允許以 generic JSONB 繞過 validation；read／manifest／commit 的 user-scoped queries 必須仍由 RLS 檢查 `auth.uid()`。

- [ ] **Step 3: 實作 manifest／read functions**

  handler 使用 user-scoped client 讀取資料；manifest 只回傳 record key、revision、fingerprint、updatedAt、counts 與 tombstone summaries；read 只接受 manifest 已確認的 keys，並再次驗證 ownership。

- [ ] **Step 4: 寫 commit failing tests**

  測試：正常建立 record、同 expected revision 更新、錯 revision 回 `409` 且資料不變、payload invalid 回 `422` 且資料不變、相同 idempotency key 重送只得到原結果。

- [ ] **Step 5: 實作 idempotency 與 commit transaction**

  以 `idempotencyKey + user_id` 建立受控 receipt；commit transaction 逐筆檢查 expected revision，任一不符就 rollback；全部通過後才寫 records／tombstones 與 receipt。若相同 key 已成功，直接回放原結果。

- [ ] **Step 6: 實作 delete function**

  delete 只能寫入 tombstone、提高該 record revision 並移除 live payload；不得接受任意 payload 作為刪除。測試舊裝置提交較低 revision 時回 `409`。

- [ ] **Step 7: 執行 Edge Function tests 與本機 endpoint smoke test**

  Run: `supabase functions serve`; 另開 terminal 執行 `pnpm vitest run supabase/functions/sync-manifest/index.test.ts supabase/functions/sync-commit/index.test.ts`。

  Expected: PASS；以本機 Supabase URL 呼叫四個 endpoint，確認 response code／body 與 contract 一致；commit `feat: add sync edge functions`。

## Task 7: 實作 CWA UV proxy／cache

**Files:**
- Create: `supabase/functions/_shared/cwa.test.ts`
- Create: `supabase/functions/uv-forecast/index.ts`
- Create: `supabase/functions/uv-forecast/index.test.ts`
- Modify: `apps/web/src/adapters/BrowserUvForecastClient.ts`
- Modify: `apps/web/src/adapters/BrowserUvForecastClient.test.ts`

**Interfaces:**
- Consumes: 現有 `/v1/uv/forecast` client、`FiveDayUvForecastSchema`、CWA F-D0047-091、Task 5 `uv_forecast_cache`。
- Produces: 不需登入、隱藏 CWA key、可快取且回應格式固定的 UV endpoint。

- [ ] **Step 1: 寫 CWA response mapping tests**

  fixture 必須覆蓋成功 JSON、缺少必要區域、非法 UVI、空值／過期資料與 CWA HTTP 401／429；schema invalid 不得寫入 cache。

- [ ] **Step 2: 實作 `_shared/cwa.ts`**

  將 CWA request 放在 server-only helper；API key 由 `Deno.env.get("CWA_API_KEY")` 取得；支援 `ETag`／`If-None-Match`；把來源資料轉成 `FiveDayUvForecastSchema` 所需欄位；任何 secret 不放 error message。

- [ ] **Step 3: 寫 UV function handler**

  驗證 `regionCode` 是白名單行政區；先讀 `usable_until` 內 cache；cache miss 才呼叫 CWA；成功 parse 後 transaction 寫 cache 並回傳；上游失敗回 `503 UPSTREAM_UNAVAILABLE`。

- [ ] **Step 4: 執行 endpoint tests**

  Run: `pnpm vitest run supabase/functions/uv-forecast/index.test.ts apps/web/src/adapters/BrowserUvForecastClient.test.ts`

  Expected: PASS；確認前端仍只呼叫 `/v1/uv/forecast?regionCode=...`；commit `feat: add cwa uv forecast proxy`。

## Task 8: 實作匿名問題回報 API

**Files:**
- Create: `supabase/functions/_shared/rate-limit.ts`
- Create: `supabase/functions/feedback/index.ts`
- Create: `supabase/functions/feedback/index.test.ts`
- Create: `apps/web/src/adapters/BrowserFeedbackClient.ts`
- Create: `apps/web/src/features/feedback/createFeedbackController.ts`
- Create: `apps/web/src/features/feedback/createFeedbackController.test.ts`

**Interfaces:**
- Consumes: Task 2 `FeedbackRequestV1Schema`、Task 5 `feedback_submissions`、Task 1 error／CORS helpers。
- Produces: 不需登入的 `/v1/feedback`，回傳不含私人資料的 feedback receipt。

- [ ] **Step 1: 寫 feedback function tests**

  測試未登入可以成功送出、缺 message／錯誤 email 回 `422`、過度頻繁回 `429`、重複 payload 不建立多筆、寫入資料不包含 Session／精確位置欄位。

- [ ] **Step 2: 實作限流與 request validation**

  以短時間視窗與雜湊後的 client fingerprint 做基本限流；不要把原始 IP 或完整 user agent 當成回報內容保存。超過限制回 `429 RATE_LIMITED`。

- [ ] **Step 3: 實作 feedback function**

  只允許 Edge Function 使用受控 database client 寫入 `feedback_submissions`；message、type、email 與 metadata 先 parse；成功回傳 `{ receiptId, createdAt }`，不回傳資料表 row。

- [ ] **Step 4: 實作前端 adapter／controller**

  controller 只收集目前 route、app version 與瀏覽器短摘要；不讀取 session repository、region precision 或 product private note。送出中禁止重複提交，錯誤轉為可理解狀態。

- [ ] **Step 5: 執行測試並提交**

  Run: `pnpm vitest run supabase/functions/feedback/index.test.ts apps/web/src/features/feedback/createFeedbackController.test.ts`

  Expected: PASS；Run `pnpm check`，Expected: PASS；commit `feat: add anonymous feedback endpoint`。

## Task 9: 實作帳號資料清除與同步設定頁

**Files:**
- Create: `supabase/functions/account-delete/index.ts`
- Create: `supabase/functions/account-delete/index.test.ts`
- Create: `apps/web/src/pages/settings/SyncSettingsPage.vue`
- Create: `apps/web/src/pages/settings/SyncSettingsPage.test.ts`
- Create: `apps/web/src/pages/settings/AccountDataPage.vue`
- Create: `apps/web/src/pages/settings/AccountDataPage.test.ts`
- Modify: `apps/web/src/router/index.ts`
- Modify: `apps/web/src/pages/MorePage.vue`
- Modify: `apps/web/src/pages/settings/DataSettingsPage.vue`

**Interfaces:**
- Consumes: Task 4 Auth／Sync controllers、Task 6 sync functions、Task 8 feedback controller。
- Produces: 同步預覽、確認、衝突、停止同步、登出與刪除 UVAlert 雲端資料的可操作頁面。

- [ ] **Step 1: 寫 account-delete function tests**

  測試 user A 只能刪除自己的 sync records／tombstones、刪除後無法再 read、Google provider account 不受影響、匿名／無 confirmation 回 `401` 或 `422` 且資料不變。

- [ ] **Step 2: 實作 account-delete transaction**

  驗證永久 user 與明確 confirmation；在受控 transaction 中刪除該 user 的 sync records／tombstones，再刪除 UVAlert Auth user；response 不包含 user identity 或 Google token。

- [ ] **Step 3: 寫同步設定頁 tests**

  測試：未登入顯示免登入可用與 Google sync CTA；登入後顯示 manifest preview；取消不變更資料；conflict 顯示本機／雲端選項；停止同步保留雲端；清除雲端要求二次確認。

- [ ] **Step 4: 實作同步／帳號頁與路由**

  `/settings/sync` 只承載登入、預覽、確認與衝突；`/settings/account-data` 承載停止同步、登出、清除雲端；`/settings/data` 保留本機匯出／清除並清楚分開兩種資料。

- [ ] **Step 5: 更新 More 入口與執行頁面測試**

  在 More page 加入「本機資料與隱私」下的同步／帳號入口與「問題回報與意見回饋」入口；不新增下排導覽項目，不改根網址提醒頁。

  Run: `pnpm vitest run apps/web/src/pages/settings/SyncSettingsPage.test.ts apps/web/src/pages/settings/AccountDataPage.test.ts`

  Expected: PASS；commit `feat: add sync and account data settings`。

## Task 10: 端到端驗證、文件與部署檢查

**Files:**
- Create: `supabase/README.md`
- Create: `docs/backend/README.md`
- Create: `docs/backend/local-development.md`
- Create: `docs/backend/deployment-checklist.md`
- Modify: `README.md`
- Modify: `package.json`

**Interfaces:**
- Consumes: Tasks 1–9 的 migration、functions、front-end controllers 與 tests。
- Produces: 新開發者可依文件啟動本機 Supabase、執行測試、設定 Google／CWA secrets，並知道如何部署而不暴露 secrets。

- [ ] **Step 1: 建立本機開發文件**

  寫明 Node／pnpm 版本、Supabase CLI、`supabase start`、`supabase db reset`、seed、function serve、前端 env、Google OAuth local redirect 與測試命令；所有 secret 只使用範例變數名稱。

- [ ] **Step 2: 建立部署 checklist**

  checklist 必須逐項確認：正式 Supabase project、Google OAuth redirect allowlist、CWA API key secret、allowed origins、RLS migration、service role key 不在 frontend、Edge Functions 部署、`/v1/*` rewrite、account delete smoke test。

- [ ] **Step 3: 加入整合 smoke test**

  以測試 fixture 驗證完整流程：免登入啟動本機提醒 → Google 登入 → manifest preview → 使用者確認上傳 active session／product → 另一個 client read → revision conflict → UV proxy cache → feedback → account delete；每個失敗點都確認本機倒數資料仍可讀。

- [ ] **Step 4: 執行完整檢查**

  Run: `pnpm check`

  Run: `pnpm build`

  Run: `supabase db reset`

  Run: `supabase test db`

  Expected: 所有現有測試、backend contract tests、RLS tests、build 均 PASS；若沒有正式 secrets，部署 smoke test 必須明確標為未連線而不是假裝成功。

- [ ] **Step 5: 更新 README 並提交 release-ready checkpoint**

  README 只新增後端開發入口、免登入／同步邊界與測試命令，不把 Supabase secret 或歷史封存文件當成設定來源；commit `docs: document backend local development and deployment`。

## 實作完成條件

- 未登入、離線或後端故障時，現有提醒倒數與手動操作測試全部通過。
- Google OAuth 可登入；取消、失敗與登出不會清除本機資料。
- 同步前有 manifest／預覽；revision conflict 不覆蓋資料；idempotency 重送不重複寫入。
- 第一版只上傳已確認的四類同步資料，不上傳歷史 Session、精確位置、裝置識別碼、UV cache、draft 或照片。
- UV proxy 不在前端暴露 CWA key，能驗證、快取並在上游失敗時回退本機資料。
- feedback 不需登入、可限流、可選信箱，且不帶出私人提醒資料。
- 使用者能停止同步、登出、清除 UVAlert 雲端資料；清除不影響 Google 帳號。
- RLS、migration、contract、Edge Function、前端 controller 與完整 build／test 都有可重現命令。
