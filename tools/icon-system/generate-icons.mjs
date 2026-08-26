import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * 圖示管線：Illustrator 為幾何的真實來源，這支腳本負責正規化與組版。
 *
 * 為什麼是這個方向：圖示本來就該用視覺工具畫。之前這支腳本用 JS 函式
 * 產生路徑，結果是「跑一次就把手繪成果整批蓋掉」——2026-08-19 差點發生。
 * 現在幾何歸 Illustrator，這支腳本只做三件機器該做的事：
 *
 *   1. 正規化：把 Illustrator 匯出的格式改成可以直接 inline 進 Vue 的樣子
 *   2. 補 metadata：<title>、data-icon、data-tone、role
 *   3. 組預覽板：從 icons/ 讀檔重組，不再自己畫
 *
 * 正規化是必要的，不是潔癖。Illustrator 匯出有三個會在 App 裡出事的地方：
 *
 *   - `stroke: #000` 寫死墨色。設計系統要求 currentColor，否則狀態圖示
 *     無法繼承語意色，放在深色倒數面板上會變成看不見的黑塊。
 *   - CSS class（.cls-1、.cls-2）放在 <defs> 裡。同一頁 inline 兩個圖示
 *     時 class 會互相覆蓋，這是最難查的那種 bug。所以樣式一律內聯到元素上。
 *   - 沒有 <title>，螢幕閱讀器讀不出圖示語意。
 */

const GRID = 24;
const ACCENT = "#C1832E";
const INK = "currentColor";

/** Illustrator 會匯出這些墨色，全部視為「應該是 currentColor」。 */
const INK_LITERALS = [
  "#000",
  "#000000",
  "#33291f",
  "#33291F",
  "#2e2925",
  "#2E2925"
];

/**
 * 圖示登記表——只有 metadata，沒有幾何。
 *
 * `file: false` 代表已經規劃但還沒畫，腳本會列出來而不是報錯。
 */
export const ICONS = Object.freeze([
  // ---- 下排導覽（雙色）----
  { id: "nav-reminder", group: "nav", label: "提醒", twoTone: true },
  { id: "nav-gear", group: "nav", label: "裝備", twoTone: true },
  { id: "nav-more", group: "nav", label: "更多", twoTone: true },

  // ---- 狀態（單色，繼承語意色）----
  { id: "state-tracking", group: "state", label: "追蹤中" },
  { id: "state-soon", group: "state", label: "即將到期" },
  { id: "state-due", group: "state", label: "已到期" },
  { id: "state-untimed", group: "state", label: "未計時" },
  { id: "state-notification-off", group: "state", label: "通知未開啟" },
  {
    id: "state-notification-pending",
    group: "state",
    label: "背景通知尚未完成"
  },
  { id: "state-offline", group: "state", label: "目前離線" },
  { id: "state-online", group: "state", label: "背景通知已恢復" },
  { id: "state-success", group: "state", label: "已儲存" },
  { id: "state-warning", group: "state", label: "警告" },
  { id: "state-unverified", group: "state", label: "標示尚未確認" },

  // ---- 更多頁卡片（雙色）----
  { id: "more-notifications", group: "more", label: "通知設定", twoTone: true },
  { id: "more-education", group: "more", label: "防曬衛教", twoTone: true },
  { id: "more-data", group: "more", label: "本機資料與隱私", twoTone: true },
  { id: "more-feedback", group: "more", label: "問題回報", twoTone: true },
  { id: "more-install", group: "more", label: "安裝到主畫面", twoTone: true },
  { id: "more-about", group: "more", label: "說明與關於", twoTone: true },

  // ---- 設定情境（雙色）----
  { id: "context-outdoor", group: "context", label: "一般戶外", twoTone: true },
  {
    id: "context-exercise",
    group: "context",
    label: "戶外運動",
    twoTone: true
  },
  { id: "context-indoor", group: "context", label: "室內", twoTone: true },
  { id: "context-water", group: "context", label: "水中", twoTone: true },

  // ---- 事件回報（雙色）----
  { id: "event-heavy-sweat", group: "event", label: "大量流汗", twoTone: true },
  { id: "event-towel", group: "event", label: "擦拭", twoTone: true },
  { id: "event-friction", group: "event", label: "摩擦", twoTone: true },
  { id: "event-hand-wash", group: "event", label: "洗手", twoTone: true },

  // ---- 裝備品類（雙色）----
  { id: "gear-sunscreen", group: "gear", label: "防曬乳", twoTone: true },
  { id: "gear-clothing", group: "gear", label: "防曬衣物", twoTone: true },
  { id: "gear-sunglasses", group: "gear", label: "太陽眼鏡", twoTone: true },
  { id: "gear-hat", group: "gear", label: "帽子", twoTone: true },
  { id: "gear-umbrella", group: "gear", label: "陽傘", twoTone: true },
  { id: "gear-other", group: "gear", label: "其他裝備", twoTone: true },

  // ---- 衛教分類（雙色）----
  {
    id: "education-uv-basics",
    group: "education",
    label: "了解今天的 UV",
    twoTone: true
  },
  {
    id: "education-before-going-out",
    group: "education",
    label: "出門前準備",
    twoTone: true
  },
  {
    id: "education-reapply",
    group: "education",
    label: "外出中的補擦",
    twoTone: true
  },
  {
    id: "education-sweat-and-water",
    group: "education",
    label: "流汗或碰水後",
    twoTone: true
  },
  {
    id: "education-after-sun-care",
    group: "education",
    label: "回家後與皮膚照顧",
    twoTone: true
  },
  {
    id: "education-special-situations",
    group: "education",
    label: "特殊情況",
    twoTone: true
  },

  // ---- 工具型（單色，尚未繪製）----
  // 這批取代 @lucide/vue 的通用圖示。單色是刻意的：它們會出現在各種
  // 語意情境裡（按鈕、連結、狀態列），必須繼承外層顏色。
  { id: "tool-arrow-right", group: "tool", label: "前往" },
  { id: "tool-arrow-left", group: "tool", label: "返回" },
  { id: "tool-arrow-down", group: "tool", label: "向下" },
  { id: "tool-chevron-down", group: "tool", label: "展開" },
  { id: "tool-chevron-right", group: "tool", label: "進入" },
  { id: "tool-close", group: "tool", label: "關閉" },
  { id: "tool-plus", group: "tool", label: "新增" },
  { id: "tool-download", group: "tool", label: "匯出" },
  { id: "tool-refresh", group: "tool", label: "重新整理" },
  { id: "tool-reset", group: "tool", label: "重置" }
]);

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/**
 * 解析 Illustrator 的 <defs><style> 區塊。
 *
 * 格式是可預期的，不需要完整 CSS parser：規則以 } 分段，選擇器可以是
 * 逗號分隔的多個 class，同一個 class 可能出現在多條規則裡（後面的覆蓋前面的）。
 */
