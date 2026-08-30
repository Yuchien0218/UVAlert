# B8 Role-Based Typography Implementation Plan

> **狀態橫幅（2026-08-30 補）**：下面的 checkbox 一個都沒有勾，但**工作已經完成並合併**。這個 repo 的計畫檔一向是寫完就不再回來勾，光看 checkbox 會以為沒動工——CLAUDE.md 也記過同樣的陷阱（「三個『沒做』的頁面其實都做完了」）。以實際合併的 PR 為準。
>
> **B8 已完成**——依本目錄 `README.md` 與 `../specs/2026-08-27-b8-role-based-typography-design.md` 的狀態列（實作、F5 視覺矩陣與獨立 scoped re-review 均通過）。**這條不是本次執行者的第一手驗證**，是轉述那兩份文件的結論。
>
> 當時記錄的唯一非阻擋 minor 是「`packages/ui/src/styles.css` 的過時註解」。行號早已位移、無法確認是否同一處；2026-08-30 修掉了該檔案裡一段**確實過時**的行高歷史註解（它宣稱 body 行高是 1.6、且文章正文「刻意維持 1.85」，兩者都已不成立）。

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace UVAlert's ambiguous typography buckets with the approved seven-role scale, migrate every consumer by meaning, add the approved article wave treatment, and verify the result across desktop, mobile, reflow, and zoom.

**Architecture:** `DESIGN.md` remains the design authority and `packages/ui/src/styles.css` remains the runtime token source; `packages/ui/src/tokens.test.ts` will enforce an explicit one-to-one typography map between them. Migration proceeds by UI responsibility rather than global search-and-replace, using temporary legacy aliases only while intermediate commits remain runnable. Long-form article rhythm stays local to `EducationArticlePage.vue`, where the existing semantic `<hr>` becomes the decorative wave without changing article copy.

**Tech Stack:** Vue 3 SFCs with `<script setup>`, TypeScript, CSS custom properties, Vitest, Vue Test Utils, Stylelint, Prettier, pnpm 11, Vite.

## Global Constraints

- Final values are exactly: page title 28px, section title 20px, card title 18px, body 16px, supporting 14px, caption 12px, nav label 12px; runtime CSS expresses them in `rem` at a 16px root.
- `--font-size-caption` and `--font-size-nav-label` remain separate semantic tokens even though both equal 12px.
- Page countdowns, UVI readouts, setup readouts, and narrow five-day forecast values retain their justified component-level `clamp()` or relative-size exceptions.
- Multi-line explanatory text must not use `caption`; use at least `supporting`.
- Buttons and input contents remain 16px.
- The Data Settings summary card keeps its original full-width dividers.
- The article wave is decorative styling on the existing semantic `<hr>`, appears no more than once in current articles, and is not introduced in settings, forms, or cards.
- Do not add `hanging-punctuation`, negative-margin punctuation fixes, global `word-break: keep-all`, new copy, icon changes, color changes, shadows, or unrelated spacing cleanup.
- B9 icon-first and progressive disclosure is a separate project and must not be implemented in this branch.
- Every task must keep the app typecheckable and lintable; use test-first changes wherever an automated contract can express the requirement.

---

## File Structure and Responsibilities

- `DESIGN.md`: canonical seven-role typography data, prose rules, component references, and removal of the obsolete 14-level drift table.
- `packages/ui/src/styles.css`: runtime typography tokens plus temporary migration aliases; no component-specific article styling.
- `packages/ui/src/tokens.test.ts`: parser and drift guard for all seven typography roles, plus final guard against legacy tokens.
- `apps/web/src/assets/app.css`: global page-heading, flow-heading, eyebrow, question-card, and shared helper typography.
- `apps/web/src/components/**` and `apps/web/src/pages/**`: semantic migration of scoped consumers, grouped below by product area.
- `apps/web/src/components/shell/BottomNavigation.vue`: exclusive consumer of `--font-size-nav-label`.
- `apps/web/src/pages/education/EducationArticlePage.vue`: article heading rhythm, caption-strength footnote, and CSS-rendered wave on the existing `<hr>`.
- `apps/web/src/pages/education/EducationPages.test.ts`: rendered article regression for the thematic break and footnote.
- `docs/superpowers/plans/2026-08-26-codebase-consolidation-audit.md`: B8 completion evidence after all automated and visual checks pass.
- `docs/superpowers/plans/README.md`: plan index and accurate B8 status.

