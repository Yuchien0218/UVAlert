# Anonymous Web Push Reminders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 讓未登入使用者在支援 Web Push 的裝置上，關閉 UVAlert 分頁後仍能於下一個補擦到期時間收到一次「該補擦防曬乳了」。

**Architecture:** 本機 Session 與 IndexedDB 維持唯一真值；前端把每台匿名裝置的 PushSubscription 與單一最新 `dueAt` 同步到 Supabase。PostgreSQL 保存私有訂閱與排程，Supabase Cron 每分鐘呼叫 `push-dispatch` Edge Function，dispatcher 原子 claim 到期排程並用 VAPID 發送標準 Web Push。

**Tech Stack:** Vue 3 Composition API、TypeScript 5.9、Vitest 4、Dexie 4、Service Worker、Push API、Supabase PostgreSQL 15、pg_cron、pg_net、Supabase Edge Functions（Deno）、`npm:web-push@3.6.7`、Vercel

## Global Constraints

- Node.js 必須為 `>=24.0.0`，pnpm 必須為 `>=11.0.0`。
- 實作開始時必須從最新 `main` 建立新的隔離 worktree；不得直接在另一個 AI 的 `claude/small-font-size-scale` 工作區修改、rebase、stash 或提交。
- 若另一個 AI 的 UI 修改已進入 `main`，以最新版本為準，只在通知設定頁做必要的行為與文案整合，不覆蓋其視覺優化。
- Vue 維持 Composition API 與 `<script setup lang="ts">`。
- 本機 Session、倒數與 IndexedDB 是唯一真值；遠端推播失敗不得讓本機 command 失敗。
- 未登入使用者可啟用推播；不得要求 Google 登入。
- 每個最近到期時間只推送一次，不實作重複提醒。
- 系統通知唯一可見文字是「該補擦防曬乳了」。
- 後端不得保存產品、身體部位、位置、UV 數值或完整 Session。
- VAPID private key、device credential pepper、dispatcher secret 與 service-role key 不得進入 `VITE_*`、Git、HTML、source map、response 或 log。
- 公開 push tables 必須啟用 RLS，且不得授予 anon／authenticated 直接讀寫權限。
- 每台裝置最多一筆有效 subscription 與一筆目前 schedule；更新必須覆蓋舊排程。
- Cron 每分鐘執行；排程到期超過 10 分鐘不得補送。
- `429`／暫時性 `5xx` 最多發送 3 次；第一次失敗等待 1 分鐘，第二次等待 3 分鐘。
- 終態排程保留 7 天；90 天未活動 subscription 自動刪除。
- 每個 Task 完成後才可勾選；提交、測試通過、Function ACTIVE 或 Vercel READY 任一單一證據都不足以宣告整體完成。
- 設計依據：`docs/superpowers/specs/2026-08-30-anonymous-web-push-reminders-design.md`。

---

## File Map

| File                                                                       | Responsibility                                                 |
| -------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `packages/platform/src/index.ts`                                           | 定義遠端 Push port、裝置憑證、最新同步意圖與狀態型別           |
| `packages/persistence-web/src/db/database.ts`                              | Dexie v4 的本機 Push delivery state table                      |
| `packages/persistence-web/src/repositories/local-push-state-repository.ts` | 原子保存匿名憑證與單一最新遠端意圖                             |
| `apps/web/src/adapters/BrowserRemotePush.ts`                               | Push API subscription、後端 API、裝置憑證與離線 flush adapter  |
| `apps/web/src/features/notification/createNotificationController.ts`       | 協調本機通知與遠端單次排程                                     |
| `apps/web/public/sw.js`                                                    | 接收 push event、顯示固定通知、點擊開啟首頁                    |
| `apps/web/src/pages/settings/NotificationSettingsPage.vue`                 | 背景推播狀態、啟用／停用／重試；移除重複頻率選項               |
| `supabase/migrations/20260830000200_anonymous_push_foundation.sql`         | tables、RLS、grants、rate limit、claim、settle、cleanup       |
| `supabase/migrations/20260830000400_push_dispatch.sql`                    | endpoint/key ownership、claim renewal、Cron 與 cleanup jobs   |
| `supabase/tests/anonymous_push.sql`                                        | pgTAP 驗證 schema、安全、claim 與清理                          |
| `supabase/functions/_shared/push-auth.ts`                                  | device credential HMAC、固定時間比較、dispatcher auth          |
| `supabase/functions/_shared/push-contracts.ts`                             | request parsing、大小與時間範圍 validation、受控錯誤碼         |
| `supabase/functions/push-subscription/index.ts`                            | 註冊、更新、撤銷匿名 PushSubscription                          |
| `supabase/functions/push-schedule/index.ts`                                | 冪等建立／覆蓋／取消單一最新排程                               |
| `supabase/functions/push-dispatch/pushSender.ts`                           | `web-push@3.6.7` 包裝與狀態碼正規化                            |
| `supabase/functions/push-dispatch/handler.ts`                              | claim、逐筆發送、重試／失效／結算流程                          |
| `supabase/functions/push-dispatch/index.ts`                                | production dependencies 與 Deno.serve                          |
| `supabase/config.toml`                                                     | 三個 push Functions 的 gateway JWT 設定                        |
| `apps/web/.env.example`、`supabase/.env.example`                           | 公開與私密設定名稱，不含真實值                                 |
| `docs/backend/local-development.md`                                        | 本機 Web Push、VAPID、Functions 與 Cron 驗證流程               |
| `docs/backend/deployment-checklist.md`                                     | production secrets、migration、Function、Cron、實機 smoke test |
| `docs/backend/preview-deployment.md`                                       | 實際部署與平台驗證證據                                         |
| 本計畫                                                                     | Task／Step checkbox 與完成證據入口                             |

---

### Task 1: Define Remote Push Contracts and Local Durable State

**Files:**

