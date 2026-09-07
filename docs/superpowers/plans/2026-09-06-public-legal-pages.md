# Public Legal Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Provide public `/privacy` and `/terms` pages for Google OAuth while keeping the developer's personal email private and offering a privacy-request category through the existing feedback form.

**Architecture:** Add two lazy-loaded, presentational Vue route pages and public entry links. Extend the existing feedback enum end-to-end (`packages/contracts` → Edge validation → database check constraint → form select) with `privacy_request`; reuse the existing anonymous feedback submission, rate limit, receipt, and optional contact-email flow.

**Tech Stack:** Vue 3, TypeScript, Vue Router 4, Vitest, Zod, Supabase PostgreSQL migrations and Edge Functions.

## Global Constraints

- Public policy pages must be available at `https://uv-alert-web.vercel.app/privacy` and `https://uv-alert-web.vercel.app/terms` without login or an active reminder.
- Never expose `michishigehikaru@gmail.com` in UI, source, tests, documentation, or deployment variables.
- Privacy text must accurately describe current Google sign-in, optional Supabase sync, Web Push, and one-time location use; it must not claim unimplemented collection, tracking, medical advice, or automated data deletion.
- `privacy_request` is an anonymous feedback category only; it does not perform export, deletion, or account actions automatically.
- Preserve existing `bug`, `feature_request`, and `content_correction` contracts and the existing feedback rate limit.
- Do not modify unrelated reminder, branding, education, or UI-optimization work.

---

### Task 1: Extend the feedback contract and database constraint

**Files:**

- Modify: `packages/contracts/src/feedback.ts`
- Modify: `packages/contracts/src/feedback.test.ts`
- Modify: `supabase/functions/_shared/feedback.ts`
- Modify: `supabase/functions/_shared/feedback.test.ts`
- Create: `supabase/migrations/20260906000001_feedback_privacy_request.sql`
- Modify: `supabase/tests/backend_foundation.sql`

**Interfaces:**

- Consumes: `FeedbackRequestV1Schema`, `_shared/feedback.ts` `FEEDBACK_TYPES`, and `public.feedback_submissions.feedback_type`.
- Produces: `FeedbackType = "bug" | "feature_request" | "content_correction" | "privacy_request"`; all validated requests may carry `feedbackType: "privacy_request"`.

- [x] **Step 1: Write the contract failing test for `privacy_request`**

```ts
it("accepts privacy_request as a feedback type", () => {
  expect(
    FeedbackRequestV1Schema.safeParse({
      schemaVersion: "feedback-v1",
      feedbackType: "privacy_request",
      message: "請協助處理我的隱私資料請求",
      contactEmail: null,
      appVersion: "test",
      route: "/feedback",
      userAgentSummary: null
    }).success
  ).toBe(true);
});
```

- [x] **Step 2: Run the focused contract test and confirm it fails because the enum rejects `privacy_request`**

Run: `pnpm vitest run packages/contracts/src/feedback.test.ts`

Expected: FAIL with an invalid enum value for `privacy_request`.

- [x] **Step 3: Add `privacy_request` to the shared contract and Edge enum**

```ts
export const FeedbackTypeSchema = z.enum([
  "bug",
  "feature_request",
  "content_correction",
  "privacy_request"
]);
```

```ts
export const FEEDBACK_TYPES = [
  "bug",
  "feature_request",
  "content_correction",
  "privacy_request"
] as const;
```

- [x] **Step 4: Add Edge parser coverage and verify contract/Edge parity**

```ts
expect(
  parseFeedbackRequest({
    schemaVersion: "feedback-v1",
    feedbackType: "privacy_request",
    message: "請協助處理我的隱私資料請求",
    contactEmail: null,
    appVersion: "test",
    route: "/feedback",
    userAgentSummary: null
  }).feedbackType
).toBe("privacy_request");
```

Run: `pnpm vitest run packages/contracts/src/feedback.test.ts supabase/functions/_shared/feedback.test.ts`

Expected: PASS.

- [x] **Step 5: Write the database failing test before changing the constraint**

```sql
select ok(
  exists (
    select 1
    from pg_constraint
    where conrelid = 'public.feedback_submissions'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%privacy_request%'
  ),
  'feedback type constraint accepts privacy_request'
);
```

- [x] **Step 6: Run the database test and confirm the current check constraint fails the new assertion**

Run: `supabase test db supabase/tests/backend_foundation.sql`

Expected: FAIL because the existing `feedback_type` constraint lists only three values.

- [x] **Step 7: Add the minimal replacement check constraint migration**

```sql
alter table public.feedback_submissions
  drop constraint feedback_submissions_feedback_type_check;

alter table public.feedback_submissions
  add constraint feedback_submissions_feedback_type_check
  check (feedback_type in (
    'bug',
    'feature_request',
    'content_correction',
    'privacy_request'
  ));
```

