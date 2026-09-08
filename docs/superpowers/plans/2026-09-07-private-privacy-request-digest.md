# Private Privacy Request Digest Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 每天台灣時間 09:00 將新的匿名隱私／帳號資料請求私密彙整為一封 Email 給營運者，未填聯絡 Email 的使用者仍可提交，且資料於 90 天後刪除。

**Architecture:** `feedback_submissions` 保持既有匿名回報的唯一真值；新增私有 digest batch/item 資料表與 service-role-only RPC，原子 claim 一個待寄 batch。`privacy-digest` Edge Function 驗證 Cron 專用密鑰，呼叫 Resend，成功才 settle batch；Supabase Cron 由 Vault 讀取 URL 與密鑰在每日台灣時間 09:00 觸發。

**Tech Stack:** Supabase PostgreSQL／RLS／pgTAP／pg_cron／pg_net／Vault、Deno Edge Functions、TypeScript、Vitest、Resend REST API。

## Global Constraints

- 不公開營運者個人 Gmail；不得寫入 `VITE_*`、Git、前端 bundle、公開頁面、`Reply-To` 或 Log。
- `privacy_request` 的 `contact_email` 維持選填；未填者仍能成功提交。
- 僅處理 `feedback_type = 'privacy_request'`；不改變其他 feedback 類型與既有限流／dedupe 合約。
- 每日台灣時間 09:00 最多寄一封；無新案件時回傳成功 no-op，不寄空信。
- 以 Resend 未驗證網域的私人測試寄送模式，收件者只可為營運者自己的私密 Gmail。
- Email 不啟用開信或點擊追蹤，完整留言僅在營運者 Email 及私有資料庫中出現。
- 任何寄送重試均使用同一個 batch 的穩定冪等鍵；成功前不得標示成已寄送。
- privacy request 與相依 digest 記錄保留 90 天後清除。
- 瀏覽器不能直接讀寫 digest 資料表或呼叫 claim／settle RPC。
- 不觸碰目前未提交的 `apps/web/src/features/education/education-content.generated.ts`。

## File Structure

| File                                                            | Responsibility                                                           |
| --------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `supabase/migrations/20260907000001_private_privacy_digest.sql` | 私有 batch/item 結構、原子 RPC、權限、Cron 與 90 天清理                  |
| `supabase/tests/private_privacy_digest.sql`                     | pgTAP 驗證結構、RLS／權限、claim/settle/cleanup 行為                     |
| `supabase/functions/privacy-digest/email.ts`                    | 無副作用的 Email escape、純文字／HTML 內容、Resend request/response 邊界 |
| `supabase/functions/privacy-digest/email.test.ts`               | 郵件內容跳脫與 Resend 回應分類測試                                       |
| `supabase/functions/privacy-digest/handler.ts`                  | 私鑰驗證、claim、寄送、settle、no-op 與紅線化 Log                        |
| `supabase/functions/privacy-digest/index.ts`                    | Production Supabase／Deno／Resend dependency wiring                      |
| `supabase/functions/privacy-digest/index.test.ts`               | Handler 的受控時間與 dependency mock 測試                                |
| `supabase/config.toml`                                          | 明確設定 `privacy-digest` 為不使用 JWT、但仍要求私有 header              |
| `docs/backend/privacy-request-digest.md`                        | 非機密設定、部署、監測與輪替操作手冊                                     |
| `docs/backend/preview-deployment.md`                            | 正式套用後的實際版本、Cron run 與 smoke 證據                             |

---

### Task 1: 建立私有 digest 資料模型、原子 claim 與 90 天清理

**Files:**

- Create: `supabase/migrations/20260907000001_private_privacy_digest.sql`
- Create: `supabase/tests/private_privacy_digest.sql`
- Modify: `supabase/config.toml`

**Interfaces:**

- Consumes: `public.feedback_submissions(id, feedback_type, message, contact_email, created_at)` 與既有 `privacy_request` constraint。
- Produces:
  - `public.claim_privacy_digest(p_now timestamptz)` returns `batch_id uuid, claim_token uuid, digest_date date, feedback_id uuid, message text, contact_email text, created_at timestamptz`.
  - `public.settle_privacy_digest(p_batch_id uuid, p_claim_token uuid, p_outcome text, p_now timestamptz, p_provider_message_id text, p_error_code text)` returns boolean.
  - `public.cleanup_private_privacy_digest(p_now timestamptz)` returns integer.
  - 僅 `service_role` 可執行上述 RPC；Task 3 的 production dependency 直接呼叫它們。