- Modify: `packages/platform/src/index.ts`
- Modify: `packages/persistence-web/src/db/database.ts`
- Create: `packages/persistence-web/src/repositories/local-push-state-repository.ts`
- Create: `packages/persistence-web/src/repositories/local-push-state-repository.test.ts`
- Modify: `packages/persistence-web/src/index.ts`

**Interfaces:**

- Produces:

```ts
export type BackgroundPushState =
  | "unsupported"
  | "permission-required"
  | "subscribing"
  | "enabled"
  | "scheduled"
  | "pending-sync"
  | "schedule-error";

export type PushDeviceCredentials = {
  deviceId: string;
  deviceSecret: string;
};

export type PendingPushIntent =
  | { kind: "schedule"; dueAt: string; operationId: string }
  | { kind: "cancel"; operationId: string };

export interface PushStatePort {
  readCredentials(): Promise<PushDeviceCredentials | null>;
  writeCredentials(value: PushDeviceCredentials): Promise<void>;
  clearCredentials(): Promise<void>;
  readPendingIntent(): Promise<PendingPushIntent | null>;
  replacePendingIntent(value: PendingPushIntent): Promise<void>;
  clearPendingIntent(operationId: string): Promise<void>;
}

export interface RemotePushPort {
  isSupported(): boolean;
  enable(): Promise<BackgroundPushState>;
  schedule(dueAt: string, operationId: string): Promise<BackgroundPushState>;
  cancel(operationId: string): Promise<BackgroundPushState>;
  disable(): Promise<BackgroundPushState>;
  flushPendingIntent(): Promise<BackgroundPushState>;
}
```

- Consumes: existing `SunshieldDatabase` and platform package export pattern.

- [x] **Step 1: Add failing persistence tests**

Create tests that use a unique fake IndexedDB name and assert:

```ts
await repository.writeCredentials({
  deviceId: "device-a",
  deviceSecret: "secret-a"
});
await expect(repository.readCredentials()).resolves.toEqual({
  deviceId: "device-a",
  deviceSecret: "secret-a"
});

await repository.replacePendingIntent({
  kind: "schedule",
  dueAt: "2026-08-30T10:30:00.000Z",
  operationId: "11111111-1111-4111-8111-111111111111"
});
await repository.replacePendingIntent({
  kind: "cancel",
  operationId: "22222222-2222-4222-8222-222222222222"
});
expect(await repository.readPendingIntent()).toEqual({
  kind: "cancel",
  operationId: "22222222-2222-4222-8222-222222222222"
});
```

Also assert `clearPendingIntent(oldOperationId)` does not erase a newer intent, while the matching operation id does.

- [x] **Step 2: Run the focused test and verify RED**

Run:

```powershell
& '.\node_modules\.bin\vitest.CMD' run packages/persistence-web/src/repositories/local-push-state-repository.test.ts
```

Expected: FAIL because `LocalPushStateRepository`, its table and platform types do not exist.

- [x] **Step 3: Add the platform contracts and Dexie v4 table**

Add a `PushDeliveryState` table keyed by a constant `id = "current-device"`:

```ts
export type PushDeliveryStateRecord = {
  id: "current-device";
  credentials: PushDeviceCredentials | null;
  pendingIntent: PendingPushIntent | null;
};
```

Add `this.version(4).stores({ PushDeliveryState: "&id" })`. Do not modify or clear any existing v1-v3 tables.

- [x] **Step 4: Implement compare-and-clear semantics**

`replacePendingIntent` overwrites the single current intent. `clearPendingIntent(operationId)` runs in a Dexie read-write transaction and clears only when the stored intent has the same operation id.

- [x] **Step 5: Run focused tests and package typechecks**

Run:

```powershell
& '.\node_modules\.bin\vitest.CMD' run packages/persistence-web/src/repositories/local-push-state-repository.test.ts packages/persistence-web/src/repositories/local-data-repository.test.ts
pnpm --filter @sunshield/platform typecheck
pnpm --filter @sunshield/persistence-web typecheck
```

Expected: all selected tests and typechecks PASS.

- [x] **Step 6: Independent review gate**

Reviewer checks that v4 is additive, credentials never enter backup/export payloads, and an older completed request cannot clear a newer pending intent.

- [x] **Step 7: Commit Task 1**

```powershell
git add -- packages/platform/src/index.ts packages/persistence-web/src/db/database.ts packages/persistence-web/src/repositories/local-push-state-repository.ts packages/persistence-web/src/repositories/local-push-state-repository.test.ts packages/persistence-web/src/index.ts
git diff --cached --check
git commit -m "feat(push): persist anonymous device delivery state"
```

---

### Task 2: Add Private Push Tables, Atomic Claims and Retention

**Files:**

- Create: `supabase/migrations/20260830000200_anonymous_push_foundation.sql`
- Create: `supabase/tests/anonymous_push.sql`

**Interfaces:**

- Produces tables `public.push_subscriptions`, `public.push_schedules`, `public.push_rate_limits`.
- Produces server-only functions:

```sql
public.claim_due_push_schedules(p_limit integer, p_now timestamptz, p_lease interval)
public.settle_push_schedule(p_device_id uuid, p_claim_token uuid, p_outcome text, p_now timestamptz, p_error_code text, p_retry_at timestamptz)
public.consume_push_rate_limit(p_scope text, p_key_hash text, p_limit integer, p_window interval, p_now timestamptz)
public.cleanup_push_data(p_now timestamptz)
```

- Consumes: exact schema and states from the approved design spec.

- [x] **Step 1: Write failing pgTAP coverage**

Assert both push tables and required columns exist, `(status, next_attempt_at)` index exists, RLS is enabled, anon/authenticated have no direct table privileges, service_role has required privileges, and constraints reject unknown states or negative attempts.

Add transactional fixtures proving:

```sql
select is(
  (select count(*) from public.claim_due_push_schedules(100, '2026-08-30T10:00:00Z', interval '2 minutes')),
  1::bigint,
  'only due pending schedules are claimed'
);
```

Call claim twice before lease expiry and assert the second call returns zero rows. Advance `p_now` beyond two minutes and assert the abandoned claim can be reclaimed. Test 7-day terminal cleanup and 90-day inactive subscription cleanup without deleting younger rows.