- [x] **Step 8: Reset the local database and run all SQL tests**

Run: `supabase db reset && supabase test db`

Expected: all migrations apply; every SQL test passes.

- [x] **Step 9: Commit the contract and migration boundary**

```bash
git add packages/contracts/src/feedback.ts packages/contracts/src/feedback.test.ts supabase/functions/_shared/feedback.ts supabase/functions/_shared/feedback.test.ts supabase/migrations/20260906000001_feedback_privacy_request.sql supabase/tests/backend_foundation.sql
git commit -m "feat(feedback): accept privacy requests"
```

### Task 2: Add public privacy policy and terms routes

**Files:**

- Create: `apps/web/src/pages/PrivacyPolicyPage.vue`
- Create: `apps/web/src/pages/TermsPage.vue`
- Modify: `apps/web/src/router/index.ts`
- Modify: `apps/web/src/router/index.test.ts`
- Create: `apps/web/src/pages/PrivacyPolicyPage.test.ts`
- Create: `apps/web/src/pages/TermsPage.test.ts`

**Interfaces:**

- Consumes: Vue Router public route convention and existing `page-stack` / `page-heading` styling tokens.
- Produces: route names `privacy` and `terms`; direct navigation to `/privacy` and `/terms` resolves to the matching public page.

- [x] **Step 1: Write failing router tests for both public paths**

```ts
it.each([
  ["/privacy", "privacy"],
  ["/terms", "terms"]
])("resolves %s as %s without session guards", async (path, name) => {
  const router = createAppRouter(makeReadyBoot(), createMemoryHistory());
  await router.push(path);
  await router.isReady();
  expect(router.currentRoute.value.name).toBe(name);
});
```

- [x] **Step 2: Run router tests and confirm both paths currently resolve to `not-found`**

Run: `pnpm vitest run apps/web/src/router/index.test.ts`

Expected: FAIL because `privacy` and `terms` routes do not exist.

- [x] **Step 3: Create the two focused static page components**

Use `<script setup lang="ts">` only for `useRouter()` and a `goBack()` action that returns to `more`; render policy text with normal Vue interpolation/template elements, never `v-html`. Include an explicit `RouterLink` to the counterpart page and `/feedback`.

Privacy page must state:

```text
Google 登入僅用於建立登入工作階段與跨裝置同步；UVAlert 不會讀取 Gmail、Google Drive、聯絡人或其他 Google 服務資料。
```

Terms page must state:

```text
UV、天氣與補擦提醒僅供輔助參考，不構成醫療建議或防曬效果保證。
```

- [x] **Step 4: Add lazy-loaded public routes before the catch-all route**

```ts
{
  path: "/privacy",
  name: "privacy",
  component: () => import("../pages/PrivacyPolicyPage.vue"),
  meta: { title: "隱私權政策", hideNavigation: true }
},
{
  path: "/terms",
  name: "terms",
  component: () => import("../pages/TermsPage.vue"),
  meta: { title: "服務條款", hideNavigation: true }
},
```

- [x] **Step 5: Write content tests for the required public disclosures**

```ts
expect(readFileSync("apps/web/src/pages/PrivacyPolicyPage.vue", "utf8"))
  .toContain("不會讀取 Gmail、Google Drive、聯絡人或其他 Google 服務資料");
expect(readFileSync("apps/web/src/pages/TermsPage.vue", "utf8"))
  .toContain("不構成醫療建議或防曬效果保證");
```

- [x] **Step 6: Run route and page tests**

Run: `pnpm vitest run apps/web/src/router/index.test.ts apps/web/src/pages/PrivacyPolicyPage.test.ts apps/web/src/pages/TermsPage.test.ts`

Expected: PASS.

- [x] **Step 7: Commit the public-page boundary**

```bash
git add apps/web/src/pages/PrivacyPolicyPage.vue apps/web/src/pages/TermsPage.vue apps/web/src/pages/PrivacyPolicyPage.test.ts apps/web/src/pages/TermsPage.test.ts apps/web/src/router/index.ts apps/web/src/router/index.test.ts
git commit -m "feat(web): add public legal pages"
```

### Task 3: Add discoverable policy links and the privacy-request option

**Files:**

- Modify: `apps/web/src/pages/FeedbackPage.vue`
- Modify: `apps/web/src/pages/MorePage.vue`
- Modify: `apps/web/src/pages/HomePage.vue`
- Modify: `apps/web/src/pages/MorePage.test.ts`
- Create or Modify: `apps/web/src/pages/HomePage.test.ts`
- Create or Modify: `apps/web/src/pages/FeedbackPage.test.ts`
- Modify: `apps/web/index.html`

**Interfaces:**

- Consumes: `FeedbackType` from `@sunshield/contracts`, route names from Task 2.
- Produces: users can choose `privacy_request` on `/feedback`; policy links are discoverable from the rendered homepage and More page.

