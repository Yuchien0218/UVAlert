# Contextual Desktop Action Width Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make only primary workflow actions fill their contextual desktop column, while preserving the shared compact-button default and all secondary/text-link alignment semantics.

**Architecture:** The shared `.button` maximum width remains the default. Three local primary-action containers opt out explicitly: common submit areas, the setup actions slot, and the empty-home location prompt. Actual region form cards opt into the existing `.form-control-stack` contract rather than duplicating field and action width declarations.

**Tech Stack:** Vue 3 SFCs, scoped CSS, shared CSS custom properties, Vitest, pnpm.

## Global Constraints

- Do not change the generic `.button { max-width: var(--control-max); }` rule.
- Do not add a global desktop-centering or global full-width selector.
- Keep text-link buttons, `.button-group`, data-settings action rows, 44px touch targets, tokens, routes, and event/data logic unchanged.
- Use `width: 100%; max-width: none;` only inside named primary-workflow containers or through `.form-control-stack`.
- This branch starts from `a93d6a9`, which already contains the remote nationwide UV distribution work; do not modify that feature.

---

## File Structure

- Modify: `apps/web/src/assets/app.css` — extend the existing `.submit-actions .button` local contract.
- Modify: `apps/web/src/components/setup/SetupStepShell.vue` — scope the setup action slot contract.
- Modify: `apps/web/src/components/home/HomeLocationPrompt.vue` — scope the sole no-region CTA contract.
- Modify: `apps/web/src/components/region/RegionLocationPanel.vue` and `RegionManualSelector.vue` — opt true form cards into `.form-control-stack`.
- Modify: `apps/web/src/assets/desktopFormLayout.test.ts` — guard regional form adoption.
- Create: `apps/web/src/assets/primaryColumnActionLayout.test.ts` — guard local primary-action width and text-link exclusion.

### Task 1: Add failing contextual-width regression guards

**Files:**
- Create: `apps/web/src/assets/primaryColumnActionLayout.test.ts`
- Modify: `apps/web/src/assets/desktopFormLayout.test.ts`

**Interfaces:**
- Consumes: source files and CSS text via `readFileSync`, following the existing layout-regression test style.
- Produces: source-level constraints that prevent future generic or secondary-control widening.

- [ ] **Step 1: Write the primary-action source test**

Create a `cssRule(source, selector)` helper that escapes the selector and returns its declaration block after comments are stripped. Assert every approved local rule has both declarations:

```ts
expect(cssRule(appCss, ".submit-actions .button")).toContain("width: 100%;");
expect(cssRule(appCss, ".submit-actions .button")).toContain("max-width: none;");
expect(cssRule(setupShell, ".setup-shell__actions > .button")).toContain("width: 100%;");
expect(cssRule(setupShell, ".setup-shell__actions > .button")).toContain("max-width: none;");
expect(cssRule(locationPrompt, ".location-prompt__cta")).toContain("width: 100%;");
expect(cssRule(locationPrompt, ".location-prompt__cta")).toContain("max-width: none;");
```

Add negative guards for the shared default and the centered text cancellation link:

```ts
expect(cssRule(appCss, ".button")).toContain("max-width: var(--control-max);");
expect(cssRule(appCss, ".submit-actions__cancel.submit-actions__cancel")).toContain("justify-self: center;");
expect(cssRule(appCss, ".submit-actions__cancel.submit-actions__cancel")).not.toContain("max-width: none;");
```

- [ ] **Step 2: Extend the form-contract test**

Load both region components in `desktopFormLayout.test.ts` and add:

```ts
expect(regionLocationPanel).toContain('class="location-panel app-card form-control-stack"');
expect(regionManualSelector).toContain('class="manual-region form-control-stack"');
```

Keep the existing text-control, primary-button, and generic `.button` assertions unchanged.

- [ ] **Step 3: Run the focused tests and verify they fail**

Run:

```powershell
pnpm vitest run apps/web/src/assets/primaryColumnActionLayout.test.ts apps/web/src/assets/desktopFormLayout.test.ts
```

Expected: FAIL because the new declarations and region classes do not yet exist.

- [ ] **Step 4: Commit the red test boundary**

```powershell
git add apps/web/src/assets/primaryColumnActionLayout.test.ts apps/web/src/assets/desktopFormLayout.test.ts
git commit -m "test(web): guard contextual desktop action widths"
```