### Semantic Migration Matrix

| Existing use                                                        | Final role                  |
| ------------------------------------------------------------------- | --------------------------- |
| Page `h1` and setup shell `h1`                                      | `--font-size-page-title`    |
| Page section, sheet/dialog, status-section, article `h2`            | `--font-size-section-title` |
| Card/fieldset title and article `h3`                                | `--font-size-card-title`    |
| General prose, button, input, primary helper                        | `--font-size-body`          |
| Multi-line secondary explanation, field label, forecast source      | `--font-size-supporting`    |
| Eyebrow, timestamp, short badge, short metadata, editorial footnote | `--font-size-caption`       |
| Bottom navigation text only                                         | `--font-size-nav-label`     |

---

### Task 1: Establish the seven-role design and runtime contract

**Files:**

- Modify: `packages/ui/src/tokens.test.ts:1-155`
- Modify: `packages/ui/src/styles.css:190-221`
- Modify: `DESIGN.md:42-128`
- Modify: `DESIGN.md:184-391`
- Modify: `DESIGN.md:540-596`
- Modify: `DESIGN.md:646-746`
- Modify: `DESIGN.md:845-866`

**Interfaces:**

- Consumes: approved B8 spec at `docs/superpowers/specs/2026-08-27-b8-role-based-typography-design.md`.
- Produces: seven canonical CSS properties and a `TYPOGRAPHY_MAP: Record<string, string>` drift-test contract used by every later task.

- [ ] **Step 1: Replace the single body-font assertion with a failing seven-role contract test**

Add this map and helper near the existing spacing/layout maps in `tokens.test.ts`:

```ts
const TYPOGRAPHY_MAP: Record<string, string> = {
  "page-title": "--font-size-page-title",
  "section-title": "--font-size-section-title",
  "card-title": "--font-size-card-title",
  body: "--font-size-body",
  supporting: "--font-size-supporting",
  caption: "--font-size-caption",
  "nav-label": "--font-size-nav-label"
};

function typographyFontSizes(): Record<string, string> {
  const fm = designMd.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? "";
  const section = fm.match(/^typography:\r?\n([\s\S]*?)(?=^\S)/m)?.[1] ?? "";
  const out: Record<string, string> = {};
  let currentKey: string | null = null;

  for (const line of section.split(/\r?\n/)) {
    const role = line.match(/^ {2}([\w-]+):\s*$/);
    if (role) {
      currentKey = role[1]!;
      continue;
    }
    const size = line.match(/^ {4}fontSize:\s*(.+)$/);
    if (currentKey !== null && size) out[currentKey] = size[1]!.trim();
  }
  return out;
}
```

Replace the existing `body-md` test with:

```ts
describe("typography", () => {
  const entries = typographyFontSizes();

  it("只公開核准的七個語意角色", () => {
    expect(Object.keys(entries).sort()).toEqual(
      Object.keys(TYPOGRAPHY_MAP).sort()
    );
  });

  for (const [role, token] of Object.entries(TYPOGRAPHY_MAP)) {
    it(`${role} 對應 ${token}，值一致`, () => {
      expect(entries[role], `DESIGN.md 缺少 typography.${role}`).toBeDefined();
      expect(cssTokens[token], `styles.css 缺少 ${token}`).toBeDefined();
      expect(normalize(cssTokens[token]!)).toBe(normalize(entries[role]!));
    });
  }
});
```

- [ ] **Step 2: Run the token test and confirm the old 14-role frontmatter fails**

Run:

```powershell
pnpm vitest run packages/ui/src/tokens.test.ts
```

Expected: FAIL because `DESIGN.md` still exposes the old roles and `styles.css` does not yet define card/supporting/nav tokens.

- [ ] **Step 3: Replace the frontmatter typography section with the approved seven roles**

Use these exact `fontSize` values and preserve established font-family intent:

