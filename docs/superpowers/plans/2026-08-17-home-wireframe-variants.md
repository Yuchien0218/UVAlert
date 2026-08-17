# Six Active Reminder Home Wireframes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce six independent grayscale, low-fidelity mobile wireframe images for UVAlert's active reminder home page.

**Architecture:** Use the approved design specification as the single source of truth. Generate A–F as six separate portrait bitmap assets with identical sample content and distinct information architecture, visually inspect each output, then save the accepted files under one project-local wireframe directory.

**Tech Stack:** Built-in image generation, local image inspection, PNG assets, Markdown design documentation.

## Global Constraints

- Use the active reminder state, not the empty or setup state.
- Produce six separate portrait images; do not place multiple phones side by side.
- Do not use phone device frames, photos, logos, illustrations, brand colors, or polished high-fidelity UI.
- Use only white, gray, dark gray, black outlines, and simple Traditional Chinese labels.
- Every variant must include UV information, data time or peak period, `00:42:18` countdown, next-step guidance, `記錄已補擦`, tracked body parts, recent event, reminder status, and the three-item bottom navigation.
- Only show tracked body parts; do not show stopped or untracked areas.
- Save accepted outputs under `docs/design/wireframes/home-active/` without modifying application code.

---

### Task 1: Generate variants A–C

**Files:**
- Create: `docs/design/wireframes/home-active/home-active-a-countdown-centered.png`
- Create: `docs/design/wireframes/home-active/home-active-b-daily-briefing.png`
- Create: `docs/design/wireframes/home-active/home-active-c-body-status.png`

**Interfaces:**
- Consumes: `docs/design/2026-08-17-home-wireframe-variants-design.md`
- Produces: Three standalone PNG previews with labels A, B, and C.

- [ ] **Step 1: Generate variant A**

Use one built-in image generation call for a portrait low-fidelity mobile wireframe whose largest central region is the `00:42:18` countdown, followed by `距離補擦還有 42 分鐘`, `記錄已補擦`, tracked-area summary, recent event, status note, and bottom navigation.

- [ ] **Step 2: Generate variant B**

Use one built-in image generation call for a portrait low-fidelity mobile wireframe led by `UV 6｜高量級`, `今日 12:00 最強`, and a short daily briefing, followed by a horizontal countdown area, the main CTA, tracked areas, recent event, status note, and bottom navigation.

- [ ] **Step 3: Generate variant C**

Use one built-in image generation call for a portrait low-fidelity mobile wireframe led by a compact UV/countdown summary and a dominant tracked-area status section for `臉部`, `頸部與耳朵`, `手臂`, and `其它部位`, followed by the main CTA, recent event, status note, and bottom navigation.

- [ ] **Step 4: Inspect A–C**

Open each generated image and verify: one screen only, grayscale, legible hierarchy, no device frame, no side-by-side phones, shared content present, and clearly different structures. Regenerate only the variant that fails a requirement.

- [ ] **Step 5: Save A–C**

Copy the accepted generated outputs into the three exact project paths listed above without overwriting unrelated files.

### Task 2: Generate variants D–F

**Files:**
- Create: `docs/design/wireframes/home-active/home-active-d-action-first.png`
- Create: `docs/design/wireframes/home-active/home-active-e-timeline.png`
- Create: `docs/design/wireframes/home-active/home-active-f-dashboard-summary.png`

**Interfaces:**
- Consumes: `docs/design/2026-08-17-home-wireframe-variants-design.md`
- Produces: Three standalone PNG previews with labels D, E, and F.

- [ ] **Step 1: Generate variant D**

Use one built-in image generation call for a portrait low-fidelity mobile wireframe whose opening statement is `距離補擦還有 42 分鐘`, immediately followed by the largest `記錄已補擦` CTA; keep countdown, tracked areas, UV, recent event, and status information secondary.

- [ ] **Step 2: Generate variant E**

Use one built-in image generation call for a portrait low-fidelity mobile wireframe organized around a vertical timeline connecting `已塗防曬`, `目前倒數`, `預計補擦`, and `10:20 已補擦全部部位`, with the CTA attached to the current node and the tracked-area summary under the next node.

- [ ] **Step 3: Generate variant F**

Use one built-in image generation call for a portrait low-fidelity mobile wireframe with one large countdown block and two smaller UV and tracked-area summary blocks, followed by a full-width CTA, recent event, future reminder information, status note, and bottom navigation.

- [ ] **Step 4: Inspect D–F**

Open each generated image and verify the same global constraints, plus confirm D is action-first, E reads as a vertical sequence, and F reads as a compact asymmetric dashboard. Regenerate only the variant that fails a requirement.

- [ ] **Step 5: Save D–F**

Copy the accepted generated outputs into the three exact project paths listed above without overwriting unrelated files.

### Task 3: Validate and index the six assets

**Files:**
- Modify: `docs/design/README.md`

**Interfaces:**
- Consumes: All six accepted PNG files.
- Produces: A project-local index entry linking the six wireframe assets and their approved design specification.

- [ ] **Step 1: Verify file set**

Confirm exactly six expected PNG filenames exist under `docs/design/wireframes/home-active/` and each file is non-empty.

- [ ] **Step 2: Verify visual consistency**

Review all six at the same display scale. Confirm identical sample values, visible A–F identifiers, grayscale-only treatment, and distinct layout families.

- [ ] **Step 3: Update the design index**

Add a `進行中提醒主頁低擬真 Wireframe` section to `docs/design/README.md`, link the approved specification, and list all six PNG assets by variant name.

- [ ] **Step 4: Inspect repository scope**

Run `git status --short` and confirm only the six PNG files and `docs/design/README.md` are new or modified during execution.

- [ ] **Step 5: Commit**

Stage the six PNG assets and updated design index, then commit with message `design: add six active reminder home wireframes`.
