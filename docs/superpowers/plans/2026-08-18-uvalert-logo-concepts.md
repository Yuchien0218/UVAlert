# UVAlert Logo Concepts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce six distinct, review-ready UVAlert logo concept families, each with an independent SVG mark, an exact Traditional Chinese horizontal lockup, a 32px monochrome preview, and a single 3×2 comparison board.

**Architecture:** A deterministic Node ESM generator owns the shared palette, typography, geometry and naming so the mark, lockup and comparison board cannot drift apart. Generated first-round SVG assets live under `docs/design/logo-concepts/`; they are review artifacts only and do not replace the current PWA icons or production brand assets.

**Tech Stack:** Node.js ESM, hand-authored SVG geometry, UTF-8 Traditional Chinese text, standalone Node verification script.

## Global Constraints

- Follow `docs/superpowers/specs/2026-08-18-uvalert-logo-concepts-design.md` exactly.
- Main wordmark text is `防曬晴報員`; secondary label is `UVAlert`.
- Preview palette is warm ivory `#FAF5EC`, terracotta apricot `#9F5E42`, and espresso `#2E2925` only.
- Chinese wordmark uses `Noto Serif TC` Medium/500; English uses `Inter` Medium/500 with modest tracking.
- Deliver six genuinely different concepts: 晨線、晴窗、補擦環、日照節點、晴報框、播報印記.
- Each mark must remain legible at 32px and have a monochrome espresso treatment.
- No people, mascots, smiling suns, shields, medical crosses, bells, exclamation marks, sunscreen bottles, green safety cues, UV rainbow gradients, checkmarks, old logos or archived visual assets.
- First-round SVG text remains editable text for review; production outlining and final PWA icon replacement happen only after the user selects one or two concepts.
- Do not modify application code, `packages/ui`, `apps/web/public`, or `docs/archive/`.

---

### Task 1: Deterministic SVG concept generator

**Files:**

- Create: `tools/logo-concepts/generate-logo-concepts.mjs`
- Create: `tools/logo-concepts/verify-logo-concepts.mjs`
- Generate: `docs/design/logo-concepts/marks/01-morning-line.svg`
- Generate: `docs/design/logo-concepts/marks/02-sun-window.svg`
- Generate: `docs/design/logo-concepts/marks/03-reapply-ring.svg`
- Generate: `docs/design/logo-concepts/marks/04-sunlight-nodes.svg`
- Generate: `docs/design/logo-concepts/marks/05-weather-bulletin-frame.svg`
- Generate: `docs/design/logo-concepts/marks/06-broadcast-mark.svg`

**Interfaces:**

- `generate-logo-concepts.mjs` exports `CONCEPTS`, `renderMarkSvg(concept)`, `renderLockupSvg(concept)`, `renderBoardSvg(concepts)` and `generateLogoConcepts(outputRoot)`.
- Each `CONCEPTS` entry has exact fields `{ id, fileStem, chineseName, tagline, mark }`; `mark` returns SVG geometry for a `64 64` viewBox.
- `verify-logo-concepts.mjs` exports `verifyLogoConcepts(outputRoot)` and exits non-zero when a required asset, accessible title, approved color, exact brand string, viewBox or concept identifier is missing.

- [ ] **Step 1: Write the verification contract before generating assets.**

```js
const EXPECTED = [
  "01-morning-line",
  "02-sun-window",
  "03-reapply-ring",
  "04-sunlight-nodes",
  "05-weather-bulletin-frame",
  "06-broadcast-mark"
];

assert.equal(markFiles.length, 6);
assert.equal(lockupFiles.length, 6);
assert.equal(boardConceptCount, 6);
assert.match(lockup, /防曬晴報員/);
assert.match(lockup, /UVAlert/);
```

- [ ] **Step 2: Run `node tools/logo-concepts/verify-logo-concepts.mjs`; expected: FAIL because the generated directory is absent.**
- [ ] **Step 3: Implement shared tokens and six `64×64` mark geometries.** Use rounded line caps, at most two stroke weights, no filters/shadows, and only the three approved colors. Keep each geometry distinguishable by silhouette: horizon, open window, broken ring, paired nodes, editorial corner, and broadcast lines.
- [ ] **Step 4: Generate six standalone mark SVGs.** Each file uses `viewBox="0 0 64 64"`, `role="img"`, `<title>`, `<desc>`, and no `<text>` element.
- [ ] **Step 5: Run the verifier; expected: it progresses past mark checks and reports missing lockups/board.**