```yaml
typography:
  page-title:
    fontFamily: "Noto Serif TC, Noto Serif CJK TC, ui-serif, serif"
    fontSize: 28px
    fontWeight: 400
    lineHeight: 1.22
    letterSpacing: -0.01em
  section-title:
    fontFamily: "Noto Serif TC, Noto Serif CJK TC, ui-serif, serif"
    fontSize: 20px
    fontWeight: 500
    lineHeight: 1.35
    letterSpacing: 0
  card-title:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 18px
    fontWeight: 500
    lineHeight: 1.45
    letterSpacing: 0
  body:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0.01em
  supporting:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 0.01em
  caption:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 0.01em
  nav-label:
    fontFamily: "Inter, Noto Sans TC, Noto Sans CJK TC, ui-sans-serif, sans-serif"
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.4
    letterSpacing: 0.01em
```

Update every `{typography.*}` component reference in the frontmatter by its semantic role, and rewrite §3/§10 so the old 14-level table and drift table no longer claim to be current. Keep countdown/readout rules under `typography-cjk` or prose as component exceptions instead of reintroducing general font-size roles.

- [ ] **Step 4: Add runtime tokens and temporary legacy aliases**

Replace the current font-size block in `styles.css` with:

```css
--font-size-page-title: 1.75rem;
--font-size-section-title: 1.25rem;
--font-size-card-title: 1.125rem;
--font-size-body: 1rem;
--font-size-supporting: 0.875rem;
--font-size-caption: 0.75rem;
--font-size-nav-label: 0.75rem;

/* B8 migration aliases: remove after every consumer has a semantic role. */
--font-size-label: var(--font-size-supporting);
--font-size-title-sm: var(--font-size-card-title);
--font-size-title: var(--font-size-section-title);
--font-size-title-md: var(--font-size-section-title);
```

Remove the obsolete historical comments that describe the old buckets as permanent design decisions; replace them with a short pointer to the B8 spec.

- [ ] **Step 5: Run the drift test and token package checks**

Run:

```powershell
pnpm vitest run packages/ui/src/tokens.test.ts
pnpm --filter @sunshield/ui typecheck
```

Expected: both commands PASS and all seven roles compare equal after px/rem normalization.

- [ ] **Step 6: Commit the contract**

```powershell
git add -- DESIGN.md packages/ui/src/styles.css packages/ui/src/tokens.test.ts
git commit -m "feat(ui): define role-based typography scale"
```

---

### Task 2: Migrate global, shell, and common typography

**Files:**

- Create: `apps/web/src/assets/typographyRoles.test.ts`
- Modify: `apps/web/src/assets/app.css:60-145,480-520`
- Modify: `apps/web/src/components/shell/BottomNavigation.vue:85-100`
- Modify: `apps/web/src/components/common/BottomSheet.vue:100-115`
- Modify: `apps/web/src/components/common/EmptyStateCard.vue:30-45`
- Modify: `apps/web/src/components/session/SessionEndControl.vue:170-195`

**Interfaces:**

- Consumes: all seven CSS properties from Task 1.
- Produces: global semantic role classes and a source-scan helper guarding this first migration group.

- [ ] **Step 1: Add a failing source-level migration guard**

Create `typographyRoles.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migratedFiles = [
  "apps/web/src/assets/app.css",
  "apps/web/src/components/shell/BottomNavigation.vue",
  "apps/web/src/components/common/BottomSheet.vue",
  "apps/web/src/components/common/EmptyStateCard.vue",
  "apps/web/src/components/session/SessionEndControl.vue"
];

const legacyToken = /--font-size-(?:label|title-sm|title-md|title)\b/;

describe("B8 typography role migration", () => {
  for (const file of migratedFiles) {
    it(`${file} 不再使用舊字級桶`, () => {
      expect(readFileSync(file, "utf8")).not.toMatch(legacyToken);
    });
  }
});
```

- [ ] **Step 2: Run the new guard and verify it fails on existing legacy uses**

Run:

```powershell
pnpm vitest run apps/web/src/assets/typographyRoles.test.ts
```

Expected: FAIL for `app.css`, `BottomSheet.vue`, and `SessionEndControl.vue`.

- [ ] **Step 3: Apply semantic roles in the migration group**

Make these exact role decisions:

- `.page-heading__eyebrow` → `caption`.
- `.question-card legend` → `card-title`.
- `.question-card__helper` stays `body` because it is primary question guidance.
- bottom navigation text → `nav-label` only.
- Bottom Sheet heading → `section-title`.
- Empty-state heading → `section-title`.
- Session-end confirmation title → `card-title`; its instructions stay `body`.