- [x] **Step 1: 寫 pgTAP 失敗測試，固定資料結構與私有權限**

```sql
select has_table('public', 'privacy_digest_batches', 'private digest batch exists');
select has_table('public', 'privacy_digest_items', 'private digest item exists');
select has_function('public', 'claim_privacy_digest', array['timestamp with time zone'], 'claim RPC exists');
select has_function('public', 'settle_privacy_digest', array['uuid','uuid','text','timestamp with time zone','text','text'], 'settle RPC exists');
select has_function('public', 'cleanup_private_privacy_digest', array['timestamp with time zone'], 'cleanup RPC exists');
select table_privs_are('public', 'privacy_digest_batches', 'anon', array[]::text[], 'anon has no digest table privilege');
select function_privs_are('public', 'claim_privacy_digest(timestamp with time zone)', 'authenticated', array[]::text[], 'authenticated cannot claim digest');
```

- [x] **Step 2: 執行資料庫測試，確認它因物件不存在而失敗**

Run: `supabase test db --local --file supabase/tests/private_privacy_digest.sql`  
Expected: FAIL，缺少 digest tables 與 RPC。

- [x] **Step 3: 寫 migration 的最小私有資料模型**

```sql
create table public.privacy_digest_batches (
  id uuid primary key default gen_random_uuid(),
  digest_date date not null unique,
  status text not null default 'pending' check (status in ('pending', 'claimed', 'sent')),
  claim_token uuid null,
  claimed_at timestamptz null,
  sent_at timestamptz null,
  provider_message_id text null,
  last_error_code text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.privacy_digest_items (
  batch_id uuid not null references public.privacy_digest_batches(id) on delete cascade,
  feedback_id uuid not null references public.feedback_submissions(id) on delete cascade,
  primary key (batch_id, feedback_id),
  unique (feedback_id)
);

alter table public.privacy_digest_batches enable row level security;
alter table public.privacy_digest_items enable row level security;
revoke all on table public.privacy_digest_batches, public.privacy_digest_items from public, anon, authenticated;
```

- [x] **Step 4: 實作 `claim_privacy_digest`，以 transaction 與 claim token 防重複**

```sql
-- Contract: if a prior pending/expired claim batch exists, lock and return it first.
-- Otherwise create a Taiwan-calendar-date batch only when unbatched
-- privacy_request rows exist, insert its items, mark it claimed, and return rows.
-- Use FOR UPDATE SKIP LOCKED; never select non-privacy feedback.
create or replace function public.claim_privacy_digest(p_now timestamptz)
returns table (
  batch_id uuid, claim_token uuid, digest_date date,
  feedback_id uuid, message text, contact_email text, created_at timestamptz
)
language plpgsql security definer
set search_path = pg_catalog, public
as $$
-- Validate p_now, reclaim stale claimed batches after 30 minutes, then lock one
-- batch. Insert a new batch only when eligible unbatched feedback exists.
$$;
```

- [x] **Step 5: 實作 settle 與 cleanup RPC，並限制 RPC 權限**

```sql
-- `sent` requires a nonblank provider message id; `retry` clears claim_token.
-- Both paths require exact batch id + claim token ownership.
-- Cleanup deletes privacy_request rows older than p_now - interval '90 days';
-- item cascade removes their links, then delete empty expired batches.
revoke all on function public.claim_privacy_digest(timestamptz) from public, anon, authenticated;
grant execute on function public.claim_privacy_digest(timestamptz) to service_role;
```

- [x] **Step 6: 加入 Cron 與 Function config，但不填任何實際密鑰**

```sql
-- Replace an existing same-name job before scheduling it.
select cron.schedule('uvalert-privacy-digest', '0 1 * * *', $digest$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'uvalert_project_url') || '/functions/v1/privacy-digest',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Privacy-Digest-Secret', (select decrypted_secret from vault.decrypted_secrets where name = 'uvalert_privacy_digest_secret')
    ), body := '{}'::jsonb
  );
$digest$);

select cron.schedule('uvalert-privacy-digest-cleanup', '17 1 * * *',
  $$select public.cleanup_private_privacy_digest(now());$$);
```

Add this exact config block:

```toml
[functions.privacy-digest]
verify_jwt = false
```

- [x] **Step 7: 擴充 pgTAP，驗證 claim、settle、retry、cleanup 與 Cron 唯一性**

