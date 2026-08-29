# PR #4 integration with current main

## Objective

Update `codex/f1-f4-g2-g3` by merging current `origin/main` (`f40a87d` or newer) into it, preserving PR #4's copy/accessibility/test-decoupling/dead-CSS intent while adopting main's completed B8, icon/motion, B9, Vercel, security, and FiveDayUvCard changes.

## Safety

- Work only in `C:\Users\yu\Coding Projects\UVAlert\.worktrees\f1-f4-g2-g3`.
- Do not rebase or force-push. Use a normal merge commit.
- Do not abort once the merge starts. Resolve every conflict deliberately.
- Do not touch root checkout, Logo files, education worktree, or B9 plan work.
- Do not invent product behavior or broaden PR #4.

## PR #4 intent to preserve

- Use the current shared loader on local-data loading state. The original PR used `SunLoader`; current main deleted it in favor of `BroadcastLoader`. Preserve the intent using main's current loader contract, not the deleted component.
- Preserve copy/accessibility improvements.
- Preserve tests decoupled from CSS implementation details.
- Preserve verified dead status-style removal only when still dead on current main.
- Preserve the audit decision documentation, updating stale wording only where merge state makes it false.

## Current-main contracts to preserve

- B8 seven typography roles and five-field runtime contract.
- Explicit semantic `data-typography-role` heading coverage and 320px containment.
- `@lucide/vue` remains removed; use generated `Icon` system.
- `BroadcastLoader` and `InlineLoader` replace old rotating/Sun loaders.
- DESIGN.md motion tokens/rules remain synchronized with `packages/ui/src/styles.css` and tests.
- No `transition: all`; infinite animation has local reduced-motion `animation: none`.
- B9 decision 1/2 contracts remain intact.
- Vercel SPA rewrite, `.env*` ignore protections, and FiveDayUvCard link regression remain intact.

## Verification

- Inspect merge conflicts and auto-merged overlap semantically.
- Search for conflict markers, `SunLoader`, `@lucide/vue`, and `transition: all`.
- Run affected focused tests.
- Run fresh `pnpm check` and `pnpm build`.
- Run targeted Prettier for changed files and `git diff --check`.
- Write `.superpowers/sdd/pr4-main-integration/report.md` with conflict decisions, auto-merge audit, tests, and concerns.
- Commit the completed merge. Do not push.
