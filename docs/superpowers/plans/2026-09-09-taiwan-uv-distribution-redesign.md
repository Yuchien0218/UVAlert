# Taiwan UV Distribution Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `/forecast` so the nationwide UV map, five-level legend, and geographically grouped 22-county list share one presentation model, use design and typography tokens, remain visible without a selected region, and present Kinmen and Matsu clearly.

**Architecture:** Keep loading in `createUvForecastController` and route composition in `ForecastPage`. Put risk metadata, fixed-scale bar math, and county grouping in a pure UV presentation module; render the feature through focused Vue components with props-down data flow. Keep the nationwide request independent from the selected-region five-day request.

**Tech Stack:** Vue 3 Composition API with `<script setup lang="ts">`, TypeScript, Vue Test Utils, Vitest, CSS custom properties, existing `@sunshield/contracts` schemas and design-token drift tests.

## Global Constraints

- No hardcoded colors, spacing, radii, font sizes, font weights, or line heights in component styles or inline styles.
- Dynamic bar width is data and may use a typed CSS custom property; design values must come from tokens.
- Keep existing contrast-safe `--color-uvi-*`; add visualization-specific UV tokens for map, legend, and bars.
- Map, legend, and list consume one shared UV presentation dictionary; no repeated risk-range switches.
- Group counties by stable five-digit `countyCode`, not localized names or API order.
- Map remains non-interactive and `aria-hidden`; the visible county list is its accessible equivalent.
- Do not alter CWA acquisition, backend/contracts thresholds, five-day card, or region selection flow.
- Keep natural wrapping; no `<br>`, nowrap, ellipsis, clipping, or fixed line counts.
- Preserve same-color map fill/stroke repair and non-zero stroke width.
- Without a selected region, skip the regional endpoint but still load and display nationwide data.
- Do not hand-edit generated outlines or education content.

---

### Task 1: Shared UV presentation model

**Files:**
- Create: `apps/web/src/features/uv/uvDistributionPresentation.ts`
- Create: `apps/web/src/features/uv/uvDistributionPresentation.test.ts`
- Modify: `apps/web/src/features/uv/uvForecastRules.ts`
- Modify: `apps/web/src/features/uv/uvForecastRules.test.ts`

**Interfaces:**
- Consumes: `UvRiskLevel`, `NationwideUvCounty`.
- Produces: `UV_RISK_PRESENTATIONS`, `getUvRiskPresentation`, `getUvRiskClassSuffix`, `getUviFillPercent`, `groupNationwideCounties`.

- [ ] **Step 1: Write failing dictionary and bar-scale tests**

```ts
expect(UV_RISK_PRESENTATIONS.map((item) => item.level)).toEqual([
  "low", "moderate", "high", "very_high", "extreme"
]);
expect(getUvRiskPresentation("very_high")).toMatchObject({
  label: "過量級", rangeLabel: "8–10", classSuffix: "very-high"
});
expect(getUviFillPercent(0)).toBe("0%");
expect(getUviFillPercent(6)).toBe("55%");
expect(getUviFillPercent(11)).toBe("100%");
expect(getUviFillPercent(15)).toBe("100%");
```

Also require negative and non-finite input to return `"0%"`.

- [ ] **Step 2: Write failing five-region grouping tests**

Pass all 22 counties in reverse order. Assert group labels are `北部、中部、南部、東部、外島`, flattened output contains 22 unique codes, and codes are ordered as:

```ts
north: ["63000", "65000", "10017", "68000", "10018", "10004", "10002"]
central: ["10005", "66000", "10007", "10008", "10009"]
south: ["10020", "10010", "67000", "64000", "10013"]
east: ["10015", "10014"]
islands: ["10016", "09020", "09007"]
```

Add a separate test requiring unknown code `99999` to throw an error naming that code.

- [ ] **Step 3: Run tests and verify RED**

```powershell
pnpm vitest run apps/web/src/features/uv/uvDistributionPresentation.test.ts
```

Expected: FAIL because the module is missing.

- [ ] **Step 4: Implement the pure module minimally**

```ts
export interface UvRiskPresentation {
  readonly level: UvRiskLevel;
  readonly label: string;
  readonly rangeLabel: string;
  readonly classSuffix: string;
}
export interface UvCountyGroup {
  readonly id: "north" | "central" | "south" | "east" | "islands";
  readonly label: string;
  readonly counties: readonly NationwideUvCounty[];
}
const UVI_FULL_SCALE = 11;
```

Build lookups from readonly dictionaries. Change `getUvRiskLevelLabel` to delegate to `getUvRiskPresentation` so its public API remains compatible without a second label dictionary.

- [ ] **Step 5: Run tests and verify GREEN**

