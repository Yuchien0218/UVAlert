# Shared Reminder Empty State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Render one identical blue empty-reminder card on the home and reminder pages, with approved copy and a right-aligned setup CTA.

**Architecture:** `ReminderEmptyState.vue` is the only owner of the no-session card. `ReminderPage.vue` keeps using it, while `HomeReminderSummary.vue` delegates its `session === null` branch to the same component and retains its existing active-session presentation logic.

**Tech Stack:** Vue 3 SFCs, TypeScript, Vue Router, Vue Test Utils, Vitest, scoped CSS

## Global Constraints

- Use `var(--color-tracking-soft)` for the shared blue background.
- Use `var(--radius-lg)` for the shared card shape.
- Do not add a white background, border, or box shadow.
- Use the existing circular check icon and arrow icon.
- Use the exact approved copy: `尚未建立提醒`, `建立提醒以追蹤各部位狀態與補擦時機。`, and `新增提醒`.
- Keep the CTA destination `/setup` and align the black CTA to the card's right edge.
- Keep the title on one line without mobile overflow.
- Do not change active-session presentations, IndexedDB, contracts, reducers, transactions, routes, or global button styles.

---

### Task 1: Make `ReminderEmptyState` the visual source of truth

**Files:**
- Modify: `apps/web/src/components/reminder/ReminderEmptyState.test.ts`
- Modify: `apps/web/src/components/reminder/ReminderEmptyState.vue`

**Interfaces:**
- Produces: a prop-free `ReminderEmptyState` component whose RouterLink navigates to `/setup`
- Consumes: global design tokens and the existing `.button.button--primary` style

- [ ] **Step 1: Write the failing visual-contract test**

Extend the existing real-component test with these literal assertions:

```ts
const card = wrapper.get('[data-testid="reminder-empty"]');
expect(card.classes()).toContain("empty-state--tracking");
expect(card.classes()).not.toContain("app-card");
expect(wrapper.get(".empty-state__action").classes()).toContain(
  "empty-state__action--end"
);
expect(wrapper.get(".empty-state__title").text()).toBe("尚未建立提醒");
expect(wrapper.get(".empty-state__body").text()).toBe(
  "建立提醒以追蹤各部位狀態與補擦時機。"
);
expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe("/setup");
```

- [ ] **Step 2: Run the focused test and verify the expected failure**

Run: `pnpm test -- apps/web/src/components/reminder/ReminderEmptyState.test.ts`

Expected: FAIL because the current component still has `app-card` and does not expose the tracking-card or right-aligned-action classes.

- [ ] **Step 3: Implement the shared blue card**

Update the component root and CTA classes:

```vue
<section
  class="empty-state empty-state--tracking"
  data-testid="reminder-empty"
>
  <!-- existing approved copy -->
  <RouterLink
    class="button button--primary empty-state__action empty-state__action--end"
    to="/setup"
  >
    新增提醒
    <ArrowRight :size="18" aria-hidden="true" />
  </RouterLink>
</section>
```

Replace `Clock3` with `CheckCircle2`, then apply scoped styles:

```css
.empty-state {
  display: grid;
  justify-items: start;
  gap: var(--space-5);
  padding: clamp(1.5rem, 7vw, 2.5rem) clamp(1.25rem, 5vw, 2rem);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.empty-state--tracking {
  background: var(--color-tracking-soft);
}

.empty-state__icon {
  background: var(--surface-primary);
  color: var(--color-tracking);
}

.empty-state__action--end {
  justify-self: end;
}
```

Retain the responsive title size and `white-space: nowrap` class from the approved reminder copy change.

- [ ] **Step 4: Run the focused test and verify green**

Run: `pnpm test -- apps/web/src/components/reminder/ReminderEmptyState.test.ts`

Expected: the component test passes with no warnings.

---

### Task 2: Delegate the home empty branch to the shared component

**Files:**
- Modify: `apps/web/src/components/home/HomeReminderSummary.test.ts`
- Modify: `apps/web/src/components/home/HomeReminderSummary.vue`

**Interfaces:**
- Consumes: `ReminderEmptyState` with no props or events
- Preserves: `HomeReminderSummary` props `{ session, connectivity }` and `action` emit for non-empty sessions

- [ ] **Step 1: Write the failing home-delegation test**

Import `ReminderEmptyState`, mount `HomeReminderSummary` with `session: null`, and assert the real shared child renders:

```ts
const wrapper = mount(HomeReminderSummary, {
  props: { session: null, connectivity: "online" }
});

expect(wrapper.findComponent(ReminderEmptyState).exists()).toBe(true);
expect(wrapper.get('[data-testid="reminder-empty"]').text()).toContain(
  "尚未建立提醒"
);
expect(wrapper.get(".empty-state__action").text()).toContain("新增提醒");
```

- [ ] **Step 2: Run the home test and verify the expected failure**

Run: `pnpm test -- apps/web/src/components/home/HomeReminderSummary.test.ts`

Expected: FAIL because the current home empty branch is inline and does not render `ReminderEmptyState`.

- [ ] **Step 3: Replace only the home empty branch**

Import the shared component and place it before the active-session section:

```vue
<ReminderEmptyState v-if="session === null" />
<section
  v-else
  class="home-summary"
  :class="{ [`home-summary--${clockPresentation?.tone}`]: clockPresentation !== null }"
  data-testid="home-reminder-summary"
>
  <!-- retain existing timed and untimed session branches -->
</section>
```

Remove the now-unused inline empty template, `ArrowRight` import, and only the CSS that existed exclusively for that inline branch. Keep `CheckCircle2` because the untimed active-session branch still uses it.

- [ ] **Step 4: Run the focused home and reminder tests**

Run: `pnpm test -- apps/web/src/components/home/HomeReminderSummary.test.ts apps/web/src/components/reminder/ReminderEmptyState.test.ts apps/web/src/pages/HomePage.test.ts apps/web/src/pages/ReminderPage.test.ts`

Expected: all focused tests pass and active-session assertions remain unchanged.

---

### Task 3: Verify the complete workspace

**Files:**
- Verify only; no production files added in this task

**Interfaces:**
- Consumes: the completed shared empty-state implementation
- Produces: verification evidence for type safety, regression safety, and production compilation

- [ ] **Step 1: Run type checking**

Run: `pnpm typecheck`

Expected: all workspace packages complete with exit code 0.

- [ ] **Step 2: Run the full test suite**

Run: `pnpm test`

Expected: all test files and tests pass with exit code 0.

- [ ] **Step 3: Run the production build**

Run: `pnpm build`

Expected: Vite completes the web build with exit code 0. The existing large region-boundary chunk warning is non-blocking and unrelated to this change.

