import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const COLORS = Object.freeze({
  ivory: "#FAF5EC",
  terracotta: "#9F5E42",
  espresso: "#2E2925",
  amberGold: "#C1832E",
  warmInk: "#33291F",
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
      <circle cx="20" cy="32" r="6" fill="${COLORS.amberGold}" stroke="none"/>
      <path d="M29 24L39 18" stroke="${COLORS.warmInk}"/>
      <path d="M32 32H46" stroke="${COLORS.warmInk}"/>
      <path d="M29 40L38 45" stroke="${COLORS.amberGold}"/>
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
  if (!monochrome) return mark;
  return mark.replaceAll(COLORS.terracotta, COLORS.espresso).replaceAll(COLORS.amberGold, COLORS.warmInk);
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
  <text x="113" y="51" fill="${COLORS.espresso}" font-family="'Noto Serif TC', serif" font-size="30" font-weight="500" letter-spacing="0.5" lang="zh-Hant-TW">防曬晴報員</text>
  <text x="113" y="79" fill="${COLORS.terracotta}" font-family="Inter, sans-serif" font-size="15" font-weight="500" letter-spacing="2.2">UVAlert</text>
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
    <text x="279" y="72" fill="${COLORS.espresso}" font-family="'Noto Serif TC', serif" font-size="26" font-weight="500" letter-spacing="0.5" lang="zh-Hant-TW">防曬晴報員</text>
    <text x="279" y="98" fill="${COLORS.terracotta}" font-family="Inter, sans-serif" font-size="14" font-weight="500" letter-spacing="2">UVAlert</text>
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

// Selected direction only. Kept in sync with SAFE_AREA_RADIUS/CONCEPT_ID in
// verify-logo-concepts.mjs, which enforces this boundary programmatically.
const SAFE_AREA_CONCEPT_ID = "06-broadcast-mark";
const SAFE_AREA_RADIUS = 20;

export function renderSafeAreaGuideSvg(concept) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" data-concept="${concept.fileStem}">
  <title>${escapeXml(titleFor(concept, "App icon 安全邊界參考"))}</title>
  <desc>${escapeXml(concept.tagline)}，疊加圓形遮罩安全邊界參考線，確認圖形不會被裁切。</desc>
  <rect width="64" height="64" fill="${COLORS.ivory}"/>
  <circle cx="32" cy="32" r="${SAFE_AREA_RADIUS}" fill="none" stroke="${COLORS.espresso}" stroke-width="0.75" stroke-dasharray="2 2" opacity=".5"/>${renderMarkGeometry(concept)}
</svg>
`;
}

// Second-round production geometry for the selected concept only. Mirrors
// geometry.broadcastMark's coordinates exactly (dot + 3 rays) so the
// stroke-based comparison-board mark and the outlined production mark never
// drift apart; convert here instead of hand-typing separate fill paths.
const BROADCAST_MARK_OUTLINE = Object.freeze({
  dot: Object.freeze({ cx: 20, cy: 32, r: 6 }),
  rays: Object.freeze([
    Object.freeze({ x1: 29, y1: 24, x2: 39, y2: 18, colorKey: "warmInk" }),
    Object.freeze({ x1: 32, y1: 32, x2: 46, y2: 32, colorKey: "warmInk" }),
    Object.freeze({ x1: 29, y1: 40, x2: 38, y2: 45, colorKey: "amberGold" }),
  ]),
  rayHalfWidth: 2,
});

function round2(value) {
  return Math.round(value * 100) / 100;
}

// Converts a stroked round-cap line segment into an equivalent filled
// "stadium" path (two parallel edges + two semicircular end caps), so the
// final art has no dependency on stroke rendering at all.
function pillPath(x1, y1, x2, y2, radius) {
  const length = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / length;
  const uy = (y2 - y1) / length;
  const nx = -uy * radius;
  const ny = ux * radius;
  const a = [round2(x1 + nx), round2(y1 + ny)];
  const b = [round2(x2 + nx), round2(y2 + ny)];
  const c = [round2(x2 - nx), round2(y2 - ny)];
  const d = [round2(x1 - nx), round2(y1 - ny)];
  return `M${a[0]} ${a[1]}L${b[0]} ${b[1]}A${radius} ${radius} 0 0 0 ${c[0]} ${c[1]}L${d[0]} ${d[1]}A${radius} ${radius} 0 0 0 ${a[0]} ${a[1]}Z`;
}

function renderBroadcastMarkOutlineBody(colorFor) {
  const { dot, rays, rayHalfWidth } = BROADCAST_MARK_OUTLINE;
  const dotMarkup = `<circle cx="${dot.cx}" cy="${dot.cy}" r="${dot.r}" fill="${colorFor("amberGold")}"/>`;
  const rayMarkup = rays
    .map((ray) => `<path d="${pillPath(ray.x1, ray.y1, ray.x2, ray.y2, rayHalfWidth)}" fill="${colorFor(ray.colorKey)}"/>`)
    .join("");
  return `<g>${dotMarkup}${rayMarkup}</g>`;
}

export function renderFilledMarkSvg(concept) {
  const colorFor = (key) => COLORS[key];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" data-concept="${concept.fileStem}">
  <title>${escapeXml(titleFor(concept, "圖標（實心底色版）"))}</title>
  <desc>${escapeXml(concept.tagline)}，暖象牙實心背景，供 App icon／favicon 點陣輸出使用（含 maskable 安全邊界）。</desc>
  <rect width="64" height="64" fill="${COLORS.ivory}"/>${renderBroadcastMarkOutlineBody(colorFor)}
</svg>
`;
}

export function renderOutlinedMarkSvg(concept) {
  const colorFor = (key) => COLORS[key];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" data-concept="${concept.fileStem}">
  <title>${escapeXml(titleFor(concept, "圖標（正式向量輪廓）"))}</title>
  <desc>${escapeXml(concept.tagline)}，去除描邊改為填色輪廓，供 App icon／favicon 產線使用。</desc>${renderBroadcastMarkOutlineBody(colorFor)}
</svg>
`;
}

export function renderDarkSurfaceMarkSvg(concept) {
  const colorFor = (key) => (key === "warmInk" ? COLORS.ivory : COLORS[key]);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" data-concept="${concept.fileStem}">
  <title>${escapeXml(titleFor(concept, "圖標（深色底反白版）"))}</title>
  <desc>${escapeXml(concept.tagline)}，用於深咖啡等深色底面的反白版本。</desc>
  <rect width="64" height="64" fill="${COLORS.espresso}"/>${renderBroadcastMarkOutlineBody(colorFor)}
</svg>
`;
}

export function generateLogoConcepts(outputRoot = resolve("docs/design/logo-concepts")) {
  const root = resolve(outputRoot);
  const markDirectory = resolve(root, "marks");
  const lockupDirectory = resolve(root, "lockups");
  mkdirSync(markDirectory, { recursive: true });
  mkdirSync(lockupDirectory, { recursive: true });

  for (const concept of CONCEPTS) {
    writeFileSync(resolve(markDirectory, `${concept.fileStem}.svg`), renderMarkSvg(concept), "utf8");
    writeFileSync(resolve(lockupDirectory, `${concept.fileStem}.svg`), renderLockupSvg(concept), "utf8");
  }

  writeFileSync(resolve(root, "uvalert-logo-concepts-board.svg"), renderBoardSvg(CONCEPTS), "utf8");

  const safeAreaConcept = CONCEPTS.find((concept) => concept.fileStem === SAFE_AREA_CONCEPT_ID);
  if (safeAreaConcept) {
    writeFileSync(
      resolve(root, `${SAFE_AREA_CONCEPT_ID}-app-icon-safe-area.svg`),
      renderSafeAreaGuideSvg(safeAreaConcept),
      "utf8"
    );
    writeFileSync(resolve(root, `${SAFE_AREA_CONCEPT_ID}-outlined.svg`), renderOutlinedMarkSvg(safeAreaConcept), "utf8");
    writeFileSync(resolve(root, `${SAFE_AREA_CONCEPT_ID}-filled.svg`), renderFilledMarkSvg(safeAreaConcept), "utf8");
    writeFileSync(
      resolve(root, `${SAFE_AREA_CONCEPT_ID}-dark-surface.svg`),
      renderDarkSurfaceMarkSvg(safeAreaConcept),
      "utf8"
    );
  }

  return { outputRoot: root, marks: CONCEPTS.length, lockups: CONCEPTS.length, board: true };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  const result = generateLogoConcepts(process.argv[2]);
  console.log(`Generated ${result.marks} standalone marks in ${result.outputRoot}`);
}