- [x] **Step 2: Run database tests and verify RED**

Run:

```powershell
supabase db reset
supabase test db
```

Expected: `anonymous_push.sql` FAIL because the schema and functions do not exist.

- [x] **Step 3: Create tables and constraints**

Use `device_id uuid primary key`, endpoint uniqueness, status checks from the spec, `attempt_count >= 0`, `on delete cascade`, and `last_operation_id uuid not null`. Do not create any user/session/product/body-zone foreign keys.

- [x] **Step 4: Lock down access**

Enable and force RLS on all three tables. Revoke all privileges from `anon` and `authenticated`; grant only the exact select/insert/update/delete and function execute permissions needed by `service_role`. Revoke function execute from `public` before granting service_role.

- [x] **Step 5: Implement atomic database functions**

`claim_due_push_schedules` must use `FOR UPDATE SKIP LOCKED`, cap `p_limit` to `1..100`, expire rows older than ten minutes, set `status='claimed'`, `claimed_at=p_now`, and a fresh `claim_token` in one transaction.

`settle_push_schedule` must update only the row matching both `device_id` and `claim_token`. A stale token returns no row and cannot settle a reclaimed job.

- [x] **Step 6: Run database verification**

Run:

```powershell
supabase db reset
supabase test db
```

Expected: all existing and new pgTAP tests PASS.

- [x] **Step 7: Independent review gate**

Reviewer checks RLS/grants, SQL injection boundaries, concurrent claim behavior, retention cutoffs, cascade behavior and migration reversibility assumptions.

- [x] **Step 8: Commit Task 2**

```powershell
git add -- supabase/migrations/20260830000200_anonymous_push_foundation.sql supabase/tests/anonymous_push.sql
git diff --cached --check
git commit -m "feat(push): add private scheduling foundation"
```

---

### Task 3: Implement Anonymous Subscription Function

**Files:**

- Create: `supabase/functions/_shared/push-auth.ts`
- Create: `supabase/functions/_shared/push-auth.test.ts`
- Create: `supabase/functions/_shared/push-contracts.ts`
- Create: `supabase/functions/_shared/push-contracts.test.ts`
- Create: `supabase/functions/push-subscription/handler.ts`
- Create: `supabase/functions/push-subscription/index.ts`
- Create: `supabase/functions/push-subscription/index.test.ts`
- Modify: `supabase/functions/_shared/http.ts`
- Modify: `supabase/functions/_shared/http.test.ts`
- Modify: `supabase/config.toml`

**Interfaces:**

- Produces:

```ts
export type DeviceCredentials = { deviceId: string; deviceSecret: string };
export type PushSubscriptionInput = {
  endpoint: string;
  expirationTime: number | null;
  keys: { p256dh: string; auth: string };
};

export async function hashDeviceSecret(
  secret: string,
  pepper: string
): Promise<string>;

export function createPushSubscriptionHandler(
  dependencies: PushSubscriptionDependencies
): (request: Request) => Promise<Response>;
```

- Authentication header for PUT/DELETE: `Authorization: Device <deviceId>.<deviceSecret>`.
- POST success response: `{ deviceId, deviceSecret }`, returned once.
- Consumes service-role database gateway, `DEVICE_CREDENTIAL_PEPPER`, and existing CORS/error helpers.

- [x] **Step 1: Add failing auth and contract tests**

Use a fixed pepper and vectors to assert identical secrets hash identically, different secrets do not, malformed `Device` headers return one generic auth error, and constant-time comparison receives equal-length byte arrays.

Subscription validation must reject non-HTTPS endpoints except `http://localhost`／`http://127.0.0.1` in local mode, keys outside documented length limits, extra-large bodies and missing keys.

- [x] **Step 2: Add failing handler matrix**

Cover OPTIONS 204, POST create 201, PUT update 200, DELETE revoke 204, unsupported method 405, invalid JSON 422, invalid credential 401 with indistinguishable message, missing pepper 500, rate limit 429, database error 500, and response/log redaction.

- [x] **Step 3: Run focused tests and verify RED**

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/_shared/push-auth.test.ts supabase/functions/_shared/push-contracts.test.ts supabase/functions/push-subscription/index.test.ts
```

Expected: FAIL because the new modules do not exist.

- [x] **Step 4: Implement device credential hashing and parsing**

Generate 32 random bytes for `deviceSecret`; encode URL-safe base64 without padding. Store `HMAC-SHA-256(DEVICE_CREDENTIAL_PEPPER, deviceSecret)`. Compare decoded digest bytes without early return on matching positions. Never log the authorization header.

- [x] **Step 5: Implement persistent registration rate limiting**

Hash the trusted gateway client address with the pepper and call `consume_push_rate_limit("register", hash, 10, interval '1 hour', now)`. Device-authenticated PUT/DELETE use `device_id` as the rate-limit key with 60 operations per hour. Do not use the in-memory `SlidingWindowRateLimiter` as production enforcement.

- [x] **Step 6: Implement the dependency-injectable handler**

POST creates a new device and returns the raw credentials once. PUT verifies credentials and rotates endpoint/keys without rotating device credentials. DELETE verifies credentials, deletes the subscription and relies on cascade for the schedule.

- [x] **Step 7: Expand CORS and function config explicitly**

Allow `GET, POST, PUT, DELETE, OPTIONS` and headers `authorization, content-type`. Add:

```toml
[functions.push-subscription]
verify_jwt = false
```

No other Function's JWT setting changes.

- [x] **Step 8: Run focused verification**

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/_shared/http.test.ts supabase/functions/_shared/push-auth.test.ts supabase/functions/_shared/push-contracts.test.ts supabase/functions/push-subscription/index.test.ts
```

Expected: all selected tests PASS.

- [x] **Step 9: Independent security review gate**

Reviewer checks credential entropy, HMAC use, error indistinguishability, endpoint validation, durable rate limiting, redaction and least-privilege grants.

