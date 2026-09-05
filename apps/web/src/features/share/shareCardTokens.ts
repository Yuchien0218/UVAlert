/**
 * 從實際套用的 CSS 讀出設計 token 的值，給 canvas 繪圖用。
 *
 * **為什麼不直接在 JS 裡寫一份色碼。** DESIGN.md 第十節記著這個 repo 的
 * token 只有三份真相（DESIGN.md → styles.css → app.css），而
 * 2026-08-26 的收斂清單把「token 多份真相、無同步機制」列為根因之一。
 * 手繪 canvas 如果自己抄一份色碼，就是第四份，而且沒有任何測試守著它。
 *
 * **為什麼用探針元素而不是 `getPropertyValue`。**
 * `getComputedStyle(root).getPropertyValue("--surface-inverse")` 拿到的是
 * 自訂屬性**宣告時的字串**，而 `--surface-inverse: var(--color-surface-dark)`
 * ——不同瀏覽器對這種轉指是否展開並不一致，拿到 `"var(--color-surface-dark)"`
 * 的話 canvas 只會畫出透明。
 *
 * 塞一個離屏元素、把 token 指派給 `color`，再讀 `getComputedStyle().color`，
 * 拿到的一定是瀏覽器解析完的 `rgb(...)`——這條路徑跟畫面上真正用的值是
 * 同一條。
 */

/** rem → px。canvas 沒有 rem 的概念，要自己換算。 */
function rootFontSizePx(): number {
  const size = Number.parseFloat(
    globalThis.getComputedStyle(document.documentElement).fontSize
  );
  return Number.isFinite(size) && size > 0 ? size : 16;
}

/**
 * 一次讀完所有需要的顏色。
 *
 * 探針只建立一次、用完就移除——每讀一個 token 都建立元素會觸發大量 reflow。
 */
export function readShareCardColors<Name extends string>(
  tokens: readonly Name[]
): Record<Name, string> {
  const probe = document.createElement("span");
  probe.setAttribute("aria-hidden", "true");
  // 不能用 display:none——那樣 getComputedStyle 仍然回得出值，但某些瀏覽器
  // 對未渲染元素的自訂屬性解析行為不一致。移出畫面比較保險。
  probe.style.cssText =
    "position:absolute;left:-9999px;top:0;width:0;height:0;overflow:hidden";
  document.body.append(probe);

  const result = {} as Record<Name, string>;
  try {
    for (const token of tokens) {
      probe.style.color = "";
      probe.style.color = `var(${token})`;
      result[token] = globalThis.getComputedStyle(probe).color;
    }
  } finally {
    probe.remove();
  }
  return result;
}

/**
 * 間距檔位換算成 canvas 的像素。
 *
 * 間距 token 的宣告值是純粹的 `1.5rem` 這種字面量（不像顏色會轉指），所以
 * 直接讀得到；但仍要自己乘上 root font size 與輸出倍率。
 */
export function readSpacingScale<Name extends string>(
  tokens: readonly Name[],
  scale: number
): Record<Name, number> {
  const root = globalThis.getComputedStyle(document.documentElement);
  const rem = rootFontSizePx();

  const result = {} as Record<Name, number>;
  for (const token of tokens) {
    const raw = root.getPropertyValue(token).trim();
    const value = Number.parseFloat(raw);
    const px = raw.endsWith("rem") ? value * rem : value;
    result[token] = Number.isFinite(px) ? Math.round(px * scale) : 0;
  }
  return result;
}
