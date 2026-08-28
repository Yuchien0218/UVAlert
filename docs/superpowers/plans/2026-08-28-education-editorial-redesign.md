# Education Editorial Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the education landing page and article pages into a lighter editorial experience with four primary topic cards, plain-text article titles, and a warm takeaway block with a short wave.

**Architecture:** Keep Markdown articles and the existing six canonical category routes as the source of truth. Extend the education content reader to extract the leading `先說結論` paragraph into a dedicated generated `takeawayHtml` field, then render that field through a focused Vue component while leaving the remaining article body in the existing renderer. Add a presentation-only homepage model for the featured article, four primary topic cards, and secondary links without changing article category ownership or URLs.

**Tech Stack:** Vue 3 Composition API with `<script setup lang="ts">`, Vue Router 4, TypeScript, Vitest, Vue Test Utils, Node.js content generator, scoped CSS using existing UVAlert design tokens.

## Global Constraints

- Do not show reading-time estimates anywhere.
- Preserve all six canonical education categories, article assignments, slugs, canonical URLs, breadcrumbs, robots metadata, and generated public pages.
- The landing page shows one featured UV entry, four primary topic cards, and low-emphasis links for `特殊情況` and `查看所有分類`.
- Article title areas use plain text with no card, background, border, or forced two-line layout.
- Never insert `<br>` into article titles and never use `white-space: nowrap`, truncation, ellipsis, clipping, or a smaller-than-page-title font to force one line.
- Titles stay on one line when space permits and wrap naturally only when the container, 320px reflow, zoom, or title length requires it.
- Remove the visible `先說結論` heading. Render the conclusion in a pale warm, borderless summary section with a shorter and lighter decorative wave above it.
- Keep the existing longer wave once between article body and source/review content.
- Preserve the B8 typography roles, approximately `44rem` article measure, `1.85` body line height, table containment, original Data Settings dividers, and all non-education behavior.
- Use existing spacing, color, radius, typography, motion, and focus tokens; do not add scattered hard-coded typography values.
- At 320px, 390px, 1440px, and 200% zoom, the page must reflow without page-level horizontal scrolling.

---

## File and Component Map

- `tools/education/content-reader.mjs`: parse each Markdown article, extract the leading conclusion, and return `takeawayHtml` separately from `bodyHtml`.
- `tools/education/education-content.test.ts`: guard extraction, malformed lead sections, generated content, and the absence of visible `先說結論` in body HTML.
- `apps/web/src/features/education/educationContent.ts`: expose the generated article type and the presentation-only landing-page model.
- `apps/web/src/features/education/educationContent.test.ts`: test the featured item, four primary topics, secondary links, and preservation of canonical categories.
- `apps/web/src/components/education/EducationArticleSummary.vue`: render one accessible warm takeaway section and its decorative short wave.
- `apps/web/src/components/education/EducationArticleSummary.test.ts`: verify semantics, HTML rendering, and decorative-wave accessibility.
- `apps/web/src/pages/education/EducationIndexPage.vue`: compose the featured entry, primary topics, secondary category links, and content-policy note.
- `apps/web/src/pages/education/EducationArticlePage.vue`: compose the plain title, summary component, body, sources/review content, and previous/next navigation.
- `apps/web/src/pages/education/EducationCategoryPage.vue`: keep canonical category navigation visually consistent without adopting the homepage hero treatment.
- `apps/web/src/pages/education/EducationPages.test.ts`: integration tests for landing-page hierarchy, article takeaway, title contract, source visibility, and previous/next links.
- `apps/web/src/features/education/education-content.generated.ts`: regenerated output; never edit by hand.
- `docs/education/articles/*.md`: remain the editorial source; no bulk copy rewrite is required because the generator extracts the existing lead section.

---

### Task 1: Extract the article takeaway in the content pipeline

**Files:**
- Modify: `tools/education/content-reader.mjs`
- Modify: `tools/education/education-content.test.ts`
- Regenerate: `apps/web/src/features/education/education-content.generated.ts`

**Interfaces:**
- Produces: every generated `EducationArticle` gains `takeawayHtml: string`.
- Produces: `bodyHtml` begins with the first real body section and does not contain `<h2>先說結論</h2>`.
- Preserves: Markdown files, front matter, six categories, ordering, slugs, SEO fields, and source/review markup.