- [x] **Step 10: Commit Task 3**

```powershell
git add -- supabase/functions/_shared/push-auth.ts supabase/functions/_shared/push-auth.test.ts supabase/functions/_shared/push-contracts.ts supabase/functions/_shared/push-contracts.test.ts supabase/functions/push-subscription/handler.ts supabase/functions/push-subscription/index.ts supabase/functions/push-subscription/index.test.ts supabase/functions/_shared/http.ts supabase/functions/_shared/http.test.ts supabase/config.toml
git diff --cached --check
git commit -m "feat(push): register anonymous subscriptions"
```

---

### Task 4: Implement Idempotent Single-Schedule API

**Files:**

- Create: `supabase/functions/push-schedule/handler.ts`
- Create: `supabase/functions/push-schedule/index.ts`
- Create: `supabase/functions/push-schedule/index.test.ts`
- Create: `supabase/migrations/20260830000300_push_schedule_operations.sql`
- Create: `supabase/tests/push_schedule_operations.sql`
- Modify: `supabase/functions/_shared/push-contracts.ts`
- Modify: `supabase/functions/_shared/push-contracts.test.ts`
- Modify: `supabase/config.toml`

**Interfaces:**

- `PUT` body:

```ts
type ScheduleRequest = {
  dueAt: string;
  operationId: string;
};
```

- `DELETE` body: `{ operationId: string }`.
- Both require `Authorization: Device <deviceId>.<deviceSecret>`.
- Produces `{ state: "scheduled", dueAt }` or `{ state: "cancelled" }`.

- [x] **Step 1: Write failing contract and handler tests**

Cover valid due time, missing timezone, invalid UUID, earlier than server time minus 10 minutes, later than server time plus 24 hours, unknown fields, invalid credentials, revoked subscription, and rate limiting.

Add idempotency assertions:

```ts
await handler(putRequest({ dueAt: firstDueAt, operationId }));
await handler(putRequest({ dueAt: firstDueAt, operationId }));
expect(dependencies.upsertSchedule).toHaveBeenCalledOnce();
```

Then use a new operation id and assert the single row is overwritten. DELETE twice with the same operation id must remain successful.

- [x] **Step 2: Run focused tests and verify RED**

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/_shared/push-contracts.test.ts supabase/functions/push-schedule/index.test.ts
```

Expected: FAIL because schedule parsing and handler do not exist.

- [x] **Step 3: Implement authenticated upsert/cancel**

Use server time, not client time, for range checks. PUT resets `status='pending'`, `attempt_count=0`, `next_attempt_at=due_at`, claim fields and terminal timestamps to null, and writes `last_operation_id`. DELETE marks the current row cancelled with its operation id; it must not delete the subscription.

- [x] **Step 4: Make operation ordering safe**

The database gateway must serialize changes per `device_id`. Replaying the same operation id returns the stored result without rewriting. A response from an older frontend request cannot clear a newer local pending intent because Task 1 uses compare-and-clear.

Implementation evidence: `apply_push_schedule_operation` uses a device-keyed advisory transaction lock and rechecks `last_operation_id` inside the lock. A local two-session check held the same device lock and the second RPC waited 5.39 seconds before completing. Database verification ran `supabase db reset` and `supabase test db` with 4 files／117 tests passing.

- [x] **Step 5: Add explicit public Function configuration**

```toml
[functions.push-schedule]
verify_jwt = false
```

- [x] **Step 6: Run focused verification**

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/_shared/push-auth.test.ts supabase/functions/_shared/push-contracts.test.ts supabase/functions/push-schedule/index.test.ts
```

Expected: all selected tests PASS.

- [x] **Step 7: Independent review gate**

Reviewer checks timestamp boundaries, one-row invariant, replay semantics, cancellation behavior and that no Session data reaches the API.

- [x] **Step 8: Commit Task 4**

```powershell
git add -- supabase/functions/push-schedule/handler.ts supabase/functions/push-schedule/index.ts supabase/functions/push-schedule/index.test.ts supabase/functions/_shared/push-contracts.ts supabase/functions/_shared/push-contracts.test.ts supabase/migrations/20260830000300_push_schedule_operations.sql supabase/tests/push_schedule_operations.sql supabase/config.toml
git diff --cached --check
git commit -m "feat(push): schedule one anonymous reminder"
```

---

### Task 5: Dispatch Due Web Push Messages and Configure Cron

**Files:**

- Create: `supabase/functions/push-dispatch/deno.json`
- Create: `supabase/functions/push-dispatch/pushSender.ts`
- Create: `supabase/functions/push-dispatch/pushSender.test.ts`
- Create: `supabase/functions/push-dispatch/handler.ts`
- Create: `supabase/functions/push-dispatch/index.ts`
- Create: `supabase/functions/push-dispatch/index.test.ts`
- Create: `supabase/migrations/20260830000400_push_dispatch.sql`
- Modify: `supabase/tests/anonymous_push.sql`
- Modify: `supabase/config.toml`

**Interfaces:**

- Exact dependency pin in `deno.json`:

```json
{
  "imports": {
    "web-push": "npm:web-push@3.6.7"
  }
}
```

- Produces:

```ts
export type PushSendResult =
  | { kind: "sent" }
  | { kind: "gone"; status: 404 | 410 }
  | {
      kind: "retry";
      status: 429 | 500 | 502 | 503 | 504;
      retryAfterSeconds: number | null;
    }
  | { kind: "permanent-failure"; status: number };

export function createPushDispatcher(
  dependencies: PushDispatcherDependencies
): (request: Request) => Promise<Response>;
```

- Payload is exactly `JSON.stringify({ type: "reminder-due" })`.
- Web Push options: `TTL: 600`, `urgency: "high"`, `topic: "uvalert-reminder-due"`.

- [x] **Step 1: Prove pinned dependency loads in the local Edge Runtime**

Run:

```powershell
supabase functions serve push-dispatch --no-verify-jwt
```

