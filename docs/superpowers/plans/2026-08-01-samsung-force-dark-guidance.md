# Samsung Internet Force Dark Guidance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a contextual Samsung Internet Force Dark explanation only when the user explicitly selects the app's light appearance.

**Architecture:** Keep the appearance controller as the sole source of preference state. A pure browser-identification utility evaluates the User-Agent at the route composition boundary; `MorePage.vue` passes the resulting boolean to the presentational `AppearanceSettings.vue`, which combines it with its existing `v-model` preference to render the informational status.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vue Test Utils, Vitest, scoped CSS.

## Global Constraints

- Do not add Pinia or another appearance state source.
- Do not modify `createAppearanceController`, its `light | dark | system` contract, or `sunshield.appearance` storage.
- Do not claim the browser Force Dark setting can be read directly.
- Do not use color inversion, filters, UA-specific theme tokens, IndexedDB, contracts, or reducer changes.

---

### Task 1: Identify Samsung Internet at the Browser Boundary

**Files:**
- Create: `apps/web/src/app/browserIdentification.ts`
- Create: `apps/web/src/app/browserIdentification.test.ts`

**Interfaces:**
- Consumes: `userAgent: string`.
- Produces: `isSamsungInternet(userAgent: string): boolean`.

- [ ] **Step 1: Write the failing utility tests**

Test the literal Samsung token `SamsungBrowser/28.0` as `true`; test Android Chrome and an empty string as `false`.

- [ ] **Step 2: Run the focused test to verify RED**

Run: `pnpm test apps/web/src/app/browserIdentification.test.ts`

Expected: FAIL because `browserIdentification.ts` does not exist.

- [ ] **Step 3: Add the minimal pure function**

Implement `return /SamsungBrowser\//i.test(userAgent)` without reading global browser state inside the utility.

- [ ] **Step 4: Run the focused test to verify GREEN**

Run: `pnpm test apps/web/src/app/browserIdentification.test.ts`

Expected: PASS.

### Task 2: Render Contextual Guidance in Appearance Settings

**Files:**
- Modify: `apps/web/src/pages/MorePage.vue`
- Modify: `apps/web/src/components/settings/AppearanceSettings.vue`
- Modify: `apps/web/src/components/settings/AppearanceSettings.test.ts`

**Interfaces:**
- Consumes: optional boolean prop `isSamsungInternetBrowser` defaulting to `false`, plus the existing `modelValue` appearance preference.
- Produces: `role="status"` text only when `isSamsungInternetBrowser === true` and `modelValue === "light"`.

- [ ] **Step 1: Write the failing component tests**

Assert Samsung Internet plus `light` renders the approved guidance. Use table-driven negative cases for Samsung plus `system`, Samsung plus `dark`, and non-Samsung plus `light`.

- [ ] **Step 2: Run the focused component test to verify RED**

Run: `pnpm test apps/web/src/components/settings/AppearanceSettings.test.ts`

Expected: FAIL because the status guidance is absent.

- [ ] **Step 3: Add the minimal prop, condition, copy, and styling**

Pass `isSamsungInternet(globalThis.navigator.userAgent)` from `MorePage.vue`. Render the approved copy as a neutral information block inside `AppearanceSettings.vue`; use existing semantic tokens and no error/danger styling.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `pnpm test apps/web/src/app/browserIdentification.test.ts apps/web/src/components/settings/AppearanceSettings.test.ts`

Expected: PASS.

### Task 3: Verify the Integrated Workspace

**Files:**
- Verify only; no production changes expected.

**Interfaces:**
- Consumes: the completed working tree.
- Produces: fresh compiler, test, and production-build evidence.

- [ ] **Step 1: Run full type checking**

Run: `pnpm typecheck`

Expected: exit code 0.

- [ ] **Step 2: Run the full test suite**

Run: `pnpm test`

Expected: all test files and tests pass.

- [ ] **Step 3: Run the production build**

Run: `pnpm build`

Expected: exit code 0; the existing large region-boundary chunk warning may remain.

- [ ] **Step 4: Inspect Git scope without committing**

Use `git -c safe.directory='C:/Users/yu/Coding Projects/Sunshield_Advisor' status --short`. Do not create the first commit until the complete initial tracking scope has been reviewed with the user.
