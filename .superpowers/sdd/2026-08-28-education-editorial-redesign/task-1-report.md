# Task 1 report: extract article takeaways

## Scope

- Added generated `takeawayHtml` to every `EducationArticle`.
- Changed generated `bodyHtml` to begin at the first real body section, excluding the leading `先說結論` section.
- Preserved Markdown source files, front matter, categories, ordering, slugs, SEO metadata, and source/review markup.
- Changed only the three files named by the brief; no Vue UI, B8, or B9 files were changed.

## TDD verification

### Red

The focused tests were added before production implementation.

- Intended command: `pnpm vitest run tools/education/education-content.test.ts`
- Environment result: `pnpm` could not use the worktree's incomplete dependency installation and attempted registry access; registry requests failed with `EACCES`.
- Actual test command using the existing repository-local Vitest binary: `C:\Users\yu\Coding Projects\UVAlert\node_modules\.bin\vitest.cmd run tools/education/education-content.test.ts`
- Result: expected red state, 5 tests total with 2 failures. Both new tests failed because `takeawayHtml` was `undefined` while the old generated body still contained `先說結論`.

### Green

- Implemented `splitLeadTakeaway` in `tools/education/content-reader.mjs` with strict heading, next-section, and single-paragraph validation; errors include the offending source path.
- Green test command: `C:\Users\yu\Coding Projects\UVAlert\node_modules\.bin\vitest.cmd run tools/education/education-content.test.ts`
- Result: 1 test file passed, 5 tests passed.
- Generated command: `node tools/education/generate-content.mjs`
- Result: generated 48 articles.
- Final green run: 1 test file passed, 5 tests passed.

## Generated diff boundary

- `takeawayHtml` appears 48 times in `apps/web/src/features/education/education-content.generated.ts`.
- `rg -n '先說結論' apps/web/src/features/education/education-content.generated.ts` returned no matches.
- `git diff --check` returned no whitespace errors.
- Changed paths are exactly:
  - `tools/education/content-reader.mjs`
  - `tools/education/education-content.test.ts`
  - `apps/web/src/features/education/education-content.generated.ts`
- Markdown article sources and unrelated UI/design areas remain outside the diff.

## Commit

`b0a9103` — `refactor(education): extract article takeaways`

## Self-review

- The splitter normalizes CRLF, requires `## 先說結論` at the beginning, requires a following `##` section, renders the lead paragraph through the existing Markdown renderer, and rejects non-single-paragraph leads.
- `bodyMarkdown` remains the original article body metadata while `bodyHtml` uses the stripped body returned by the splitter, matching the brief's generated contract.
- No source copy, front matter, category, ordering, slug, SEO field, source markup, review markup, Vue UI, B8, or B9 content was modified.
- No concerns identified within Task 1 scope.
