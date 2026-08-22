# Session End Control Visual Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the reminder session-ending UI while preserving two-step confirmation, focus management, and mobile-safe touch targets.

**Architecture:** Keep the existing Vue component and controller boundary. Change only template semantics and component-scoped presentation; lock the behavior with the existing Vue Test Utils test suite.

**Tech Stack:** Vue 3, `<script setup lang="ts">`, Vue Test Utils, Vitest, scoped CSS.

## Global Constraints

- Do not change IndexedDB, contracts, reducer, or the session-end transaction.
- Preserve `confirm` and `resetError` emits.
- Preserve error copy and ending-state disabling.
- Keep the trigger as a semantic button with a minimum 44px touch target.

---

### Task 1: Lock the simplified disclosure behavior

**Files:**
- Modify: `apps/web/src/components/session/SessionEndControl.test.ts`
- Modify: `apps/web/src/components/session/SessionEndControl.vue`

**Interfaces:**
- Consumes: `phase: SessionEndPhase`, `error: SessionEndError`
- Produces: `confirm` and `resetError` component events

- [ ] **Step 1: Write failing tests**

Assert that the resting trigger has `text-link`, the expanded content uses `[role="region"]`, no `app-card` is present, and the confirmation title is a styled `<p>` referenced by `aria-labelledby`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm vitest run apps/web/src/components/session/SessionEndControl.test.ts`

Expected: FAIL because the current component still uses an `alertdialog`, `app-card`, and heading-row button.

- [ ] **Step 3: Apply the minimal Vue/CSS change**

Move the trigger into the summary, replace `alertdialog` with a labelled region, remove card styling, use a styled `<p>` for the confirmation title, add a 44px inline-flex hit target, and remove obsolete mobile rules.

- [ ] **Step 4: Run focused and full verification**

Run:

```powershell
pnpm vitest run apps/web/src/components/session/SessionEndControl.test.ts
pnpm typecheck
pnpm test
pnpm build
```

Expected: all commands exit with code 0.