- [ ] **Step 1: Add failing extraction tests**

Add focused cases to `tools/education/education-content.test.ts` using the existing reader test style:

```ts
it("extracts the lead conclusion from rendered article body", async () => {
  const content = await readEducationContent();
  const article = content.articles.find(
    (candidate) => candidate.slug === "what-is-uv-index"
  );

  expect(article?.takeawayHtml).toContain("UV 指數（UVI）");
  expect(article?.takeawayHtml).toMatch(/^<p>.*<\/p>$/s);
  expect(article?.bodyHtml).not.toContain("先說結論");
  expect(article?.bodyHtml).toContain("<h2>台灣常見的五級分法</h2>");
});

it("requires every article to start with one conclusion paragraph", async () => {
  const content = await readEducationContent();

  for (const article of content.articles) {
    expect(article.takeawayHtml, article.slug).toMatch(/^<p>.+<\/p>$/s);
    expect(article.bodyHtml, article.slug).not.toContain("先說結論");
  }
});
```

- [ ] **Step 2: Run the tests and verify the red state**

Run:

```bash
pnpm vitest run tools/education/education-content.test.ts
```

Expected: FAIL because `takeawayHtml` does not exist and `bodyHtml` still contains `先說結論`.

- [ ] **Step 3: Implement a strict leading-section splitter**

Add a focused helper in `tools/education/content-reader.mjs` before `parseArticle`:

```js
export function splitLeadTakeaway(bodyMarkdown, sourcePath) {
  const normalized = bodyMarkdown.replaceAll("\r\n", "\n").trim();
  const heading = "## 先說結論";
  const nextSectionIndex = normalized.indexOf("\n## ", heading.length);
  if (!normalized.startsWith(`${heading}\n`) || nextSectionIndex < 0) {
    throw new Error(`Missing leading conclusion section in ${sourcePath}`);
  }

  const takeawayMarkdown = normalized
    .slice(heading.length, nextSectionIndex)
    .trim();
  const takeawayHtml = renderMarkdownToHtml(takeawayMarkdown);
  if (!/^<p>.+<\/p>$/s.test(takeawayHtml)) {
    throw new Error(`Leading conclusion must be one paragraph in ${sourcePath}`);
  }

  return {
    takeawayHtml,
    bodyMarkdown: normalized.slice(nextSectionIndex + 1).trim()
  };
}
```

In `parseArticle`, call the helper and return:

```js
const lead = splitLeadTakeaway(bodyMarkdown, sourcePath);
return {
  // existing metadata
  bodyMarkdown,
  takeawayHtml: lead.takeawayHtml,
  bodyHtml: renderMarkdownToHtml(lead.bodyMarkdown)
};
```

Do not silently accept missing or multi-paragraph conclusions; the generator must name the offending source path.

- [ ] **Step 4: Run extraction tests and regenerate content**

Run:

```bash
pnpm vitest run tools/education/education-content.test.ts
pnpm education:generate
```

Expected: tests PASS; generated articles contain `takeawayHtml`; generated `bodyHtml` contains no `<h2>先說結論</h2>`.

- [ ] **Step 5: Verify generated diff boundaries**

Run:

```bash
git diff -- apps/web/src/features/education/education-content.generated.ts
rg -n '先說結論' apps/web/src/features/education/education-content.generated.ts
```

Expected: generated diff only adds takeaway fields and removes the leading heading/paragraph from each body; `rg` returns no generated matches.

- [ ] **Step 6: Commit the content contract**

```bash
git add tools/education/content-reader.mjs tools/education/education-content.test.ts apps/web/src/features/education/education-content.generated.ts
git commit -m "refactor(education): extract article takeaways"
```

---

### Task 2: Build the accessible article-summary component

**Files:**
- Create: `apps/web/src/components/education/EducationArticleSummary.vue`
- Create: `apps/web/src/components/education/EducationArticleSummary.test.ts`

**Interfaces:**
- Consumes: `takeawayHtml: string` from Task 1.
- Produces: `<EducationArticleSummary :html="article.takeawayHtml" />`.
- Semantics: one `<section aria-label="文章摘要">`; decorative wave is hidden from the accessibility tree.

- [ ] **Step 1: Write the failing component tests**

