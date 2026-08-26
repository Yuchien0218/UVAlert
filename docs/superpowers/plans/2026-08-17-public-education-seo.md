# 公開衛教 SEO 頁面實作計畫

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 將 `docs/education/articles` 的衛教內容接成可分享、可抓取、可驗證的公開頁面，並產生 canonical、robots、Article/Breadcrumb Schema 與 sitemap；尚未完成專業審閱的文章一律可預覽但 `noindex`，不進 sitemap。

**Architecture:** 以 Node build-time parser 讀取 Markdown，產生 Vue 使用的 deterministic TypeScript data，也產生 Vite build 後的公開 HTML。Vue 路由提供互動閱讀體驗；靜態 HTML 讓爬蟲、分享預覽與停用 JavaScript 時仍能看到標題、摘要與文章內容。公開 URL 的網域由 `VITE_PUBLIC_SITE_URL` 注入，不在程式內假造正式網域。

**Tech Stack:** Vue 3、Vue Router 4、Vite 7、TypeScript、Node ESM、Vitest、HTML JSON-LD。

## Global Constraints

- 文章只有 `status: published` 且 `reviewStatus: approved` 才是可索引內容。
- 草稿／待審文章仍可由直接 URL 讀取，頁面顯示審閱提示並使用 `noindex,follow`，不得進入 sitemap。
- Schema 的可見欄位必須和頁面文字一致；不建立 `ai.txt`、`llms.txt` 或隱藏給模型的內容。
- sitemap 只列 canonical、公開、可索引的絕對 HTTPS URL；沒有設定 `VITE_PUBLIC_SITE_URL` 時以 localhost 產出並在 build 顯示警告，部署前必須設定正式網域。
- 不新增第三方 Markdown 套件；只渲染內容資料夾內受信任 Markdown 的明確子集並先 escape HTML。
- 不修改 `docs/archive/`，不 stage 既有的 `.claude/settings.local.json` 與 `防曬晴報員設計系統.md`。

---

### Task 1: 建立衛教內容讀取、Markdown 轉 HTML 與 Vue 生成資料

**Files:**

- Create: `tools/education/content-reader.mjs`
- Create: `tools/education/generate-content.mjs`
- Create: `apps/web/src/features/education/education-content.generated.ts` (generated)
- Create: `tools/education/education-content.test.ts`
- Modify: `package.json`
- Modify: `apps/web/package.json`

**Interfaces:**

- `content-reader.mjs` exports `CATEGORY_DEFINITIONS`, `readEducationContent()`, `renderMarkdownToHtml()`, `isPublishable()` and `getPublicSiteUrl()`.
- `readEducationContent()` returns `{ categories, articles }`; each article includes front matter, `bodyHtml`, `sourcePath`, and `publishable`.
- `generate-content.mjs` writes a deterministic TypeScript module exporting `educationCategories` and `educationArticles`.

- [x] **Step 1: Write failing content invariants.** Assert six categories, 48 unique slugs, front matter/body HTML for every article, no article is publishable in the current data, and rendered output contains no raw `<script>` from Markdown.
- [x] **Step 2: Run the focused test after scaffolding and confirm the generated content contract.**
- [x] **Step 3: Implement the parser and trusted Markdown renderer.** Support headings, paragraphs, unordered/ordered lists, links, strong/emphasis, inline code, blockquotes, and Markdown tables; escape text and URL attributes before emitting HTML. Preserve category order from the six approved slugs.
- [x] **Step 4: Implement deterministic generation and add scripts.** Add root `education:generate` and make the web build run generation before `vue-tsc`; do not include timestamps or machine-specific paths in generated output.
- [x] **Step 5: Run the focused test and web typecheck; expected: PASS.**

### Task 2: 新增公開衛教路由、頁面與 head 管理

**Files:**

- Create: `apps/web/src/features/education/educationContent.ts`
- Create: `apps/web/src/features/education/educationSeo.ts`
- Create: `apps/web/src/components/education/EducationSeoHead.vue`
- Create: `apps/web/src/pages/education/EducationIndexPage.vue`
- Create: `apps/web/src/pages/education/EducationCategoryPage.vue`
- Create: `apps/web/src/pages/education/EducationArticlePage.vue`
- Create: `apps/web/src/pages/education/EducationNotFoundPage.vue`
- Create: `apps/web/src/pages/education/EducationPages.test.ts`
- Modify: `apps/web/src/router/index.ts`
- Modify: `apps/web/src/pages/MorePage.vue`
- Modify: `apps/web/src/env.d.ts`

**Interfaces:**