function parseStyleBlock(css) {
  const classProperties = new Map();

  for (const rule of css.split("}")) {
    const separator = rule.indexOf("{");
    if (separator === -1) continue;

    const selectors = rule.slice(0, separator).trim();
    const declarations = rule.slice(separator + 1).trim();
    if (!selectors || !declarations) continue;

    const properties = [];
    for (const declaration of declarations.split(";")) {
      const colon = declaration.indexOf(":");
      if (colon === -1) continue;
      const name = declaration.slice(0, colon).trim();
      const value = declaration.slice(colon + 1).trim();
      if (name && value) properties.push([name, value]);
    }
    if (properties.length === 0) continue;

    for (const selector of selectors.split(",")) {
      const className = selector.trim().replace(/^\./, "");
      if (!className) continue;
      const existing = classProperties.get(className) ?? new Map();
      for (const [name, value] of properties) existing.set(name, value);
      classProperties.set(className, existing);
    }
  }

  return classProperties;
}

/** SVG presentation attribute 不吃 px 單位；順手統一強調色大小寫。 */
function normalizePropertyValue(name, value) {
  let next = value.trim();
  if (/^[\d.]+px$/.test(next)) next = next.slice(0, -2);
  if (INK_LITERALS.includes(next)) return INK;
  if (next.toLowerCase() === ACCENT.toLowerCase()) return ACCENT;
  return next;
}

/**
 * 把 class 樣式內聯到元素上，然後移除 <defs> 與 class 屬性。
 *
 * 內聯是為了讓同一頁可以安全地 inline 多個圖示——Illustrator 每個檔案都從
 * .cls-1 開始編號，不內聯的話兩個圖示放在一起就會互相搶樣式。
 */
function inlineClassStyles(markup, classProperties) {
  return markup.replace(/class="([^"]+)"/g, (_match, classList) => {
    const merged = new Map();
    for (const className of classList.trim().split(/\s+/)) {
      const properties = classProperties.get(className);
      if (!properties) continue;
      for (const [name, value] of properties) merged.set(name, value);
    }
    if (merged.size === 0) return "";

    return [...merged]
      .map(
        ([name, value]) => `${name}="${normalizePropertyValue(name, value)}"`
      )
      .join(" ");
  });
}

/** 把散落在屬性上的寫死墨色換成 currentColor。 */
function normalizeInlineColors(markup) {
  let next = markup;
  for (const literal of INK_LITERALS) {
    next = next.replaceAll(`"${literal}"`, `"${INK}"`);
  }
  return next.replace(new RegExp(ACCENT, "gi"), ACCENT);
}