### Task 2: Implement local primary-action and region-form contracts

**Files:**
- Modify: `apps/web/src/assets/app.css:1284-1321`
- Modify: `apps/web/src/components/setup/SetupStepShell.vue:154-165`
- Modify: `apps/web/src/components/home/HomeLocationPrompt.vue:49-51`
- Modify: `apps/web/src/components/region/RegionLocationPanel.vue:45`
- Modify: `apps/web/src/components/region/RegionManualSelector.vue:68,152-156`

**Interfaces:**
- Consumes: Task 1 guards and the existing `.form-control-stack` declarations.
- Produces: CSS-only layout changes without router, emitted-event, or data-model changes.

- [ ] **Step 1: Make common submit actions fill their column**

Amend only the existing rule in `app.css`:

```css
.submit-actions .button {
  width: 100%;
  max-width: none;
}
```

Do not change `.submit-actions__cancel.submit-actions__cancel`.

- [ ] **Step 2: Make setup and no-region entry actions fill their containers**

Add the scoped setup rule next to `.setup-shell__actions`:

```css
.setup-shell__actions > .button {
  width: 100%;
  max-width: none;
}
```

Extend only the no-region CTA rule:

```css
.location-prompt__cta {
  justify-self: stretch;
  width: 100%;
  max-width: none;
}
```

- [ ] **Step 3: Opt the two region forms into the shared contract**

Make these template changes:

```vue
<section class="location-panel app-card form-control-stack" aria-labelledby="location-title">
<section class="manual-region form-control-stack" aria-labelledby="manual-region-title">
```

Delete only the redundant `width: 100%` declaration from `.manual-region__field select, .manual-region__field input`; the global form-control-stack rule owns that width after the opt-in.

- [ ] **Step 4: Run focused regression tests and verify they pass**

Run:

```powershell
pnpm vitest run apps/web/src/assets/primaryColumnActionLayout.test.ts apps/web/src/assets/desktopFormLayout.test.ts apps/web/src/components/region/RegionLocationPanel.test.ts apps/web/src/components/region/RegionManualSelector.test.ts apps/web/src/components/setup/SetupFlowComponents.test.ts apps/web/src/pages/homeDesktopActionLayout.test.ts
```

Expected: PASS; region interaction tests continue to cover locating, confirmation, manual validation, and save emission.

- [ ] **Step 5: Commit the implementation**

```powershell
git add apps/web/src/assets/app.css apps/web/src/components/setup/SetupStepShell.vue apps/web/src/components/home/HomeLocationPrompt.vue apps/web/src/components/region/RegionLocationPanel.vue apps/web/src/components/region/RegionManualSelector.vue
git commit -m "fix(web): fill contextual primary action columns"
```

### Task 3: Run full quality gates and inspect responsiveness

**Files:**
- Verify only; no new production files required.

**Interfaces:**
- Consumes: Task 1 guards and Task 2 local CSS contracts.
- Produces: verification evidence for desktop, mobile, accessibility sizing, and repository quality.

- [ ] **Step 1: Run the full quality suite**

```powershell
pnpm check
```

Expected: typecheck, Vitest, ESLint, and Stylelint PASS.

- [ ] **Step 2: Check desktop behavior**

At a desktop viewport, inspect the no-region home card, `/setup`, reapply, report, event correction, and both `/region` states. Each named primary action fills its parent column; no 26rem-width right-side gap remains.

- [ ] **Step 3: Check narrow behavior and exclusions**

At a mobile viewport, verify named actions are still clickable and retain the existing `--tap-target` height. Verify `.submit-actions__cancel`, region fallback links, `.button-group`, and `/settings/data` confirmation/sync controls retain their current local alignment and grouping.

- [ ] **Step 4: Inspect the final diff**

```powershell
git diff origin/main...HEAD --check
git status --short
```

Expected: no whitespace errors and no untracked or unstaged files.

## Self-Review

- **Spec coverage:** Task 1 protects non-global behavior, Task 2 implements every named primary and region-form contract, and Task 3 verifies desktop, mobile, text-link, grouping, and full-suite requirements.
- **Placeholder scan:** no placeholders or deferred implementation steps remain.
- **Consistency:** all selectors match the approved design document and inspected source names; no component API or data type is introduced.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-10-contextual-desktop-action-width.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task with review between tasks.
2. **Inline Execution** — execute the tasks in this session, batching execution with checkpoints.