- `educationContent.ts` exports typed `educationCategories`, `educationArticles`, `findEducationArticle(slug)`, `findEducationCategory(slug)`, `listArticlesForCategory(slug)`, and `isEducationArticlePublishable(article)`.
- `educationSeo.ts` exports `applyEducationSeo(input)` and `clearEducationSeo()`; it owns title, description, robots, canonical, and JSON-LD nodes without duplicating tags on navigation.
- `EducationSeoHead` accepts `title`, `description`, `canonicalPath`, `robots`, `article?`, and `breadcrumbs` props.

- [x] **Step 1: Add route/page tests.** Cover `/education`, a valid category/article, an unknown slug, visible draft warning, `noindex,follow` for drafts, canonical URL, and Article/Breadcrumb JSON-LD.
- [x] **Step 2: Run the focused page/router tests and confirm they pass after implementation.**
- [x] **Step 3: Add content helpers and SEO head manager.** Use `import.meta.env.VITE_PUBLIC_SITE_URL` when present, normalize trailing slash, fall back to `http://localhost:4173` in local tests, and remove/reuse only UVAlert-owned head nodes.
- [x] **Step 4: Build the three public page layouts.** Use descriptive H1/links, article summary and primary question above the body, visible review state, related articles, and a clear empty state when no article is publishable. Unknown categories/slugs render the public not-found page instead of silently showing another article.
- [x] **Step 5: Register public routes before the catch-all with `hideNavigation: true`, add an Education entry to More, and extend `VITE_PUBLIC_SITE_URL` typing.** Keep private app routes unchanged.
- [x] **Step 6: Run focused tests and web typecheck; expected: PASS.**

### Task 3: 產生公開靜態頁、robots、sitemap 並更新 PWA shell

**Files:**

- Create: `tools/education/generate-public-site.mjs`
- Modify: `apps/web/index.html`
- Modify: `apps/web/package.json`
- Modify: `docs/education/README.md`
- Create: `docs/education/public-seo-implementation.md`
- Modify: `README.md` (only if the root README exists and has a setup section)

**Interfaces:**

- `generate-public-site.mjs` reads the same content reader and writes `apps/web/dist/education/**/index.html`, `apps/web/dist/robots.txt`, and `apps/web/dist/sitemap.xml`.
- Static pages contain visible HTML, absolute canonical URL, description, robots, Article/BlogPosting and BreadcrumbList JSON-LD; draft pages contain noindex and are omitted from sitemap.

- [x] **Step 1: Add shell metadata test expectations to the existing build verification checklist.** The Vite SPA shell includes a short description and `noindex,follow` so private app routes are not treated as public SEO pages.
- [x] **Step 2: Implement static HTML generation after `vite build`.** Use the same renderer, include a small inline reading stylesheet, escape JSON-LD safely, preserve UTF-8, and generate only canonical published routes.
- [x] **Step 3: Generate robots with `Allow: /` and the absolute sitemap URL; do not use robots to conceal private data.** Private SPA shell remains `noindex`.
- [x] **Step 4: Document `VITE_PUBLIC_SITE_URL`, publish/review gate, output paths, hosting rewrite requirements, Rich Results Test/URL Inspection checks, and current zero-indexable-article behavior.**
- [x] **Step 5: Run `pnpm build` and inspect generated files; 48 draft article pages exist for direct preview, sitemap excludes all 48 drafts, robots points to sitemap, and shell has noindex.**

### Task 4: 全量驗證、差異檢查與提交

**Files:**

- Modify: files from Tasks 1–3 only.

- [x] **Step 1: Read `C:\Users\yu\.agents\skills\verification-before-completion\SKILL.md` and follow its evidence checklist.**
- [x] **Step 2: Run `pnpm check`, `pnpm build`, and `git diff --check`.**
- [x] **Step 3: Verify generated public files, JSON-LD validity, no draft URL in sitemap, `docs/archive/` unchanged, and unrelated untracked files remain unstaged.**
- [x] **Step 4: Commit only the SEO implementation and plan/docs with message `feat: add public education seo pages`.**
- [x] **Step 5: Report commit hash, verification results, and the required production `VITE_PUBLIC_SITE_URL` deployment step; do not claim search indexing until articles are professionally approved.**

## Self-review

- Spec coverage: public page routes, static HTML, canonical, Article/Breadcrumb Schema, robots, sitemap, PWA shell noindex, More entry, draft safety gate, deployment documentation, tests, and build verification are covered by Tasks 1–4.
- Placeholder scan: no `TBD`, `TODO`, or unspecified implementation step is used; every generated file and command is named.
- Type consistency: the content reader output is consumed by the generator and Vue generated module; SEO props and route/page responsibilities are defined before their consumers.