```ts
// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EducationArticleSummary from "./EducationArticleSummary.vue";

describe("EducationArticleSummary", () => {
  it("renders one labelled takeaway without a visible template heading", () => {
    const wrapper = mount(EducationArticleSummary, {
      props: { html: "<p>先依今天的 UV 安排防護。</p>" }
    });

    expect(wrapper.get("section").attributes("aria-label")).toBe("文章摘要");
    expect(wrapper.text()).toContain("先依今天的 UV 安排防護。");
    expect(wrapper.text()).not.toContain("先說結論");
    expect(wrapper.find("h2").exists()).toBe(false);
    expect(wrapper.get(".education-summary__wave").attributes("aria-hidden")).toBe("true");
  });
});
```

- [ ] **Step 2: Run the component test and verify it fails**

Run:

```bash
pnpm --filter @sunshield/web vitest run src/components/education/EducationArticleSummary.test.ts
```

Expected: FAIL because the component does not exist.

- [ ] **Step 3: Implement the focused component**

Create `EducationArticleSummary.vue` with a typed prop and no route/data responsibility:

```vue
<script setup lang="ts">
defineProps<{ html: string }>();
</script>

<template>
  <section class="education-summary" aria-label="文章摘要">
    <span class="education-summary__wave" aria-hidden="true" />
    <div class="education-summary__content" v-html="html" />
  </section>
</template>
```

Use scoped CSS with existing tokens:

```css
.education-summary {
  display: grid;
  gap: var(--space-4);
  max-width: 44rem;
  padding: var(--space-5);
  border-radius: var(--radius-md);
  background: var(--color-surface-cream-strong);
}

.education-summary__wave {
  width: 4.5rem;
  height: 0.4rem;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 8'%3E%3Cpath d='M1 4C11 0 19 8 29 4S47 0 57 4s18 4 28 0 18-4 34 0' fill='none' stroke='%236F5A54' stroke-opacity='.35' stroke-linecap='round' stroke-width='2'/%3E%3C/svg%3E");
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
}

.education-summary__content :deep(p) {
  margin: 0;
  color: var(--text-body);
  font-size: var(--font-size-body);
  line-height: 1.7;
}
```

Reuse the existing article-wave path rather than drawing a different motif. Confirm the chosen surface token exists before using it; if the current canonical warm surface has another name, use that existing token and update the test only for semantics, not literal color values.

- [ ] **Step 4: Run component tests and style checks**

Run:

```bash
pnpm --filter @sunshield/web vitest run src/components/education/EducationArticleSummary.test.ts
pnpm stylelint "apps/web/src/components/education/EducationArticleSummary.vue"
```

Expected: PASS with no Stylelint warnings.

- [ ] **Step 5: Commit the component**

```bash
git add apps/web/src/components/education/EducationArticleSummary.vue apps/web/src/components/education/EducationArticleSummary.test.ts
git commit -m "feat(education): add article takeaway block"
```

---

### Task 3: Reshape the education landing page without changing canonical categories

**Files:**
- Modify: `apps/web/src/features/education/educationContent.ts`
- Create: `apps/web/src/features/education/educationContent.test.ts`
- Modify: `apps/web/src/pages/education/EducationIndexPage.vue`
- Modify: `apps/web/src/pages/education/EducationPages.test.ts`

**Interfaces:**
- Produces: `educationHomeFeatured`, `educationHomePrimaryTopics`, and `educationHomeSecondaryLinks` presentation values.
- Preserves: `educationCategories`, `listArticlesForCategory`, and all canonical category routes.
- Consumes: existing `educationCategoryPath()` and article counts.

- [ ] **Step 1: Write failing presentation-model tests**

In `educationContent.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  educationCategories,
  educationHomeFeatured,
  educationHomePrimaryTopics,
  educationHomeSecondaryLinks
} from "./educationContent";

describe("education home presentation", () => {
  it("keeps six canonical categories behind four primary home topics", () => {
    expect(educationCategories).toHaveLength(6);
    expect(educationHomeFeatured.categorySlug).toBe("uv-basics");
    expect(educationHomePrimaryTopics.map((topic) => topic.title)).toEqual([
      "補擦時機",
      "流汗與下水",
      "認識防曬標示",
      "曬後與不適處理"
    ]);
    expect(educationHomeSecondaryLinks.map((link) => link.title)).toEqual([
      "特殊情況",
      "查看所有分類"
    ]);
  });
});
```

