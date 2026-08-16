# Fixed Bottom Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the shared four-item navigation fixed to the viewport bottom while ensuring route content and iPhone safe areas remain unobstructed.

**Architecture:** `BottomNavigation.vue` owns viewport-fixed presentation. `AppShell.vue` derives navigation visibility from existing route metadata and applies shared content clearance; a global CSS token is the single source of truth for navigation height. Route pages remain unchanged.

**Tech Stack:** Vue 3, Vue Router 4, scoped CSS, shared CSS custom properties, Vitest, Vue Test Utils, Vite.

## Global Constraints

- Keep the labels, icons, destinations, and active-route behavior unchanged.
- Render exactly one shared `BottomNavigation.vue` from `AppShell.vue`.
- Use `--bottom-nav-height` in both navigation geometry and main-content clearance.
- Add `env(safe-area-inset-bottom)` to both the navigation and reserved content space.
- Use an opaque background and explicit z-index.
- Routes with `route.meta.hideNavigation === true` must hide the navigation and must not reserve navigation space.
- Do not add scroll listeners, per-page navigation styles, dependencies, or domain/persistence changes.
- The workspace is currently not recognized as a Git repository, so execution must not attempt commit commands.

---

## File Map

- `packages/ui/src/styles.css`: owns the shared `--bottom-nav-height` token.
- `apps/web/src/components/shell/BottomNavigation.vue`: owns fixed positioning, safe-area padding, opaque surface, and stacking.
- `apps/web/src/components/shell/AppShell.vue`: owns route-derived navigation visibility and main-content clearance.
- `apps/web/src/components/shell/BottomNavigation.test.ts`: verifies routes and the fixed-navigation CSS contract.
- `apps/web/src/components/shell/AppShellLayout.test.ts`: verifies the App Shell source contract for shared visibility and clearance.

### Task 1: Lock the fixed-layout contract with failing tests

**Files:**
- Modify: `apps/web/src/components/shell/BottomNavigation.test.ts`
- Create: `apps/web/src/components/shell/AppShellLayout.test.ts`

**Interfaces:**
- Consumes: existing `BottomNavigation.vue`, `AppShell.vue`, and `packages/ui/src/styles.css` source.
- Produces: regression checks for fixed positioning, safe areas, shared height, route visibility, and content clearance.

- [ ] **Step 1: Add the failing BottomNavigation CSS-contract test**

Add source-level assertions alongside the existing rendered-route test:

```ts
import { readFileSync } from "node:fs";

const bottomNavigationSource = readFileSync(
  new URL("./BottomNavigation.vue", import.meta.url),
  "utf8"
);

it("固定在視窗底部並處理安全區與遮蓋層級", () => {
  expect(bottomNavigationSource).toContain("position: fixed;");
  expect(bottomNavigationSource).toContain("bottom: 0;");
  expect(bottomNavigationSource).toContain("left: 0;");
  expect(bottomNavigationSource).toContain("right: 0;");
  expect(bottomNavigationSource).toContain("var(--bottom-nav-height)");
  expect(bottomNavigationSource).toContain("env(safe-area-inset-bottom)");
  expect(bottomNavigationSource).toMatch(/z-index:\s*\d+/);
  expect(bottomNavigationSource).toContain("background: var(--page-background);");
});
```

- [ ] **Step 2: Add the failing App Shell layout-contract test**

Create `AppShellLayout.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shellSource = readFileSync(
  new URL("./AppShell.vue", import.meta.url),
  "utf8"
);
const tokenSource = readFileSync(
  new URL("../../../../../packages/ui/src/styles.css", import.meta.url),
  "utf8"
);

describe("AppShell fixed navigation layout", () => {
  it("以共用 token 為顯示導覽的頁面保留底部空間", () => {
    expect(tokenSource).toContain("--bottom-nav-height:");
    expect(shellSource).toContain("navigationVisible");
    expect(shellSource).toContain("app-shell--with-navigation");
    expect(shellSource).toContain("var(--bottom-nav-height)");
    expect(shellSource).toContain("env(safe-area-inset-bottom)");
    expect(shellSource).toContain("route.meta.hideNavigation !== true");
  });
});
```

- [ ] **Step 3: Run focused tests and verify RED**

Run:

```powershell
& .\node_modules\.bin\vitest.CMD run apps/web/src/components/shell/BottomNavigation.test.ts apps/web/src/components/shell/AppShellLayout.test.ts
```

