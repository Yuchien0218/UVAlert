import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Icon geometry echoes the 06 broadcast logo mark: solid dots plus
// capsule strokes (round caps/joins), no thin hairlines, no sharp corners.
// Grid is 24x24 with a ~2px optical margin so icons sit evenly beside text.
const GRID = 24;
const STROKE = 2.5;

const ACCENT = "#C1832E";
const INK = "currentColor";

// Two-color icons carry the logo's amber accent; status icons stay single-color
// so they can inherit the semantic status colors already in packages/ui.
const PALETTE_TWO_TONE = Object.freeze({ ink: INK, accent: ACCENT });
const PALETTE_MONO = Object.freeze({ ink: INK, accent: INK });

const line = (d, color) =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/>`;
const dot = (cx, cy, r, color) => `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
const ring = (cx, cy, r, color) =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${color}" stroke-width="${STROKE}"/>`;
const wedge = (d, color) => `<path d="${d}" fill="${color}"/>`;

// Remaining-time gauge, read like a battery or fuel gauge: full means there is
// still protection time, empty means it is due. Segment count carries the
// meaning, so the four states stay distinct in greyscale and at 16px.
// Dashes are deliberately absent from this system. Round caps close small gaps
// (rendering the stroke solid), larger gaps break the line into unrelated specks,
// and on a closed curve the dash phase lands asymmetrically and skews the shape.
// "Inactive" is carried by the diagonal slash instead, which also matches how
// the notification icons read.
// One definition for every "disabled" slash: 45 degrees, centred on 12,12,
// same length and weight wherever it appears. Icons previously carried two
// different slashes (53 degrees here, 45 degrees and much longer on the cloud).
const slash = (color) =>
  `<path d="M5.6 18.4L18.4 5.6" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="round"/>`;

// A bell is the plainest notification symbol there is. The logo spec bans bells,
// but that list constrains the brand mark only ("禁止方向" for the logo), not UI
// status icons. Dome + rim + clapper keeps it in the capsule/solid family.
// `splitRim` leaves an explicit, symmetric gap in the bell's rim for the
// "not finished yet" state. The gap is authored as two separate strokes rather
// than a dash pattern, so its position is controlled and cannot skew the shape.
const bell = (color, { splitRim = false } = {}) => {
  const dome = `<path d="M6.6 15.8V10.2A5.4 5.4 0 0 1 17.4 10.2V15.8Z" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round"/>`;
  // The gap is a notch, not a wide break: at 6.2 units it ate a third of the rim
  // and made this bell look narrower than the others even though both measure
  // the same width.
  const rim = splitRim
    ? `<path d="M4.8 15.8H10.4M13.6 15.8H19.2" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="round"/>`
    : `<path d="M4.8 15.8H19.2" fill="none" stroke="${color}" stroke-width="${STROKE}" stroke-linecap="round"/>`;
  return dome + rim;
};

// Segment sizing leaves an even 1.6 gutter between segments and the shell's
// inner edge on all four sides, so the row does not look crammed.
const GAUGE_SLOTS = [5.6, 10.4, 15.2];
const gauge = (filledSegments, color) => {
  const outline = `<rect x="2.75" y="8.2" width="18.5" height="7.6" rx="3.2" fill="none" stroke="${color}" stroke-width="${STROKE}"/>`;
  const segments = GAUGE_SLOTS.slice(0, filledSegments)
    .map((x) => `<rect x="${x}" y="10.6" width="3.2" height="2.8" rx="1.1" fill="${color}"/>`)
    .join("");
  return outline + segments;
};
const box = (x, y, w, h, r, color) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="none" stroke="${color}" stroke-width="${STROKE}"/>`;
const solidBox = (x, y, w, h, r, color) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${color}"/>`;

