import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 卡片內距收斂守門（2026-08-30）。
 *
 * DESIGN.md 第四節從很早就訂了「卡片內距預設 20px」，但那條規則在程式碼裡
 * 是 28 處各自寫 `padding: var(--space-5)`——想整批調鬆緊得改 28 個檔案，
 * 等於規則沒有真的收斂成 token。改用 `--card-padding` 之後，這條測試擋住
 * 「又有人寫回原始間距值」。
 *
 * 允許清單只有一項：SessionEndControl 的 backdrop 內距不是表面內距，是
 * backdrop 與視窗邊緣的留白，調卡片時不該連帶動到它。
 *
 * 掃描前先剝註解（CLAUDE.md「守門測試」段的坑一）——否則上面那行說明
 * 「不要寫 padding: var(--space-5)」本身就會讓測試變紅。
 */

const sourceRoot = "apps/web/src";
const currentTestFile = join(sourceRoot, "assets", "cardPadding.test.ts");

const ALLOWED_RAW_SPACING = new Set([
  "apps/web/src/components/session/SessionEndControl.vue"
]);

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

function discoverSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverSourceFiles(entryPath);
    if (entryPath === currentTestFile) return [];
    return /\.(?:vue|css)$/.test(entry.name) ? [entryPath] : [];
  });
}

const sourceFiles = discoverSourceFiles(sourceRoot).sort();

describe("卡片內距收斂成 --card-padding", () => {
  it("有掃到檔案（避免走訪壞掉時靜默通過）", () => {
    expect(sourceFiles.length).toBeGreaterThan(50);
  });

  it("token 定義在 styles.css，且維持 20px 那一級", () => {
    expect(
      readFileSync("packages/ui/src/styles.css", "utf8")
    ).toMatch(/--card-padding:\s*var\(--space-5\);/);
  });

  /*
   * 門檻 2026-08-31 從 25 調到 20。
   *
   * 這條守的是「不是宣告了沒人用的 token」，不是「數量只能增加不能減少」
   * ——同日兩次**正當的**減少讓它掉到 24：`SetupProcessBanner` 整個移除，
   * 以及 `WaterStartPicker` 改用共用的 `.question-card app-card`（內距由
   * app.css 提供，不必自己寫）。兩者都是收斂的結果，不是有人繞過 token。
   *
   * 留一點餘裕，但不要留太多——降到個位數就代表 token 真的沒人用了。
   */
  it("實際有被大量使用，不是宣告了沒人用的 token", () => {
    const users = sourceFiles.filter((file) =>
      strip(readFileSync(file, "utf8")).includes("var(--card-padding)")
    );
    expect(users.length).toBeGreaterThanOrEqual(20);
  });

  for (const file of sourceFiles.filter(
    (path) => !ALLOWED_RAW_SPACING.has(path.replaceAll("\\", "/"))
  )) {
    it(`${file} 不再直接寫卡片內距的原始值`, () => {
      expect(strip(readFileSync(file, "utf8"))).not.toMatch(
        /padding:\s*var\(--space-5\)/
      );
    });
  }
});