Expected: the new tests fail because fixed positioning, the height token, and App Shell clearance do not exist yet.

### Task 2: Implement the shared fixed navigation layout

**Files:**
- Modify: `packages/ui/src/styles.css`
- Modify: `apps/web/src/components/shell/BottomNavigation.vue`
- Modify: `apps/web/src/components/shell/AppShell.vue`

**Interfaces:**
- Consumes: `route.meta.hideNavigation` and `--content-max`.
- Produces: `--bottom-nav-height`, `navigationVisible`, and `.app-shell--with-navigation`.

- [ ] **Step 1: Define the shared height token**

Add to `:root` in `packages/ui/src/styles.css`:

```css
--bottom-nav-height: 4.5rem;
```

The token represents the navigation's base height before the device safe-area inset.

- [ ] **Step 2: Fix BottomNavigation to the viewport**

Update `.bottom-nav` in `BottomNavigation.vue`:

```css
.bottom-nav {
  position: fixed;
  z-index: 20;
  right: 0;
  bottom: 0;
  left: 0;
  display: grid;
  width: min(100%, var(--content-max));
  min-height: calc(
    var(--bottom-nav-height) + env(safe-area-inset-bottom)
  );
  grid-template-columns: repeat(4, 1fr);
  margin-inline: auto;
  padding: var(--space-2) max(var(--space-2), env(safe-area-inset-right))
    calc(var(--space-2) + env(safe-area-inset-bottom))
    max(var(--space-2), env(safe-area-inset-left));
  border-top: 1px solid var(--border-subtle);
  background: var(--page-background);
}
```

Remove the translucent `color-mix` background and `backdrop-filter`; the fixed bar must be opaque.

- [ ] **Step 3: Derive visibility once in AppShell**

Update the script:

```ts
import { computed, nextTick, useTemplateRef, watch } from "vue";

const navigationVisible = computed(
  () => route.meta.hideNavigation !== true
);
```

Update the root and navigation markup:

```vue
<div
  class="app-shell"
  :class="{ 'app-shell--with-navigation': navigationVisible }"
>
  <!-- existing header, banner, and main -->
  <BottomNavigation v-if="navigationVisible" />
</div>
```

- [ ] **Step 4: Reserve shared bottom clearance**

Change the shell grid to exclude a normal-flow footer row and add conditional clearance:

```css
.app-shell {
  grid-template-rows: auto auto 1fr;
}

.app-shell--with-navigation .app-shell__main {
  padding-bottom: calc(
    var(--space-12) + var(--bottom-nav-height) +
      env(safe-area-inset-bottom)
  );
}
```

Keep the existing default `.app-shell__main` bottom padding for routes that hide navigation.

- [ ] **Step 5: Run focused tests and verify GREEN**

Run the same focused Vitest command from Task 1.

Expected: both shell test files pass.

### Task 3: Verify all routes and mobile scrolling

**Files:**
- Verify only: `apps/web/src/components/shell/AppShell.vue`
- Verify only: `apps/web/src/components/shell/BottomNavigation.vue`

**Interfaces:**
- Consumes: built application at `http://127.0.0.1:5173/`.
- Produces: test and visual evidence that navigation remains fixed and content remains reachable.

- [ ] **Step 1: Run complete automated verification**

Run:

```powershell
& .\node_modules\.bin\vitest.CMD run
& .\apps\web\node_modules\.bin\vue-tsc.CMD --noEmit -p apps/web/tsconfig.json
& .\node_modules\.bin\vite.CMD build apps/web
```

Expected: zero failed tests, zero type errors, and Vite exits with code 0. The existing generated region-boundary chunk warning is acceptable.

- [ ] **Step 2: Open a mobile responsive viewport**

Use a viewport approximately `390 × 844` at `/`, `/reminder`, `/products`, and `/more`.

- [ ] **Step 3: Verify fixed position before and after scroll**

For each route:

1. record the bottom navigation bounding rectangle;
2. scroll to the page bottom;
3. record it again;
4. confirm its bottom edge still equals the viewport height and its vertical position is unchanged.

- [ ] **Step 4: Verify the final content is unobstructed**

At the bottom of each long route, confirm the final visible content block's bottom edge is above the navigation's top edge or can be scrolled above it. On the home/reminder pages, specifically inspect the final safety/disclaimer copy.

- [ ] **Step 5: Verify hidden-navigation route behavior**

Open `/setup/context` and confirm the bottom navigation is absent and the main container does not have `app-shell--with-navigation`.