Do not change spacing, card borders, navigation icon size, or focus behavior.

- [ ] **Step 4: Run targeted tests and lint**

Run:

```powershell
pnpm vitest run apps/web/src/assets/typographyRoles.test.ts apps/web/src/components/shell/BottomNavigation.test.ts
pnpm lint:css
```

Expected: all tests PASS and Stylelint exits zero.

- [ ] **Step 5: Commit the shared migration**

```powershell
git add -- apps/web/src/assets/app.css apps/web/src/assets/typographyRoles.test.ts apps/web/src/components/shell/BottomNavigation.vue apps/web/src/components/common/BottomSheet.vue apps/web/src/components/common/EmptyStateCard.vue apps/web/src/components/session/SessionEndControl.vue
git commit -m "refactor(web): apply shared typography roles"
```

---

### Task 3: Migrate product and setup experiences

**Files:**

- Modify: `apps/web/src/assets/typographyRoles.test.ts`
- Modify: `apps/web/src/components/product/GearListItem.vue:125-150`
- Modify: `apps/web/src/components/product/ProductSnapshotEditor.vue:350-380`
- Modify: `apps/web/src/components/product/SetupProcessBanner.vue:65-90`
- Modify: `apps/web/src/components/setup/QuickProtectionSummary.vue:150-205`
- Modify: `apps/web/src/components/setup/WaterStartPicker.vue:90-145`
- Modify: `apps/web/src/components/setup/ZoneProtectionForm.vue:265-390`
- Modify: `apps/web/src/pages/setup/SetupPage.vue:435-465`

**Interfaces:**

- Consumes: `card-title`, `supporting`, `caption`, `section-title`, and preserved responsive readout exceptions.
- Produces: product/setup pages with no legacy font-size buckets and no changes to their data or form behavior.

- [ ] **Step 1: Expand the source guard with every product/setup file above**

Append those seven paths to `migratedFiles` without changing `legacyToken`.

- [ ] **Step 2: Run the guard and confirm the newly added files fail**

Run:

```powershell
pnpm vitest run apps/web/src/assets/typographyRoles.test.ts
```

Expected: FAIL listing the product/setup files that still contain `label`, `title-sm`, or `title-md`.

- [ ] **Step 3: Migrate product/setup roles without changing readout clamps**

Apply this mapping:

- Gear item name, quick protection preset name, water-start title, and preset-card title → `card-title`.
- Product editor section heading and setup-process heading → `section-title`.
- Multi-line field labels and setup summaries → `supporting`.
- Short preset eyebrow/count label → `caption` only when it remains a single short line.
- Preserve `clamp(1.5rem, 7vw, 2.35rem)` for the setup recovery/readout headlines.
- Leave input values and actionable form guidance at `body`.

- [ ] **Step 4: Run focused setup/product tests and CSS lint**

Run:

```powershell
pnpm vitest run apps/web/src/assets/typographyRoles.test.ts apps/web/src/components/product apps/web/src/components/setup apps/web/src/pages/setup
pnpm lint:css
```

Expected: targeted tests PASS; no unknown custom property or CSS-value errors.

- [ ] **Step 5: Commit the product/setup migration**

```powershell
git add -- apps/web/src/assets/typographyRoles.test.ts apps/web/src/components/product/GearListItem.vue apps/web/src/components/product/ProductSnapshotEditor.vue apps/web/src/components/product/SetupProcessBanner.vue apps/web/src/components/setup/QuickProtectionSummary.vue apps/web/src/components/setup/WaterStartPicker.vue apps/web/src/components/setup/ZoneProtectionForm.vue apps/web/src/pages/setup/SetupPage.vue
git commit -m "refactor(web): migrate product and setup typography"
```

---

### Task 4: Migrate home, reminder, region, and forecast experiences

**Files:**

- Modify: `apps/web/src/assets/typographyRoles.test.ts`
- Modify: `apps/web/src/components/home/HomeUvHeadline.vue:80-118`
- Modify: `apps/web/src/pages/HomePage.vue:510-520`
- Modify: `apps/web/src/components/reapplication/ReapplicationZoneSelector.vue:55-70`
- Modify: `apps/web/src/components/reminder/ZoneStatusList.vue:180-215`
- Modify: `apps/web/src/components/region/RegionLocationPanel.vue:130-165`
- Modify: `apps/web/src/components/region/RegionManualSelector.vue:165-180`
- Modify: `apps/web/src/components/region/RegionPreferenceSummary.vue:45-60`
- Modify: `apps/web/src/pages/RegionPage.vue:95-110`
- Modify: `apps/web/src/components/uv/FiveDayUvCard.vue:275-380`