export const ICONS = Object.freeze([
  // ---- 下排導覽（雙色）----
  {
    id: "nav-reminder",
    group: "nav",
    label: "提醒",
    twoTone: true,
    // Sand sits in the upper chamber: every other amber accent in the set lives
    // in the top half, and "time still left" suits a nav icon better than
    // "time run out".
    body: (c) =>
      wedge("M7.9 5.1H16.1L12 11.7Z", c.accent) +
      line("M6.4 3.9H17.6L12 12L17.6 20.1H6.4L12 12Z", c.ink),
  },
  {
    id: "nav-gear",
    group: "nav",
    label: "裝備",
    twoTone: true,
    nudgeY: -0.3,
    body: (c) => solidBox(9.25, 2.75, 5.5, 3.75, 1.5, c.accent) + box(6.75, 7.5, 10.5, 13.25, 3.25, c.ink),
  },
  // A horizontal three-dot row measured 17.5x4.5 next to two ~13x19 shapes, so
  // it never read as part of the set. A 2x2 grid carries comparable mass and
  // also matches what the page actually is: a card grid.
  {
    id: "nav-more",
    group: "nav",
    label: "更多",
    twoTone: true,
    body: (c) =>
      dot(6.8, 6.8, 3.05, c.ink) +
      dot(17.2, 6.8, 3.05, c.accent) +
      dot(6.8, 17.2, 3.05, c.ink) +
      dot(17.2, 17.2, 3.05, c.ink),
  },

  // ---- 倒數與部位狀態（單色，繼承語意色）----
  // Fill amount encodes elapsed progress, so the four states stay distinct
  // in greyscale and for color-blind users.
  // Chosen over a filled ring, an hourglass and a depleting arc: the gauge kept
  // the four states furthest apart at 16px, and "full = time left, empty = act
  // now" needs no learning.
  {
    id: "state-tracking",
    group: "state",
    label: "追蹤中",
    body: (c) => gauge(3, c.ink),
  },
  {
    id: "state-soon",
    group: "state",
    label: "即將到期",
    body: (c) => gauge(1, c.ink),
  },
  {
    id: "state-due",
    group: "state",
    label: "已到期",
    body: (c) => gauge(0, c.ink),
  },
  {
    id: "state-untimed",
    group: "state",
    label: "未計時",
    body: (c) => gauge(0, c.ink) + slash(c.ink),
  },

  // ---- 通知與連線（單色）----
  // Radiating arcs read as a wifi signal, a corner badge looked lopsided, and a
  // card with an unread dot was too abstract to read as "notification" at all.
  {
    id: "state-notification-off",
    group: "state",
    label: "通知未開啟",
    nudgeY: -0.2,
    body: (c) => bell(c.ink) + dot(12, 19, 1.8, c.ink) + slash(c.ink),
  },
  {
    id: "state-notification-pending",
    group: "state",
    label: "背景通知尚未完成",
    // Broken rim: the bell is there but not yet whole. A hollow clapper was
    // tried first (at stroke 2.5 a ring that small just reads as a bigger solid
    // dot), then dropping the clapper entirely — but that left this too close
    // to the plain bell used for the settings card.
    nudgeY: -0.2,
    body: (c) => bell(c.ink, { splitRim: true }) + dot(12, 19, 1.8, c.ink),
  },
  {
    id: "state-offline",
    group: "state",
    label: "目前離線",
    nudgeY: -0.45,
    body: (c) =>
      // The cloud mass is not symmetric around 12,12 (it sits low and slightly
      // right), so the shared centred slash stuck out further on the top-right
      // than the bottom-left. This variant is pushed 1.4 further southwest so
      // both ends clear the cloud's edge by the same amount.
      line("M7.5 18A4.5 4.5 0 0 1 7.5 9A6 6 0 0 1 18.5 11A3.6 3.6 0 0 1 18 18Z", c.ink) +
      `<path d="M4.6 19.4L18.4 5.6" fill="none" stroke="${c.ink}" stroke-width="${STROKE}" stroke-linecap="round"/>`,
  },
  {
    id: "state-online",
    group: "state",
    label: "背景通知已恢復",
    // Paired with state-offline: the same cloud, with and without the slash.
    // An interior dot was tried first but read as an arbitrary blob, because
    // the cloud's own mass sits right of centre and the dot fought it.
    body: (c) => line("M7.5 18A4.5 4.5 0 0 1 7.5 9A6 6 0 0 1 18.5 11A3.6 3.6 0 0 1 18 18Z", c.ink),
  },

  // ---- 表單與資料狀態（單色）----
  {
    id: "state-success",
    group: "state",
    label: "已儲存",
    body: (c) => ring(12, 12, 8.5, c.ink) + line("M8 12.3L11 15.2L16 9.5", c.ink),
  },
  {
    id: "state-warning",
    group: "state",
    label: "警告",
    nudgeY: -0.65,
    // Explicitly arc-rounded corners rather than a sharp triangle: cutting the
    // apex back widens the usable interior, which is what actually fixes the
    // exclamation mark crowding the edges (about 1.5 clearance versus 0.6 on a
    // sharp triangle). It also matches the round caps and joins used everywhere
    // else in the set — the sharp triangle was the odd one out.
    body: (c) =>
      line("M10.3 5.1A2 2 0 0 1 13.7 5.1L20.9 18.6A2 2 0 0 1 19.2 21.5H4.8A2 2 0 0 1 3.1 18.6Z", c.ink) +
      line("M12 11V13.8", c.ink) +
      dot(12, 17.1, 1.15, c.ink),
  },
  {
    id: "state-unverified",
    group: "state",
    label: "標示尚未確認",
    // The bowl is a true 270-degree arc centred on x=12, so the hook sits
    // directly above the stem and the dot. The earlier version started the
    // bowl off-axis, which tilted the whole glyph inside the ring.
    body: (c) =>
      ring(12, 12, 8.5, c.ink) +
      line("M9.6 9.8A2.4 2.4 0 1 1 12 12.2V13.5", c.ink) +
      dot(12, 16.4, 1.25, c.ink),
  },

  // ---- 更多頁六張卡片（雙色）----
  {
    id: "more-notifications",
    group: "more",
    label: "通知設定",
    twoTone: true,
    nudgeY: -0.2,
    body: (c) => bell(c.ink) + dot(12, 19, 1.8, c.accent),
  },
  {
    id: "more-education",
    group: "more",
    label: "防曬衛教",
    twoTone: true,
    nudgeY: -0.45,
    // Amber is painted first so the ink structure sits on top of it: the spine
    // tucks under the book's edges instead of capping them.
    body: (c) =>
      line("M12 7.6V18.6", c.accent) +
      line("M12 7.6C10.2 6.6 7.8 6.2 4.8 6.2V17.2C7.8 17.2 10.2 17.6 12 18.6C13.8 17.6 16.2 17.2 19.2 17.2V6.2C16.2 6.2 13.8 6.6 12 7.6Z", c.ink),
  },
  {
    id: "more-data",
    group: "more",
    label: "本機資料與隱私",
    twoTone: true,
    // Amber is an accent laid over an ink structure, matching more-education's
    // ink book with an amber spine. Making amber the structure itself (the top
    // ellipse) broke that rule and read heavier than the rest of the set.
    body: (c) =>
      line("M5.25 12A6.75 2.9 0 0 0 18.75 12", c.accent) +
      `<ellipse cx="12" cy="7.25" rx="6.75" ry="2.9" fill="none" stroke="${c.ink}" stroke-width="${STROKE}"/>` +
      line("M5.25 7.25V16.75A6.75 2.9 0 0 0 18.75 16.75V7.25", c.ink),
  },
  {
    id: "more-feedback",
    group: "more",
    label: "問題回報",
    twoTone: true,
    nudgeY: -0.45,
    body: (c) =>
      line("M6 4.5H18A2.5 2.5 0 0 1 20.5 7V14.5A2.5 2.5 0 0 1 18 17H12.5L8 20.5V17H6A2.5 2.5 0 0 1 3.5 14.5V7A2.5 2.5 0 0 1 6 4.5Z", c.ink) +
      dot(12, 10.75, 2, c.accent),
  },
  {
    id: "more-install",
    group: "more",
    label: "安裝到主畫面",
    twoTone: true,
    nudgeY: -0.65,
    // The arrow used to run 10.5 units against a 6-unit tray, so it read as an
    // arrow with a tray attached. Shorter arrow, wider tray, closer to square.
    body: (c) =>
      line("M4.4 13.4V18.4A2.2 2.2 0 0 0 6.6 20.6H17.4A2.2 2.2 0 0 0 19.6 18.4V13.4", c.ink) +
      line("M12 4.8V11.9", c.accent) +
      line("M8.3 9.4L12 13.1L15.7 9.4", c.accent),
  },
  {
    id: "more-about",
    group: "more",
    label: "說明與關於",
    twoTone: true,
    body: (c) => ring(12, 12, 8.5, c.ink) + dot(12, 8, 1.5, c.accent) + line("M12 11.75V16.25", c.ink),
  },
]);

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