```powershell
pnpm vitest run apps/web/src/features/uv/uvDistributionPresentation.test.ts apps/web/src/features/uv/uvForecastRules.test.ts
```

- [ ] **Step 6: Commit**

```powershell
git add -- apps/web/src/features/uv/uvDistributionPresentation.ts apps/web/src/features/uv/uvDistributionPresentation.test.ts apps/web/src/features/uv/uvForecastRules.ts apps/web/src/features/uv/uvForecastRules.test.ts
git diff --cached --check
git commit -m "refactor(uv): centralize distribution presentation rules"
```

---

### Task 2: Design, spacing, radius, and typography tokens

**Files:**
- Modify: `DESIGN.md`
- Modify: `packages/ui/src/styles.css`
- Modify: `packages/ui/src/tokens.test.ts`
- Modify: `packages/ui/src/uvRiskContrast.test.ts`

**Interfaces:**
- Consumes: current canonical token architecture.
- Produces: five `--color-uvi-visual-*` tokens and `--uv-distribution-*` aliases used by later components.

- [ ] **Step 1: Write failing resolved-token assertions**

Require these variables after stripping comments and resolving aliases:

```text
--color-uvi-visual-low
--color-uvi-visual-moderate
--color-uvi-visual-high
--color-uvi-visual-very-high
--color-uvi-visual-extreme
--uv-distribution-item-radius
--uv-distribution-item-padding-inline
--uv-distribution-item-padding-block
--uv-distribution-row-gap
--uv-distribution-column-gap
--uv-distribution-group-gap
```

- [ ] **Step 2: Run token test and verify RED**

```powershell
pnpm vitest run packages/ui/src/tokens.test.ts
```

- [ ] **Step 3: Add authoritative values to `DESIGN.md` and `styles.css`**

Use the approved visualization palette only for non-text data graphics:

```yaml
uvi-visual-low: "#A3D977"
uvi-visual-moderate: "#FDD835"
uvi-visual-high: "#FFA726"
uvi-visual-very-high: "#EF5350"
uvi-visual-extreme: "#AB47BC"
```

Alias component values to existing primitives resolving to radius 8px, inline padding 12px, block padding 6px, row gap 10px, column gap 16px, and a group gap at least twice the row gap. Verify primitive names before using them; if 6px/10px primitives are absent, add only the component token values to `DESIGN.md` and guard them with the drift test.

- [ ] **Step 4: Preserve contrast-safe foreground tokens**

Keep current `--color-uvi-*` values and tests unchanged. Extend `uvRiskContrast.test.ts` to ensure visualization tokens are not treated as text foregrounds.

- [ ] **Step 5: Run tests and verify GREEN**

```powershell
pnpm vitest run packages/ui/src/tokens.test.ts packages/ui/src/uvRiskContrast.test.ts
```

- [ ] **Step 6: Commit**

```powershell
git add -- DESIGN.md packages/ui/src/styles.css packages/ui/src/tokens.test.ts packages/ui/src/uvRiskContrast.test.ts
git diff --cached --check
git commit -m "feat(ui): add UV distribution visualization tokens"
```

---

### Task 3: Reusable legend and grouped county list

**Files:**
- Create: `apps/web/src/components/uv/UvRiskLegend.vue`
- Create: `apps/web/src/components/uv/UvRiskLegend.test.ts`
- Create: `apps/web/src/components/uv/UvCountyListItem.vue`
- Create: `apps/web/src/components/uv/UvCountyListItem.test.ts`
- Create: `apps/web/src/components/uv/UvCountyGroupedList.vue`
- Create: `apps/web/src/components/uv/UvCountyGroupedList.test.ts`

**Interfaces:**
- `UvRiskLegend`: no props.
- `UvCountyListItem`: `{ county: NationwideUvCounty }`.
- `UvCountyGroupedList`: `{ counties: readonly NationwideUvCounty[] }`.

- [ ] **Step 1: Write failing legend test**

Assert five items in dictionary order with visible text `0–2 低量級` through `11+ 危險級`, shared class suffixes, and `data-typography-role="supporting"`.

- [ ] **Step 2: Write failing county-item test**

```ts
expect(wrapper.text()).toContain("臺北市");
expect(wrapper.get(".stat-figure").text()).toBe("8");
expect(wrapper.classes()).toContain("uv-county-item--very-high");
expect(wrapper.attributes("style")).toContain("--uvi-fill: 73%");
```

After stripping comments, assert no `border-bottom`, `<hr>`, Hex color, literal font size/radius/padding, nowrap, or ellipsis exists.

- [ ] **Step 3: Write failing grouped-list test**

Pass 22 reversed fixtures. Assert five visible `card-title` headings in order, 22 `UvCountyListItem` instances, correct representative county membership, and nested `ul`／`li` semantics.

