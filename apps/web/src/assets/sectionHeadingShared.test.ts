import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 卡片標題的圖示錨點是共用類別，不是某一頁的私有樣式（2026-09-04）。
 *
 * 使用者回報「有些頁面沒有 icon 或裝飾，我覺得很空」。清點 24 個頁面之後，
 * 成因不是品味而是這條規則被鎖住了：`.section-heading` 只寫在
 * `DataSettingsPage.vue` 的 scoped style 裡，所以別的頁想用也用不到——
 * 通知設定頁 5 張卡 0 個標題圖示、帳號與雲端資料頁 4 張卡 0 個，而
 * `ProductsPage` 只好自己另刻一個 `.gear-section-heading`。
 *
 * 這是同一個坑的第三次（`.time-option` 2026-08-31、`.time-picker--invalid`
 * 2026-09-03），所以這次補守門：**只要它又被寫回某一頁的 scoped style，
 * 這條就會紅。**
 */

const APP_CSS = "apps/web/src/assets/app.css";
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
      out.push(path);
    }
  }
  return out;
}

const files = vueFiles(SRC);

describe(".section-heading 是共用類別", () => {
  it("有掃到檔案（避免走訪壞掉時靜默通過）", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  /* 比對完整的宣告，不是名字片段——`.section-headings` 之類的改名要抓得到。 */
  it("定義在 app.css", () => {
    const css = strip(readFileSync(APP_CSS, "utf8"));

    expect(css).toMatch(/\.section-heading \{[^}]*display: flex;/);
    expect(css).toMatch(/\.section-heading svg \{[^}]*flex: none;/);
  });

  /*
   * **反向，也是這條守門真正的目的**：不可以有任何 `.vue` 在自己的
   * `<style scoped>` 裡重新定義它。少了這條，把 app.css 的版本留著、同時
   * 在某一頁又寫一份，上面那條照樣綠——而那正是這次要修的狀態。
   *
   * `.education-section-heading`／`.gear-section-heading` 是別的類別，
   * 用邊界比對排除掉。
   */
  it("沒有任何頁面在 scoped style 裡自己再定義一次", () => {
    const offenders = files.filter((path) =>
      /(^|[\s,>])\.section-heading[\s.,:{]/.test(strip(readFileSync(path, "utf8")))
    );

    expect(
      offenders.map((path) => path.split("\\").join("/")),
      ".section-heading 已經在 app.css，不要在頁面裡再寫一份"
    ).toEqual([]);
  });
});