**Interfaces:**

- Consumes: final semantic tokens and the component-exception rule from the B8 spec.
- Produces: all non-education runtime areas free of legacy title/label tokens while preserving numeric presentation.

- [ ] **Step 1: Expand the migration guard with this task's nine files**

Add each listed path to `migratedFiles`.

- [ ] **Step 2: Run the guard to capture the expected failures**

Run:

```powershell
pnpm vitest run apps/web/src/assets/typographyRoles.test.ts
```

Expected: FAIL for all files that still use a legacy title or label bucket.

- [ ] **Step 3: Assign semantic roles**

Use these decisions:

- Home loading/error `h2`, UVI level text, and reapplication legend → `section-title`.
- Region panel/manual sheet headings → `section-title`.
- Region summary, region skip card, and location sub-card titles → `card-title`.
- Zone list multi-line supporting labels and forecast source/note → `supporting`.
- Five-day date and compact UVI badge → `caption`.
- Keep `.uv-day__value`, narrow forecast values, night-session number, countdown number, and other established numeric `clamp()` values unchanged.

Do not alter the Data Settings summary card or its dividers in this task.

- [ ] **Step 4: Run focused tests, typecheck, and CSS lint**

Run:

```powershell
pnpm vitest run apps/web/src/assets/typographyRoles.test.ts apps/web/src/components/home apps/web/src/components/reminder apps/web/src/components/region apps/web/src/components/uv
pnpm --filter @sunshield/web typecheck
pnpm lint:css
```

Expected: all commands PASS.

- [ ] **Step 5: Commit the domain migration**

```powershell
git add -- apps/web/src/assets/typographyRoles.test.ts apps/web/src/components/home/HomeUvHeadline.vue apps/web/src/pages/HomePage.vue apps/web/src/components/reapplication/ReapplicationZoneSelector.vue apps/web/src/components/reminder/ZoneStatusList.vue apps/web/src/components/region/RegionLocationPanel.vue apps/web/src/components/region/RegionManualSelector.vue apps/web/src/components/region/RegionPreferenceSummary.vue apps/web/src/pages/RegionPage.vue apps/web/src/components/uv/FiveDayUvCard.vue
git commit -m "refactor(web): migrate status and forecast typography"
```

---

### Task 5: Apply education roles, heading rhythm, and the approved wave

**Files:**

- Modify: `apps/web/src/assets/typographyRoles.test.ts`
- Modify: `apps/web/src/pages/education/EducationIndexPage.vue:115-150`
- Modify: `apps/web/src/pages/education/EducationCategoryPage.vue:100-135`
- Modify: `apps/web/src/pages/education/EducationArticlePage.vue:115-240`
- Modify: `apps/web/src/pages/education/EducationPages.test.ts:45-80`

**Interfaces:**

- Consumes: existing generated `<hr>` from `tools/education/content-reader.mjs`, `section-title`, `card-title`, `caption`, and the existing 44rem article measure.
- Produces: one CSS-rendered soft wave per current article, stronger heading-to-following-paragraph proximity, and a visibly subordinate editorial footnote.

- [ ] **Step 1: Add rendered-article structure assertions**

In the existing article-page test, add:

```ts
const divider = wrapper.get(".education-article-body hr");
expect(divider.exists()).toBe(true);
expect(wrapper.get(".education-article-body hr + p").text()).toContain(
  "本文為一般衛教草稿"
);
```

Also add the three education Vue files to `migratedFiles`.

- [ ] **Step 2: Run education and migration tests before styling**

Run:

```powershell
pnpm vitest run apps/web/src/pages/education/EducationPages.test.ts apps/web/src/assets/typographyRoles.test.ts
```

Expected: the rendered `<hr>` assertions PASS because source content already provides it; the migration guard FAILS on old title tokens. This establishes that B8 changes presentation, not article copy or generated-content structure.

- [ ] **Step 3: Migrate education heading roles and preserve body measure**

Apply:

