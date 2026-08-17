import { readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const ARTICLES_DIRECTORY = resolve(REPOSITORY_ROOT, "docs/education/articles");
const EDUCATION_README = resolve(REPOSITORY_ROOT, "docs/education/README.md");

export const CATEGORY_DEFINITIONS = Object.freeze([
  {
    slug: "uv-basics",
    title: "了解今天的 UV",
    description: "先讀懂 UV 指數、預報與一天中的曝曬變化。"
  },
  {
    slug: "before-going-out",
    title: "出門前準備",
    description: "挑選防曬乳、衣物與配件，出門前一次準備好。"
  },
  {
    slug: "reapply-sunscreen",
    title: "外出中的補擦",
    description: "把兩小時提醒和流汗、碰水等實際情境分開看。"
  },
  {
    slug: "sweat-and-water",
    title: "流汗或碰水後",
    description: "遇到游泳、淋雨、毛巾擦拭或海邊活動時怎麼處理。"
  },
  {
    slug: "after-sun-care",
    title: "回家後與皮膚照顧",
    description: "回家清潔、曬後照護與需要求助的警訊。"
  },
  {
    slug: "special-situations",
    title: "特殊情況",
    description: "敏感反應、孕期、嬰幼兒與藥物相關的防護界線。"
  }
]);

const CATEGORY_BY_SLUG = new Map(
  CATEGORY_DEFINITIONS.map((category) => [category.slug, category])
);

export function isPublishable(article) {
  return article.status === "published" && article.reviewStatus === "approved";
}

export function getPublicSiteUrl(environment = process.env) {
  const configured = environment.VITE_PUBLIC_SITE_URL?.trim();
  const value = configured || "http://localhost:4173";
  return value.replace(/\/+$/, "");
}

export async function readEducationContent() {
  const readme = await readFile(EDUCATION_README, "utf8");
  const order = readArticleOrder(readme);
  const fileNames = (await readdir(ARTICLES_DIRECTORY))
    .filter((fileName) => fileName.endsWith(".md"))
    .sort((left, right) => left.localeCompare(right));
  const parsedArticles = [];

  for (const fileName of fileNames) {
    const sourcePath = resolve(ARTICLES_DIRECTORY, fileName);
    const source = await readFile(sourcePath, "utf8");
    const article = parseArticle(source, sourcePath);
    const category = CATEGORY_BY_SLUG.get(article.category);

    if (category === undefined) {
      throw new Error(`Unknown education category ${article.category} in ${fileName}`);
    }
    if (article.slug !== fileName.replace(/\.md$/, "")) {
      throw new Error(`Article slug does not match file name in ${fileName}`);
    }

    parsedArticles.push({
      ...article,
      categoryTitle: article.categoryTitle || category.title,
      publishable: isPublishable(article),
      sourcePath
    });
  }

  const seenSlugs = new Set();
  for (const article of parsedArticles) {
    if (seenSlugs.has(article.slug)) {
      throw new Error(`Duplicate education article slug ${article.slug}`);
    }
    seenSlugs.add(article.slug);
    if (!order.has(article.slug)) {
      throw new Error(`Article ${article.slug} is missing from docs/education/README.md`);
    }
  }

  for (const slug of order.keys()) {
    if (!seenSlugs.has(slug)) {
      throw new Error(`README lists missing education article ${slug}`);
    }
  }

  parsedArticles.sort((left, right) => order.get(left.slug) - order.get(right.slug));

  return {
    categories: CATEGORY_DEFINITIONS,
    articles: parsedArticles
  };
}

export function renderMarkdownToHtml(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const output = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index] ?? "";

    if (line.trim() === "") {
      index += 1;
      continue;
    }

    const heading = /^(#{2,6})\s+(.+?)\s*$/.exec(line);
    if (heading !== null) {
      const level = heading[1].length;
      output.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*---\s*$/.test(line)) {
      output.push("<hr>");
      index += 1;
      continue;
    }

    if (/^\s*[-*+]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*[-*+]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*[-*+]\s+/, ""));
        index += 1;
      }
      output.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = [];
      while (index < lines.length && /^\s*\d+[.)]\s+/.test(lines[index] ?? "")) {
        items.push((lines[index] ?? "").replace(/^\s*\d+[.)]\s+/, ""));
        index += 1;
      }
      output.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    if (isTableStart(lines, index)) {
      const table = renderTable(lines, index);
      output.push(table.html);
      index = table.nextIndex;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoteLines = [];
      while (index < lines.length && /^>\s?/.test(lines[index] ?? "")) {
        quoteLines.push((lines[index] ?? "").replace(/^>\s?/, ""));
        index += 1;
      }
      output.push(`<blockquote>${renderInline(quoteLines.join(" "))}</blockquote>`);
      continue;
    }

    const paragraphLines = [line.trim()];
    index += 1;
    while (index < lines.length) {
      const next = lines[index] ?? "";
      if (
        next.trim() === "" ||
        /^(#{2,6})\s+/.test(next) ||
        /^\s*---\s*$/.test(next) ||
        /^\s*[-*+]\s+/.test(next) ||
        /^\s*\d+[.)]\s+/.test(next) ||
        /^>\s?/.test(next) ||
        isTableStart(lines, index)
      ) {
        break;
      }
      paragraphLines.push(next.trim());
      index += 1;
    }
    output.push(`<p>${renderInline(paragraphLines.join(" "))}</p>`);
  }

  return output.join("\n");
}

