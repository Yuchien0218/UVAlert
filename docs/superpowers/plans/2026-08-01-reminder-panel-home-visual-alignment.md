# Reminder Panel Home Visual Alignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the reminder page's primary reminder block use the same quiet, state-soft visual hierarchy as `HomeReminderSummary.vue` without modifying other pages.

**Architecture:** Keep `PrimaryReminderPanel.vue` as the state dispatcher and update the unified `ReminderPanel.vue` component. Extend the existing reminder presentation with a derived `remainingMinutes` value so the panel can render a large minute value without reimplementing reminder rules in Vue templates.

**Tech Stack:** Vue 3, TypeScript, scoped CSS, Vitest, Vue Test Utils.

## Global Constraints

- Do not change contracts, reducer, IndexedDB, routes, or reminder transactions.
- Use `--color-tracking-soft`, `--color-soon-soft`, `--color-due-soft`, and the existing `--color-untimed-soft`.
- Keep one full-width primary action and remove the duplicate zone-status link.
- Do not modify `HomeReminderSummary.vue` or unrelated pages.

---

### Task 1: Align the primary reminder presentation

**Files:**
- Modify: `apps/web/src/features/reminder/reminderPresentation.ts`
- Modify: `apps/web/src/components/reminder/PrimaryReminderPanel.vue`
- Modify: `apps/web/src/components/reminder/ReminderPanel.vue` (now the unified component)
- Modify: `apps/web/src/components/reminder/PrimaryReminderPanel.test.ts`
- Modify: `apps/web/src/pages/ReminderPage.vue`
- Modify: `apps/web/src/pages/ReminderPage.test.ts`

**Interfaces:**
- `ReminderPresentation.remainingMinutes: number | null`
- `PrimaryReminderPanel.vue` supplies the existing `useCurrentTime()` value so the displayed minutes continue to decrease while mounted.
- Existing `action` emit remains unchanged.

- [ ] Write failing component/page tests for state classes, one eyebrow, large minutes, one CTA, no duplicate zone link, and no developer copy.
- [ ] Run the focused tests and confirm they fail against the current card UI.
- [ ] Add the derived minute field and implement the minimal template/CSS changes.
- [ ] Run focused tests, typecheck, full tests, and build.
