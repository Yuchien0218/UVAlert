import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COLORS = Object.freeze({
  ivory: "#FAF5EC",
  terracotta: "#9F5E42",
  espresso: "#2E2925",
});

const geometry = {
  morningLine: () => `
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
      <path d="M14 43H50" stroke="${COLORS.espresso}"/>
      <path d="M21 43A11 11 0 0 1 43 43" stroke="${COLORS.terracotta}"/>
      <path d="M32 17V22M18.5 24.5L22 28M45.5 24.5L42 28" stroke="${COLORS.terracotta}"/>
    </g>`,
  sunWindow: () => `
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
      <path d="M17 46V18H46V29" stroke="${COLORS.espresso}"/>
      <path d="M46 38V46H31" stroke="${COLORS.espresso}"/>
      <circle cx="36" cy="31" r="8" stroke="${COLORS.terracotta}"/>
    </g>`,
  reapplyRing: () => `
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
      <path d="M46.8 45.4A20 20 0 1 1 49.7 22.6" stroke="${COLORS.espresso}"/>
      <circle cx="32" cy="32" r="8" stroke="${COLORS.terracotta}"/>
      <circle cx="50" cy="20" r="3" fill="${COLORS.terracotta}" stroke="none"/>
    </g>`,
  sunlightNodes: () => `
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
      <path d="M17 39C21 25 36 20 47 27" stroke="${COLORS.terracotta}"/>
      <path d="M18 45C29 52 44 48 48 36" stroke="${COLORS.espresso}"/>
      <circle cx="16" cy="41" r="5" fill="${COLORS.terracotta}" stroke="none"/>
      <circle cx="49" cy="32" r="4" fill="${COLORS.espresso}" stroke="none"/>
    </g>`,
  weatherBulletinFrame: () => `
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
      <path d="M17 42V18H41" stroke="${COLORS.espresso}"/>
      <circle cx="39" cy="30" r="9" stroke="${COLORS.terracotta}"/>
      <path d="M25 48H49" stroke="${COLORS.terracotta}"/>
    </g>`,
  broadcastMark: () => `
    <g fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="4">
      <circle cx="18" cy="22" r="6" fill="${COLORS.terracotta}" stroke="none"/>
      <path d="M30 22H49" stroke="${COLORS.espresso}"/>
      <path d="M23 34H45" stroke="${COLORS.espresso}"/>
      <path d="M17 46H37" stroke="${COLORS.terracotta}"/>
    </g>`,
};

export const CONCEPTS = Object.freeze([
  Object.freeze({ id: "01-morning-line", fileStem: "01-morning-line", chineseName: "晨線", tagline: "每天查看晴報的溫暖起點", mark: geometry.morningLine }),
  Object.freeze({ id: "02-sun-window", fileStem: "02-sun-window", chineseName: "晴窗", tagline: "打開一扇生活化的陽光情報窗", mark: geometry.sunWindow }),
  Object.freeze({ id: "03-reapply-ring", fileStem: "03-reapply-ring", chineseName: "補擦環", tagline: "用未完的節奏記住下一次補擦", mark: geometry.reapplyRing }),
  Object.freeze({ id: "04-sunlight-nodes", fileStem: "04-sunlight-nodes", chineseName: "日照節點", tagline: "在日照變化間輕柔串起補擦節奏", mark: geometry.sunlightNodes }),
  Object.freeze({ id: "05-weather-bulletin-frame", fileStem: "05-weather-bulletin-frame", chineseName: "晴報框", tagline: "像每日生活快報一樣整理陽光資訊", mark: geometry.weatherBulletinFrame }),
  Object.freeze({ id: "06-broadcast-mark", fileStem: "06-broadcast-mark", chineseName: "播報印記", tagline: "把陽光提醒濃縮成清楚的短報", mark: geometry.broadcastMark }),
]);

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function titleFor(concept, asset) {
  return `防曬晴報員 ${concept.chineseName}${asset}`;
}