- [ ] **Step 1: Write the failing feedback-page test for the new option**

```ts
expect(wrapper.get("select").text()).toContain("隱私／帳號資料請求");
```

- [ ] **Step 2: Run the focused test and confirm the option is absent**

Run: `pnpm vitest run apps/web/src/pages/FeedbackPage.test.ts`

Expected: FAIL because the select currently lists three categories.

- [ ] **Step 3: Add the fourth select option with clear request copy**

```vue
<option value="privacy_request">隱私／帳號資料請求</option>
```

Keep the contact Email label as optional and do not introduce the developer email.

- [ ] **Step 4: Add a compact public-policy section to MorePage**

Add two `RouterLink`s to `/privacy` and `/terms` after the entry list, using the existing tokens and no new bottom-navigation item. The content must state that privacy and terms are public information.

- [ ] **Step 5: Add failing MorePage tests and then verify the links**

```ts
expect(wrapper.find('a[href="/privacy"]').text()).toContain("隱私權政策");
expect(wrapper.find('a[href="/terms"]').text()).toContain("服務條款");
```

Run: `pnpm vitest run apps/web/src/pages/FeedbackPage.test.ts apps/web/src/pages/MorePage.test.ts`

Expected: PASS.

- [ ] **Step 6: Add a compact link pair to the rendered HomePage**

Add a small footer-level `RouterLink` pair to `/privacy` and `/terms` in `HomePage.vue`, outside the reminder-state branches so it remains visible on the actual app homepage. Add a HomePage test that asserts both `href` values. This is the visible homepage entry required for the Google OAuth policy URL.

- [ ] **Step 7: Add a plain HTML fallback link pair to the app document**

Add an accessible `noscript` section in `apps/web/index.html` linking to `/privacy` and `/terms`, so the policy URLs are discoverable even when JavaScript cannot boot. Do not replace the SPA policy pages or add an external domain.

- [ ] **Step 8: Commit discoverability and form selection changes**

```bash
git add apps/web/src/pages/FeedbackPage.vue apps/web/src/pages/FeedbackPage.test.ts apps/web/src/pages/HomePage.vue apps/web/src/pages/HomePage.test.ts apps/web/src/pages/MorePage.vue apps/web/src/pages/MorePage.test.ts apps/web/index.html
git commit -m "feat(web): expose privacy request contact path"
```

### Task 4: Verify, deploy, and record the public OAuth URLs

**Files:**

- Modify: `docs/backend/preview-deployment.md`
- Modify: `docs/superpowers/plans/2026-09-06-public-legal-pages.md`

**Interfaces:**

- Consumes: Tasks 1–3 commits and Vercel production domain `https://uv-alert-web.vercel.app`.
- Produces: verified public URLs ready for Google OAuth: `https://uv-alert-web.vercel.app/privacy` and `https://uv-alert-web.vercel.app/terms`.

- [ ] **Step 1: Run all focused tests and verify a green build**

Run:

```bash
pnpm vitest run packages/contracts/src/feedback.test.ts supabase/functions/_shared/feedback.test.ts apps/web/src/router/index.test.ts apps/web/src/pages/FeedbackPage.test.ts apps/web/src/pages/HomePage.test.ts apps/web/src/pages/MorePage.test.ts apps/web/src/pages/PrivacyPolicyPage.test.ts apps/web/src/pages/TermsPage.test.ts
pnpm --filter @sunshield/web typecheck
pnpm --filter @sunshield/web build
supabase test db
```

Expected: every command exits 0. Record any unrelated blocker rather than claiming it passed.

- [ ] **Step 2: Push the migration to the linked Supabase project only after local SQL tests pass**

Run: `supabase db push`

Expected: migration `20260906000001_feedback_privacy_request.sql` applies without data deletion.

- [ ] **Step 3: Push `main` and wait for Vercel production deployment**

Run: `git push origin main`

Expected: Vercel build references the pushed commit and production is Ready.

- [ ] **Step 4: Browser-smoke the two exact production URLs and form option**

Verify:

```text
https://uv-alert-web.vercel.app/privacy
https://uv-alert-web.vercel.app/terms
https://uv-alert-web.vercel.app/feedback
```

Expected: first two pages render without login; feedback select includes `隱私／帳號資料請求`; no developer email appears.

- [ ] **Step 5: Record evidence and mark only verified plan steps complete**

Record the production deployment URL, migration version, test results, and browser observations in `docs/backend/preview-deployment.md`; mark completed Task 1–4 checkboxes in this plan.

- [ ] **Step 6: Commit verification records**

```bash
git add docs/backend/preview-deployment.md docs/superpowers/plans/2026-09-06-public-legal-pages.md
git commit -m "docs: record legal page deployment"
```
