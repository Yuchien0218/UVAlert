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