function parseArticle(source, sourcePath) {
  const normalized = source.replaceAll("\r\n", "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error(`Missing front matter in ${sourcePath}`);
  }
  const closingMarker = normalized.indexOf("\n---\n", 4);
  if (closingMarker < 0) {
    throw new Error(`Unclosed front matter in ${sourcePath}`);
  }

  const frontMatter = parseFrontMatter(normalized.slice(4, closingMarker));
  const bodyMarkdown = normalized.slice(closingMarker + "\n---\n".length).trim();
  const requiredFields = [
    "title",
    "slug",
    "category",
    "summary",
    "primaryQuestion",
    "status",
    "reviewStatus",
    "lastReviewed"
  ];
  for (const field of requiredFields) {
    if (typeof frontMatter[field] !== "string" || frontMatter[field].length === 0) {
      throw new Error(`Missing article field ${field} in ${sourcePath}`);
    }
  }

  return {
    title: frontMatter.title,
    slug: frontMatter.slug,
    category: frontMatter.category,
    categoryTitle: frontMatter.categoryTitle ?? "",
    summary: frontMatter.summary,
    primaryQuestion: frontMatter.primaryQuestion,
    status: frontMatter.status,
    reviewStatus: frontMatter.reviewStatus,
    lastReviewed: frontMatter.lastReviewed,
    bodyMarkdown,
    bodyHtml: renderMarkdownToHtml(bodyMarkdown)
  };
}

function parseFrontMatter(source) {
  const fields = {};
  for (const line of source.split("\n")) {
    if (line.trim() === "") continue;
    const match = /^([A-Za-z][A-Za-z0-9_]*)\s*:\s*(.*)$/.exec(line);
    if (match === null) {
      throw new Error(`Unsupported front matter line: ${line}`);
    }
    const value = match[2].trim();
    fields[match[1]] =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
        ? value.slice(1, -1)
        : value;
  }
  return fields;
}

function readArticleOrder(readme) {
  const order = new Map();
  const matches = readme.matchAll(/\|\s*[^|]+\s*\|\s*[^|]+\s*\|\s*`([^`]+)`\s*\|/g);
  for (const [index, match] of [...matches].entries()) {
    const slug = match[1];
    if (order.has(slug)) {
      throw new Error(`Duplicate article slug in README ${slug}`);
    }
    order.set(slug, index);
  }
  return order;
}

function isTableStart(lines, index) {
  const header = lines[index] ?? "";
  const separator = lines[index + 1] ?? "";
  return header.includes("|") && /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(separator);
}

function renderTable(lines, startIndex) {
  const headerCells = splitTableRow(lines[startIndex] ?? "");
  const separator = lines[startIndex + 1] ?? "";
  const columnCount = headerCells.length;
  const rows = [];
  let index = startIndex + 2;

  while (index < lines.length) {
    const line = lines[index] ?? "";
    if (line.trim() === "" || !line.includes("|")) break;
    const cells = splitTableRow(line);
    if (cells.length !== columnCount) break;
    rows.push(cells);
    index += 1;
  }

  const head = headerCells.map((cell) => `<th scope="col">${renderInline(cell)}</th>`).join("");
  const body = rows
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("");
  return {
    html: `<div class="education-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`,
    nextIndex: index
  };
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderInline(value) {
  const escaped = escapeHtml(value);
  const tokens = [];
  const protect = (html) => {
    const token = `\u0000${tokens.length}\u0000`;
    tokens.push(html);
    return token;
  };

  let result = escaped.replace(/`([^`]+)`/g, (_match, code) =>
    protect(`<code>${code}</code>`)
  );
  result = result.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    (_match, label, url) => protect(`<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`)
  );
  result = result.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  result = result.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  result = result.replace(/_([^_]+)_/g, "<em>$1</em>");
  return result.replace(/\u0000(\d+)\u0000/g, (_match, tokenIndex) => tokens[Number(tokenIndex)] ?? "");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
