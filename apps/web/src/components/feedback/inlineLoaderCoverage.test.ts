import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 按鈕的忙碌狀態一律配 `InlineLoader`（2026-09-05）。
 *
 * `InlineLoader` 是播報印記動畫的直線版，**專門為按鈕內的忙碌狀態做的**
 * ——它的顏色用 `currentColor`，元件註解明說是「因為它會出現在主要按鈕
 * （深底淺字）與次要按鈕（淺底深字）兩種情境」。也就是說，設計時就預期
 * 會用在多處。
 *
 * 但盤點時它**只接了 `SetupPage` 一處**，另外 14 顆按鈕在用純文字「…」。
 * 這是同一個坑的第三次：
 *
 *   `.section-heading`      鎖在單一頁面的 scoped style（2026-09-04）
 *   `IconLead size="hero"`  檔位說是給空狀態的，空狀態沒用它（2026-09-05）
 *   `InlineLoader`          為多處按鈕設計，只接一處（這一條）
 *
 * 三次都是「工具做好了、規則也寫了，但沒接上」。所以這次補守門。
 */

const SRC = "apps/web/src";

/** 掃原始碼前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "generated") vueFiles(path, out);
    } else if (entry.endsWith(".vue")) {
      out.push(path.split("\\").join("/"));
    }
  }
  return out;
}

/**
 * 「忙碌文字」的形狀：按鈕內出現以刪節號收尾的字串（「儲存中…」）。
 *
 * 實測這個 pattern 在全站抓到 15 顆，**沒有誤抓**——刪節號在這個 repo 就
 * 只用在這個用途上。比對的是完整的 `…"`（字串結尾），不是單獨的刪節號，
 * 所以句子中間出現刪節號的內文不會被算進來。
 */
const BUSY_BUTTON = /<button[\s\S]*?<\/button>/g;
const BUSY_TEXT = /"[^"]*…"/;

interface BusyButton {
  file: string;
  label: string;
  hasLoader: boolean;
}

function busyButtons(): BusyButton[] {
  const found: BusyButton[] = [];
  for (const file of vueFiles(SRC)) {
    const code = strip(readFileSync(file, "utf8"));
    for (const [button] of code.matchAll(BUSY_BUTTON)) {
      if (!BUSY_TEXT.test(button)) continue;
      found.push({
        file,
        label: BUSY_TEXT.exec(button)?.[0] ?? "",
        hasLoader: button.includes("<InlineLoader")
      });
    }
  }
  return found;
}

/**
 * **唯一的例外，而且有具體理由。**
 *
 * `GearSharePage` 的「儲存圖片」左邊已經有一顆 20px 的 `more-install`
 * 圖示。2026-09-02 的註解寫著「產生中時圖示不換掉：文字已經從『儲存圖片』
 * 變成『產生中…』，圖示跟著抽換只會讓按鈕在點下去的瞬間跳一下」。
 *
 * 再塞一顆 loader 進去會變成「圖示 ＋ loader ＋ 文字」，而且正好製造那段
 * 註解想避免的寬度跳動。
 */
const EXEMPT = new Set(["apps/web/src/pages/GearSharePage.vue"]);

describe("按鈕的忙碌狀態要有 InlineLoader", () => {
  const buttons = busyButtons();

  /* 走訪壞掉時不要靜默通過。 */
  it("有掃到帶忙碌文字的按鈕", () => {
    expect(buttons.length).toBeGreaterThan(10);
  });

  it("除了具名例外，每一顆都接上了", () => {
    const missing = buttons
      .filter((button) => !button.hasLoader && !EXEMPT.has(button.file))
      .map((button) => `${button.file} ${button.label}`);

    expect(
      missing,
      "按鈕文字變成「…中」時要同時顯示 InlineLoader"
    ).toEqual([]);
  });

  /*
   * **反向：例外清單要能自我失效。**
   *
   * 少了這條，例外會變成一張只增不減的清單——某一天 GearSharePage 改版
   * 加上了 loader，這裡卻還掛著一筆「刻意不加」的紀錄，下一個人會照著它
   * 把剛加好的東西又拿掉。
   */
  it("例外清單裡的檔案，現在真的沒有接", () => {
    const stale = [...EXEMPT].filter((file) =>
      buttons.some((button) => button.file === file && button.hasLoader)
    );

    expect(stale, "這些檔案已經接上了，請把它從 EXEMPT 移除").toEqual([]);
  });
});

describe("InlineLoader 是裝飾，不是可及內容", () => {
  const source = strip(
    readFileSync("apps/web/src/components/feedback/InlineLoader.vue", "utf8")
  );

  /*
   * 它永遠出現在「按鈕內、旁邊就有忙碌文字」的位置——按鈕自己已經從
   * 「儲存」變成「儲存中…」。宣告成 `role="img"` ＋ aria-label 會把同一
   * 件事播報兩次；`ReapplyPage` 那顆旁邊還有一個 `role="status"`，會變成
   * 三次。接到 13 顆按鈕之後這個重複會被放大 13 倍。
   */
  it("用 aria-hidden，不宣告 role 與 aria-label", () => {
    expect(source).toContain('aria-hidden="true"');
    expect(source).not.toContain('role="img"');
    expect(source).not.toContain("aria-label");
  });

  /*
   * **反向：可見的動畫必須還在。** 少了這條，把整個 `<svg>` 刪掉也會過
   * 上面那條——那時「有沒有接上 loader」的守門守的就是一個空元件。
   */
  it("三段膠囊與掃描動畫都還在", () => {
    expect(source).toContain("inline-loader__segment");
    expect(source).toMatch(
      /animation:\s*inline-loader-sweep var\(--duration-loader-cycle\)/
    );
  });
});