Expected: function bundle starts without missing Node built-ins or unsupported runtime APIs. If it fails, leave this Step and Task unchecked, record the exact compatibility error, and stop before implementing against an unverified sender dependency.

- [x] **Step 2: Write failing sender tests**

Inject the library call and assert the wrapper passes only the stored endpoint/keys, fixed payload, TTL, urgency, topic and VAPID details. Map resolved responses to `sent`; map thrown errors with `statusCode` 404/410, 429/5xx and other 4xx to the exact union above. Error messages must not include endpoint or keys.

- [x] **Step 3: Write failing dispatcher tests**

Cover invalid dispatcher secret 401, missing server secrets 500, empty batch 200, success settlement, gone cleanup, transient retry, third failure terminal state, ten-minute expiry, one-row failure isolation, and max batch 100.

- [x] **Step 4: Run tests and verify RED**

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/push-dispatch/pushSender.test.ts supabase/functions/push-dispatch/index.test.ts
```

Expected: FAIL because sender and dispatcher do not exist.

- [x] **Step 5: Implement the pinned Web Push adapter**

Use `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`. Validate subject begins with `mailto:` or `https://` and is not an `https://localhost` subject. Do not call global `setVapidDetails`; pass details per send so tests and concurrent invocations remain isolated.

- [x] **Step 6: Implement dispatcher authentication and orchestration**

Require `X-Dispatch-Secret` and compare its digest in fixed time against `PUSH_DISPATCH_SECRET`. Claim with `p_limit=100`, `p_lease='2 minutes'`. Settle each row with its claim token. Use attempt count and the fixed 1／3 minute backoff; cap retry time at `due_at + 10 minutes`.

- [x] **Step 7: Add Cron and cleanup jobs**

Enable `pg_cron` and `pg_net`. Migration creates:

- `uvalert-push-dispatch`: every minute, HTTP POST to the project Function URL, reading `uvalert_project_url` and `uvalert_push_dispatch_secret` from Vault at execution time.
- `uvalert-push-cleanup`: daily at `03:17 UTC`, calling `cleanup_push_data(now())` in SQL.

Use stable job names so rerunning the migration replaces rather than duplicates jobs. Do not embed real URL or secret values in SQL.

- [x] **Step 8: Configure dispatcher Function explicitly**

```toml
[functions.push-dispatch]
verify_jwt = false
```

The custom dispatch secret remains mandatory; `verify_jwt=false` does not make the handler anonymously executable.

- [x] **Step 9: Run Edge and database verification**

```powershell
& '.\node_modules\.bin\vitest.CMD' run supabase/functions/push-dispatch/pushSender.test.ts supabase/functions/push-dispatch/index.test.ts
supabase db reset
supabase test db
```

Expected: all selected tests PASS; local Cron rows exist once each; no real secret appears in migration or logs.

- [x] **Step 10: Independent review gate**

Reviewer checks package pinning, Edge Runtime compatibility evidence, dispatch auth, secret redaction, claim-token settlement, retry math, 404/410 deletion and Cron uniqueness.

- [ ] **Step 11: Commit Task 5**

```powershell
git add -- supabase/functions/push-dispatch/deno.json supabase/functions/push-dispatch/pushSender.ts supabase/functions/push-dispatch/pushSender.test.ts supabase/functions/push-dispatch/handler.ts supabase/functions/push-dispatch/index.ts supabase/functions/push-dispatch/index.test.ts supabase/migrations/20260830000400_push_dispatch.sql supabase/tests/anonymous_push.sql supabase/config.toml
git diff --cached --check
git commit -m "feat(push): dispatch due reminders"
```

---

### Task 6: Subscribe in the Browser and Receive Service Worker Push

**Files:**

- Create: `apps/web/src/adapters/BrowserRemotePush.ts`
- Create: `apps/web/src/adapters/BrowserRemotePush.test.ts`
- Modify: `apps/web/public/sw.js`
- Create: `apps/web/src/service-worker-push.test.ts`
- Modify: `apps/web/src/env.d.ts`
- Modify: `apps/web/.env.example`

**Interfaces:**

- `BrowserRemotePush implements RemotePushPort` from Task 1.
- Constructor dependencies include `PushStatePort`, API base URL, public VAPID key, service-worker registration provider, fetch, online state and `createOperationId()`.
- Uses endpoints `${apiBase}/push-subscription` and `${apiBase}/push-schedule`.

- [ ] **Step 1: Write failing browser adapter tests**

Cover unsupported APIs, permission denied, initial subscribe/register, reuse of existing subscription and credentials, subscription rotation PUT, schedule PUT, cancel DELETE, disable remote then browser unsubscribe, offline latest-intent replacement, reconnect flush, compare-and-clear race and secret-free errors.

Assert `pushManager.subscribe` receives:

```ts
{
  userVisibleOnly: true,
  applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
}
```

- [ ] **Step 2: Write failing Service Worker contract tests**

Load `sw.js` in a minimal worker harness. Dispatch `{ type: "reminder-due" }` and assert:

```js
self.registration.showNotification("該補擦防曬乳了", {
  tag: "uvalert-reminder-due",
  data: { path: "/" }
});
```

Invalid JSON, unknown type and payload with attacker-supplied title/URL must not display arbitrary content.

- [ ] **Step 3: Run focused tests and verify RED**

```powershell
& '.\node_modules\.bin\vitest.CMD' run apps/web/src/adapters/BrowserRemotePush.test.ts apps/web/src/service-worker-push.test.ts
```

Expected: FAIL because the adapter and push listener do not exist.

- [ ] **Step 4: Implement capability checks and subscription lifecycle**

Support requires secure context, `serviceWorker`, `PushManager` and `Notification`. iOS without an available PushManager reports `unsupported`; do not infer installation state from user agent strings.

Read `VITE_PUSH_PUBLIC_KEY` through `readConfiguredEnvironmentValue`. Missing/blank key keeps remote push disabled without affecting local notifications.

- [ ] **Step 5: Implement API and offline intent handling**