```sql
-- Seed one privacy_request without contact_email and one bug report.
-- First claim returns exactly the privacy row; concurrent/stale token settlement returns false.
-- `sent` settlement prevents a second claim; `retry` enables a later claim.
-- Age a privacy row to 91 days, call cleanup, then assert it is removed.
-- Assert cron.job has exactly one row for each uvalert-privacy-digest job name.
```

- [x] **Step 8: 執行 migration reset 與所有 SQL 測試**

Run: `supabase db reset --local; supabase test db --local`  
Expected: PASS；新 pgTAP 檔與既有資料庫測試皆通過。

- [x] **Step 9: Commit**

```bash
git add -- supabase/migrations/20260907000001_private_privacy_digest.sql supabase/tests/private_privacy_digest.sql supabase/config.toml
git commit -m "feat(feedback): add private privacy digest storage"
```

### Task 2: 建立可測試的 Resend Email 邊界與安全內容格式

**Files:**

- Create: `supabase/functions/privacy-digest/email.ts`
- Create: `supabase/functions/privacy-digest/email.test.ts`

**Interfaces:**

- Consumes: Task 1 claim row型別。
- Produces:
  - `type PrivacyDigestItem = { feedbackId: string; message: string; contactEmail: string | null; createdAt: string }`.
  - `renderPrivacyDigestEmail(input: { digestDate: string; items: PrivacyDigestItem[] }): { subject: string; text: string; html: string }`.
  - `sendResendEmail(fetch, apiKey, recipient, email, idempotencyKey): Promise<{ messageId: string }>`.

- [x] **Step 1: 寫失敗測試，固定「無 Email 仍呈現案件」及 HTML escape**

```ts
it("renders a request without contact email", () => {
  expect(
    renderPrivacyDigestEmail({
      digestDate: "2026-09-07",
      items: [
        {
          feedbackId: "case-1",
          message: "請刪除資料",
          contactEmail: null,
          createdAt: "2026-09-07T01:00:00.000Z"
        }
      ]
    }).text
  ).toContain("未提供聯絡信箱");
});

it("escapes requester text instead of executing it as HTML", () => {
  expect(
    renderPrivacyDigestEmail({
      digestDate: "2026-09-07",
      items: [
        {
          feedbackId: "case-2",
          message: "<img src=x onerror=alert(1)>",
          contactEmail: null,
          createdAt: "2026-09-07T01:00:00.000Z"
        }
      ]
    }).html
  ).toContain("&lt;img");
});
```

- [x] **Step 2: 執行測試，確認模組尚不存在**

Run: `pnpm vitest run supabase/functions/privacy-digest/email.test.ts`  
Expected: FAIL，找不到 `email.ts`。

- [x] **Step 3: 實作純函式渲染與 Resend REST 呼叫**

```ts
export async function sendResendEmail(
  fetch: typeof globalThis.fetch,
  apiKey: string,
  recipient: string,
  email: { subject: string; text: string; html: string },
  idempotencyKey: string
): Promise<{ messageId: string }> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey
    },
    body: JSON.stringify({
      from: "UVAlert <onboarding@resend.dev>",
      to: [recipient],
      subject: email.subject,
      text: email.text,
      html: email.html
    })
  });
  // accept only nonblank string `id`; error must not contain recipient/message.
}
```

- [x] **Step 4: 加入成功、非 2xx、無 id 與密鑰不外洩測試**

```ts
expect(request.headers.get("Idempotency-Key")).toBe("privacy-digest:batch-1");
await expect(
  sendResendEmail(
    mockFetch,
    "secret-api-key",
    "private@example.test",
    email,
    "privacy-digest:batch-1"
  )
).rejects.toThrow("RESEND_SEND_FAILED");
expect(JSON.stringify(loggedError)).not.toContain("secret-api-key");
```

- [x] **Step 5: 執行 focused tests**

Run: `pnpm vitest run supabase/functions/privacy-digest/email.test.ts`  
Expected: PASS。

- [x] **Step 6: Commit**

```bash
git add -- supabase/functions/privacy-digest/email.ts supabase/functions/privacy-digest/email.test.ts
git commit -m "feat(feedback): render private privacy digest email"
```

### Task 3: 實作受控 `privacy-digest` Edge Function

**Files:**

- Create: `supabase/functions/privacy-digest/handler.ts`
- Create: `supabase/functions/privacy-digest/index.ts`
- Create: `supabase/functions/privacy-digest/index.test.ts`

**Interfaces:**

- Consumes: Task 1 三個 RPC、Task 2 `renderPrivacyDigestEmail`／`sendResendEmail`、`constantTimeEqual` from `supabase/functions/_shared/push-auth.ts`。
- Produces: `POST /functions/v1/privacy-digest`；只接受 `X-Privacy-Digest-Secret` 的受控內部請求。

