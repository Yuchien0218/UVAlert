# Reminder Page Restoration Design

**Date:** 2026-08-01  
**Status:** Approved design, pending implementation review

## Goal

Restore `/reminder` as the dedicated detailed reminder page and restore the fourth bottom-navigation entry, while keeping the home page focused on the current highest-priority action and outdoor UV information.

This change does not modify IndexedDB schemas, contracts, reducers, projection rules, or command transactions.

## Page Responsibilities

### Home `/`

The home page contains:

- `HomeReminderSummary`
- `OutdoorContextCard`
- `EveningUvPrompt` when eligible
- `FiveDayUvCard`
- the existing general safety note associated with home UV information

When an active Session exists, `HomeReminderSummary` continues to derive its primary CTA from `primaryAction.actionKind`.

The home page no longer contains:

- `ZoneStatusList`
- `SessionEndControl`
- detailed reminder-state management

### Reminder `/reminder`

When an active Session exists, the reminder page contains, in this order:

1. `PrimaryReminderPanel`
2. `ZoneStatusList`
3. `SessionEndControl`
4. the reminder safety note

When no active Session exists, the route remains `/reminder` and renders `ReminderEmptyState`. It must not redirect to the home page.

Loading and database-read failure states remain local to the reminder page and must not replace an existing Session with an empty state.

## Navigation and Routing

The bottom navigation contains exactly four entries:

1. Home — `/`
2. Reminder — `/reminder`
3. Products — `/products`
4. More — `/more`

Each entry retains both an icon and visible text. Vue Router exact-active styling identifies the current page.

The `/reminder` route renders `ReminderPage.vue` directly. The legacy redirect from `/reminder` to `/` is removed.

Existing reminder actions continue to route according to the current `ActionKind` mapping. Implementing `/reminder/reapply` or other command transactions is outside this restoration slice.

## Component Boundaries and Data Flow

- `HomePage.vue` remains a route-level composition surface for the summary and UV components.
- `ReminderPage.vue` remains a route-level composition surface for reminder details and Session management.
- Session projection remains owned by the existing app boot controller.
- Ending a Session remains owned by the existing session control controller.
- Child components receive projection state through typed props and notify route pages through typed emits.
- No duplicated reminder truth or page-local Session copy is introduced.

## Error Handling

- Reminder loading state uses `role="status"`.
- Reminder restoration failure uses `role="alert"` and retains the existing retry action.
- A failed end-Session transaction remains on `/reminder` and is handled by `SessionEndControl`.
- Successful Session end refreshes the projection and displays `ReminderEmptyState` on the same route.

## Tests and Acceptance

Implementation must add or update tests proving:

1. `/reminder` resolves to the reminder page instead of redirecting home.
2. The bottom navigation contains Home, Reminder, Products, and More.
3. The home page does not render `ZoneStatusList` or `SessionEndControl`.
4. The reminder page renders `PrimaryReminderPanel`, `ZoneStatusList`, and `SessionEndControl` for an active Session.
5. The reminder page renders `ReminderEmptyState` without navigation when no Session exists.
6. Ending a Session successfully leaves the user on `/reminder` and changes the page to the empty state through the refreshed projection.
7. Type checking, all automated tests, and the production build pass.

## Out of Scope

- `/reminder/reapply`
- event-report transactions
- region-setting flow
- IndexedDB schema changes
- contracts or reducer changes
- visual redesign beyond restoring the fourth navigation item and moving existing components

