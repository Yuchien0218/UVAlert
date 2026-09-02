/**
 * 把設計系統的 SVG 幾何直接畫到 canvas 上。
 *
 * **為什麼不是「轉點陣」。** `paintShareCard.ts` 原本有一句註解說「SVG 要
 * 先轉點陣，成本與收益不成比例」，所以品牌列退化成純文字。那句話的前提
 * 只有在圖是**圖片**（`<img>`／`drawImage`／外部檔案）時才成立——需要
 * 載入、要等 onload、跨來源還會污染 canvas 讓 `toBlob` 直接失敗。
 *
 * 但我們的圖示與 logo 不是圖片，是**純幾何**：`icons.generated.ts` 與
 * `brandLockupMarkup.ts` 裡就只有 `<path d>`、`<circle>`、`<rect>`。Canvas
 * 對這三種都有原生對應（`Path2D`、`arc`、`roundRect`），所以可以向量直接
 * 畫——同步、零外部資源、不污染 canvas，而且 3 倍輸出下邊緣仍然銳利。
 *
 * **刻意只支援用得到的子集。** 這不是一個 SVG 渲染器，是一個「畫我們自己
 * 的圖示」的函式。沒有 `<polygon>`、沒有 `<use>`、沒有漸層、沒有 CSS。
 * 遇到不認得的元素就跳過而不是拋錯——漏畫一個裝飾圖示，比讓整個「儲存
 * 圖片」壞掉好。真正的防線是 `drawSvg.test.ts` 逐一檢查登記表裡每個圖示
 * 都畫得出東西，新圖示用到新語法時那條測試會紅。
 *
 * transform 只支援 `translate(x y)`，因為登記表裡只有 `nav-gear` 用到。
 */

/** 圖示畫布是 24×24（`generate-icons.mjs` 的 GRID）。 */
const ICON_GRID = 24;

export interface DrawSvgOptions {
  /** 左上角座標。 */
  x: number;
  y: number;
  /** 畫出來的邊長（正方形圖示）或高度（見 `drawSvgMarkup` 的 viewBox）。 */
  size: number;
  /** `currentColor` 要換成的顏色。 */
  color: string;
}

/**
 * 畫一個 24×24 的圖示。
 *
 * `body` 就是 `ICONS[name].body`——含 `<title>`，會被忽略（canvas 沒有可及
 * 性樹，圖示在圖片裡一律是裝飾性的，語意由旁邊的文字承擔）。
 */
export function drawIcon(
  context: CanvasRenderingContext2D,
  body: string,
  options: DrawSvgOptions
): void {
  drawSvgMarkup(context, body, ICON_GRID, ICON_GRID, options);
}

/**
 * 畫任意 viewBox 的一段 SVG 內容。
 *
 * 等比縮放並置中對齊（等同 `preserveAspectRatio="xMidYMid meet"` 的預設），
 * `size` 是**高度**——品牌 lockup 是橫式的，用高度控制才符合它在 DOM 那邊
 * 的用法（`height` ＋ `width: auto`）。
 */
export function drawSvgMarkup(
  context: CanvasRenderingContext2D,
  markup: string,
  viewBoxWidth: number,
  viewBoxHeight: number,
  options: DrawSvgOptions
): void {
  const root = parseSvgFragment(markup);
  if (root === null) return;

  const scale = options.size / viewBoxHeight;

  context.save();
  context.translate(options.x, options.y);
  context.scale(scale, scale);
  paintNode(context, root, options.color);
  context.restore();

  // viewBoxWidth 只用來給呼叫端算寬度（見 svgWidthFor），這裡不需要它。
  void viewBoxWidth;
}

/** 等比縮放後這段 SVG 會佔多寬。呼叫端用它排版（例如把日期靠右）。 */
export function svgWidthFor(
  viewBoxWidth: number,
  viewBoxHeight: number,
  height: number
): number {
  return (viewBoxWidth / viewBoxHeight) * height;
}

