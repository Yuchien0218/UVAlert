import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 場景層動效與「不要有假的可點提示」（2026-09-04，互動動效批次 5）。
 *
 * vitest 的 cwd 是 repo 根目錄。
 */
const SRC = "apps/web/src";
const SHARED = join(SRC, "assets", "app.css");

/** 掃描前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

function styleFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "generated") styleFiles(path, out);
    } else if (/\.(?:vue|css)$/.test(entry) && !entry.includes(".test.")) {
      out.push(path);
    }
  }
  return out;
}

/**
 * **允許 hover 的表面必須真的可以點。**
 *
 * 起因：`.uv-day:hover` 會把五日預報的某一天邊框改成中性灰——但那是個
 * `<li>`，沒有 click、沒有連結、沒有 cursor: pointer。滑過會亮起來、按下去
 * 什麼都不會發生。更糟的是它的特異性 (0,2,0) 高過 `.uv-day--low` 那組
 * (0,1,0)，所以**滑過會蓋掉承載風險等級的邊框色**。
 *
 * 列成白名單而不是寫規則自動判斷：hover 該不該存在是每次都要想一下的事，
 * 多一個就讓這條紅一次，逼人回來判斷它是不是又一個假提示。
 */
const HOVERABLE = [
  ".choice-grid label:hover", // <label> 包著 radio，有 cursor: pointer
  ".time-option:hover", // <button>
  "button.event-row:hover .event-label", // 選擇器自己就寫明是 button
  ".quick-protection__header:hover" // <button>
];

describe("不要有假的可點提示", () => {
  it("所有 :hover 都掛在真的可以點的東西上", () => {
    const found: string[] = [];
    for (const path of styleFiles(SRC)) {
      for (const line of strip(readFileSync(path, "utf8")).split("\n")) {
        const match = /^\s*([^{}\n]*:hover[^{}\n]*?)\s*\{/.exec(line);
        if (match) found.push(match[1]!.trim());
      }
    }

    expect([...found].sort()).toEqual([...HOVERABLE].sort());
  });

  /* 這一條是上面那個 bug 本身，單獨釘住。 */
  it("五日預報的某一天沒有 hover 樣式", () => {
    const source = strip(
      readFileSync(join(SRC, "components", "uv", "FiveDayUvCard.vue"), "utf8")
    );
    expect(source).not.toContain(".uv-day:hover");
  });
});

describe("換頁與通知的進出場", () => {
  const css = strip(readFileSync(SHARED, "utf8"));

  /*
   * 在批次 5 之前只有進場：舊頁瞬間消失，中間有一格「什麼都沒有」的空白。
   * 進場那一側刻意不定義——App.vue 用 mode="out-in"，進場交給 page-stack
   * 的階梯淡入，兩邊都寫會疊在一起。
   */
  it("換頁有離場轉場", () => {
    expect(css).toMatch(
      /\.page-leave-active\s*\{[^}]*transition:\s*opacity var\(--duration-fast\)/
    );
    expect(css).toMatch(/\.page-leave-to\s*\{[^}]*opacity:\s*0;/);
  });

  /*
   * 返回時整頁一起淡入，不跑階梯——使用者剛看過那一頁，一格一格再長一次
   * 會讀成「重新載入」。**要同時守住 delay 歸零**：只換 animation-name
   * 的話，nth-child 那組 delay 還在，返回仍然是階梯。
   */
  it("返回時不跑階梯淡入", () => {
    const rule = /:root\[data-nav-direction="back"\][^{]*\{([^}]*)\}/.exec(css);
    expect(rule, "找不到返回時的覆寫規則").not.toBeNull();
    expect(rule![1]).toContain("animation-delay: 0s;");
    expect(rule![1]).toContain("animation-name: page-stack-plain-fade-in;");
  });

  /*
   * 「已儲存」是操作的唯一回饋，卻一直沒有進場。用 base（320ms）不是 fast
   * ——這是「自己發生的事」，依第十二節規則二該慢一點才安靜。
   */
  it("操作結果的提示有進場，且用「自己發生的」時距", () => {
    expect(css).toMatch(
      /\.notice\s*\{[^}]*animation:\s*notice-fade-in var\(--duration-base\)/
    );
  });
});
