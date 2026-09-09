# Desktop Layout Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repair desktop form and choice layouts without changing UV/product domain behavior.

**Architecture:** Keep responsive policy in shared CSS tokens and classes. Restrict desktop control widths only where a compact control is semantically appropriate; allow form fields and primary form actions to align to their card column. Keep the water-resistance hierarchy in `ProductSnapshotEditor`, but ensure its parent option is a deliberate full row.

**Tech Stack:** Vue 3, TypeScript, Vitest, CSS custom properties, Playwright browser verification.

## Global Constraints

- Preserve mobile layouts and the 44px tap target.
- Use existing Design Tokens; no hex colors, magic component dimensions, or inline styles.
- Do not add a desktop-only navigation pattern in this repair; record it separately if visual QA confirms it is product work rather than a regression.
- No push, merge, PR, or worktree cleanup.

---

### Task 1: Protect form control alignment

**Files:**
- Modify: `apps/web/src/assets/app.css`
- Modify: `apps/web/src/pages/FeedbackPage.vue`
- Test: `apps/web/src/assets/desktopFormLayout.test.ts`

- [x] Write a failing source-level regression test requiring a `.form-control-stack` class to make child text controls and primary submit actions fill their available card column on desktop, while `.button` retains the shared maximum for non-form actions.
- [x] Run the focused test and confirm RED.
- [x] Add the scoped shared class and apply it to `FeedbackPage`; use it as the reusable form-column contract rather than overriding individual widths.
- [x] Run the focused test and confirm GREEN.

### Task 2: Repair water-resistance row hierarchy

**Files:**
- Modify: `apps/web/src/components/product/ProductSnapshotEditor.vue`
- Modify: `apps/web/src/components/product/labelQuestionRows.test.ts`

- [x] Write a failing test that requires the `water-claim-option` to span every desktop row column.
- [ ] Run the focused test and confirm RED. (The first run exposed a test file-path issue; the completed source assertion was not separately rerun before the implementation.)
- [x] Add the component-scoped grid span using existing grid semantics; do not alter radio values, DOM grouping, or disclosure behavior.
- [x] Run the focused test and confirm GREEN.

### Task 3: Verify desktop matrix

**Files:**
- Modify: `docs/superpowers/plans/2026-09-09-desktop-layout-repair.md`

- [x] Run focused tests, `pnpm typecheck`, and `pnpm lint`.
- [x] Use browser screenshots at 1280px and 1440px for Feedback, new Gear form, and product label water question; check no control/card-width mismatch, no orphan water option, no clipping, natural wrapping, and intact mobile navigation.
- [x] Record actual evidence and remaining product-level desktop-navigation decision.

#### Evidence recorded 2026-09-09

- `pnpm check` passed: workspace typecheck, 189 test files / 7898 tests, ESLint, and Stylelint.
- At 1440px, Feedback's form is 662px wide with 620px usable control width; the select and submit button each measured 620px. The browser screenshot confirmed aligned form edges.
- At 1440px, the new Gear form's name field measured 620px and the primary save action 662px (their intended parent columns). The water parent option and its first grid both measured 620px; its computed three-column grid remained, but the parent itself now measured 620px rather than one column.
- The same form and water measurements held at 1280px. Browser state allowed direct visual screenshots for Feedback and the new Gear form. The local storage adapter reported a reminder-read alert, but it did not block the new Gear form or the water question.
- The centred 47rem app shell and bottom navigation on desktop remain an explicit product-layout decision, not part of this defect repair. No desktop-only navigation pattern was added.