// Shapes whose rounded joins push their painted bounds off the geometric
// centre (a triangle's apex spreads more than its base) carry a nudgeY so the
// rendered ink lands on 12,12. Values come from measuring the rasterised icons.
export function renderIconBody(icon, palette) {
  const body = icon.body(palette);
  return icon.nudgeY ? `<g transform="translate(0 ${icon.nudgeY})">${body}</g>` : body;
}

export function renderIconSvg(icon) {
  const palette = icon.twoTone ? PALETTE_TWO_TONE : PALETTE_MONO;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" role="img" data-icon="${icon.id}" data-tone="${icon.twoTone ? "two" : "mono"}">
  <title>${escapeXml(icon.label)}</title>
  ${renderIconBody(icon, palette)}
</svg>
`;
}

export function renderPreviewBoardSvg(icons = ICONS) {
  const groups = [
    { key: "nav", title: "下排導覽（雙色）" },
    { key: "state", title: "狀態（單色，繼承語意色）" },
    { key: "more", title: "更多頁卡片（雙色）" },
  ];

  const columns = 6;
  const cellW = 168;
  const cellH = 150;
  let y = 96;
  let markup = "";

  for (const group of groups) {
    const members = icons.filter((icon) => icon.group === group.key);
    markup += `
  <text x="64" y="${y}" fill="#2E2925" font-family="'Noto Sans TC', sans-serif" font-size="24" font-weight="500" lang="zh-Hant-TW">${escapeXml(group.title)}</text>`;
    y += 40;

    members.forEach((icon, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 64 + col * cellW;
      const top = y + row * cellH;
      const palette = icon.twoTone ? { ink: "#33291F", accent: ACCENT } : { ink: "#33291F", accent: "#33291F" };

      markup += `
  <g data-icon-cell="${icon.id}" transform="translate(${x} ${top})">
    <g transform="scale(2)">${renderIconBody(icon, palette)}</g>
    <g transform="translate(0 60) scale(0.667)">${renderIconBody(icon, palette)}</g>
    <text x="30" y="72" fill="#6F5A54" font-family="'Noto Sans TC', sans-serif" font-size="13" lang="zh-Hant-TW">16px</text>
    <text x="0" y="100" fill="#2E2925" font-family="'Noto Sans TC', sans-serif" font-size="16" lang="zh-Hant-TW">${escapeXml(icon.label)}</text>
  </g>`;
    });

    y += Math.ceil(members.length / columns) * cellH + 24;
  }

  const height = y + 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 ${height}" role="img">
  <title>防曬晴報員 圖示系統核心組預覽</title>
  <desc>依導覽、狀態與更多頁卡片分組，每個圖示同時呈現 48px 與 16px。</desc>
  <rect width="1120" height="${height}" fill="#FAF5EC"/>
  <text x="64" y="56" fill="#2E2925" font-family="'Noto Serif TC', serif" font-size="30" font-weight="500" letter-spacing="0.5" lang="zh-Hant-TW">圖示系統核心組</text>${markup}
</svg>
`;
}

export function generateIcons(outputRoot = resolve("docs/design/icon-system")) {
  const root = resolve(outputRoot);
  const iconDirectory = resolve(root, "icons");
  mkdirSync(iconDirectory, { recursive: true });

  for (const icon of ICONS) {
    writeFileSync(resolve(iconDirectory, `${icon.id}.svg`), renderIconSvg(icon), "utf8");
  }

  writeFileSync(resolve(root, "icon-system-preview.svg"), renderPreviewBoardSvg(ICONS), "utf8");

  return { outputRoot: root, icons: ICONS.length };
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  const result = generateIcons(process.argv[2]);
  console.log(`Generated ${result.icons} icons in ${result.outputRoot}`);
}
