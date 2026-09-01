import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getPublicSiteUrl, readEducationContent } from "./content-reader.mjs";

const REPOSITORY_ROOT = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../.."
);
const DIST_DIRECTORY = resolve(REPOSITORY_ROOT, "apps/web/dist");

const PUBLIC_STYLE = `
:root { color-scheme: light; font-family: -apple-system, BlinkMacSystemFont, "Noto Sans TC", "Microsoft JhengHei", sans-serif; color: #121212; background: #f9f9f9; }
* { box-sizing: border-box; }
body { max-width: 47rem; min-width: 20rem; margin: 0 auto; background: #f9f9f9; line-height: 1.5; }
a { color: #2f6fbb; }
.site-header { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 1.25rem clamp(1rem, 5vw, 2.75rem); border-bottom: 1px solid #e3e3e3; background: #fff; }
.site-header a { color: inherit; font-weight: 600; text-decoration: none; }
.site-header small { color: #5a5a5a; }
main { padding: clamp(1.5rem, 6vw, 3.5rem) clamp(1rem, 5vw, 2.75rem) 4rem; }
.eyebrow { margin: 0 0 .75rem; color: #5a5a5a; font-size: .8rem; }
h1 { max-width: 25em; margin: 0 0 1rem; font-size: clamp(1.8rem, 7vw, 2.5rem); line-height: 1.2; letter-spacing: -.04em; }
h2 { margin: 2rem 0 .75rem; font-size: 1.25rem; line-height: 1.35; }
h3 { margin: 1.75rem 0 .5rem; font-size: 1.05rem; }
.lead, .summary { color: #5a5a5a; }
.card-list { display: grid; gap: .75rem; margin: 1.25rem 0 0; }
.card { display: grid; gap: .35rem; padding: 1.25rem; border: 1px solid #e3e3e3; border-radius: 1.25rem; background: #fff; color: inherit; text-decoration: none; }
.card strong { font-size: 1.05rem; font-weight: 600; }
.card small, .meta { color: #5a5a5a; font-size: .8rem; }
/* kicker 是膠囊（與 app 一致）：審閱徽章拿掉之後，卡片上帶底色的元素換它接手。 */
.kicker { justify-self: start; padding: .1rem .5rem; border-radius: 999px; background: #e3e3e3; color: #5a5a5a; font-size: .75rem; }
/* 文章的「先說結論」段落。產生器把它從 bodyHtml 抽走放進 takeawayHtml，
   所以要單獨渲染，否則整篇文章會少掉結論。 */
.article-takeaway { max-width: 44rem; margin: 0 0 1.5rem; padding: 1rem 1.25rem; border-radius: .5rem; background: #f4ece2; }
.article-takeaway p { margin: 0; line-height: 1.6; }
.article-body, .article-takeaway { text-wrap: pretty; overflow-wrap: break-word; }
.article-body p, .article-takeaway p { text-align: justify; }
.article-body { max-width: 44rem; }
.article-body p { margin: 0 0 .75rem; }
.article-body ul, .article-body ol { margin: 0 0 1.25rem; padding-left: 1.5rem; }
.article-body li + li { margin-top: .5rem; }
.article-body blockquote { margin: 1.25rem 0; padding-left: 1rem; border-left: .2rem solid #e3e3e3; color: #5a5a5a; }
/* 波浪分隔線：與 app 的 .wave-divider 同一個遮罩與同一組數值（app.css）。 */
.article-body hr, .related hr { width: 7.5rem; height: .5rem; border: 0; background-color: #5a5a5a; opacity: .55; mask-image: url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 8'%3E%3Cpath d='M1 4C11 0 19 8 29 4S47 0 57 4s18 4 28 0 18-4 34 0' fill='none' stroke='%23000' stroke-linecap='round' stroke-width='2'/%3E%3C/svg%3E\"); mask-position: center; mask-repeat: no-repeat; mask-size: 100% 100%; }
.article-body hr { margin: 2.5rem auto; }
.article-body code { padding: .1rem .3rem; border-radius: .5rem; background: #e3e3e3; font-size: .9em; }
.education-table-wrap { overflow-x: auto; margin: 1.25rem 0; }
table { width: 100%; min-width: 32rem; border-collapse: collapse; font-size: .9rem; }
th, td { padding: .75rem; border: 1px solid #e3e3e3; text-align: left; vertical-align: top; }
th { background: #fff; }
.back-link { display: inline-block; margin-bottom: 1.5rem; }
.related { margin-top: 2.5rem; }
.related hr { margin: 0 auto 1.5rem; }
footer { padding: 0 clamp(1rem, 5vw, 2.75rem) 2.5rem; color: #5a5a5a; font-size: .8rem; }
`;

