# Reminder Zero-Minute Due Tone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reminder page switch to its due-red presentation as soon as its local countdown reaches zero.

**Architecture:** Keep domain projections unchanged and resolve the clock/projection boundary in the pure reminder presentation builder. Reuse the existing due presentation so color, copy, ARIA semantics, and action rendering change together.

**Tech Stack:** Vue 3, TypeScript, Vitest, Vue Test Utils

## Global Constraints

- Do not change IndexedDB, contracts, reducers, or transactions.
- Preserve the `actionKind` supplied by the committed primary action.
- Do not implement a CSS-only color override.

---

### Task 1: Cover and fix the zero-minute boundary

**Files:**
- Modify: `apps/web/src/components/reminder/PrimaryReminderPanel.test.ts`
- Modify: `apps/web/src/features/reminder/reminderPresentation.ts`

**Interfaces:**
- Consumes: `buildReminderPresentation({ primaryAction, zones, connectivity, now })`
- Produces: a `ReminderPresentation` with `tone: "due"` when a valid timed countdown reaches zero

- [ ] **Step 1: Write the failing regression test**

Add a test that freezes time at `baseAction.actionAt`, mounts `PrimaryReminderPanel` with the still-timed `baseAction` and still-tracking `baseZone`, and expects `data-presentation="due"`, class `due-panel--due`, and the original action to remain available.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm test -- apps/web/src/components/reminder/PrimaryReminderPanel.test.ts`

Expected: the new assertion receives `timed` before the production fix.

- [ ] **Step 3: Implement the presentation fallback**

In the `timed_ring` branch, after calculating `remainingMinutes`, return the existing due presentation when `remainingMinutes === 0`. Extract the due object construction into a focused helper if needed to avoid duplicating the committed `due_card` branch.

- [ ] **Step 4: Run focused verification**

Run: `pnpm test -- apps/web/src/components/reminder/PrimaryReminderPanel.test.ts`

Expected: all tests in the file pass.

- [ ] **Step 5: Run project verification**

Run: `pnpm typecheck`

Run: `pnpm test`

Run: `pnpm build`

Expected: all commands exit successfully.

### Task 2: Synchronize affected zone status colors and labels

**Files:**
- Modify: `apps/web/src/features/reminder/reminderPresentation.ts`
- Modify: `apps/web/src/components/reminder/ZoneStatusList.vue`
- Modify: `apps/web/src/components/reminder/ZoneStatusList.test.ts`
- Modify: `apps/web/src/pages/ReminderPage.vue`

**Interfaces:**
- Produces: `isReminderActionDue(primaryAction, now)` as the shared local due-boundary predicate
- Consumes: `PrimaryAction.affectedZoneInstanceIds` to limit the visual override to affected zones

- [ ] **Step 1: Write the failing zone synchronization test**

Freeze time at `actionAt`, supply a still-timed primary action and tracking zones, and assert that affected zones render in `zone-group--due` with the due status label while an unaffected tracking zone remains in `zone-group--tracking`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `pnpm test -- apps/web/src/components/reminder/ZoneStatusList.test.ts`

Expected: the affected group remains tracking before the production fix.

- [ ] **Step 3: Implement one shared due-boundary predicate**

Export `isReminderActionDue(primaryAction, now)` from the reminder presentation module, use it in the primary panel presentation path, and use it in `ZoneStatusList` to derive the effective status of affected tracking/soon zones.

- [ ] **Step 4: Wire the committed primary action into the zone list**

Pass `boot.currentSession.value.primaryAction` from `ReminderPage.vue` to `ZoneStatusList`.

- [ ] **Step 5: Run focused and project verification**

Run: `pnpm test -- apps/web/src/components/reminder/ZoneStatusList.test.ts apps/web/src/components/reminder/PrimaryReminderPanel.test.ts`

Run: `pnpm typecheck`

Run: `pnpm test`

Run: `pnpm build`

Expected: all commands exit successfully.