### Task 2: Exact lockups and 3×2 comparison board

**Files:**

- Generate: `docs/design/logo-concepts/lockups/01-morning-line.svg`
- Generate: `docs/design/logo-concepts/lockups/02-sun-window.svg`
- Generate: `docs/design/logo-concepts/lockups/03-reapply-ring.svg`
- Generate: `docs/design/logo-concepts/lockups/04-sunlight-nodes.svg`
- Generate: `docs/design/logo-concepts/lockups/05-weather-bulletin-frame.svg`
- Generate: `docs/design/logo-concepts/lockups/06-broadcast-mark.svg`
- Generate: `docs/design/logo-concepts/uvalert-logo-concepts-board.svg`

**Interfaces:**

- Each lockup uses `viewBox="0 0 520 112"`: 64px mark at left, exact Chinese wordmark centered vertically, `UVAlert` below/right at lower visual weight.
- The board uses `viewBox="0 0 1600 1240"` and six `data-concept` groups arranged as three columns × two rows.
- Every board cell contains the large two-color mark, the horizontal lockup, a 32px monochrome mark, concept name and the fixed tagline below.

- [ ] **Step 1: Add lockup and board checks to the verifier.** Require exact Traditional Chinese/English strings, the two specified viewBoxes, six unique `data-concept` values, and a 32px preview group in every board cell.
- [ ] **Step 2: Run the verifier; expected: FAIL on missing lockups and board.**
- [ ] **Step 3: Implement horizontal lockup generation.** Preserve editable SVG `<text>` with explicit `lang="zh-Hant-TW"`, font stacks and font weights; do not let the image model render brand text.
- [ ] **Step 4: Implement the 3×2 board.** Use only warm ivory background, subtle espresso hairlines and the approved logo colors; no mockups, shadows, photographs, UI cards or gradients.
- [ ] **Step 5: Run `node tools/logo-concepts/generate-logo-concepts.mjs` then `node tools/logo-concepts/verify-logo-concepts.mjs`; expected: PASS with 6 marks, 6 lockups and 1 board.**

### Task 3: Review guide, visual inspection and commit

**Files:**

- Create: `docs/design/logo-concepts/README.md`
- Modify: `docs/design/README.md`

**Interfaces:**

- `README.md` explains that these are first-round concepts, lists all six meanings/trade-offs, links every SVG, records the palette/type, and gives a selection checklist.
- `docs/design/README.md` links the concept folder without declaring any concept as the final production logo.

- [ ] **Step 1: Write the review guide with direct links to the board, marks and lockups.** State that no PWA icon, favicon, wordmark component or design token has changed.
- [ ] **Step 2: Inspect `uvalert-logo-concepts-board.svg` visually.** Confirm all six cells render, Chinese text is correct, no geometry is clipped, 32px previews stay identifiable, and concepts are materially different.
- [ ] **Step 3: Run final verification.**

```powershell
node tools/logo-concepts/verify-logo-concepts.mjs
git diff --check
git diff --name-only -- apps/web packages/ui docs/archive
```

Expected: verifier PASS; no whitespace errors; no application, token or archive paths changed.

- [ ] **Step 4: Commit only the logo concept generator, verifier, SVGs and design docs.**

```powershell
git add -- tools/logo-concepts docs/design/logo-concepts docs/design/README.md docs/superpowers/plans/2026-08-18-uvalert-logo-concepts.md
git commit -m "design: add uvalert logo concept board"
```

- [ ] **Step 5: Present the board to the user and ask them to select one or two concept numbers for second-round refinement.** Do not replace production assets until that selection is explicit.

## Self-review

- Spec coverage: six named concepts, exact wordmark, icon/lockup/32px formats, approved palette/type, comparison board, forbidden directions, evaluation and selection workflow all map to Tasks 1–3.
- Placeholder scan: no implementation placeholder or unspecified asset remains.
- Interface consistency: generator exports, concept fields, output roots, viewBoxes and verifier expectations use the same names in every task.
- Scope check: the plan creates first-round review assets only; final vector outlining and app integration remain outside this plan by design.
