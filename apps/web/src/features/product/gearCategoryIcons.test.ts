import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ICONS } from "../../generated/icons.generated";
import { GEAR_CATEGORY_ICONS } from "./gearPresentation";

/**
 * 品類 → 圖示只有一份。
 *
 * **2026-08-31 收斂前，這張表逐字複製在 GearForm.vue 與 GearListItem.vue
 * 兩個檔案裡**，而且 GearForm 的註解寫著「跟 GearListItem.vue 用同一組
 * 品類圖示對應」——用註解交代兩份要一致，就是「這裡遲早會漂移」的自白。
 * 兩份當時剛好同值，那是運氣不是機制。
 *
 * 這條測試把運氣換成機制：再有人在元件裡自己寫一張表，就會紅。
 *
 * vitest 的 cwd 是 repo 根目錄。
 */

const SRC = "apps/web/src";

/** 掃描前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。上面那段就會誤中。 */
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
      /*
       * 排除測試檔。不是為了寬容，是因為**這個檔案自己就含有那個字串**
       * （下面 `includes()` 的參數），掃進來會永遠紅在自己身上——而那是
       * 假失敗，不是真的有第二份定義。
       */
      (entry.endsWith(".vue") || entry.endsWith(".ts")) &&
      !entry.endsWith(".test.ts")
    ) {
      out.push(path);
    }
  }
  return out;
}

describe("GEAR_CATEGORY_ICONS", () => {
  it("四個品類都有圖示，而且圖示真的存在", () => {
    expect(Object.keys(GEAR_CATEGORY_ICONS)).toHaveLength(4);
    for (const icon of Object.values(GEAR_CATEGORY_ICONS)) {
      expect(Object.keys(ICONS), icon).toContain(icon);
    }
  });

  /*
   * 比對**宣告**而不是名字片段：`const GEAR_CATEGORY_ICONS` 才算重新定義，
   * 單純 import 這個名字不算（那正是我們希望大家做的事）。理由見
   * CLAUDE.md「守門測試：坑二」。
   */
  it("只有 gearPresentation.ts 定義它，其他地方一律 import", () => {
    const offenders: string[] = [];
    for (const path of sourceFiles(SRC)) {
      if (path.endsWith(join("features", "product", "gearPresentation.ts"))) {
        continue;
      }
      const code = stripComments(readFileSync(path, "utf8"));
      if (code.includes("const GEAR_CATEGORY_ICONS")) offenders.push(path);
    }

    expect(
      offenders,
      "品類圖示對應表只能有一份，從 gearPresentation.ts import"
    ).toEqual([]);
  });

  /*
   * 兩個使用點都必須真的走這張表。只守「沒有第二份定義」的話，元件改成
   * 直接寫死 `<Icon name="gear-sunscreen" />` 也會過——那一樣是漂移，只是
   * 換個形狀。
   */
  it.each([
    "apps/web/src/components/product/GearForm.vue",
    "apps/web/src/components/product/GearListItem.vue"
  ])("%s 從共用的表拿圖示", (path) => {
    const code = stripComments(readFileSync(path, "utf8"));

    expect(code).toContain("GEAR_CATEGORY_ICONS[");
    expect(code, "不該再從 gearPresentation 以外的地方拿").toContain(
      "from \"../../features/product/gearPresentation\""
    );
  });
});
