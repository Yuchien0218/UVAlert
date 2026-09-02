// @vitest-environment happy-dom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * 二級頁面的返回出口規則（`docs/decisions/2026-09-02-secondary-page-exit-rule.md`）：
 *
 *   可放棄的流程／模態 → `tool-close`（叉叉）
 *   階層下鑽           → `tool-arrow-left`（箭頭）
 *
 * 判準是**離開時使用者會不會覺得有東西沒完成**。叉叉帶著「放棄」的語氣，
 * 箭頭只是「往回走」。
 *
 * **為什麼用白名單而不是自動推導。** 「這一頁是不是可放棄的流程」是語意，
 * 從檔名或路徑猜不出來（`GearFormPage` 是流程、`GearSharePage` 是下鑽，兩個
 * 都在 pages/ 底下）。白名單的代價是新頁面要手動登記——那正是重點：**新增
 * 一個有出口的頁面時，必須選邊**，而不是隨手複製上一頁的圖示。
 */

const SRC = "apps/web/src/";

/** 掃原始碼前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

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

/** 離開＝放棄一段還沒完成的事。 */
const ABANDONABLE = [
  "components/common/BottomSheet.vue",
  "components/session/SessionEndControl.vue",
  "pages/EventCorrectionPage.vue",
  "pages/GearFormPage.vue",
  "pages/ReapplyPage.vue",
  "pages/ReportContextEventPage.vue"
];

/** 離開＝回到上一層，沒有東西被放棄。 */
const DRILL_DOWN = [
  "components/setup/SetupStepShell.vue",
  "pages/GearSharePage.vue",
  "pages/education/EducationArticlePage.vue",
  "pages/education/EducationCategoryPage.vue",
  "pages/settings/NotificationSettingsPage.vue"
];

function exitIconsIn(file: string): string[] {
  const code = stripComments(readFileSync(SRC + file, "utf8"));
  return (code.match(/icon="tool-(?:close|arrow-left)"/g) ?? []).map((m) =>
    m.slice('icon="'.length, -1)
  );
}

describe("二級頁面的返回出口", () => {
  it("可放棄的流程用叉叉", () => {
    const wrong = ABANDONABLE.filter(
      (file) => !exitIconsIn(file).includes("tool-close")
    );

    expect(wrong, "這些頁面是可放棄的流程，出口應該是叉叉").toEqual([]);
  });

  it("階層下鑽用箭頭", () => {
    const wrong = DRILL_DOWN.filter(
      (file) => !exitIconsIn(file).includes("tool-arrow-left")
    );

    expect(wrong, "這些頁面是階層下鑽，出口應該是箭頭").toEqual([]);
  });

  /*
   * **兩份名單分開守，還要有「不得混用」這條。**
   *
   * 只有上面兩條的話，一個檔案同時放叉叉與箭頭會兩條都過——CLAUDE.md 記過
   * 這種「兩個條件互相掩護」的失敗模式。
   */
  it("同一頁不混用兩種出口", () => {
    const mixed = [...ABANDONABLE, ...DRILL_DOWN].filter((file) => {
      const icons = new Set(exitIconsIn(file));
      return icons.size > 1;
    });

    expect(mixed, "同一頁只能有一種出口語意").toEqual([]);
  });

  /*
   * **這條讓白名單不會靜靜過期。** 新頁面加了出口卻沒登記時，上面三條都是
   * 綠的（它們只檢查名單內的檔案）——等於守門看不見它。
   */
  it("所有用了出口圖示的檔案都已登記", () => {
    const listed = new Set(
      [...ABANDONABLE, ...DRILL_DOWN].map((file) => SRC + file)
    );
    const unlisted: string[] = [];

    for (const path of vueFiles(SRC)) {
      const normalized = path.split("\\").join("/");
      if (listed.has(normalized)) continue;
      // IconButton 本身與圖示預覽不是頁面出口。
      if (normalized.endsWith("components/common/IconButton.vue")) continue;
      const code = stripComments(readFileSync(path, "utf8"));
      if (/icon="tool-(?:close|arrow-left)"/.test(code)) {
        unlisted.push(normalized);
      }
    }

    expect(
      unlisted,
      "新增出口時要選邊：加進 ABANDONABLE 或 DRILL_DOWN"
    ).toEqual([]);
  });
});