export async function generatePublicSite({
  distDirectory = DIST_DIRECTORY,
  environment = process.env
} = {}) {
  const content = await readEducationContent();
  const baseUrl = getPublicSiteUrl(environment);
  if (
    environment.VITE_PUBLIC_SITE_URL === undefined ||
    environment.VITE_PUBLIC_SITE_URL.trim() === ""
  ) {
    process.stderr.write(
      "VITE_PUBLIC_SITE_URL is not set; generated canonical and sitemap URLs use http://localhost:4173.\n"
    );
  }
  await mkdir(distDirectory, { recursive: true });

  const publishedArticles = content.articles.filter(
    (article) => article.publishable
  );
  const latestPublishedDate = latestDate(
    publishedArticles.map((article) => article.lastReviewed)
  );
  const educationIndexable = publishedArticles.length > 0;
  await writePublicPage(
    resolve(distDirectory, "education/index.html"),
    renderEducationIndex(
      content,
      baseUrl,
      educationIndexable,
      latestPublishedDate
    )
  );

  for (const category of content.categories) {
    const articles = content.articles.filter(
      (article) => article.category === category.slug
    );
    const publishableCount = articles.filter(
      (article) => article.publishable
    ).length;
    await writePublicPage(
      resolve(distDirectory, `education/${category.slug}/index.html`),
      renderCategoryPage(
        category,
        articles,
        baseUrl,
        publishableCount > 0,
        latestDate(
          articles
            .filter((article) => article.publishable)
            .map((article) => article.lastReviewed)
        )
      )
    );
  }

  for (const article of content.articles) {
    await writePublicPage(
      resolve(distDirectory, `education/articles/${article.slug}/index.html`),
      renderArticlePage(article, content, baseUrl)
    );
  }

  const sitemapUrls = [];
  if (educationIndexable) {
    sitemapUrls.push({ path: "/education", lastmod: latestPublishedDate });
  }
  for (const category of content.categories) {
    const articles = content.articles.filter(
      (article) => article.category === category.slug && article.publishable
    );
    if (articles.length > 0) {
      sitemapUrls.push({
        path: `/education/${category.slug}`,
        lastmod: latestDate(articles.map((article) => article.lastReviewed))
      });
    }
  }
  for (const article of publishedArticles) {
    sitemapUrls.push({
      path: `/education/articles/${article.slug}`,
      lastmod: article.lastReviewed
    });
  }

  await writeFile(
    resolve(distDirectory, "sitemap.xml"),
    renderSitemap(baseUrl, sitemapUrls),
    "utf8"
  );
  await writeFile(
    resolve(distDirectory, "robots.txt"),
    renderRobots(baseUrl),
    "utf8"
  );
  return {
    articleCount: content.articles.length,
    publishedArticleCount: publishedArticles.length,
    sitemapUrlCount: sitemapUrls.length,
    baseUrl
  };
}

