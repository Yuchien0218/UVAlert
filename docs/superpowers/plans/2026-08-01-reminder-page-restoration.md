# Reminder Page Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore `/reminder` as the detailed reminder page, restore the fourth bottom-navigation item, and keep the home page focused on summary and UV information.

**Architecture:** Vue Router renders `ReminderPage.vue` directly at `/reminder`. Route pages remain thin composition surfaces over the existing app boot and session-control controllers; no new Session truth, contract, reducer, or IndexedDB behavior is introduced.

**Tech Stack:** Vue 3, `<script setup lang="ts">`, Vue Router 4, Vitest, Vue Test Utils, TypeScript, Vite.

## Global Constraints

- Do not modify IndexedDB schemas, contracts, reducers, projections, or command transactions.
- Home contains `HomeReminderSummary`, outdoor information, evening UV prompt, five-day UV, and the home safety note.
- Reminder contains `PrimaryReminderPanel`, `ZoneStatusList`, `SessionEndControl`, and the reminder safety note.
- `/reminder` must remain `/reminder` when no Session exists.
- Bottom navigation is exactly `首頁｜提醒｜產品｜更多`, with icon and visible text.
- Existing `primaryAction.actionKind` routing remains unchanged.
- The workspace is not a Git repository; commit steps are not applicable.

---

### Task 1: Restore Reminder Route and Bottom Navigation

**Files:**
- Modify: `apps/web/src/router/index.test.ts`
- Modify: `apps/web/src/router/index.ts`
- Create: `apps/web/src/components/shell/BottomNavigation.test.ts`
- Modify: `apps/web/src/components/shell/BottomNavigation.vue`

**Interfaces:**
- Consumes: `createAppRouter(boot, history, setup?)` and Vue Router `RouterLink`.
- Produces: route name `reminder` at `/reminder`; four visible navigation destinations.

- [ ] **Step 1: Change the route test to require a dedicated reminder route**

```ts
it("提醒網址保留在提醒頁", async () => {
  const router = createAppRouter(boot, createMemoryHistory());
  await router.push("/reminder#zone-status");
  await router.isReady();
  expect(router.currentRoute.value.name).toBe("reminder");
  expect(router.currentRoute.value.hash).toBe("#zone-status");
  expect(globalThis.document.title).toBe("目前提醒｜防曬晴報員");
});
```

- [ ] **Step 2: Add a bottom-navigation behavior test**

Mount `BottomNavigation` with a memory router and assert the visible labels and `href` values are exactly:

```ts
[
  ["首頁", "/"],
  ["提醒", "/reminder"],
  ["產品", "/products"],
  ["更多", "/more"]
]
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
pnpm exec vitest run apps/web/src/router/index.test.ts apps/web/src/components/shell/BottomNavigation.test.ts
```

Expected: route test fails because `/reminder` redirects to home; navigation test fails because only three items exist.

- [ ] **Step 4: Implement the dedicated route and fourth navigation item**

Replace the redirect with:

```ts
{
  path: "/reminder",
  name: "reminder",
  component: () => import("../pages/ReminderPage.vue"),
  meta: { title: "目前提醒" }
}
```

Add `Bell` and update the navigation list and CSS grid to four columns:

```ts
{ to: "/reminder", label: "提醒", icon: Bell }
```

```css
grid-template-columns: repeat(4, 1fr);
```

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the same Vitest command. Expected: PASS.

---

### Task 2: Restore Home and Reminder Page Responsibility Boundaries

**Files:**
- Create: `apps/web/src/pages/HomePage.test.ts`
- Create: `apps/web/src/pages/ReminderPage.test.ts`
- Modify: `apps/web/src/pages/HomePage.vue`
- Modify: `apps/web/src/pages/ReminderPage.vue`

**Interfaces:**
- Consumes: `WebAppServices.boot`, `WebAppServices.sessionControl`, existing reminder and UV components.
- Produces: summary-only home page and detailed reminder page without duplicated Session truth.

- [ ] **Step 1: Add a home-page boundary test**

Mount `HomePage` with active Session services and real child components where practical. Assert:

```ts
expect(wrapper.findComponent(HomeReminderSummary).exists()).toBe(true);
expect(wrapper.findComponent(ZoneStatusList).exists()).toBe(false);
expect(wrapper.findComponent(SessionEndControl).exists()).toBe(false);
```

- [ ] **Step 2: Add reminder-page active and empty-state tests**

For an active Session, assert:

```ts
expect(wrapper.findComponent(PrimaryReminderPanel).exists()).toBe(true);
expect(wrapper.findComponent(ZoneStatusList).exists()).toBe(true);
expect(wrapper.findComponent(SessionEndControl).exists()).toBe(true);
expect(wrapper.text()).toContain("不代表安全曝曬時間");
```

For a null Session, assert `ReminderEmptyState` exists and no navigation is triggered.

- [ ] **Step 3: Run page tests and verify RED**

Run:

```powershell
pnpm exec vitest run apps/web/src/pages/HomePage.test.ts apps/web/src/pages/ReminderPage.test.ts
```

Expected: home test fails because detail controls are still present; reminder active test fails because `SessionEndControl` is absent.

- [ ] **Step 4: Remove detailed controls from HomePage**

Remove the `ZoneStatusList` and `SessionEndControl` imports, handlers, and template instances. Keep `HomeReminderSummary`, outdoor context, evening prompt, five-day UV card, and the existing home safety note.

- [ ] **Step 5: Add SessionEndControl to ReminderPage**

Inject the existing controller through services:

```ts
const { boot, sessionControl } = useWebAppServices();

function handleEndSession(): void {
  const currentSession = boot.currentSession.value;
  if (currentSession === null) return;
  void sessionControl.endCurrentSession(currentSession);
}
```

Render it after `ZoneStatusList` and before the safety note:

```vue
<SessionEndControl
  :phase="sessionControl.endPhase.value"
  :error="sessionControl.endError.value"
  @confirm="handleEndSession"
  @reset-error="sessionControl.clearEndError"
/>
```

- [ ] **Step 6: Run page tests and verify GREEN**

Run the same page Vitest command. Expected: PASS.

---

### Task 3: Regression and Production Verification

**Files:**
- Modify only if a verification failure reveals a defect within this approved scope.

**Interfaces:**
- Consumes: all workspace packages and the production Vite configuration.
- Produces: verified reminder-page restoration.

- [ ] **Step 1: Run Vue and TypeScript checks**

```powershell
pnpm typecheck
```

Expected: all workspace project type checks pass.

- [ ] **Step 2: Run all tests**

```powershell
pnpm test
```

Expected: all existing 134 tests plus the newly added tests pass.

- [ ] **Step 3: Run production build**

```powershell
pnpm build
```

Expected: Vite production build succeeds without TypeScript errors.

- [ ] **Step 4: Review the rendered behavior**

Verify:

- `/` has summary and UV content but no detailed zone list or end control.
- `/reminder` remains on that URL with both active and empty Session states.
- bottom navigation shows four usable entries at mobile widths.
- ending a Session refreshes projection and shows the reminder empty state without redirecting home.