- [ ] **Step 2: Run the presentation test and verify it fails**

Run:

```bash
pnpm --filter @sunshield/web vitest run src/features/education/educationContent.test.ts
```

Expected: FAIL because the homepage presentation exports do not exist.

- [ ] **Step 3: Add the explicit presentation model**

Add readonly values to `educationContent.ts`:

```ts
export const educationHomeFeatured = {
  categorySlug: "uv-basics",
  iconName: "education-uv-basics",
  eyebrow: "先從這裡開始",
  title: "了解今天的 UV",
  description: "先看今天的指數，再決定要不要調整防曬。"
} as const;

export const educationHomePrimaryTopics = [
  { title: "補擦時機", categorySlug: "reapply-sunscreen", iconName: "education-reapply" },
  { title: "流汗與下水", categorySlug: "sweat-and-water", iconName: "education-sweat-and-water" },
  { title: "認識防曬標示", categorySlug: "before-going-out", iconName: "education-before-going-out" },
  { title: "曬後與不適處理", categorySlug: "after-sun-care", iconName: "education-after-sun-care" }
] as const;

export const educationHomeSecondaryLinks = [
  { title: "特殊情況", categorySlug: "special-situations" },
  { title: "查看所有分類", targetId: "all-education-categories" }
] as const;
```

Derive descriptions and counts from canonical category/article data in the page; do not duplicate counts or reassign article categories.

- [ ] **Step 4: Add failing page-level hierarchy assertions**

Update the education-index test to assert:

```ts
expect(wrapper.get(".education-featured").text()).toContain("了解今天的 UV");
expect(wrapper.find(".education-featured").text()).not.toContain("分鐘");
expect(wrapper.findAll(".education-topic-card")).toHaveLength(4);
expect(wrapper.get(".education-secondary-links").text()).toContain("特殊情況");
expect(wrapper.get(".education-secondary-links").text()).toContain("查看所有分類");
expect(wrapper.get("#all-education-categories").text()).toContain("6 個主題");
```

Expected before implementation: FAIL because the new structure is absent.

- [ ] **Step 5: Implement the landing-page composition**

Refactor `EducationIndexPage.vue` so the page order is:

1. Existing SEO head.
2. Page-level heading `防曬衛教` with concise policy copy.
3. One native `RouterLink.education-featured` for `uv-basics`.
4. Four `RouterLink.education-topic-card` entries in a two-column desktop grid.
5. Low-emphasis `.education-secondary-links` for `特殊情況` and anchor navigation to `#all-education-categories`.
6. A compact all-categories list preserving all six canonical routes.
7. Content-source/review policy text.

Do not add reading time. Render the exact existing generated icon named by each presentation entry through the shared `Icon` component; keep card text to title, one sentence, and article count. Use existing links and visible focus styles. At the mobile breakpoint, switch the topic grid to one column when the two-column copy no longer reads comfortably.

- [ ] **Step 6: Run landing tests, typecheck, and focused style checks**

Run:

```bash
pnpm --filter @sunshield/web vitest run src/features/education/educationContent.test.ts src/pages/education/EducationPages.test.ts
pnpm --filter @sunshield/web typecheck
pnpm stylelint "apps/web/src/pages/education/EducationIndexPage.vue"
```

Expected: PASS; all six canonical categories remain discoverable; no reading-time copy exists.

- [ ] **Step 7: Commit the landing page**

```bash
git add apps/web/src/features/education/educationContent.ts apps/web/src/features/education/educationContent.test.ts apps/web/src/pages/education/EducationIndexPage.vue apps/web/src/pages/education/EducationPages.test.ts
git commit -m "feat(education): reshape the article landing page"
```

---

### Task 4: Compose the editorial article page and navigation

**Files:**
- Modify: `apps/web/src/pages/education/EducationArticlePage.vue`
- Modify: `apps/web/src/pages/education/EducationPages.test.ts`
- Modify: `apps/web/src/features/education/educationContent.ts`

**Interfaces:**
- Consumes: `article.takeawayHtml` and `EducationArticleSummary` from Tasks 1–2.
- Produces: `findAdjacentEducationArticles(slug)` returning `{ previous, next }` in canonical README order.
- Preserves: current SEO metadata, breadcrumbs, publishable status, body renderer, sources, and review footnote.