/**
 * 把一份 Illustrator（或既有）SVG 正規化成可以直接 inline 的樣子。
 */
export function normalizeIconSvg(source, icon) {
  let body = source;

  // 取出 <svg> 內容，順便丟掉 XML 宣告與 Illustrator 的圖層 id
  const openTag = body.match(/<svg\b[^>]*>/i);
  if (!openTag) throw new Error(`${icon.id}: 找不到 <svg> 標籤`);
  body = body.slice(openTag.index + openTag[0].length);
  const closeTag = body.lastIndexOf("</svg>");
  if (closeTag === -1) throw new Error(`${icon.id}: 找不到 </svg> 標籤`);
  body = body.slice(0, closeTag);

  // 舊的 <title> 由 metadata 重新注入，避免兩份不同步
  body = body.replace(/<title>[\s\S]*?<\/title>/gi, "");

  // <defs><style> 的 class 內聯掉，然後整個 defs 移除
  const styleBlock = body.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  if (styleBlock) {
    const classProperties = parseStyleBlock(styleBlock[1]);
    body = body.replace(/<defs>[\s\S]*?<\/defs>/gi, "");
    body = inlineClassStyles(body, classProperties);
  }

  body = normalizeInlineColors(body);

  // 收掉內聯後留下的多餘空白
  body = body
    .replace(/\s+>/g, ">")
    .replace(/\s{2,}/g, " ")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n  ");

  const tone = icon.twoTone ? "two" : "mono";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${GRID} ${GRID}" role="img" data-icon="${icon.id}" data-tone="${tone}">
  <title>${escapeXml(icon.label)}</title>
  ${body}
</svg>
`;
}

const GROUP_TITLES = Object.freeze({
  nav: "下排導覽（雙色）",
  state: "狀態（單色，繼承語意色）",
  more: "更多頁卡片（雙色）",
  context: "設定情境（雙色）",
  event: "事件回報（雙色）",
  gear: "裝備品類（雙色）",
  education: "衛教分類（雙色）",
  tool: "工具型（單色）"
});

export const CONFIRMED_GROUPS = Object.freeze(["nav", "state", "more"]);
export const PENDING_GROUPS = Object.freeze([
  "context",
  "event",
  "gear",
  "education",
  "tool"
]);

/** 從正規化後的 SVG 取出可以塞進預覽板的內容，並把 currentColor 換成實色。 */
function extractBoardBody(normalizedSvg, inkColor) {
  const inner = normalizedSvg
    .replace(/^[\s\S]*?<svg\b[^>]*>/i, "")
    .replace(/<\/svg>\s*$/i, "")
    .replace(/<title>[\s\S]*?<\/title>/gi, "")
    .trim();
  return inner.replaceAll(INK, inkColor);
}

export function renderPreviewBoardSvg(groupKeys, boardTitle, iconBodies) {
  const columns = 4;
  const cellW = 250;
  const cellH = 210;
  const boardWidth = 1120;
  let y = 108;
  let markup = "";

  for (const key of groupKeys) {
    const members = ICONS.filter(
      (icon) => icon.group === key && iconBodies.has(icon.id)
    );
    if (members.length === 0) continue;

    markup += `
  <text x="64" y="${y}" fill="#2E2925" font-family="'Noto Sans TC', sans-serif" font-size="25" font-weight="500" lang="zh-Hant-TW">${escapeXml(GROUP_TITLES[key])}</text>`;
    y += 46;

    members.forEach((icon, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      const x = 64 + col * cellW;
      const top = y + row * cellH;
      const body = iconBodies.get(icon.id);

      markup += `
  <g data-icon-cell="${icon.id}" transform="translate(${x} ${top})">
    <g transform="scale(4)">${body}</g>
    <g transform="translate(104 62) scale(1.5)">${body}</g>
    <g transform="translate(150 74) scale(0.75)">${body}</g>
    <text x="104" y="118" fill="#6F5A54" font-family="'Noto Sans TC', sans-serif" font-size="13" lang="zh-Hant-TW">36px / 18px</text>
    <text x="0" y="130" fill="#2E2925" font-family="'Noto Sans TC', sans-serif" font-size="17" lang="zh-Hant-TW">${escapeXml(icon.label)}</text>
  </g>`;
    });

    y += Math.ceil(members.length / columns) * cellH + 28;
  }

  const height = y + 36;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${boardWidth} ${height}" role="img">
  <title>防曬晴報員 ${escapeXml(boardTitle)}</title>
  <desc>每個圖示同時呈現 96px、36px 與 18px 三種尺寸。</desc>
  <rect width="${boardWidth}" height="${height}" fill="#FAF5EC"/>
  <text x="64" y="62" fill="#2E2925" font-family="'Noto Serif TC', serif" font-size="32" font-weight="500" letter-spacing="0.5" lang="zh-Hant-TW">${escapeXml(boardTitle)}</text>${markup}
</svg>
`;
}