- [x] **Step 1: 寫 handler 失敗測試，固定安全邊界**

```ts
it("rejects requests without the digest secret before claiming", async () => {
  const dependencies = makeDependencies();
  const response = await createPrivacyDigestHandler(dependencies)(
    new Request("https://api.test/privacy-digest", { method: "POST" })
  );
  expect(response.status).toBe(401);
  expect(dependencies.claim).not.toHaveBeenCalled();
});

it("returns no-op without calling Resend when no privacy requests exist", async () => {
  const dependencies = makeDependencies({ claim: vi.fn(async () => null) });
  await expect(
    createPrivacyDigestHandler(dependencies)(authorizedRequest()).then((r) =>
      r.json()
    )
  ).resolves.toEqual({ status: "no-op", claimed: 0, sent: 0 });
  expect(dependencies.sendEmail).not.toHaveBeenCalled();
});
```

- [x] **Step 2: 執行測試，確認 handler 尚不存在**

Run: `pnpm vitest run supabase/functions/privacy-digest/index.test.ts`  
Expected: FAIL，找不到 `handler.ts`／`index.ts`。

- [x] **Step 3: 定義明確 dependencies 與最小 handler**

```ts
export type PrivacyDigestDependencies = {
  readSecret(
    name:
      "PRIVACY_DIGEST_SECRET" | "RESEND_API_KEY" | "PRIVACY_DIGEST_RECIPIENT"
  ): string | undefined;
  compareSecret(left: string, right: string): Promise<boolean>;
  claim(now: string): Promise<{
    batchId: string;
    claimToken: string;
    digestDate: string;
    items: PrivacyDigestItem[];
  } | null>;
  settle(input: {
    batchId: string;
    claimToken: string;
    outcome: "sent" | "retry";
    now: string;
    providerMessageId: string | null;
    errorCode: string | null;
  }): Promise<boolean>;
  sendEmail(input: {
    apiKey: string;
    recipient: string;
    email: ReturnType<typeof renderPrivacyDigestEmail>;
    idempotencyKey: string;
  }): Promise<{ messageId: string }>;
  now(): Date;
  reportError(code: string): void;
};
```

Handler order: enforce POST → constant-time secret compare → require nonblank server secrets → `claim` → return no-op when null → render → send → settle `sent`; on send failure report only `PRIVACY_DIGEST_SEND_FAILED`, settle `retry`, return controlled 502.

- [x] **Step 4: 實作 production Supabase dependency wiring**

```ts
const { data, error } = await client.rpc("claim_privacy_digest", {
  p_now: input.now
});
// Map a homogeneous RPC row list into one batch object; reject mixed batch/token/date rows.
const { data, error } = await client.rpc("settle_privacy_digest", {
  p_batch_id: input.batchId,
  p_claim_token: input.claimToken,
  p_outcome: input.outcome,
  p_now: input.now,
  p_provider_message_id: input.providerMessageId,
  p_error_code: input.errorCode
});
```

- [x] **Step 5: 加入成功、失敗重試、缺失設定、可疑 RPC 資料與 redacted log 測試**

```ts
expect(dependencies.settle).toHaveBeenCalledWith(
  expect.objectContaining({ outcome: "sent", providerMessageId: "email-123" })
);
expect(dependencies.settle).toHaveBeenCalledWith(
  expect.objectContaining({
    outcome: "retry",
    providerMessageId: null,
    errorCode: "RESEND_SEND_FAILED"
  })
);
expect(JSON.stringify(dependencies.reportError.mock.calls)).not.toContain(
  "完整使用者留言"
);
```

- [x] **Step 6: 執行 focused tests**

Run: `pnpm vitest run supabase/functions/privacy-digest/email.test.ts supabase/functions/privacy-digest/index.test.ts`  
Expected: PASS。

- [x] **Step 7: Commit**

```bash
git add -- supabase/functions/privacy-digest/handler.ts supabase/functions/privacy-digest/index.ts supabase/functions/privacy-digest/index.test.ts
git commit -m "feat(feedback): dispatch private privacy digest"
```

### Task 4: 建立安全操作手冊、完整驗證與正式環境核對清單

**Files:**

- Create: `docs/backend/privacy-request-digest.md`
- Modify: `docs/backend/preview-deployment.md`
- Modify: `docs/superpowers/plans/2026-09-07-private-privacy-request-digest.md`

**Interfaces:**