- [ ] **Step 1: Write failing adjacent-navigation tests**

```ts
import { findAdjacentEducationArticles } from "./educationContent";

it("returns previous and next articles in canonical order", () => {
  const adjacent = findAdjacentEducationArticles("what-is-uv-index");
  expect(adjacent.current?.slug).toBe("what-is-uv-index");
  expect(adjacent.next?.slug).toBeTruthy();
});
```

Also cover first/last articles so absent neighbors return `undefined`, not wrapped or fabricated.

- [ ] **Step 2: Run the helper test and verify it fails**

Run:

```bash
pnpm --filter @sunshield/web vitest run src/features/education/educationContent.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement adjacent lookup**

```ts
export function findAdjacentEducationArticles(slug: string): {
  current: EducationArticle | undefined;
  previous: EducationArticle | undefined;
  next: EducationArticle | undefined;
} {
  const index = educationArticles.findIndex((article) => article.slug === slug);
  if (index < 0) return { current: undefined, previous: undefined, next: undefined };
  return {
    current: educationArticles[index],
    previous: educationArticles[index - 1],
    next: educationArticles[index + 1]
  };
}
```

- [ ] **Step 4: Add failing article-page assertions**

Update `EducationPages.test.ts`:

```ts
expect(wrapper.find(".education-article-header").classes()).not.toContain("app-card");
expect(wrapper.get("h1").html()).not.toContain("<br");
expect(wrapper.get('[aria-label="文章摘要"]').text()).toContain("UV 指數");
expect(wrapper.text()).not.toContain("先說結論");
expect(wrapper.findAll(".education-article-body hr")).toHaveLength(1);
expect(wrapper.get(".education-adjacent-nav").text()).toContain("下一篇");
```

Keep the existing canonical, robots, JSON-LD, source, review-note, and wave assertions.

- [ ] **Step 5: Refactor the article template**

In `EducationArticlePage.vue`:

- Import and render `EducationArticleSummary` after the plain-text header.
- Remove the old duplicate visible summary paragraph from the header; `article.summary` remains SEO/list copy while `article.takeawayHtml` is the article conclusion.
- Keep title markup as plain `h1` with `page-title`; do not add `<br>`, nowrap, truncation, or line clamping.
- Keep `max-width: 44rem` and natural wrapping.
- Render body HTML after the summary.
- Replace the three-item same-category card/list block with previous/next text navigation using native `RouterLink`s and visible labels.
- Keep the existing review status and source content available after the body wave.

Use a simple navigation structure:

```vue
<nav class="education-adjacent-nav" aria-label="前後篇文章">
  <RouterLink v-if="adjacent.previous" :to="educationArticlePath(adjacent.previous.slug)">
    <span>上一篇</span>
    {{ adjacent.previous.title }}
  </RouterLink>
  <RouterLink v-if="adjacent.next" :to="educationArticlePath(adjacent.next.slug)">
    <span>下一篇</span>
    {{ adjacent.next.title }}
  </RouterLink>
</nav>
```

- [ ] **Step 6: Refine article CSS without changing the B8 scale**

Keep `font-size: var(--font-size-page-title)` via the B8 role. Remove only the artificial `max-width: 24ch` if it causes the old forced two-line appearance; retain the page measure. Preserve:

```css
.education-article-header,
.education-summary,
.education-article-body,
.education-adjacent-nav {
  max-width: 44rem;
}