Send credentials only in `Authorization: Device ...`; never put them in URL/query. Persist schedule/cancel intent before fetch. Clear it only after a successful matching operation id. Network errors return `pending-sync`; validation/auth errors return `schedule-error` and retain enough local state for explicit recovery.

- [ ] **Step 6: Add the fixed Service Worker push handler**

Parse only `{ type: "reminder-due" }`. The worker, not the payload, supplies notification text, tag and `/` path. Preserve current install, activate and notificationclick behavior.

- [ ] **Step 7: Run focused tests and web typecheck**

```powershell
& '.\node_modules\.bin\vitest.CMD' run apps/web/src/adapters/BrowserRemotePush.test.ts apps/web/src/service-worker-push.test.ts apps/web/src/adapters/BrowserNotifications.test.ts
pnpm --filter @sunshield/web typecheck
```

Expected: all selected tests and typecheck PASS.

- [ ] **Step 8: Independent privacy and browser review gate**

Reviewer checks no user-agent branching, no credentials in URLs/logs, no attacker-controlled notification content, proper unsubscribe order and safe offline races.

- [ ] **Step 9: Commit Task 6**

```powershell
git add -- apps/web/src/adapters/BrowserRemotePush.ts apps/web/src/adapters/BrowserRemotePush.test.ts apps/web/public/sw.js apps/web/src/service-worker-push.test.ts apps/web/src/env.d.ts apps/web/.env.example
git diff --cached --check
git commit -m "feat(web): subscribe to anonymous push reminders"
```

---

### Task 7: Coordinate Remote Scheduling and Update Notification Settings

**Files:**

- Modify: `apps/web/src/features/notification/createNotificationController.ts`
- Modify: `apps/web/src/features/notification/createNotificationController.test.ts`
- Modify: `apps/web/src/app/createWebAppServices.ts`
- Modify: `apps/web/src/app/appBoot.integration.test.ts`
- Modify: `apps/web/src/pages/settings/NotificationSettingsPage.vue`
- Modify: `apps/web/src/pages/settings/NotificationSettingsPage.test.ts`

**Interfaces:**

- `createNotificationController` additionally consumes `remotePush: RemotePushPort`, `connectivity: Readonly<Ref<ConnectivityStatus>>`, and `createOperationId(): string`.
- `NotificationController` additionally exposes:

```ts
readonly backgroundPushState: Readonly<ShallowRef<BackgroundPushState>>;
enableBackgroundPush(): Promise<void>;
disableBackgroundPush(): Promise<void>;
retryBackgroundSync(): Promise<void>;
```

- Existing local `NotificationPort` remains available for foreground/tab-alive fallback.

- [ ] **Step 1: Replace repeat-frequency expectations with single-send tests**

Delete controller/UI expectations for 5／15 minute repeat scheduling. Every local `ScheduledNotification` now uses `repeatMinutes: null`, title `該補擦防曬乳了`, and empty body.

- [ ] **Step 2: Add failing controller tests**

Cover initial active Session schedule, due-time replacement, reapplication new schedule, ended/null Session cancel, remote failure not affecting local schedule, offline `pending-sync`, reconnect flush, enable, disable and dispose behavior.

Use deferred promises to prove an older schedule response cannot overwrite the status of a newer operation.

- [ ] **Step 3: Add failing settings-page tests**

Assert the page shows the seven states from the spec, offers enable/disable/retry actions where applicable, contains the iPhone/iPad main-screen limitation, and no longer renders repeat-frequency radio buttons or claims that closing the tab always prevents notification.

- [ ] **Step 4: Run focused tests and verify RED**

```powershell
& '.\node_modules\.bin\vitest.CMD' run apps/web/src/features/notification/createNotificationController.test.ts apps/web/src/pages/settings/NotificationSettingsPage.test.ts apps/web/src/app/appBoot.integration.test.ts
```

Expected: FAIL because remote push is not wired and the old repeat UI remains.

- [ ] **Step 5: Integrate local and remote channels**

One watcher derives `sessionNextDueAt`. It always maintains the local fallback and, only after remote push is enabled, sends the latest remote schedule/cancel intent. Do not send Session id, product, zone or UV data.

- [ ] **Step 6: Wire production services**

Instantiate `LocalPushStateRepository(database)` and `BrowserRemotePush` in `createWebAppServices`; reuse the normalized `VITE_API_BASE_URL` base resolution pattern. Pass boot connectivity and the existing `createId` source.

- [ ] **Step 7: Update the settings page without overwriting unrelated UI work**

Remove repeat-frequency controls. Add state-driven enable, disable and retry actions using existing cards/buttons/tokens. Preserve the latest `main` typography, icon and layout decisions. Copy must say background push is auxiliary and may be delayed by network, power saving or OS settings.

- [ ] **Step 8: Run focused and web verification**

```powershell
& '.\node_modules\.bin\vitest.CMD' run apps/web/src/features/notification/createNotificationController.test.ts apps/web/src/pages/settings/NotificationSettingsPage.test.ts apps/web/src/app/appBoot.integration.test.ts apps/web/src/adapters/BrowserNotifications.test.ts
pnpm --filter @sunshield/web typecheck
```

Expected: all selected tests and typecheck PASS.

- [ ] **Step 9: Browser review gate**

In a local HTTPS-capable environment, inspect permission-required, enabled, pending-sync, schedule-error and unsupported states. Verify natural text wrapping and keyboard focus; do not manually insert `<br>`, nowrap, clipping or ellipsis.

- [ ] **Step 10: Independent integration review gate**

Reviewer checks local truth remains authoritative, no remote failure escapes into Session commands, current UI work is preserved, and single-send behavior is consistent across adapter/controller/page.

- [ ] **Step 11: Commit Task 7**

```powershell
git add -- apps/web/src/features/notification/createNotificationController.ts apps/web/src/features/notification/createNotificationController.test.ts apps/web/src/app/createWebAppServices.ts apps/web/src/app/appBoot.integration.test.ts apps/web/src/pages/settings/NotificationSettingsPage.vue apps/web/src/pages/settings/NotificationSettingsPage.test.ts
git diff --cached --check
git commit -m "feat(web): coordinate background push delivery"
```