- Education index/category section headings and article `h2` → `section-title`.
- Education cards and article `h3` → `card-title`.
- Article metadata and final editorial footnote → `caption`.
- Article summary stays `body`; article body stays 16px with `line-height: 1.85` and `max-width: 44rem`.
- Set `h2` margin to `var(--space-10) 0 var(--space-3)` and `h3` margin to `var(--space-8) 0 var(--space-2)` so headings are farther from preceding content and closer to following content.

- [ ] **Step 4: Turn the existing thematic break into the approved soft wave**

Replace the current straight-border `<hr>` styling with an intrinsic, decorative CSS background while retaining the semantic `hr` element:

```css
.education-article-body :deep(hr) {
  width: 7.5rem;
  height: 0.5rem;
  margin: var(--space-10) auto;
  border: 0;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 8'%3E%3Cpath d='M1 4C11 0 19 8 29 4S47 0 57 4s18 4 28 0 18-4 34 0' fill='none' stroke='%236F5A54' stroke-opacity='.55' stroke-linecap='round' stroke-width='2'/%3E%3C/svg%3E");
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.education-article-body :deep(hr + p) {
  margin-top: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-caption);
  line-height: 1.6;
}
```

Do not insert additional `<hr>` elements or edit all 48 article files. CSS background imagery is outside the accessibility tree, while the existing `hr` keeps the correct thematic-break semantics.

- [ ] **Step 5: Run education generation, tests, and CSS lint**

Run:

```powershell
pnpm education:generate
git diff --exit-code -- apps/web/src/features/education/education-content.generated.ts
pnpm vitest run apps/web/src/pages/education/EducationPages.test.ts tools/education/education-content.test.ts apps/web/src/assets/typographyRoles.test.ts
pnpm lint:css
```

Expected: generation produces no diff; all tests and Stylelint PASS.

- [ ] **Step 6: Commit the education treatment**

```powershell
git add -- apps/web/src/assets/typographyRoles.test.ts apps/web/src/pages/education/EducationIndexPage.vue apps/web/src/pages/education/EducationCategoryPage.vue apps/web/src/pages/education/EducationArticlePage.vue apps/web/src/pages/education/EducationPages.test.ts
git commit -m "feat(web): refine education typography rhythm"
```

---

### Task 6: Remove migration aliases and enforce the final vocabulary

**Files:**

- Modify: `packages/ui/src/tokens.test.ts`
- Modify: `packages/ui/src/styles.css:190-225`
- Modify: `apps/web/src/assets/typographyRoles.test.ts`

**Interfaces:**

- Consumes: completed semantic migration from Tasks 2-5.
- Produces: a final codebase in which legacy typography variables cannot return unnoticed.

- [ ] **Step 1: Add failing final guards for declarations and all source consumers**

Add to `tokens.test.ts`:

```ts
it("不再宣告 B8 前的舊字級桶", () => {
  for (const legacy of [
    "--font-size-label",
    "--font-size-title-sm",
    "--font-size-title",
    "--font-size-title-md"
  ]) {
    expect(cssTokens[legacy]).toBeUndefined();
  }
});
```

Replace the fixed `migratedFiles` list in `typographyRoles.test.ts` with recursive source discovery over `apps/web/src` for `.vue` and `.css`, excluding the test file itself. Keep the same `legacyToken` regex and assert each discovered source does not match it.

- [ ] **Step 2: Run both guards and verify the temporary declarations fail**

Run:

```powershell
pnpm vitest run packages/ui/src/tokens.test.ts apps/web/src/assets/typographyRoles.test.ts
```

Expected: FAIL only because `styles.css` still declares the four temporary aliases; no runtime source file should fail.

- [ ] **Step 3: Remove all four temporary aliases and their migration comment**

Delete exactly:

```css
--font-size-label: var(--font-size-supporting);
--font-size-title-sm: var(--font-size-card-title);
--font-size-title: var(--font-size-section-title);
--font-size-title-md: var(--font-size-section-title);
```

- [ ] **Step 4: Search for legacy names and unintended hard-coded general text sizes**

Run:

```powershell
rg -n -- "--font-size-(label|title-sm|title-md|title)\b" apps/web/src packages DESIGN.md
rg -n --pcre2 -g "*.vue" -g "*.css" "font-size:\s*(?!var\(--font-size-|clamp\()[^;]+" apps/web/src packages/ui/src
```