- [ ] **Step 4: Run tests and verify RED**

```powershell
pnpm vitest run apps/web/src/components/uv/UvRiskLegend.test.ts apps/web/src/components/uv/UvCountyListItem.test.ts apps/web/src/components/uv/UvCountyGroupedList.test.ts
```

Expected: FAIL because components are missing.

- [ ] **Step 5: Implement the three presentational components**

Use `UV_RISK_PRESENTATIONS`, `getUvRiskClassSuffix`, `getUviFillPercent`, and `groupNationwideCounties`. Bind only `--uvi-fill` dynamically. Use `supporting` for legend/county text, `stat-figure` for values, `card-title` for region headings, and all radius/padding/gaps from Task 2 tokens. Use two columns by default and the existing content-driven 30rem switch to three columns.

- [ ] **Step 6: Run tests and verify GREEN**

Run the same three-test command; expect PASS without Vue warnings.

- [ ] **Step 7: Commit**

```powershell
git add -- apps/web/src/components/uv/UvRiskLegend.vue apps/web/src/components/uv/UvRiskLegend.test.ts apps/web/src/components/uv/UvCountyListItem.vue apps/web/src/components/uv/UvCountyListItem.test.ts apps/web/src/components/uv/UvCountyGroupedList.vue apps/web/src/components/uv/UvCountyGroupedList.test.ts
git diff --cached --check
git commit -m "feat(web): group nationwide UV county data"
```

---

### Task 4: Kinmen and Matsu inset presentation

**Files:**
- Modify: `apps/web/src/components/uv/TaiwanUvMap.vue`
- Modify: `apps/web/src/components/uv/TaiwanUvMap.test.ts`

**Interfaces:**
- Keep existing map props unchanged.
- Add centralized inset configuration for `09020`／金門 and `09007`／馬祖.

- [ ] **Step 1: Write failing inset tests**

Assert two visible `.uv-map__inset-label` nodes with `金門`, `馬祖`, corresponding `data-county-code` attributes, visualization risk classes, and no marker when `highlightCountyCode` is null. Retain viewBox, same fill/stroke, and non-zero stroke-width assertions.

- [ ] **Step 2: Run map test and verify RED**

```powershell
pnpm vitest run apps/web/src/components/uv/TaiwanUvMap.test.ts
```

- [ ] **Step 3: Centralize geometry and implement labels**

```ts
interface InsetConfig {
  readonly countyCode: string;
  readonly label: string;
  readonly scale: number;
  readonly xRatio: number;
  readonly yRatio: number;
}
```

Create readonly entries for Kinmen and Matsu; keep projection values in this table rather than template branches. Generate risk suffixes from Task 1. Use visualization fill tokens, keep each stroke identical to its fill, and render labels with caption typography. Do not alter source geometry.

- [ ] **Step 4: Run test and verify GREEN**

Run the same map test; expect all geometry and label guards to pass.

- [ ] **Step 5: Commit**

```powershell
git add -- apps/web/src/components/uv/TaiwanUvMap.vue apps/web/src/components/uv/TaiwanUvMap.test.ts
git diff --cached --check
git commit -m "feat(web): clarify UV map island insets"
```

---

### Task 5: Distribution container and no-region behavior

**Files:**
- Create: `apps/web/src/components/uv/TaiwanUvDistribution.vue`
- Create: `apps/web/src/components/uv/TaiwanUvDistribution.test.ts`
- Modify: `apps/web/src/pages/ForecastPage.vue`
- Modify: `apps/web/src/pages/ForecastPage.test.ts`
- Modify: `apps/web/src/features/uv/createUvForecastController.test.ts`

**Interfaces:**
- `TaiwanUvDistribution` props: `{ forecast: NationwideUvForecast; region: RegionSelection | null }`.
- `ForecastPage` passes controller state and owns no distribution calculation.

- [ ] **Step 1: Write failing selected-region composition test**

Assert the region row comes before `.uv-distribution__content`; the content begins with a divider and contains `section-title`, map, legend, and grouped list once each. Assert current-region text/link use body typography.

- [ ] **Step 2: Write failing no-region component test**

With `region: null` and a valid 22-county forecast, assert `尚未設定地區`, the `/region` link text `設定地區`, map/legend/five groups/22 rows are present, and `.uv-map__marker` is absent.

- [ ] **Step 3: Run component test and verify RED**

```powershell
pnpm vitest run apps/web/src/components/uv/TaiwanUvDistribution.test.ts
```

- [ ] **Step 4: Implement container and thin `ForecastPage`**

Render region row first, then a tokenized divider/content block with title, map, legend, and list. Derive marker code from `region?.countyCode ?? null`. Replace old page markup with:

