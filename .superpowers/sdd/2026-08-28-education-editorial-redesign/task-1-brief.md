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