Expected: the first command finds no old typography tokens. Review every second-command result and retain only documented relative code/table/narrow-readout exceptions from the B8 spec; do not convert them blindly.

- [ ] **Step 5: Run the full automated quality gate**

Run:

```powershell
pnpm format:check
pnpm check
pnpm build
```

Expected: all commands exit zero. Report warnings separately from failures; do not call a warning-free run unless the output is actually warning-free.

- [ ] **Step 6: Commit final enforcement**

```powershell
git add -- packages/ui/src/styles.css packages/ui/src/tokens.test.ts apps/web/src/assets/typographyRoles.test.ts
git commit -m "test(ui): guard typography role vocabulary"
```

---

### Task 7: Perform the B8 visual matrix and record completion evidence

**Files:**

- Modify: `docs/superpowers/plans/2026-08-26-codebase-consolidation-audit.md:224-227,267`
- Modify: `docs/superpowers/plans/README.md:17`

**Interfaces:**

- Consumes: production build from Task 6 and the approved B8 visual spec.
- Produces: evidence-backed B8 completion status; no B9 implementation.

- [ ] **Step 1: Start the production preview and note its URL**

Run:

```powershell
pnpm --filter @sunshield/web exec vite preview --host 127.0.0.1
```

Expected: Vite reports a reachable local preview URL. Keep this terminal running for the remaining visual steps.

- [ ] **Step 2: Verify the 390×844 mobile matrix**

Open and exercise:

- Home: loading, empty, active reminder, due state, and night state.
- Setup: eligibility, quick protection, zone selection, and water-start picker.
- Products: list, empty state, detail, add/edit form.
- Region and five-day forecast.
- Education index, category, and at least one long article containing a table and the final wave/footnote.
- Data Settings and Notification Settings.
- Bottom Sheet and session-end confirmation.

For every screen confirm: no horizontal overflow, no clipped title, no multi-line explanation at 12px, navigation remains 12px, numeric clamps remain readable, and Data Settings dividers are unchanged.

- [ ] **Step 3: Verify the 1440×1000 desktop matrix**

Repeat the same routes and states. Confirm page title 28px does not become a responsive 32px, section/card hierarchy remains visible, article measure stays 44rem, and the wave is centered and visually subordinate.

- [ ] **Step 4: Verify 320px reflow and 200% zoom**

At 320 CSS pixels and at browser 200% zoom, confirm:

- no text or controls overlap;
- buttons/input content remain 16px;
- 12px roles remain short labels only;
- 44px control targets remain operable;
- article tables may scroll within their existing wrapper without causing page-level horizontal overflow.

- [ ] **Step 5: Check runtime diagnostics**

Across the matrix, inspect browser console and page errors. Expected: zero new console errors, page errors, missing custom-property warnings, or failed network requests attributable to B8.

- [ ] **Step 6: Update audit documents with exact evidence**

Mark B8 complete only if Steps 2-5 passed. Record the exact viewports, routes, automated commands, and any accepted component exceptions. Update the plan index from “未動工” to the verified result without claiming B9 is implemented.

- [ ] **Step 7: Re-run documentation checks and commit evidence**

Run:

```powershell
pnpm exec prettier --check docs/superpowers/plans/2026-08-26-codebase-consolidation-audit.md docs/superpowers/plans/README.md
git diff --check
```

Expected: both checks PASS.

```powershell
git add -- docs/superpowers/plans/2026-08-26-codebase-consolidation-audit.md docs/superpowers/plans/README.md
git commit -m "docs: record B8 typography verification"
```

---

## Final Self-Review Checklist

- The seven approved values appear identically in the spec, `DESIGN.md`, runtime CSS, and automated drift test.
- Every old title/label bucket is removed from declarations and consumers.
- Caption and navigation remain separate tokens.
- Data readout clamps, 44rem article measure, 1.85 article line-height, and narrow forecast exceptions remain intact.
- Data Settings dividers remain unchanged.
- The existing article `<hr>` renders as one soft wave and the editorial footnote is visually subordinate.
- B9 icon sizes, disclosure controls, and copy reduction are not present in this branch.
- Automated checks and all four visual conditions—390×844, 1440×1000, 320px reflow, and 200% zoom—have explicit pass/fail evidence.