```vue
<TaiwanUvDistribution
  v-if="uvForecast.nationwide.value !== null"
  :forecast="uvForecast.nationwide.value"
  :region="uvForecast.region.value"
/>
```

Remove page-local `UVI_FULL_SCALE`, `uviFill`, risk classes, old list styles, and the old lower region section. Do not gate nationwide content on selected region or five-day phase.

- [ ] **Step 5: Add page and controller independence tests**

Update `mountForecast` to accept independent `nationwide`, `region`, `forecast`, and `phase`. With `phase: "no_region"`, `region: null`, and nationwide data, assert full distribution remains visible. In controller tests call both `ensureLoaded()` and `ensureNationwideLoaded()` with no region; assert regional API is not called, nationwide API is called once, phase remains `no_region`, and nationwide state is populated.

- [ ] **Step 6: Run integration tests and verify GREEN**

```powershell
pnpm vitest run apps/web/src/components/uv/TaiwanUvDistribution.test.ts apps/web/src/pages/ForecastPage.test.ts apps/web/src/features/uv/createUvForecastController.test.ts
```

- [ ] **Step 7: Commit**

```powershell
git add -- apps/web/src/components/uv/TaiwanUvDistribution.vue apps/web/src/components/uv/TaiwanUvDistribution.test.ts apps/web/src/pages/ForecastPage.vue apps/web/src/pages/ForecastPage.test.ts apps/web/src/features/uv/createUvForecastController.test.ts
git diff --cached --check
git commit -m "refactor(web): compose nationwide UV distribution"
```

---

### Task 6: Full automated and visual verification

**Files:**
- Update: `docs/superpowers/plans/2026-09-09-taiwan-uv-distribution-redesign.md` with exact observed evidence.

- [ ] **Step 1: Run targeted UV tests**

```powershell
pnpm vitest run apps/web/src/features/uv/uvDistributionPresentation.test.ts apps/web/src/components/uv/UvRiskLegend.test.ts apps/web/src/components/uv/UvCountyListItem.test.ts apps/web/src/components/uv/UvCountyGroupedList.test.ts apps/web/src/components/uv/TaiwanUvMap.test.ts apps/web/src/components/uv/TaiwanUvDistribution.test.ts apps/web/src/pages/ForecastPage.test.ts apps/web/src/features/uv/createUvForecastController.test.ts packages/ui/src/tokens.test.ts packages/ui/src/uvRiskContrast.test.ts
```

- [ ] **Step 2: Run separate and full gates**

```powershell
pnpm typecheck
pnpm lint
pnpm check
```

Record current test file/test counts; do not copy older evidence.

- [ ] **Step 3: Inspect required viewport and state matrix**

Use the configured `web-dev` preview at 320px, 390×844, desktop ≥1280px, and 200% zoom. Check selected-region and no-region/skipped states. Verify breathing room, five visible group headings, natural legend wrapping, bars behind text, aligned numbers, no row separators, and nationwide content remaining visible without a region.

- [ ] **Step 4: Inspect island composition**

At 320px and 390px, verify Kinmen and Matsu are recognizable labeled insets and Taiwan proper retains useful scale. Verify Penghu is legible; if not, first add a failing test and then move it into the same inset configuration.

- [ ] **Step 5: Review diff and record evidence**

```powershell
git diff --check
git status --short
```

Update this plan with exact results and remaining limitations. No deployment, push, merge, PR, or worktree cleanup is authorized.

- [ ] **Step 6: Commit verification documentation if changed**

```powershell
git add -- docs/superpowers/plans/2026-09-09-taiwan-uv-distribution-redesign.md
git diff --cached --check
git commit -m "docs: record UV distribution verification"
```

### 2026-09-09 inline execution evidence

- Token guards passed: `packages/ui/src/tokens.test.ts` and
  `packages/ui/src/uvRiskContrast.test.ts`, **183 tests**.
- Final targeted UV regression run passed **10 test files / 209 tests**.
- Component and container regression tests passed during implementation: legend,
  county item, grouped list, map, distribution container, ForecastPage, and
  controller. The final container fixture re-run passed **2 tests**.
- `pnpm typecheck` passed after the final fixture type correction.
- `pnpm lint` passed after the final fixture type correction.
- A full `pnpm test` before that fixture-only type correction passed **193 test
  files / 7962 tests**. The correction only adds the required `RegionSelection`
  fields to the test fixture; the execution environment subsequently truncated
  two full-suite summaries, so a fresh untruncated whole-suite result remains
  required before release approval.
- Browser visual QA at 320px, 390px, desktop, and 200% zoom remains pending;
  no deployment, push, merge, PR, or worktree cleanup was performed.
