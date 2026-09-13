# Local Data Page Hierarchy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce card stacking and repeated empty-state copy on the local data page while preserving every export, import, confirmation, and clear-data behavior.

**Architecture:** Keep `DataSettingsPage.vue` as the existing route-level coordinator because this change introduces no new state or reusable interaction. Change only its presentation hierarchy and user-facing copy, with component tests guarding the rendered structure and action availability.

**Tech Stack:** Vue 3 Composition API, TypeScript, scoped CSS, Vitest, Vue Test Utils.

## Global Constraints

- Preserve all controller calls, confirmation steps, error states, and data-safety statements.
- Keep the data summary as the only `.app-card`.
- Render backup and clear controls as flat sibling sections.
- Show a non-interactive draft status when no draft exists; show the clear action only when a draft exists.
- Keep the destructive all-data action as white surface with danger-colored text.
- Reuse existing design tokens; add no raw colors or magic spacing values.

---

### Task 1: Guard the approved hierarchy and copy

**Files:**
- Modify: `apps/web/src/pages/settings/DataSettingsPage.test.ts`
- Modify: `apps/web/src/pages/settings/dataSettingsLayout.test.ts`

**Interfaces:**
- Consumes: rendered `DataSettingsPage` and existing `localData` service fixture.
- Produces: tests for one summary card, two flat sections, conditional draft action, and concise empty values.

- [x] Write tests for the approved rendered behavior.
- [x] Run the focused tests and confirm they fail against the current page.

### Task 2: Implement the flattened page hierarchy

**Files:**
- Modify: `apps/web/src/pages/settings/DataSettingsPage.vue`

**Interfaces:**
- Consumes: existing `localData` controller state and actions without contract changes.
- Produces: the same export, import, and clear operations in a flatter visual hierarchy.

- [x] Update the page introduction, summary values, backup copy, and action labels.
- [x] Keep only the summary in `.app-card`; use `.data-section` for backup and clear areas.
- [x] Replace the disabled no-draft button with static status text.
- [x] Separate the all-data action under a visible danger subsection.
- [x] Run focused tests until green.

### Task 3: Verify the complete result

**Files:**
- Verify: `apps/web/src/pages/settings/DataSettingsPage.vue`
- Verify: `apps/web/src/pages/settings/DataSettingsPage.test.ts`
- Verify: `apps/web/src/pages/settings/dataSettingsLayout.test.ts`

**Interfaces:**
- Consumes: completed implementation.
- Produces: test, lint, typecheck, and mobile-layout evidence.

- [x] Inspect the rendered page at 375px width for hierarchy, wrapping, and overflow.
- [x] Run `pnpm check` and confirm exit code 0.
- [x] Run `git diff --check` and verify unrelated user files remain untouched.
