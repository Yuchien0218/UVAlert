import type { GearShareCardData } from "../../components/product/GearShareCard.vue";
import { ICONS } from "../../generated/icons.generated";
import { GEAR_CATEGORY_ICONS } from "../product/gearPresentation";
import {
  BRAND_LOCKUP_HEIGHT,
  BRAND_LOCKUP_MARKUP,
  BRAND_LOCKUP_WIDTH
} from "../../components/shell/brandLockupMarkup";
import { drawIcon, drawSvgMarkup } from "./drawSvg";
import { readShareCardColors, readSpacingScale } from "./shareCardTokens";

/**
 * 把分享卡畫成一張 PNG（計畫階段二）。
 *
 * **為什麼手繪 canvas 而不是 html2canvas／html-to-image。** 那類函式庫要
 * 新增一個 runtime 依賴（目前 `apps/web` 只有 4 個），而且對 CJK web font
 * 的處理一向不穩——它們把 DOM 轉成 SVG `foreignObject` 再轉點陣，字型必須
 * 內嵌成 base64，iOS Safari 還有已知問題。手繪零依賴、輸出可預期。
 *
 * 手繪的代價是「設計系統被抄進 JS」。用 `shareCardTokens` 從實際套用的 CSS
 * 讀值來抵銷：**這個檔案裡沒有任何色碼字面量**，`paintShareCard.test.ts`
 * 有一條守門擋著。
 *
 * **字型的已知限制。** serif subset 刻意不含使用者輸入（見
 * `tools/fonts/build-fonts.mjs`：「裝備名稱、備註不會進標題」），所以裝備
 * 名稱在圖上會 fallback 到系統黑體——**不同手機分享出來的字體會不一樣**。
 * 這是既有決策的延伸，不是這裡新引入的問題。
 */

/** IG 直式。寬度固定，高度不足時補到 1350，超過時讓它長。 */
const OUTPUT_WIDTH = 1080;
const MIN_OUTPUT_HEIGHT = 1350;

/**
 * 版面以 360px 的卡片寬度設計，再放大三倍輸出。
 *
 * 這樣所有間距都能直接沿用設計系統的檔位（`--space-*`）乘以 scale，不必
 * 為 canvas 另外訂一套數值。
 */
const SCALE = OUTPUT_WIDTH / 360;

const COLOR_TOKENS = [
  "--color-canvas",
  "--text-primary",
  "--text-body",
  "--text-secondary",
  "--border-subtle",
  "--color-hairline",
  "--surface-inverse",
  "--text-inverse",
  "--color-on-dark-soft",
  "--color-uvi-low",
  "--color-uvi-moderate",
  "--color-uvi-high",
  "--color-uvi-very-high",
  "--color-uvi-extreme"
] as const;

const SPACING_TOKENS = [
  "--space-1",
  "--space-2",
  "--space-3",
  "--space-4",
  "--space-6"
] as const;

type ColorMap = Record<(typeof COLOR_TOKENS)[number], string>;
type SpacingMap = Record<(typeof SPACING_TOKENS)[number], number>;

const UVI_COLOR_TOKEN = {
  low: "--color-uvi-low",
  moderate: "--color-uvi-moderate",
  high: "--color-uvi-high",
  very_high: "--color-uvi-very-high",
  extreme: "--color-uvi-extreme"
} as const;

const FORMULATION_LABELS = {
  lotion: "乳液",
  gel: "凝膠／水感",
  cream: "霜狀",
  spray: "噴霧",
  stick: "防曬棒"
} as const;

/**
 * 斷行。
 *
 * **逐字元而不是逐字（word）**：中文沒有空白，用 `split(" ")` 會整段不斷行
 * 而溢出畫布。拉丁字母因此可能在單字中間斷開——這張卡上的拉丁內容只有
 * 「SPF 50」「PA++++」「60ml」這類短標示，實務上不會遇到。
 */
function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  let current = "";
  for (const character of text) {
    const candidate = current + character;
    if (current !== "" && context.measureText(candidate).width > maxWidth) {
      lines.push(current);
      current = character;
    } else {
      current = candidate;
    }
  }
  if (current !== "") lines.push(current);
  return lines.length === 0 ? [""] : lines;
}

