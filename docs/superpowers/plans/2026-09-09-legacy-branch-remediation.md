# Legacy Branch Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Safely transfer still-valid work from reviewed legacy branches onto current `main`, while preventing stale Push claims and inaccurate operational records.

**Architecture:** Start from current `main` in an isolated worktree. Recreate only the reviewed, still-valid changes with tests first; do not merge old branches wholesale because their notification UI predates anonymous background Push. Record the resulting status truthfully in the plan index.

**Tech Stack:** Vue 3, TypeScript, Vitest, CSS custom-property tokens, Markdown operational documentation.

## Global Constraints

- Do not change, stage, restore, or commit `apps/web/src/features/education/education-content.generated.ts`; its current difference is line-ending-only.
- Do not carry forward the claim that notification delivery requires an open browser tab. Background Push is optional, auxiliary, and may still be delayed or blocked.
- Keep Local Session and IndexedDB as the reminder source of truth.
- Preserve existing shared button, card, typography, spacing, and natural-wrapping conventions.
- Do not claim Android Chrome, iPhone/iPad Home Screen, or long-term exactly-once verification is complete without current device evidence.

---

### Task 1: Correct anonymous Push status documentation

**Files:**
- Modify: `docs/superpowers/plans/README.md`
- Test: `git diff --check` and targeted text search

**Interfaces:**
- Consumes: Push completion evidence in `docs/superpowers/plans/2026-08-30-anonymous-web-push-reminders.md`.
- Produces: An index entry that distinguishes completed documentation from open mobile and long-term smoke evidence.

- [x] **Step 1: Add an expectation search before editing**

```powershell
rg -n "final documentation commit|Android Chrome|iPhone/iPad|exactly-once" docs/superpowers/plans/README.md docs/superpowers/plans/2026-08-30-anonymous-web-push-reminders.md
```

Expected: the index incorrectly says the final documentation commit is open while the implementation plan marks it complete.

- [x] **Step 2: Replace only the contradictory index clause**

The anonymous-Push index row must say that the final documentation commit is complete, while Android Chrome, iPhone/iPad Home Screen, and longer exactly-once observation remain open.

- [x] **Step 3: Verify the documentation correction**

```powershell
rg -n "final documentation commit 亦尚未完成" docs/superpowers/plans/README.md
git diff --check
```

Expected: the obsolete sentence has no match and the diff has no whitespace errors.

### Task 2: Reconcile legacy layout and copy work with current `main`

**Files:**
- Inspect: `apps/web/src/components/help/ContentUnderReview.vue`
- Inspect: `apps/web/src/pages/education/EducationArticlePage.vue`
- Inspect: `apps/web/src/pages/settings/DataSettingsPage.vue`
- Inspect: `apps/web/src/pages/settings/NotificationSettingsPage.vue`
- Inspect: current test and copy files corresponding to the two legacy branches

**Interfaces:**
- Consumes: the reviewed legacy branches and their source audits.
- Produces: an evidence-backed decision whether any production code must be transferred.

- [x] **Step 1: Compare patch identities and current source history**

Evidence: `git cherry -v main copy/taiwan-copy-audit` marks the copy commit `13e05f4` as patch-equivalent (`-`) to current `main`; `git cherry -v main codex/push-notification-plan` likewise marks `677cf1c` and `f164962` as equivalent. `git log -S` and `git blame` identify current-main commit `943214b` as already containing the adopted paragraph, aside, blockquote, and empty-card layout changes from `polish/paragraph-spacing-and-void-cards`.

- [x] **Step 2: Exclude stale notification wording**

Current `NotificationSettingsPage.vue` already distinguishes an open-tab local fallback from optional background Push and retains the limitation that delivery may be delayed or unavailable. The legacy "keep the browser tab open" claim is not transferred.

- [x] **Step 3: Decide code and test disposition**

No production source or test changes are required: the reviewed legacy behavior is already in current `main`, and reproducing it would duplicate or regress the current background-Push page. No TDD cycle is applicable because no production code is changed.

### Task 3: Review and commit the documentation-only reconciliation

**Files:**
- Modify: `docs/superpowers/plans/README.md`
- Create: this plan

**Interfaces:**
- Consumes: Task 1 correction and Task 2 historical reconciliation.
- Produces: a small, truthful documentation-only branch ready for an explicit integration decision.

- [ ] **Step 1: Review the documentation diff**

Confirm the index says the documentation commit is complete and leaves only genuinely unverified mobile and long-term Push evidence open.

- [ ] **Step 2: Verify the documentation-only branch**

```powershell
git diff --check
git status --short
```

Expected: only the index and this plan are changed, with no whitespace errors.

- [ ] **Step 3: Commit the verified documentation reconciliation**

```powershell
git add -- docs/superpowers/plans/README.md docs/superpowers/plans/2026-09-09-legacy-branch-remediation.md
git diff --cached --check
git commit -m "docs: reconcile reviewed legacy branch status"
```

**Plan self-review:** Task 1 corrects the only current documentation defect. Task 2 prevents duplicate transfer of work already present in `main` and excludes stale Push copy. Task 3 requires a narrow diff review before a local commit. No production deployment, branch deletion, merge, or remote push is authorized by this plan.
