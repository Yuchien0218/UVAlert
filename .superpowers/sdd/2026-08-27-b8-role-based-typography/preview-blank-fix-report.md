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