---

### Task 8: Document Reproducible Local and Production Setup

**Files:**

- Modify: `supabase/.env.example`
- Modify: `apps/web/.env.example`
- Modify: `docs/backend/README.md`
- Modify: `docs/backend/local-development.md`
- Modify: `docs/backend/deployment-checklist.md`
- Modify: `docs/superpowers/plans/README.md`
- Modify: `docs/decisions/2026-08-23-notification-decision.md`

**Interfaces:**

- Documents secret names: `VAPID_SUBJECT`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `DEVICE_CREDENTIAL_PEPPER`, `PUSH_DISPATCH_SECRET`.
- Documents public setting: `VITE_PUSH_PUBLIC_KEY`.
- Documents Vault names: `uvalert_project_url`, `uvalert_push_dispatch_secret`.

- [ ] **Step 1: Update examples with names only**

Use placeholders such as `https://example.invalid` and `replace-in-secure-shell`. Do not insert the production project ref into generic examples unless the existing file is explicitly a dated deployment record.

- [ ] **Step 2: Add exact secure setup sequence**

Document generating one VAPID pair, setting Function secrets from a secure shell, storing dispatcher URL/secret in Vault, applying migration, deploying three Functions, configuring `VITE_PUSH_PUBLIC_KEY` in Vercel and redeploying.

Commands must reference environment variables rather than literal secrets, for example:

```powershell
supabase secrets set "VAPID_SUBJECT=$env:UVALERT_VAPID_SUBJECT" "VAPID_PUBLIC_KEY=$env:UVALERT_VAPID_PUBLIC_KEY" "VAPID_PRIVATE_KEY=$env:UVALERT_VAPID_PRIVATE_KEY" "DEVICE_CREDENTIAL_PEPPER=$env:UVALERT_DEVICE_CREDENTIAL_PEPPER" "PUSH_DISPATCH_SECRET=$env:UVALERT_PUSH_DISPATCH_SECRET" --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
```

- [ ] **Step 3: Correct historical notification documentation**

Mark the old local-only `canDeliverInBackground=false` decision as historical once remote push is enabled. Preserve the distinction between local fallback and Web Push; do not rewrite history as if backend push always existed.

- [ ] **Step 4: Add checkboxes and evidence fields to this plan index**

Index status must say implementation is local until Task 9 production evidence exists. Add fields for migration version, Function versions, Cron run id, Vercel deployment, commit, timestamp and device/browser smoke results.

- [ ] **Step 5: Verify documentation and secret scan**

```powershell
rg -n "VAPID_PRIVATE_KEY=.+[^>]$|DEVICE_CREDENTIAL_PEPPER=.+[^>]$|PUSH_DISPATCH_SECRET=.+[^>]$|SUPABASE_SERVICE_ROLE_KEY=.+[^>]$" apps/web docs/backend supabase
& '.\node_modules\.bin\prettier.CMD' --check apps/web/.env.example supabase/.env.example docs/backend/README.md docs/backend/local-development.md docs/backend/deployment-checklist.md docs/superpowers/plans/README.md docs/decisions/2026-08-23-notification-decision.md
git diff --check
```

Expected: no real secret values; Prettier and diff checks PASS.

- [ ] **Step 6: Independent documentation review gate**

Reviewer checks commands do not echo secrets, local vs production paths are distinct, iOS installation limits are explicit, and no unchecked deployment claim is presented as complete.

- [ ] **Step 7: Commit Task 8**

```powershell
git add -- supabase/.env.example apps/web/.env.example docs/backend/README.md docs/backend/local-development.md docs/backend/deployment-checklist.md docs/superpowers/plans/README.md docs/decisions/2026-08-23-notification-decision.md
git diff --cached --check
git commit -m "docs: document anonymous push deployment"
```

---

### Task 9: Full Local Verification

**Files:**

- Modify only files required to fix verified defects in Tasks 1-8; do not bundle unrelated cleanup.
- Update this plan's checkboxes only after each corresponding command has current evidence.

**Interfaces:**

- Consumes all local implementation tasks.
- Produces a reviewed, deployable commit set; does not mutate production.

- [ ] **Step 1: Run all focused Push tests together**

```powershell
& '.\node_modules\.bin\vitest.CMD' run packages/persistence-web/src/repositories/local-push-state-repository.test.ts supabase/functions/_shared/push-auth.test.ts supabase/functions/_shared/push-contracts.test.ts supabase/functions/push-subscription/index.test.ts supabase/functions/push-schedule/index.test.ts supabase/functions/push-dispatch/pushSender.test.ts supabase/functions/push-dispatch/index.test.ts apps/web/src/adapters/BrowserRemotePush.test.ts apps/web/src/service-worker-push.test.ts apps/web/src/features/notification/createNotificationController.test.ts apps/web/src/pages/settings/NotificationSettingsPage.test.ts
```

Expected: all listed files PASS.

- [ ] **Step 2: Run database reset and pgTAP**

```powershell
supabase db reset
supabase test db
```

Expected: all existing and anonymous Push database tests PASS.

- [ ] **Step 3: Run repository gates**

```powershell
pnpm check
pnpm build
```

Expected: typecheck, all tests, ESLint, Stylelint and production build exit 0. Record existing chunk/canonical warnings precisely instead of claiming warning-free output.

- [ ] **Step 4: Run secret and bundle scans**

Search tracked files and built assets for the test secret markers and private environment variable names. The production bundle may contain `VITE_PUSH_PUBLIC_KEY`'s value but must not contain private VAPID key, device pepper, dispatcher secret or service-role key.

- [ ] **Step 5: Perform final whole-scope independent review**

Review from merge-base through current HEAD across security, correctness, privacy, concurrency, offline behavior, UI truthfulness and deployment reproducibility. Resolve every finding or record an explicit blocker; a clean per-Task review does not replace this whole-scope review.

- [ ] **Step 6: Commit only verified review fixes**