/**
 * 單行截斷，超出的部分補上刪節號。
 *
 * **為什麼需要它。** 深色卡上的名稱與規格值都只畫第一行——多行會把卡片
 * 高度變成另一個變數。原本的寫法是 `wrapText(...)[0]`，也就是**第二行以後
 * 直接消失，而且看不出來消失過**：讀圖的人會以為那就是完整的名稱。
 *
 * 2026-09-02 深色卡右上角加了品類圖示，名稱的可用寬度因此變窄，靜靜截斷
 * 的機率跟著變高——所以在同一次改動裡把它補上，而不是留給下一個人踩。
 */
function truncateToWidth(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string {
  if (context.measureText(text).width <= maxWidth) return text;

  const ellipsis = "…";
  let result = "";
  for (const character of text) {
    if (context.measureText(result + character + ellipsis).width > maxWidth) {
      break;
    }
    result += character;
  }
  return result === "" ? ellipsis : result + ellipsis;
}

interface StatEntry {
  label: string;
  value: string;
}

/** 深色卡上的規格欄位——與 `GearShareCard.vue` 的判斷邏輯逐條對應。 */
function buildStats(
  data: GearShareCardData,
  contextLabel: string | null,
  showPrice: boolean
): StatEntry[] {
  const sunscreen = data.sunscreen;
  if (sunscreen === null) return [];
  const snapshot = sunscreen.currentSnapshot;
  const stats: StatEntry[] = [];

  const label: string[] = [];
  if (snapshot.spf !== null) label.push(`SPF ${snapshot.spf}`);
  if (snapshot.paGrade !== null) label.push(snapshot.paGrade);
  if (label.length > 0) stats.push({ label: "標示", value: label.join(" ") });

  // 只印包裝真的有寫的分鐘數；120 是系統預設，不是標示。
  if (snapshot.reapplicationIntervalMinutes !== null) {
    stats.push({
      label: "補擦間隔",
      value: `${snapshot.reapplicationIntervalMinutes} 分`
    });
  }

  const water = snapshot.waterResistanceStatus;
  if (water === "40" || water === "80") {
    stats.push({ label: "耐水", value: `${water} 分鐘` });
  } else if (water === "not_water_resistant") {
    stats.push({ label: "耐水", value: "標示不耐水" });
  }

  if (sunscreen.volume !== null) {
    stats.push({ label: "容量", value: sunscreen.volume });
  }
  if (sunscreen.formulation !== null) {
    stats.push({
      label: "劑型",
      value: FORMULATION_LABELS[sunscreen.formulation]
    });
  }
  if (contextLabel !== null) {
    stats.push({ label: "情境", value: contextLabel });
  }

  /*
   * 價格（2026-09-02 使用者要求「防曬乳也要可以顯示價格」）。
   *
   * 跟其他裝備共用同一個 showPrice 開關、一樣預設不印——深色卡不是例外。
   * 放在最後，因為它是紀錄不是包裝標示。
   */
  if (showPrice && sunscreen.priceTwd !== null) {
    stats.push({ label: "價格", value: `NT$ ${sunscreen.priceTwd}` });
  }

  return stats;
}

export interface PaintShareCardInput {
  data: GearShareCardData;
  /** 卡片標題，由呼叫端決定（兩種模式的文字在元件裡定義）。 */
  title: string;
  /**
   * 卡片日期，畫在頁尾。
   *
   * 2026-09-02 起**兩種模式都有**（原本只有進行中提醒才有，而且在頁首），
   * 所以不再可為 null。
   */
  dateLabel: string;
  /** 風險等級的中文標籤。 */
  riskLabel: string | null;
  /** 情境的中文標籤；沒有進行中提醒時是 null。 */
  contextLabel: string | null;
  showPrice: boolean;
}

/**
 * 畫出分享卡並回傳 PNG blob。
 *
 * 呼叫前會等 `document.fonts.ready`——沒等的話 canvas 會用 fallback 字型
 * 畫，而畫面上的 DOM 已經換成 web font，兩者會長得不一樣。
 */
export async function paintShareCard(
  input: PaintShareCardInput
): Promise<Blob> {
  await document.fonts.ready;

  const colors = readShareCardColors(COLOR_TOKENS) as ColorMap;
  const space = readSpacingScale(SPACING_TOKENS, SCALE) as SpacingMap;

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  const context = canvas.getContext("2d");
  if (context === null) {
    throw new Error("這個瀏覽器不支援 canvas 2d，無法輸出圖片。");
  }

  const pad = space["--space-6"];
  const contentWidth = OUTPUT_WIDTH - pad * 2;
  const sans = `"Inter Subset", system-ui, sans-serif`;
  const serif = `"Noto Serif TC Subset", serif`;

  const metrics = { pad, contentWidth, space, colors, sans, serif };

  /*
   * **畫兩次，不另外寫一份 measure()。**
   *
   * 內容是變動的（裝備件數、有沒有 session、填了幾個規格），需要先知道高度
   * 才能決定畫布大小。第一版寫了獨立的 `measure()`，把每一段的字級與間距
   * 抄成第二份——**兩份版面數學一定會漂移**：之後任何人調 `paint` 裡的一個
   * 間距，`measure()` 不會跟著改，而畫面上不會立刻看得出來（只是圖片底部
   * 多或少一截空白），是那種會靜靜爛掉的重複。
   *
   * 改成用同一個 `paint` 跑兩次：第一次畫在丟棄用的畫布上只為了拿最終 y，
   * 第二次才畫真的。canvas 繪圖很便宜，多畫一次換掉一整份重複邏輯划算。
   *
   * （公平地說：改動前的 `measure()` 算出來的高度跟這個做法只差 12px，不是
   * 在修一個看得見的 bug——修的是那份重複本身。）
   *
   * 高度取 `max(1350, 實際需要)`：固定 1350 會在內容多時切掉最下面的安全
   * 註記，那是 DESIGN.md 第五節的「不可隱藏」項目，切掉比比例不標準嚴重。
   */
  const scratch = document.createElement("canvas");
  scratch.width = OUTPUT_WIDTH;
  scratch.height = MIN_OUTPUT_HEIGHT * 4;
  const scratchContext = scratch.getContext("2d");
  if (scratchContext === null) {
    throw new Error("這個瀏覽器不支援 canvas 2d，無法輸出圖片。");
  }
  const contentBottom = paint(scratchContext, input, {
    ...metrics,
    canvasHeight: scratch.height
  });

  canvas.height = Math.max(MIN_OUTPUT_HEIGHT, Math.ceil(contentBottom + pad));
  paint(context, input, { ...metrics, canvasHeight: canvas.height });

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob === null) reject(new Error("圖片產生失敗，請再試一次。"));
      else resolve(blob);
    }, "image/png");
  });
}