.education-article-body {
  min-width: 0;
  font-size: var(--font-size-body);
  line-height: 1.85;
}
```

Keep the existing body-end wave. Do not add a second `hr` inside body HTML; the summary wave belongs to the summary component.

- [ ] **Step 7: Run focused article tests and checks**

Run:

```bash
pnpm --filter @sunshield/web vitest run src/components/education/EducationArticleSummary.test.ts src/features/education/educationContent.test.ts src/pages/education/EducationPages.test.ts
pnpm --filter @sunshield/web typecheck
pnpm stylelint "apps/web/src/pages/education/EducationArticlePage.vue" "apps/web/src/components/education/EducationArticleSummary.vue"
```

Expected: PASS; the visual text `先說結論` is absent; title markup has no artificial break; one body-end wave remains.

- [ ] **Step 8: Commit the article-page composition**

```bash
git add apps/web/src/pages/education/EducationArticlePage.vue apps/web/src/pages/education/EducationPages.test.ts apps/web/src/features/education/educationContent.ts apps/web/src/features/education/educationContent.test.ts
git commit -m "feat(education): refine article reading layout"
```

---

### Task 5: Verify responsive, visual, and accessibility behavior

**Files:**
- Create: `docs/verification/education-editorial-redesign.md`

**Interfaces:**
- Consumes: the completed landing and article pages.
- Produces: a checked verification record with route, viewport, observed dimensions, keyboard result, and known non-feature warnings.

- [ ] **Step 1: Run the complete project gates**

Run:

```bash
pnpm education:generate
pnpm check
pnpm --filter @sunshield/web build
git diff --check
```

Expected: all commands exit 0. Record existing non-blocking build warnings separately; do not call warnings failures or claim warning-free output.

- [ ] **Step 2: Start a production preview and verify the landing page**

At 1440×1000, 390×844, and 320×844 visit `/education` and record:

- featured `了解今天的 UV` title stays on one line when it fits;
- no reading-time text;
- exactly four primary topic cards;
- `特殊情況` and `查看所有分類` remain discoverable;
- all six canonical categories are reachable;
- no page-level horizontal overflow;
- focus rings remain visible and are not clipped.

- [ ] **Step 3: Verify representative article lengths and states**

At the same viewports visit at least:

- `/education/articles/what-is-uv-index` for a table;
- one long-title article;
- one special-situation article with safety content;
- one article with the largest source list.

Record computed/observed results:

- title uses the 28px page-title role;
- no `<br>`, nowrap, truncation, or clipping;
- title stays one line when it fits and naturally wraps only when required;
- warm takeaway has one short decorative wave and no visible `先說結論`;
- body measure is approximately 44rem and line height is 1.85;
- exactly one longer body-end wave separates sources;
- tables scroll only inside `.education-table-wrap` at 320px;
- source links and review status remain visible;
- previous/next navigation reflows without overlapping.

- [ ] **Step 4: Verify zoom, keyboard, and accessibility tree**

At effective 200% zoom:

- traverse return, source, category, and adjacent links with keyboard only;
- verify every focus indicator is visible;
- inspect the accessibility tree for `section` named `文章摘要`;
- verify decorative waves are not announced;
- verify topic cards are native links with visible text in their accessible names;
- verify there is no page-level horizontal scroll.

- [ ] **Step 5: Verify contrast and UI states**

Measure the rendered summary foreground/background pair and any safety-note pair against the applicable WCAG text contrast threshold. Exercise hover, active, focus-visible, loading/content-review, unknown article, and unknown category states. Record exact failures and fix only education-scoped defects.

- [ ] **Step 6: Write the verification record**

Create `docs/verification/education-editorial-redesign.md` with:

```markdown
# Education editorial redesign verification

## Build and automated checks
- command — exit code — observed warnings

## Browser matrix
| Route | Viewport/zoom | Overflow | Title | Summary | Wave/source | Keyboard | Result |

## Accessibility
- accessible summary name
- decorative wave behavior
- focus order and focus visibility
- measured contrast pairs

## Known unrelated warnings
- warning and why it is not attributable to this change
```

Do not mark an untested route or state as passed.

- [ ] **Step 7: Commit verification evidence**

```bash
git add docs/verification/education-editorial-redesign.md
git commit -m "test(education): verify editorial redesign"
```

If any browser or accessibility check fails, stop this task before Step 6, return the exact failure to the responsible Task 1–4 implementer, require a focused fix commit, and rerun all affected checks. Do not mix an unspecified product-code fix into the evidence commit.

---

## Final Review Gate

- [ ] Generate a review package from the implementation merge base through `HEAD`.
- [ ] Assign a fresh reviewer to inspect design-spec coverage, content-pipeline correctness, Vue semantics, accessibility, and browser evidence.
- [ ] Resolve every Critical or Important finding with a focused fix commit and one new review.
- [ ] Confirm the branch contains no B9 icon-first work, header/Logo changes, UV forecast changes, reminder-flow changes, or unrelated user files.
- [ ] Do not push or merge until the user explicitly requests delivery.
