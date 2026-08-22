# Samsung Internet Light Theme Protection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure an explicit in-app light appearance remains light when Samsung Internet applies automatic darkening.

**Architecture:** Keep the existing Vue appearance controller as the single source of truth. Advertise document-level light/dark support in HTML, and strengthen only the explicit light CSS branch with `color-scheme: only light` so dark and system behavior remain unchanged.

**Tech Stack:** Vue 3, TypeScript, Vite, Vitest, CSS Color Adjustment.

## Global Constraints

- Do not add Pinia or another appearance state source.
- Preserve the existing `light | dark | system` preference contract and localStorage key.
- Do not change dark-mode Design Tokens.

---

### Task 1: Protect the Explicit Light Theme

**Files:**
- Modify: `apps/web/index.html`
- Modify: `packages/ui/src/styles.css`
- Test: `apps/web/src/app/appearanceDocumentContract.test.ts`

**Interfaces:**
- Consumes: `data-theme="light"` written by `createAppearanceController`.
- Produces: document metadata declaring `light dark` support and an explicit-light CSS rule using `only light`.

- [ ] **Step 1: Write the failing document contract tests**

Add tests that load the real HTML and CSS artifacts and verify their externally consumed browser declarations: `meta[name="color-scheme"]` is `light dark`, explicit light uses `only light`, and explicit dark remains `dark`.

- [ ] **Step 2: Run the focused test and verify RED**

Run: `pnpm test apps/web/src/app/appearanceDocumentContract.test.ts`

Expected: FAIL because the meta declaration is absent and explicit light currently uses `light`.

- [ ] **Step 3: Add the minimal declarations**

Add `<meta name="color-scheme" content="light dark">` to the document head and change only `:root[data-theme="light"]` to `color-scheme: only light`.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run: `pnpm test apps/web/src/app/appearanceDocumentContract.test.ts`

Expected: PASS.

- [ ] **Step 5: Run complete verification**

Run `pnpm typecheck`, `pnpm test`, and `pnpm build`; all must exit successfully.