interface Metrics {
  pad: number;
  contentWidth: number;
  space: SpacingMap;
  sans: string;
  serif: string;
}

function paint(
  context: CanvasRenderingContext2D,
  input: PaintShareCardInput,
  options: Metrics & { colors: ColorMap; canvasHeight: number }
): number {
  const { pad, contentWidth, space, colors, sans, serif } = options;
  const { data } = input;

  context.fillStyle = colors["--color-canvas"];
  context.fillRect(0, 0, OUTPUT_WIDTH, options.canvasHeight);
  context.textBaseline = "top";

  let y = pad;

  /*
   * 品牌列。
   *
   * **2026-09-02：畫真的 lockup，不再只畫「防曬晴報員」四個字。** 這裡原本
   * 的註解寫「SVG 要先轉點陣，成本與收益不成比例」——那個判斷是錯的：
   * lockup 是純幾何（path／circle），`drawSvg` 用 Path2D 向量直接畫，
   * 不經過圖片、不需要 await、不會污染 canvas。理由完整版見 drawSvg.ts。
   *
   * 這同時修掉一個不一致：畫面上的 `GearShareCard.vue` 一直都用
   * `BrandLockup`，只有輸出的 PNG 退化成文字，所以「預覽」跟「存下來的圖」
   * 頂端長得不一樣。
   */
  const lockupHeight = 20 * SCALE;
  drawSvgMarkup(
    context,
    BRAND_LOCKUP_MARKUP,
    BRAND_LOCKUP_WIDTH,
    BRAND_LOCKUP_HEIGHT,
    { x: pad, y, size: lockupHeight, color: colors["--text-primary"] }
  );
  y += lockupHeight + space["--space-4"];

  // 標題
  context.font = `${28 * SCALE}px ${serif}`;
  context.fillStyle = colors["--text-primary"];
  for (const line of wrapText(context, input.title, contentWidth)) {
    context.fillText(line, pad, y);
    y += 34 * SCALE;
  }
  y += space["--space-3"];

  /*
   * 地區與 UV。**風險色只出現在這裡（淺色區）** ——五個風險色在深色卡上
   * 只有 2.42–2.93，全部過不了 AA。跟 `GearShareCard.vue` 的版面同一個約束。
   */
  if (input.riskLabel !== null && data.riskLevel !== null) {
    context.font = `${14 * SCALE}px ${sans}`;
    context.fillStyle = colors["--text-secondary"];
    let x = pad;
    const head = `${data.regionName} ｜ 今日 UV `;
    context.fillText(head, x, y + 4 * SCALE);
    x += context.measureText(head).width;

    context.font = `500 ${20 * SCALE}px ${sans}`;
    context.fillStyle = colors[UVI_COLOR_TOKEN[data.riskLevel]];
    const uvi = String(data.uvi);
    context.fillText(uvi, x, y);
    x += context.measureText(uvi).width + 6 * SCALE;

    context.font = `${14 * SCALE}px ${sans}`;
    context.fillStyle = colors["--text-secondary"];
    context.fillText(input.riskLabel, x, y + 4 * SCALE);
    y += 20 * SCALE + space["--space-4"];
  }

  // 深色卡
  if (data.sunscreen !== null) {
    const stats = buildStats(data, input.contextLabel, input.showPrice);
    const rows = Math.ceil(stats.length / 2);
    /*
     * 規格區上緣的分隔線（2026-09-02 使用者回報「線條不見了」）。
     *
     * 畫面上的卡一直有這條線（`.share-card__stats` 的 border-top），**畫布
     * 從來沒有畫過**——整個 painter 原本只有一次 stroke，在頁尾。這是預覽
     * 與輸出不一致的第二個案例，跟品牌列（原本退化成純文字）同一類：兩份
     * 各自獨立的繪圖程式碼，少寫一行不會有人發現，除非把圖存下來比對。
     *
     * 線佔的高度要算進 cardHeight，否則規格區會被卡片底緣切掉。
     */
    const cardHeight =
      space["--space-4"] * 2 +
      14 * SCALE +
      26 * SCALE +
      space["--space-3"] * 2 +
      SCALE +
      rows * (14 * SCALE + 22 * SCALE + space["--space-3"]);

    roundedRect(context, pad, y, contentWidth, cardHeight, 14 * SCALE);
    context.fillStyle = colors["--surface-inverse"];
    context.fill();

    let inner = y + space["--space-4"];
    const innerLeft = pad + space["--space-4"];
    const innerWidth = contentWidth - space["--space-4"] * 2;

    /*
     * 品類圖示當深色卡的視覺重心（2026-09-02 使用者要求）。
     *
     * 放右上角而不是名稱左邊：左邊已經有「主要防曬」這個 eyebrow 在帶路，
     * 再塞一個圖示會變成兩個起點。放右上角則是把整張卡的右上填起來——
     * 那裡本來是空的，而規格是兩欄網格、佔滿整寬，只有這兩列有餘裕。
     *
     * 用 `--color-on-dark-soft` 當 currentColor（深色上 8.86，同 eyebrow）。
     * 圖示裡的琥珀金會原樣保留，那是圖示配色系統的重點色（DESIGN.md 第八
     * 節），而且這是裝飾性圖形不是文字，不受 4.5:1 的約束。
     */
    const badgeSize = 32 * SCALE;
    drawIcon(context, ICONS[GEAR_CATEGORY_ICONS.sunscreen].body, {
      x: pad + contentWidth - space["--space-4"] - badgeSize,
      y: inner,
      size: badgeSize,
      color: colors["--color-on-dark-soft"]
    });

    /*
     * 文字欄要讓開圖示，否則長名稱會壓到它上面。只有 eyebrow 與名稱這兩
     * 列需要讓——底下的規格網格在圖示下方，可以用整個寬度。
     */
    const headWidth = innerWidth - badgeSize - space["--space-3"];

    context.font = `500 ${13 * SCALE}px ${sans}`;
    context.fillStyle = colors["--color-on-dark-soft"];
    context.fillText("主要防曬", innerLeft, inner);
    inner += 14 * SCALE + space["--space-1"];

    context.font = `${20 * SCALE}px ${sans}`;
    context.fillStyle = colors["--text-inverse"];
    context.fillText(
      truncateToWidth(context, data.sunscreen.displayName, headWidth),
      innerLeft,
      inner
    );
    inner += 26 * SCALE + space["--space-3"];

    context.strokeStyle = colors["--color-on-dark-soft"];
    context.lineWidth = SCALE;
    context.beginPath();
    // +0.5 讓 1px 的線落在像素中心，否則會糊成兩條半透明的線。
    context.moveTo(innerLeft, Math.round(inner) + 0.5);
    context.lineTo(innerLeft + innerWidth, Math.round(inner) + 0.5);
    context.stroke();
    inner += SCALE + space["--space-3"];

    const columnWidth = (innerWidth - space["--space-4"]) / 2;
    stats.forEach((stat, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);
      const x = innerLeft + column * (columnWidth + space["--space-4"]);
      const top = inner + row * (14 * SCALE + 22 * SCALE + space["--space-3"]);

      context.font = `${13 * SCALE}px ${sans}`;
      context.fillStyle = colors["--color-on-dark-soft"];
      context.fillText(stat.label, x, top);

      context.font = `500 ${17 * SCALE}px ${sans}`;
      context.fillStyle = colors["--text-inverse"];
      context.fillText(
        truncateToWidth(context, stat.value, columnWidth),
        x,
        top + 14 * SCALE + space["--space-1"]
      );
    });

    y += cardHeight + space["--space-4"];
  }

  // 其他裝備
  for (const item of data.gear) {
    const tileHeight = 56 * SCALE;
    roundedRect(context, pad, y, contentWidth, tileHeight, 8 * SCALE);
    context.fillStyle = colors["--color-hairline"];
    context.fill();

    /*
     * 品類圖示（2026-09-02 使用者要求）。
     *
     * 這是三個放置點裡最實用的一個：收到圖的人不用讀字就知道每一列是
     * 防曬乳、太陽眼鏡、衣物還是其他，圖被縮小時尤其有用。
     *
     * 垂直置中於整格，不是對齊第一行文字——一列有沒有第二行（尺寸／
     * 顏色）是變動的，對齊文字會讓有無細節的兩列圖示高度不一致。
     */
    const tileIcon = 24 * SCALE;
    drawIcon(context, ICONS[GEAR_CATEGORY_ICONS[item.gearCategory]].body, {
      x: pad + space["--space-3"],
      y: y + (tileHeight - tileIcon) / 2,
      size: tileIcon,
      color: colors["--text-body"]
    });
    const textLeft = pad + space["--space-3"] * 2 + tileIcon;

    const details: string[] = [];
    if (input.showPrice && item.priceTwd !== null) {
      details.push(`NT$ ${item.priceTwd}`);
    }
    if (item.size !== null) details.push(item.size);
    if (item.color !== null) details.push(item.color);

    /*
     * 名稱的垂直位置要看有沒有第二行。
     *
     * 原本固定在 y+10（等於「上緣對齊」），一列只有名稱時下面就空一截。
     * 沒有圖示時那只是有點鬆；加了垂直置中的圖示之後，兩者的中線對不上
     * 會直接看起來像壞掉。所以只有名稱時名稱也置中。
     */
    const nameTop =
      details.length > 0 ? y + 10 * SCALE : y + (tileHeight - 20 * SCALE) / 2;

    context.font = `500 ${17 * SCALE}px ${sans}`;
    context.fillStyle = colors["--text-primary"];
    context.fillText(item.displayName, textLeft, nameTop);

    if (details.length > 0) {
      context.font = `${13 * SCALE}px ${sans}`;
      context.fillStyle = colors["--text-body"];
      context.fillText(details.join("・"), textLeft, y + 34 * SCALE);
    }
    y += tileHeight + space["--space-2"];
  }

  /*
   * 頁尾。**2026-09-02 從安全註記改成日期**（使用者要求）。
   *
   * 原本那段在 DESIGN.md 第五節的「不可隱藏」清單裡，移除是使用者的裁決；
   * 理由與代價記在 `docs/decisions/2026-09-02-share-card-footer-date.md`。
   *
   * 日期同時也從頁首拿掉了——兩邊都留會變成一張卡上有兩個日期。
   */
  y += space["--space-3"];
  context.strokeStyle = colors["--border-subtle"];
  context.lineWidth = SCALE;
  context.beginPath();
  context.moveTo(pad, y);
  context.lineTo(OUTPUT_WIDTH - pad, y);
  context.stroke();
  y += space["--space-3"];

  context.font = `${12 * SCALE}px ${sans}`;
  context.fillStyle = colors["--text-secondary"];
  context.fillText(input.dateLabel, pad, y);
  y += 18 * SCALE;

  /* 回傳內容底部——呼叫端用它決定畫布高度，見 paintShareCard 的「畫兩次」。 */
  return y;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}