function renderMarkGeometry(concept, { monochrome = false } = {}) {
  const mark = concept.mark();
  return monochrome ? mark.replaceAll(COLORS.terracotta, COLORS.espresso) : mark;
}

export function renderMarkSvg(concept) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" data-concept="${concept.fileStem}">
  <title>${escapeXml(titleFor(concept, "圖標"))}</title>
  <desc>${escapeXml(concept.tagline)}，以簡潔幾何呈現陽光與提醒節奏。</desc>${renderMarkGeometry(concept)}
</svg>
`;
}

export function renderLockupSvg(concept) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 520 112" role="img" data-concept="${concept.fileStem}">
  <title>${escapeXml(titleFor(concept, "橫式標誌"))}</title>
  <desc>${escapeXml(concept.tagline)}，包含獨立圖標、中文品牌名稱與英文副標。</desc>
  <g transform="translate(24 24)">${renderMarkGeometry(concept)}</g>
  <text x="112" y="51" fill="${COLORS.espresso}" font-family="'Noto Serif TC', serif" font-size="30" font-weight="500" lang="zh-Hant-TW">防曬晴報員</text>
  <text x="114" y="79" fill="${COLORS.terracotta}" font-family="Inter, sans-serif" font-size="15" font-weight="500" letter-spacing="1.8">UVAlert</text>
</svg>
`;
}

export function renderBoardSvg(concepts = CONCEPTS) {
  const cells = concepts.map((concept, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 64 + column * 512;
    const y = 112 + row * 552;

    return `
  <g data-concept="${concept.fileStem}" transform="translate(${x} ${y})">
    <g transform="translate(24 40) scale(2)">${renderMarkGeometry(concept)}</g>
    <g transform="translate(190 44)">${renderMarkGeometry(concept)}</g>
    <text x="278" y="72" fill="${COLORS.espresso}" font-family="'Noto Serif TC', serif" font-size="26" font-weight="500" lang="zh-Hant-TW">防曬晴報員</text>
    <text x="280" y="98" fill="${COLORS.terracotta}" font-family="Inter, sans-serif" font-size="14" font-weight="500" letter-spacing="1.6">UVAlert</text>
    <g data-preview-size="32" transform="translate(32 218) scale(.5)">${renderMarkGeometry(concept, { monochrome: true })}</g>
    <text x="88" y="240" fill="${COLORS.espresso}" font-family="'Noto Serif TC', serif" font-size="23" font-weight="500" lang="zh-Hant-TW">${escapeXml(concept.chineseName)}</text>
    <text x="32" y="286" fill="${COLORS.espresso}" font-family="'Noto Serif TC', serif" font-size="17" font-weight="500" lang="zh-Hant-TW">${escapeXml(concept.tagline)}</text>
    <path d="M32 328H448" stroke="${COLORS.espresso}" stroke-width="2" opacity=".24"/>
  </g>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1240" role="img">
  <title>防曬晴報員 UVAlert 六款 Logo 概念比較板</title>
  <desc>依序呈現晨線、晴窗、補擦環、日照節點、晴報框與播報印記六款概念。</desc>
  <rect width="1600" height="1240" fill="${COLORS.ivory}"/>${cells}
</svg>
`;
}

export function generateLogoConcepts(outputRoot = resolve("docs/design/logo-concepts")) {
  const markDirectory = resolve(outputRoot, "marks");
  mkdirSync(markDirectory, { recursive: true });

  for (const concept of CONCEPTS) {
    writeFileSync(resolve(markDirectory, `${concept.fileStem}.svg`), renderMarkSvg(concept), "utf8");
  }

  return { outputRoot: resolve(outputRoot), marks: CONCEPTS.length };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  const result = generateLogoConcepts(process.argv[2]);
  console.log(`Generated ${result.marks} standalone marks in ${result.outputRoot}`);
}
