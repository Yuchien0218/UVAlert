import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 每一處 `.app-card` 都必須有 padding 來源。
 *
 * `.app-card` 是**表面基元**：只提供邊框、圓角與底色，**沒有 padding**。
 * 內距由具體的卡片 class 提供（`.question-card`、`.install-card`、各頁
 * scoped 的 `.app-card` 覆寫等）。
 *
 * 這個分工不是隨意的——20 幾處用法已經由併用的 class 供應內距，若把
 * padding 加進 `.app-card`，那些會全部變成雙重內距。
 *
 * 但它有一個代價：**忘記補內距的用法會直接破圖，而且沒有任何東西會
 * 提醒**。2026-08-24 的 `51026aa` 就是這樣——`.product-label` 的樣式在
 * 重構時遺失，只剩 `.app-card`，內容從此貼著邊框，六天後才被發現。
 *
 * 這條測試就是那個提醒。
 */
const sourceRoot = "apps/web/src";
const sharedCss =
  readFileSync("apps/web/src/assets/app.css", "utf8") +
  readFileSync("packages/ui/src/styles.css", "utf8");

/**
 * 收集「規則本身含 padding」的 class 名稱。
 *
 * 群組選擇器（`.install-card,\n.limits { padding: … }`）要把每一個都算
 * 進去——第一版只抓到群組裡的第一個，誤報了三個檔案。
 */
function paddedClasses(rawCss: string): Set<string> {
  /*
   * 先去掉註解。說明文字裡常常提到 class 名稱（本檔的註解就寫了
   * app-card 與 product-label），不剝掉的話它們會被當成選擇器讀進來，
   * 讓守門對真正的破圖放行——第一版就是這樣漏掉的。
   */
  const css = rawCss
    .split("/*")
    .map((part, index) =>
      index === 0 ? part : part.slice(part.indexOf("*/") + 2)
    )
    .join("");
  const found = new Set<string>();
  for (const rule of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const [, selector, body] = rule;
    if (selector === undefined || body === undefined) continue;
    if (!/(^|[\s;])padding/.test(body)) continue;
    for (const name of selector.matchAll(/\.([a-zA-Z][\w-]*)/g))
      if (name[1] !== undefined) found.add(name[1]);
  }
  return found;
}

const sharedPadded = paddedClasses(sharedCss);

/**
 * 內距放在子區塊、不在卡片本身的例外。
 *
 * `.quick-protection` 與 `.context-group` 都是可收合卡片：觸發器是整列寬
 * 的按鈕，內距必須由觸發器與內容區各自負責，否則點擊範圍會縮進來。
 */
const paddingOnChildren = new Set(["quick-protection", "context-group"]);

function discoverVueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverVueFiles(entryPath);
    return entry.name.endsWith(".vue") ? [entryPath] : [];
  });
}

describe("每個 .app-card 都有內距來源", () => {
  for (const file of discoverVueFiles(sourceRoot).sort()) {
    const source = readFileSync(file, "utf8");
    const usages = [...source.matchAll(/class="([^"{}]*\bapp-card\b[^"]*)"/g)];
    if (usages.length === 0) continue;

    const styleStart = source.indexOf("<style");
    const localPadded = paddedClasses(
      styleStart < 0 ? "" : source.slice(styleStart)
    );

    it(`${file} 的 .app-card 都有內距`, () => {
      const naked = usages
        .map((match) => match[1] ?? "")
        .filter((classList) => {
          if (localPadded.has("app-card")) return false;
          return !classList
            .split(/\s+/)
            .filter(Boolean)
            .some(
              (name) =>
                name !== "app-card" &&
                (sharedPadded.has(name) ||
                  localPadded.has(name) ||
                  paddingOnChildren.has(name))
            );
        });

      expect(
        naked,
        `${file} 有 .app-card 沒有任何內距來源：` +
          `${naked.map((c) => `class="${c}"`).join("、")}。` +
          `.app-card 只提供邊框／圓角／底色，內距要由具體的卡片 class 給——` +
          `2026-08-24 的 .product-label 就是這樣破圖的。`
      ).toEqual([]);
    });
  }
});