Use a scoped commit message describing the actual defect, rerun its focused tests, then rerun any affected full gate. Do not create an empty closeout commit.

---

### Task 10: Deploy Supabase and Connect Vercel

**Files:**

- No source changes unless a verified deployment discrepancy requires returning to Tasks 1-9.
- External state: confirmed Supabase project, Vault, Function secrets, migrations, Edge Functions, Cron jobs, Vercel environment and deployment.

**Interfaces:**

- Consumes user-confirmed project ref `ykfdnltaqpdytmrszbbk` only after a fresh read-only verification that it remains the intended project.
- Produces deployed subscription, schedule and dispatcher endpoints plus Vercel bundle with the public VAPID key.

- [ ] **Step 1: Read-only production preflight**

```powershell
supabase projects list
supabase migration list --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
supabase functions list --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
vercel whoami
vercel project ls
```

Confirm the exact Supabase and Vercel projects before mutation. Verify required secret environment variables are nonblank without printing their values.

- [ ] **Step 2: Inspect migration dry run**

```powershell
supabase link --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
supabase db push --dry-run
```

Expected: only the intended anonymous push migration is pending. Stop on destructive or unrelated changes.

- [ ] **Step 3: Set Function secrets and Vault values securely**

Set the five Function secrets from the secure shell. Use parameterized SQL or Dashboard secret entry for Vault; command output must not contain their values. Verify only secret names and updated timestamps.

- [ ] **Step 4: Apply migration and deploy Functions**

```powershell
supabase db push
supabase functions deploy push-subscription --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
supabase functions deploy push-schedule --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
supabase functions deploy push-dispatch --project-ref $env:UVALERT_SUPABASE_PROJECT_REF
```

Expected: migration succeeds; all three Functions ACTIVE; only these three have the planned custom JWT boundary.

- [ ] **Step 5: Verify Cron without sending to a real user**

Confirm each named Cron job exists once. Invoke dispatcher with an empty due queue and verify HTTP 200, zero claimed, no secrets in logs, and a successful `cron.job_run_details` entry.

- [ ] **Step 6: Configure Vercel public key and deploy intended commit**

Set `VITE_PUSH_PUBLIC_KEY` as public Config for Production and explicitly approved Preview environments. Deploy from monorepo root because Vercel project root is `apps/web`. Confirm deployment metadata identifies the intended commit.

- [ ] **Step 7: Verify production API security boundaries**

Check CORS preflight from `https://uv-alert-web.vercel.app`, invalid credential responses, invalid timestamp rejection, dispatcher rejection without its secret, and direct anon table access denial. Do not print real credentials in terminal output.

- [ ] **Step 8: Commit deployment status record**

After smoke testing in Task 11, update `docs/backend/preview-deployment.md` and this plan with exact evidence, then commit only those documentation files.

---

### Task 11: Production Device Smoke Tests and Completion Record

**Files:**

- Modify: `docs/backend/preview-deployment.md`
- Modify: `docs/superpowers/plans/2026-08-30-anonymous-web-push-reminders.md`
- Modify: `docs/superpowers/plans/README.md`

**Interfaces:**

- Consumes deployed production URL, Function versions, Cron run evidence and actual devices.
- Produces truthful, dated completion status.

- [ ] **Step 1: Android Chrome smoke test**

Enable background push, start a short controlled reminder, close the tab, receive exactly one「該補擦防曬乳了」notification, tap it, and confirm UVAlert opens with the local current Session. Record OS/browser versions and timestamp without recording subscription data.

- [ ] **Step 2: Desktop smoke test**

Repeat on Windows or macOS with a supported browser. Confirm closing the tab still allows push and cancellation prevents the old notification.

- [ ] **Step 3: iPhone/iPad Home Screen smoke test**

If a device is available, install UVAlert to the Home Screen, launch from the icon, enable push and repeat the closed-app test. If unavailable, leave this checkbox unchecked and record `尚未驗證：缺少可用 iPhone/iPad 實機`; do not infer support from simulator or documentation.

- [ ] **Step 4: Cancellation and replacement smoke test**

Create a reminder, change the next due time, and verify only the replacement is delivered. Then create another, complete/stop/end before due time and verify the cancelled reminder is not delivered.

- [ ] **Step 5: Offline recovery smoke test**

Go offline, create or change a reminder, verify UI shows pending sync, reconnect before due time, confirm scheduled state, close the tab and receive the notification. Repeat with an already expired due time and confirm no stale push is created.

- [ ] **Step 6: Retest existing core behavior**

With push denied and with an unsupported harness, confirm setup, local countdown, reapplication, stop and end remain usable. Confirm local notification fallback still works while the tab is alive.

- [ ] **Step 7: Record exact evidence and mark checkboxes truthfully**

Record Supabase project ref, migration version, three Function versions, Cron names and latest success, Vercel deployment/commit, production URL, verification time and each platform result. Mark only completed Steps `- [x]`; preserve open mobile/platform limitations.

- [ ] **Step 8: Final documentation commit**

```powershell
git add -- docs/backend/preview-deployment.md docs/superpowers/plans/2026-08-30-anonymous-web-push-reminders.md docs/superpowers/plans/README.md
git diff --cached --check
git commit -m "docs: record anonymous push deployment"
```

## Plan Completion Criteria

- [ ] Tasks 1-9 implementation, local tests and independent reviews are complete.
- [ ] Production migration and all three Functions are verified on the intended Supabase project.
- [ ] Dispatcher and cleanup Cron jobs have current successful run evidence.
- [ ] Vercel production contains the intended commit and public VAPID key only.
- [ ] Android and desktop closed-tab smoke tests pass.
- [ ] iPhone/iPad result is either verified or explicitly left open with the exact device blocker.
- [ ] Cancellation, replacement, offline recovery and unsupported-platform fallback are verified.
- [ ] No private secret or Push subscription material appears in Git, frontend bundle, response or logs.
- [ ] Deployment record distinguishes code complete, deployed, reviewed and device-verified states.