function renderEducationIndex(content, baseUrl, indexable, lastmod) {
  const categories = content.categories
    .map((category) => {
      const articles = content.articles.filter(
        (article) => article.category === category.slug
      );
      const published = articles.filter(
        (article) => article.publishable
      ).length;
      return `<a class="card" href="/education/${category.slug}"><span class="kicker">${articles.length} 篇文章</span><strong>${escapeHtml(category.title)}</strong><small>${escapeHtml(category.description)}</small></a>`;
    })
    .join("\n");
  const body = `<p class="eyebrow">防曬生活編輯部</p><h1>防曬衛教</h1><p class="lead">提供實用情境與官方指引。本專區為一般衛教資訊，不能取代專業醫療診斷。</p><h2>依一天的使用流程找答案</h2><div class="card-list">${categories}</div>`;
  return renderDocument({
    title: "防曬衛教",
    description:
      "用白話讀懂 UV、防曬乳、補擦、碰水與曬後照護；每篇文章列出官方來源與使用界線。",
    canonicalPath: "/education",
    robots: indexable ? "index,follow" : "noindex,follow",
    baseUrl,
    body,
    pageType: "CollectionPage",
    breadcrumbs: [{ name: "防曬衛教", path: "/education" }],
    lastmod
  });
}

function renderCategoryPage(category, articles, baseUrl, indexable, lastmod) {
  const cards = articles
    .map(
      (article) =>
        `<a class="card" href="/education/articles/${article.slug}"><span class="kicker">${escapeHtml(article.primaryQuestion)}</span><strong>${escapeHtml(article.title)}</strong><small>${escapeHtml(article.summary)}</small></a>`
    )
    .join("\n");
  const body = `<a class="back-link" href="/education">← 防曬衛教</a><p class="eyebrow">衛教分類</p><h1>${escapeHtml(category.title)}</h1><p class="lead">${escapeHtml(category.description)}</p><h2>文章</h2><div class="card-list">${cards}</div>`;
  return renderDocument({
    title: category.title,
    description: category.description,
    canonicalPath: `/education/${category.slug}`,
    robots: indexable ? "index,follow" : "noindex,follow",
    baseUrl,
    body,
    pageType: "CollectionPage",
    breadcrumbs: [
      { name: "防曬衛教", path: "/education" },
      { name: category.title, path: `/education/${category.slug}` }
    ],
    lastmod
  });
}

function renderArticlePage(article, content, baseUrl) {
  const category = content.categories.find(
    (candidate) => candidate.slug === article.category
  );
  const related = content.articles
    .filter(
      (candidate) =>
        candidate.category === article.category &&
        candidate.slug !== article.slug
    )
    .slice(0, 3)
    .map(
      (candidate) =>
        `<li><a href="/education/articles/${candidate.slug}">${escapeHtml(candidate.title)}</a></li>`
    )
    .join("");
  const relatedSection =
    related === ""
      ? ""
      : `<section class="related"><hr /><h2>同主題延伸閱讀</h2><ul>${related}</ul></section>`;
  const body = `<a class="back-link" href="${category === undefined ? "/education" : `/education/${category.slug}`}">← ${escapeHtml(category?.title ?? "防曬衛教")}</a><p class="eyebrow">${escapeHtml(article.primaryQuestion)}</p><h1>${escapeHtml(article.title)}</h1><p class="summary">${escapeHtml(article.summary)}</p><p class="meta">最後查閱：${escapeHtml(article.lastReviewed)}</p><div class="article-takeaway">${article.takeawayHtml}</div><div class="article-body">${article.bodyHtml}</div>${relatedSection}`;
  return renderDocument({
    title: article.title,
    description: article.summary,
    canonicalPath: `/education/articles/${article.slug}`,
    robots: article.publishable ? "index,follow" : "noindex,follow",
    baseUrl,
    body,
    article,
    breadcrumbs: [
      { name: "防曬衛教", path: "/education" },
      ...(category === undefined
        ? []
        : [{ name: category.title, path: `/education/${category.slug}` }]),
      { name: article.title, path: `/education/articles/${article.slug}` }
    ],
    lastmod: article.lastReviewed
  });
}

/**
 * 組 <title>，並且**不重複相鄰的同名區段**。
 *
 * 2026-08-31 修：衛教首頁自己的標題就叫「防曬衛教」，套進
 * `${title}｜防曬衛教｜UVAlert` 之後實際輸出是
 * 「防曬衛教｜防曬衛教｜UVAlert」。
 *
 * 與 apps/web/src/features/education/educationSeo.ts 的 buildEducationTitle
 * 是同一條規則——SPA 與這裡產的靜態頁必須輸出同一個標題，否則同一個網址
 * 在有無 JS 兩種情況下標題會不一樣。
 */
