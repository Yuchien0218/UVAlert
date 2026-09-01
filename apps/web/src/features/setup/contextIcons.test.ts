import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICONS } from "../../generated/icons.generated";
import { CONTEXT_ICONS, CONTEXT_LABELS } from "./setupCatalog";

/**
 * 情境 → 圖示只有一份。
 *
 * 這份對應原本只存在於 `ContextSelector.vue` 的 `DIRECT_OPTIONS` 與
 * `groups` 裡，而且**只涵蓋得到四個磚**——室內與水上的子選項沒有自己的
 * 圖示。`/setup` 收合後的摘要要顯示已選情境的圖示，需要六個情境都查得到
 * 的表，所以 2026-08-31 抽到 `setupCatalog.ts`，跟 `CONTEXT_LABELS` 並列。
 *
 * 這是同一天第三次做同一件事（`educationCategoryIcons`、
 * `GEAR_CATEGORY_ICONS`、這個），所以守門也照同一個形狀寫。
 *
 * vitest 的 cwd 是 repo 根目錄。
 */

const SRC = "apps/web/src";

/** 掃描前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "generated") sourceFiles(path, out);
    } else if (
      // 排除測試檔：這個檔案自己就含有下面 includes() 要找的字串。
      (entry.endsWith(".vue") || entry.endsWith(".ts")) &&
      !entry.endsWith(".test.ts")
    ) {
      out.push(path);
    }
  }
  return out;
}

describe("CONTEXT_ICONS", () => {
  /*
   * 六個情境全部都要查得到——這正是抽出來的理由。原本的表只涵蓋四個磚，
   * 摘要列拿 indoor_window 去查會是 undefined。
   */
  it("每個情境都有圖示，數量與 CONTEXT_LABELS 一致", () => {
    expect(Object.keys(CONTEXT_ICONS).sort()).toEqual(
      Object.keys(CONTEXT_LABELS).sort()
    );
    for (const icon of Object.values(CONTEXT_ICONS)) {
      expect(Object.keys(ICONS), icon).toContain(icon);
    }
  });

  /*
   * 室內與水上的兩個子選項共用群組圖示，是刻意的：選擇器的版面就是
   * 「四個磚，其中兩個展開後有子選項」，子選項不是獨立的視覺層級。
   */
  it("子選項共用所屬群組的圖示", () => {
    expect(CONTEXT_ICONS.indoor_window).toBe(CONTEXT_ICONS.indoor_away);
    expect(CONTEXT_ICONS.water_active).toBe(CONTEXT_ICONS.water_preparing);
  });

  it("只有 setupCatalog.ts 定義它，其他地方一律 import", () => {
    const offenders: string[] = [];
    for (const path of sourceFiles(SRC)) {
      if (path.endsWith(join("features", "setup", "setupCatalog.ts"))) continue;
      const code = stripComments(readFileSync(path, "utf8"));
      if (code.includes("const CONTEXT_ICONS")) offenders.push(path);
    }

    expect(offenders, "情境圖示對應表只能有一份").toEqual([]);
  });

  /*
   * 兩個使用點都要真的走這張表。只守「沒有第二份定義」的話，元件改回
   * 直接寫 `icon: "context-outdoor"` 也會過——那一樣是漂移。
   */
  it.each([
    "apps/web/src/pages/setup/SetupPage.vue",
    "apps/web/src/components/setup/ContextSelector.vue"
  ])("%s 不寫死圖示 id", (path) => {
    const code = stripComments(readFileSync(path, "utf8"));

    expect(code).toContain("CONTEXT_ICONS");
    expect(code, "不該再寫死圖示 id").not.toMatch(
      /["']context-(outdoor|exercise|indoor|water)["']/
    );
  });

  /*
   * **上面那條擋不住「圖示被整個拿掉」**——`CONTEXT_ICONS` 光是留在 import
   * 那一行就能讓 `toContain` 通過。寫這條時實測到：把摘要列的 `<Icon>`
   * 刪掉，測試依然全綠。
   *
   * 所以另外比對**完整的屬性**（CLAUDE.md「坑二」：不要只比名字片段），
   * 確認圖示真的被綁在畫面上。
   */
  it("收合後的情境摘要真的渲染圖示", () => {
    const code = stripComments(
      readFileSync("apps/web/src/pages/setup/SetupPage.vue", "utf8")
    );

    expect(code).toContain(':name="CONTEXT_ICONS[context]"');
  });

  it("情境選擇器的磚真的渲染圖示", () => {
    const code = stripComments(
      readFileSync("apps/web/src/components/setup/ContextSelector.vue", "utf8")
    );

    expect(code).toContain(':name="option.icon"');
    expect(code).toContain(':name="group.icon"');
  });
});
