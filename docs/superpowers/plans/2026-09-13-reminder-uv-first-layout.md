# Reminder UV-First Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve the reminder page's UV-first reading order while moving the region into the UV headline, clarifying the global forecast link, and adding an hourglass to the start action.

**Architecture:** Keep existing component responsibilities and data flow. `BrandHeader` owns global navigation, `HomeUvHeadline` presents UV context through typed props, and `HomePage` composes the current region and start action without adding state.

**Tech Stack:** Vue 3 Composition API, TypeScript, Vue Router, scoped CSS, Vitest, Vue Test Utils.

## Global Constraints

- Keep the UV advice text unchanged.
- Keep UV before the start action when there is no active reminder.
- Reuse `nav-reminder` at 20px; add no icon asset.
- Use existing design tokens only.
- Do not add a visible page title, card, or explanatory paragraph.

---

### Task 1: Guard the approved information placement

**Files:**
- Modify: `apps/web/src/components/shell/BrandHeader.test.ts`
- Modify: `apps/web/src/components/home/HomeUvHeadline.test.ts`
- Modify: `apps/web/src/pages/HomePage.test.ts`

**Interfaces:**
- Consumes: current component props and rendered route state.
- Produces: behavior tests for navigation labels, region link placement, unchanged advice, and CTA icon.

- [x] Add a header test expecting `五日 UV 預報` to link to `/forecast` when UV context exists.
- [x] Add a headline test expecting `臺中市西區` to link to `/region` beside `今日 UV`.
- [x] Add a page test expecting `nav-reminder` inside `開始防曬提醒` while UV remains earlier in DOM order.
- [x] Run the focused tests and confirm they fail for the missing behavior.

### Task 2: Implement the approved layout

**Files:**
- Modify: `apps/web/src/components/shell/BrandHeader.vue`
- Modify: `apps/web/src/components/home/HomeUvHeadline.vue`
- Modify: `apps/web/src/pages/HomePage.vue`

**Interfaces:**
- Consumes: `regionName: string | null`, existing `uvRiskLevel`, `Icon`, and Vue Router links.
- Produces: a forecast header link, a region link in the UV headline, and an icon-led start action.

- [x] Change the populated global header link to `五日 UV 預報` and `/forecast`.
- [x] Add typed `regionName` input to `HomeUvHeadline` and render it as a `/region` link.
- [x] Pass the current region from both `HomePage` headline call sites.
- [x] Add `<Icon name="nav-reminder" :size="20" mono />` to the no-session start button.
- [x] Adjust only token-based local spacing needed to keep the UV and action visually connected.
- [x] Run the focused tests until green.

### Task 3: Verify the complete page

**Files:**
- Verify: `apps/web/src/components/shell/BrandHeader.vue`
- Verify: `apps/web/src/components/home/HomeUvHeadline.vue`
- Verify: `apps/web/src/pages/HomePage.vue`

**Interfaces:**
- Consumes: completed implementation.
- Produces: automated and rendered verification evidence.

- [x] Run `pnpm check` and confirm exit code 0.
- [x] Inspect the no-session page at 375px with region data and confirm hierarchy and wrapping.
- [x] Inspect the no-region state and confirm `今日全臺UV分布` remains available.
- [x] Run `git diff --check` and review the final changed-file set.