/**
 * 用 DOMParser 而不是正規表示式。
 *
 * path 的 `d` 裡有大量逗號、括號與負號，用 regex 抓屬性遲早會在某個
 * 圖示上剖錯，而且錯法是「安靜地畫歪」。DOMParser 在瀏覽器與測試用的
 * happy-dom 都有。
 */
function parseSvgFragment(markup: string): Element | null {
  const parser = new DOMParser();
  const document_ = parser.parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`,
    "image/svg+xml"
  );
  const root = document_.documentElement;
  // 剖析失敗時 DOMParser 回的是 <parsererror> 而不是丟例外。
  if (root === null || root.querySelector("parsererror") !== null) return null;
  return root;
}

function paintNode(
  context: CanvasRenderingContext2D,
  node: Element,
  color: string
): void {
  for (const child of Array.from(node.children)) {
    const tag = child.tagName.toLowerCase();

    if (tag === "title" || tag === "desc") continue;

    if (tag === "g") {
      context.save();
      applyTranslate(context, child.getAttribute("transform"));
      paintNode(context, child, color);
      context.restore();
      continue;
    }

    const path = buildPath(child, tag);
    if (path === null) continue;
    strokeAndFill(context, child, path, color);
  }
}

function buildPath(element: Element, tag: string): Path2D | null {
  if (tag === "path") {
    const d = element.getAttribute("d");
    return d === null || d === "" ? null : new Path2D(d);
  }

  if (tag === "circle") {
    const path = new Path2D();
    path.arc(
      numberAttribute(element, "cx"),
      numberAttribute(element, "cy"),
      numberAttribute(element, "r"),
      0,
      Math.PI * 2
    );
    return path;
  }

  if (tag === "rect") {
    const path = new Path2D();
    const width = numberAttribute(element, "width");
    const height = numberAttribute(element, "height");
    // rx 沒寫時 ry 會接手（SVG 規則），反之亦然。
    const rx = element.getAttribute("rx") ?? element.getAttribute("ry");
    path.roundRect(
      numberAttribute(element, "x"),
      numberAttribute(element, "y"),
      width,
      height,
      rx === null ? 0 : Number(rx)
    );
    return path;
  }

  return null;
}

/**
 * 上色。
 *
 * 順序是先 fill 後 stroke，跟 SVG 的繪製模型一致——描邊會蓋在填色上，
 * 反過來會讓雙色圖示的邊被填色吃掉一半線寬。
 */
function strokeAndFill(
  context: CanvasRenderingContext2D,
  element: Element,
  path: Path2D,
  color: string
): void {
  // SVG 的 fill 預設是黑色（不是 none），我們的圖示靠 fill="none" 明確關掉。
  const fill = element.getAttribute("fill") ?? "currentColor";
  if (fill !== "none") {
    context.fillStyle = resolveColor(fill, color);
    context.fill(path);
  }

  const stroke = element.getAttribute("stroke");
  if (stroke !== null && stroke !== "none") {
    context.strokeStyle = resolveColor(stroke, color);
    context.lineWidth = Number(element.getAttribute("stroke-width") ?? 1);
    context.lineCap =
      (element.getAttribute("stroke-linecap") as CanvasLineCap | null) ??
      "butt";
    context.lineJoin =
      (element.getAttribute("stroke-linejoin") as CanvasLineJoin | null) ??
      "miter";
    context.stroke(path);
  }
}

function resolveColor(value: string, currentColor: string): string {
  return value === "currentColor" ? currentColor : value;
}

function applyTranslate(
  context: CanvasRenderingContext2D,
  transform: string | null
): void {
  if (transform === null) return;
  const match = /translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)/.exec(transform);
  if (match === null) return;
  context.translate(Number(match[1]), Number(match[2]));
}

function numberAttribute(element: Element, name: string): number {
  const raw = element.getAttribute(name);
  return raw === null ? 0 : Number(raw);
}
