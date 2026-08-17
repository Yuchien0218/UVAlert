import type { EducationArticle } from "./educationContent";

export type EducationRobots = "index,follow" | "noindex,follow";

export interface EducationBreadcrumb {
  name: string;
  path: string;
}

export interface EducationSeoInput {
  title: string;
  description: string;
  canonicalPath: string;
  robots: EducationRobots;
  breadcrumbs: EducationBreadcrumb[];
  article?: EducationArticle;
  pageType?: "WebPage" | "CollectionPage";
}

const SEO_MARKER = "data-uvalert-education-seo";
const BRAND_NAME = "UVAlert 防曬晴報員";

export function getEducationPublicSiteUrl(): string {
  const configured = import.meta.env.VITE_PUBLIC_SITE_URL?.trim();
  return (configured || "http://localhost:4173").replace(/\/+$/, "");
}

export function toEducationAbsoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getEducationPublicSiteUrl()}${normalizedPath}`;
}

export function applyEducationSeo(input: EducationSeoInput): void {
  if (typeof document === "undefined") return;

  const canonicalUrl = toEducationAbsoluteUrl(input.canonicalPath);
  document.title = `${input.title}｜防曬衛教｜UVAlert`;
  setMeta("description", input.description);
  setMeta("robots", input.robots);
  setMeta("og:title", input.title, "property");
  setMeta("og:description", input.description, "property");
  setMeta("og:type", input.article === undefined ? "website" : "article", "property");
  setMeta("og:url", canonicalUrl, "property");
  setMeta("og:site_name", BRAND_NAME, "property");
  setMeta("twitter:card", "summary", "name");
  setMeta("twitter:title", input.title, "name");
  setMeta("twitter:description", input.description, "name");
  setCanonical(canonicalUrl);

  setJsonLd("page", {
    "@context": "https://schema.org",
    "@type": input.pageType ?? "WebPage",
    "@id": canonicalUrl,
    url: canonicalUrl,
    name: input.title,
    description: input.description,
    inLanguage: "zh-Hant",
    isPartOf: {
      "@type": "WebSite",
      name: BRAND_NAME,
      url: getEducationPublicSiteUrl()
    }
  });
  setJsonLd("breadcrumbs", createBreadcrumbSchema(input.breadcrumbs, canonicalUrl));

  if (input.article === undefined) {
    removeJsonLd("article");
  } else {
    setJsonLd("article", createArticleSchema(input.article, canonicalUrl));
  }
}

export function clearEducationSeo(): void {
  if (typeof document === "undefined") return;
  document.head
    .querySelectorAll(`[${SEO_MARKER}]`)
    .forEach((element) => element.remove());
  document.head
    .querySelectorAll(`link[rel="canonical"][${SEO_MARKER}]`)
    .forEach((element) => element.remove());
  // The SPA shell is private by default. Restore its crawler policy after
  // leaving a public education route instead of leaving `index,follow` behind.
  setMeta("robots", "noindex,follow");
}

function createArticleSchema(article: EducationArticle, canonicalUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonicalUrl}#article`,
    mainEntityOfPage: { "@type": "WebPage", "@id": canonicalUrl },
    headline: article.title,
    description: article.summary,
    inLanguage: "zh-Hant",
    dateModified: article.lastReviewed,
    isAccessibleForFree: true,
    author: { "@type": "Organization", name: BRAND_NAME },
    publisher: { "@type": "Organization", name: BRAND_NAME }
  };
}

function createBreadcrumbSchema(breadcrumbs: EducationBreadcrumb[], currentUrl: string) {
  const items = breadcrumbs.map((breadcrumb, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: breadcrumb.name,
    item: toEducationAbsoluteUrl(breadcrumb.path)
  }));
  if (items.length === 0 || items.at(-1)?.item !== currentUrl) {
    items.push({
      "@type": "ListItem",
      position: items.length + 1,
      name: document.title.replace(/｜防曬衛教｜UVAlert$/, ""),
      item: currentUrl
    });
  }
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items
  };
}

function setMeta(name: string, content: string, attribute: "name" | "property" = "name") {
  const selector = `meta[${attribute}="${CSS.escape(name)}"]`;
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (element === null) {
    element = document.createElement("meta");
    element.setAttribute(attribute, name);
    element.setAttribute(SEO_MARKER, "true");
    document.head.append(element);
  }
  element.content = content;
}

function setCanonical(url: string) {
  let element = document.head.querySelector<HTMLLinkElement>(
    `link[rel="canonical"][${SEO_MARKER}]`
  );
  if (element === null) {
    element = document.createElement("link");
    element.rel = "canonical";
    element.setAttribute(SEO_MARKER, "true");
    document.head.append(element);
  }
  element.href = url;
}

function setJsonLd(kind: "page" | "article" | "breadcrumbs", value: unknown) {
  let element = document.head.querySelector<HTMLScriptElement>(
    `script[type="application/ld+json"][data-uvalert-seo-kind="${kind}"]`
  );
  if (element === null) {
    element = document.createElement("script");
    element.type = "application/ld+json";
    element.dataset.uvalertEducationSeo = "true";
    element.dataset.uvalertSeoKind = kind;
    document.head.append(element);
  }
  element.textContent = JSON.stringify(value).replaceAll("<", "\\u003c");
}

function removeJsonLd(kind: "page" | "article" | "breadcrumbs") {
  document.head
    .querySelector(`script[type="application/ld+json"][data-uvalert-seo-kind="${kind}"]`)
    ?.remove();
}