/**
 * 從正規化後的 SVG 取出 <title> 之後、</svg> 之前的內容——也就是可以直接塞進
 * Vue 元件 <svg> 標籤內的部分（保留 currentColor 與 #C1832E，不轉實色）。
 */
function extractInlineBody(normalizedSvg) {
  return normalizedSvg
    .replace(/^[\s\S]*?<svg\b[^>]*>\s*/i, "")
    .replace(/\s*<\/svg>\s*$/i, "")
    .trim();
}

/**
 * 產生 apps/web 可以直接匯入的圖示註冊表。這是 apps/web/src/generated/ 底下
 * 唯一手動維護以外的圖示來源——和衛教內容、行政區資料同一套「docs/ 是來源、
 * generated/ 是產物」慣例，改來源、跑產生器，不要手改產出檔。
 */
function buildIconRegistry(iconBodies) {
  const entries = ICONS.filter((icon) => iconBodies.has(icon.id))
    .map((icon) => {
      const body = iconBodies.get(icon.id).replaceAll("`", "\\`");
      return `  "${icon.id}": {\n    viewBox: "0 0 ${GRID} ${GRID}",\n    title: ${JSON.stringify(icon.label)},\n    body: \`${body}\`\n  }`;
    })
    .join(",\n");

  return `// 自動產生，請勿手動修改。來源：docs/design/icon-system/icons/。
// 重新產生：node tools/icon-system/generate-icons.mjs

export interface IconEntry {
  viewBox: string;
  title: string;
  body: string;
}

// 用 as const（不是 Record<string, IconEntry>）讓 key 保持字面量聯集，
// 這樣 ICONS[name] 在 name: IconName 時才推得出一定存在，不必判斷 undefined。
export const ICONS = {
${entries}
} as const satisfies Record<string, IconEntry>;

export type IconName = keyof typeof ICONS;
`;
}

export function buildIcons(
  outputRoot = resolve("docs/design/icon-system"),
  registryPath = resolve("apps/web/src/generated/icons.generated.ts")
) {
  const root = resolve(outputRoot);
  const iconDirectory = resolve(root, "icons");

  const normalized = [];
  const missing = [];
  const iconBodies = new Map();
  const inlineBodies = new Map();

  for (const icon of ICONS) {
    const file = resolve(iconDirectory, `${icon.id}.svg`);
    if (!existsSync(file)) {
      missing.push(icon.id);
      continue;
    }

    const output = normalizeIconSvg(readFileSync(file, "utf8"), icon);
    writeFileSync(file, output, "utf8");
    normalized.push(icon.id);
    iconBodies.set(icon.id, extractBoardBody(output, "#33291F"));
    inlineBodies.set(icon.id, extractInlineBody(output));
  }

  writeFileSync(registryPath, buildIconRegistry(inlineBodies), "utf8");

  // 檔案存在但沒登記在 ICONS 裡——通常是改名或忘了刪的殘留
  const registered = new Set(ICONS.map((icon) => icon.id));
  const unregistered = readdirSync(iconDirectory)
    .filter((name) => name.endsWith(".svg"))
    .map((name) => name.replace(/\.svg$/, ""))
    .filter((id) => !registered.has(id));

  writeFileSync(
    resolve(root, "preview-confirmed.svg"),
    renderPreviewBoardSvg(CONFIRMED_GROUPS, "圖示系統 — 已確認", iconBodies),
    "utf8"
  );
  writeFileSync(
    resolve(root, "preview-pending-review.svg"),
    renderPreviewBoardSvg(PENDING_GROUPS, "圖示系統 — 待確認", iconBodies),
    "utf8"
  );

  return { outputRoot: root, normalized, missing, unregistered };
}

const isDirectRun =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);

if (isDirectRun) {
  const result = buildIcons(process.argv[2]);
  console.log(
    `已正規化 ${result.normalized.length} 個圖示 → ${result.outputRoot}`
  );

  if (result.missing.length > 0) {
    console.log(`\n尚未繪製（${result.missing.length}）：`);
    for (const id of result.missing) {
      const icon = ICONS.find((entry) => entry.id === id);
      console.log(`  ${id.padEnd(30)} ${icon.label}`);
    }
  }

  if (result.unregistered.length > 0) {
    console.log(`\n有檔案但未登記在 ICONS（${result.unregistered.length}）：`);
    for (const id of result.unregistered) console.log(`  ${id}`);
  }
}
