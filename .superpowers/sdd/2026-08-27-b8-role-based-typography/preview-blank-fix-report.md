# B8 preview blank-screen fix report

## Status

DONE_WITH_CONCERNS

- Branch: `codex/b8-typography-scale`
- Scope stayed within the brief's five expected tracked files.
- Push / merge / PR changes: not performed.

## Scope audit

- Tracked code changes remain limited to:
  - `apps/web/src/adapters/configuredEnvironment.ts`
  - `apps/web/src/adapters/SupabaseAuthAdapter.ts`
  - `apps/web/src/adapters/SupabaseAuthAdapter.test.ts`
  - `apps/web/src/adapters/SupabaseCloudSyncAdapter.ts`
  - `apps/web/src/adapters/SupabaseCloudSyncAdapter.test.ts`
- No UI, CSS, DESIGN, icon, motion, Logo, reminder-flow, routing, or deployment-document changes were added.
- This takeover only applied one allowed follow-up change beyond the inherited implementation: a pure Prettier rewrite on four already-modified files.

## Implemented behavior

- Added a shared `readConfiguredEnvironmentValue()` helper that trims configured strings and converts empty or whitespace-only values to `undefined`.
- Applied that normalization to Supabase auth URL and publishable key before deciding whether to build the Supabase client.
- Applied the same normalization to cloud-sync base URL and to the Supabase-config presence check that decides whether cloud sync should stay enabled.
- Added the two focused regression tests required by the brief:
  - blank Supabase URL/key returns `DisabledAuthAdapter`
  - blank cloud-sync base URL returns `DisabledCloudSyncAdapter`

## Verification

### Fresh evidence from this takeover

- Focused Vitest rerun: `2` files / `7` tests passed.
- Changed-files Prettier check initially failed on four inherited edited files; a pure formatting pass was applied, then the same changed-files Prettier check passed.
- `git diff --check` passed with no whitespace-error findings.
- Post-format scope re-audit still showed only the brief's five tracked code files plus this report and the `progress.md` ledger update.

### Prior evidence carried forward from the implementer handoff

- TDD red evidence was reported before takeover:
  - blank auth URL/key previously threw `supabaseUrl is required`
  - blank cloud-sync base URL previously selected the wrong adapter
- TDD green evidence was reported before takeover: the focused adapter suite passed at `2` files / `7` tests.
- Full verification was reported before takeover and was not rerun because the live diff matched the brief and no inconsistency was found:
  - `pnpm check`: passed at `90` files / `648` tests, with typecheck / ESLint / Stylelint passing
  - `pnpm build`: passed

## Concerns

- The red-phase failure evidence and the full `pnpm check` / `pnpm build` results are inherited from the prior implementer handoff, not freshly rerun in this takeover.
- Running focused verification inside the managed sandbox hit the known worktree parent-directory access restriction, so the focused Vitest and Prettier commands were rerun outside the sandbox to obtain usable evidence.

## Fix round 1

### Reviewer findings addressed

- `SupabaseCloudSyncAdapter` factory previously normalized `baseUrl` and then still re-enabled sync through fallback construction when a blank explicit `baseUrl` was passed alongside nonblank Supabase env config.
- Focused coverage did not directly guard helper normalization, auth single-field blank handling, whitespace handling, or the cloud-sync environment matrix.

### Additional scoped change

- Added `apps/web/src/adapters/configuredEnvironment.test.ts`.
- This is the only tracked file beyond the original five code files, and it is strictly required to satisfy the reviewer's requested direct helper table coverage for `undefined`, empty, whitespace-only, and trimmed nonblank inputs.

### TDD evidence

- Red:
  - Focused suite failed only at `SupabaseCloudSyncAdapter` when `createSupabaseCloudSyncAdapter({ auth, baseUrl: "   " })` was evaluated with nonblank `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
  - Failure was behavioral, not a test error: the factory returned `SupabaseCloudSyncAdapter` instead of `DisabledCloudSyncAdapter`.
- Green:
  - After the minimal factory fix, focused Vitest passed at `3` files / `19` tests.

### Minimal implementation

- Kept `readConfiguredEnvironmentValue()` unchanged.
- In `createSupabaseCloudSyncAdapter()`, treated an explicitly provided `baseUrl` that normalizes to `undefined` as an immediate disabled case.
- Preserved the existing env-driven `/v1` fallback path only for cases where callers do not explicitly pass `baseUrl`.

### Fresh verification

- `pnpm check`: passed fresh; all workspace typechecks completed, `91` test files / `660` tests passed, then ESLint and Stylelint completed with exit code `0`.
- `pnpm build`: passed fresh. Existing warnings remain:
  - chunk-size warning for large production bundles
  - `VITE_PUBLIC_SITE_URL is not set`, so generated canonical/sitemap URLs use `http://localhost:4173`
- Changed-files Prettier check failed once on `apps/web/src/adapters/SupabaseAuthAdapter.test.ts`; after a pure formatting rewrite, the changed-files Prettier check passed.
- `git diff --check`: passed.

### Round 1 concerns

- Focused and full verification still required running outside the managed sandbox because the worktree test/build tooling needs parent-directory and installed-package access that the sandbox blocks.