function buildTitle(pageTitle) {
  return [pageTitle, "防曬衛教", "UVAlert"]
    .filter((segment, index, all) => segment !== all[index - 1])
    .join("｜");
}

function renderDocument({
  title,
  description,
  canonicalPath,
  robots,
  baseUrl,
  body,
  article,
  breadcrumbs,
  pageType = "WebPage",
  lastmod
}) {
  const canonicalUrl = `${baseUrl}${canonicalPath}`;
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": pageType,
    "@id": canonicalUrl,
    url: canonicalUrl,
    name: title,
    description,
    inLanguage: "zh-Hant",
    isPartOf: { "@type": "WebSite", name: "UVAlert 防曬晴報員", url: baseUrl }
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbs.map((breadcrumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: breadcrumb.name,
      item: `${baseUrl}${breadcrumb.path}`
    }))
  };
  const schemas = [pageSchema, breadcrumbSchema];
  if (article !== undefined) {
    schemas.push({
      "@context": "https://schema.org",
      "@type": "Article",
      "@id": `${canonicalUrl}#article`,
      mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
      headline: article.title,
      description: article.summary,
      inLanguage: "zh-Hant",
      dateModified: article.lastReviewed,
      isAccessibleForFree: true,
      author: { "@type": "Organization", name: "UVAlert 防曬晴報員" },
      publisher: { "@type": "Organization", name: "UVAlert 防曬晴報員" }
    });
  }
  const schemaScripts = schemas
    .map(
      (schema) =>
        `<script type="application/ld+json">${safeJson(schema)}</script>`
    )
    .join("");
  const lastmodMeta =
    lastmod === undefined
      ? ""
      : `<meta name="last-modified" content="${escapeHtml(lastmod)}">`;
  return `<!doctype html><html lang="zh-Hant"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escapeHtml(buildTitle(title))}</title><meta name="description" content="${escapeHtml(description)}"><meta name="robots" content="${robots}"><link rel="canonical" href="${escapeHtml(canonicalUrl)}"><meta property="og:title" content="${escapeHtml(title)}"><meta property="og:description" content="${escapeHtml(description)}"><meta property="og:type" content="${article === undefined ? "website" : "article"}"><meta property="og:url" content="${escapeHtml(canonicalUrl)}"><meta property="og:site_name" content="UVAlert 防曬晴報員">${lastmodMeta}<style>${PUBLIC_STYLE}</style>${schemaScripts}</head><body><header class="site-header"><a href="/">UVAlert 防曬晴報員</a><small>防曬生活編輯部</small></header><main>${body}</main><footer>一般衛教內容；若有持續或加重的不適，請尋求醫療專業協助。</footer></body></html>`;
}

function renderSitemap(baseUrl, urls) {
  const entries = urls
    .map(
      ({ path, lastmod }) =>
        `<url><loc>${escapeXml(`${baseUrl}${path}`)}</loc>${lastmod === undefined ? "" : `<lastmod>${escapeXml(lastmod)}</lastmod>`}</url>`
    )
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>\n`;
}

function renderRobots(baseUrl) {
  return `User-agent: *\nAllow: /\nSitemap: ${baseUrl}/sitemap.xml\n`;
}

async function writePublicPage(filePath, html) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, html, "utf8");
}

function latestDate(values) {
  return values.length === 0 ? undefined : [...values].sort().at(-1);
}

function safeJson(value) {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeXml(value) {
  return escapeHtml(value);
}

async function main() {
  const result = await generatePublicSite();
  process.stdout.write(
    `Public education site generated: ${result.articleCount} articles, ${result.publishedArticleCount} published, ${result.sitemapUrlCount} sitemap URLs\n`
  );
}

if (
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main().catch((error) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`
    );
    process.exitCode = 1;
  });
}
