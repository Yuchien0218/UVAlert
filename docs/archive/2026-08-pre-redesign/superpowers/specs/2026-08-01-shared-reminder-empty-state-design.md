# Shared Reminder Empty State Design

## Goal

Make the no-session state on the home page and reminder page visually and verbally identical. The shared card uses the existing home-page blue treatment and the approved reminder-page copy.

## Component architecture

`ReminderEmptyState.vue` becomes the single shared empty-state component. `ReminderPage.vue` keeps its existing use of this component. `HomeReminderSummary.vue` renders the same component whenever `session` is `null`; its timed, due, soon, and untimed session presentations remain unchanged.

The shared component owns its icon, copy, setup link, and empty-card styling. Neither route page duplicates those details.

## Visual specification

- Background: `var(--color-tracking-soft)`.
- Shape: the same large rounded rectangle used by the current home summary through `var(--radius-lg)`.
- No white card background, border, or box shadow.
- Icon: the current home empty-state circular check icon on a white circular surface.
- Content remains left aligned.
- The primary black button is aligned to the right edge of the card on both pages.
- The title stays on one line using responsive type sizing plus `white-space: nowrap`.
- The layout must not overflow at supported mobile widths.

## Copy

- Title: `尚未建立提醒`
- Body: `建立提醒以追蹤各部位狀態與補擦時機。`
- CTA: `新增提醒` followed by the existing arrow icon.
- CTA destination: `/setup`.

## Scope boundaries

- Do not change active-session countdown cards or reminder transactions.
- Do not change IndexedDB, contracts, reducers, or routing behavior.
- Do not change other pages or global button styles.

## Verification

- A component test verifies the shared copy, setup destination, blue-card class, right-aligned CTA class, and one-line title class.
- A home summary test verifies that `session: null` renders the shared `ReminderEmptyState` component.
- Existing active-session home summary and reminder page tests remain green.
- Run project type checking, the full test suite, and the production build.

