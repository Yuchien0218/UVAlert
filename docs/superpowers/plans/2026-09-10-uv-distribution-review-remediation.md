# UV Distribution Review Remediation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve review findings so the nationwide UV distribution has one presentation source, legible island labels, verified skipped-region behavior, and reproducible visual fixtures.

**Architecture:** `uvDistributionPresentation` owns risk metadata, visual token references, and numeric fill ratios. Map, legend, and county rows consume that metadata through props/helpers. Existing presentation components retain props-down data flow and no user interaction.

**Tech Stack:** Vue 3, TypeScript, Vitest, CSS custom properties.

## Global Constraints

- No component-local Hex colors, spacing, radius, or typography literals.
- Preserve original UVI values; 11 remains the visual full scale.
- Keep the map `aria-hidden`; the grouped list remains equivalent accessible content.
- Do not merge, push, or clean worktrees in this implementation pass.

---

### Task 1: Centralize risk visual metadata and numeric fill ratio

**Files:**
- Modify: `apps/web/src/features/uv/uvDistributionPresentation.ts`
- Modify: `apps/web/src/features/uv/uvDistributionPresentation.test.ts`
- Modify: `apps/web/src/components/uv/UvCountyListItem.vue`
- Modify: `apps/web/src/components/uv/UvRiskLegend.vue`
- Modify: `apps/web/src/components/uv/TaiwanUvMap.vue`

- [ ] Write failing tests for numeric 0–1 ratios and risk metadata visual-token names.
- [ ] Run focused test and confirm RED.
- [ ] Add visual-token metadata and shared custom-property style helper; use it in map, legend, and county row.
- [ ] Run focused test and confirm GREEN.

### Task 2: Make island labels legible

**Files:**
- Modify: `apps/web/src/components/uv/TaiwanUvMap.vue`
- Modify: `apps/web/src/components/uv/TaiwanUvMap.test.ts`

- [ ] Write a failing test requiring a surface-backed SVG label frame for both inset labels.
- [ ] Run focused test and confirm RED.
- [ ] Render token-styled label frames behind 金門 and 馬祖 text.
- [ ] Run focused test and confirm GREEN.

### Task 3: Protect skipped-region and visual fixture acceptance

**Files:**
- Modify: `apps/web/src/features/uv/createUvForecastController.test.ts`
- Modify: `apps/web/src/pages/ForecastPage.test.ts`

- [ ] Write failing skipped-region assertions for nationwide load and rendered distribution.
- [ ] Run focused tests and confirm RED.
- [ ] Add the minimum fixture coverage; do not change controller behavior unless tests reveal a defect.
- [ ] Run focused tests and confirm GREEN.
- [ ] Run `pnpm check` and record browser visual evidence or the exact external blocker.