- Consumes: Task 1 migration／Cron、Task 3 deployed Function。
- Produces: 可重複操作但不包含任何真實 secret／Email／feedback 內容的正式部署與驗證證據。

- [x] **Step 1: 寫操作手冊，列出精確 secret 名稱與安全規則**

```markdown
Function Secrets:

- `RESEND_API_KEY`: 只授予 `sending_access`；帳號本人收件限制由 `resend.dev` 測試網域執行，不是 API key 的收件者權限。
- `PRIVACY_DIGEST_RECIPIENT`: 營運者私有 Gmail；不得出現在截圖、commit 或公開文件。
- `PRIVACY_DIGEST_SECRET`: Cron 專用高熵密鑰；不得和瀏覽器或 Vercel env 共用。

Vault:

- `uvalert_project_url`: 現有 Supabase project URL。
- `uvalert_privacy_digest_secret`: 與 `PRIVACY_DIGEST_SECRET` 完全相同。
```

- [x] **Step 2: 寫正式前安全檢查命令，不輸出真實密鑰**

```powershell
rg -l --hidden --glob '!node_modules/**' --glob '!dist/**' 'RESEND_API_KEY=.+|PRIVACY_DIGEST_RECIPIENT=.+|PRIVACY_DIGEST_SECRET=.+' .
supabase db reset --local
supabase test db --local
pnpm vitest run supabase/functions/privacy-digest/email.test.ts supabase/functions/privacy-digest/index.test.ts
pnpm check
```

Expected: 搜尋只輸出含候選內容的檔名，不得把匹配值印到 terminal／tool logs；以受控方式確認沒有真實值後，其他命令全 PASS。

- [x] **Step 3: 寫明確的正式部署順序與人工核對點**

```markdown
1. 由使用者建立 Resend 帳號與只授予 `sending_access` 的 API key；使用 `resend.dev` 測試網域，由該網域限制只能寄到帳號擁有者自己的 Gmail。不要貼進聊天室或 Git。
2. 由使用者在 Supabase Dashboard 設定三個 Function Secrets 與一個新增 Vault secret。
3. 取得使用者明確同意後，`supabase db push --linked`，再部署 `privacy-digest`。
4. 在 Dashboard／SQL 確認兩個 Cron job 各存在一次，並以受控測試資料手動 invoke 一次。
5. 確認私人 Gmail 收到一封且只一封摘要信；再確認空 queue 回傳 no-op 且沒有 Email。
6. 把不含個資的版本、時間、Cron run ID 與結果寫入 deployment record。
```

- [ ] **Step 4: 執行完整本機驗證並記錄實際輸出摘要**

Run: `supabase db reset --local; supabase test db --local; pnpm vitest run supabase/functions/privacy-digest/email.test.ts supabase/functions/privacy-digest/index.test.ts; pnpm check`  
Expected: 全部 PASS；若 Docker 未啟動，停止並請使用者啟動，不以未執行標示完成。

2026-09-07 實際結果：local reset PASS、全部 pgTAP 265 項 PASS、focused Vitest 26 項 PASS；`pnpm check` 因既有頁面出口清單測試 1 項失敗而未完成。補跑 `pnpm lint` 後，Stylelint 也有 1 個既有 custom property 錯誤，故本 Step 保持未勾選。

- [ ] **Step 5: 只在完成正式操作後更新 deployment record**

```markdown
- migration version：`20260907000001_private_privacy_digest.sql`
- Edge Function：`privacy-digest` active version
- Cron jobs：`uvalert-privacy-digest`、`uvalert-privacy-digest-cleanup`
- smoke：一封私有測試 digest 到達；空 queue no-op
```

Do not mark this step complete until actual production evidence exists.

2026-09-07 狀態：未執行任何正式操作；`docs/backend/preview-deployment.md` 只新增未完成核對清單與本機證據，未新增正式完成聲明。

- [x] **Step 6: Commit local documentation and verification evidence**

```bash
git add -- docs/backend/privacy-request-digest.md docs/backend/preview-deployment.md docs/superpowers/plans/2026-09-07-private-privacy-request-digest.md
git commit -m "docs: record privacy digest operations"
```

## Review and Merge Gates

- Each task receives an independent review before proceeding to the next task.
- Do not push, merge, apply remote migration, set Edge Function secrets, configure Vault, deploy Function, create external Resend resources, or alter Cron without the user’s explicit per-operation approval.
- Before any final completion claim, run the relevant focused tests, all SQL tests, `pnpm check`, and inspect the final Git diff/status. Preserve unrelated modifications.
