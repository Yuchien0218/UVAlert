import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ICONS } from "../../generated/icons.generated";

/**
 * 「記錄狀況」的六個選項各自帶一顆圖示。
 *
 * 起因是 2026-08-31 的圖示清點：61 顆裡有 17 顆沒有任何使用點，其中
 * `event-heavy-sweat`／`event-towel`／`event-friction`／`event-hand-wash`
 * 四顆**正好對應這個選單的四種情境**，label 與選項逐字相同——它們本來就是
 * 為這裡畫的，只是一直沒接上。使用者裁決走乙案（補齊並各配圖示）。
 *
 * **這裡讀原始碼而不是掛載元件**，因為要守的是「選項物件上帶著 icon」這件
 * 事本身：controller 的建立需要一整組 port，掛起來成本高，而漂移會發生在
 * 這幾個字面量上。
 *
 * vitest 的 cwd 是 repo 根目錄。
 */

const CONTROLLER = readFileSync(
  "apps/web/src/features/reminder/createContextEventController.ts",
  "utf8"
);

const PAGE = readFileSync(
  "apps/web/src/pages/ReportContextEventPage.vue",
  "utf8"
);

/** 掃描前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

/**
 * 六種 kind → 預期的圖示。
 *
 * `water_start` 與 `water_end` 共用 `context-water`：它們永遠不會同時出現
 * （有進行中的水上區間就只給離水，沒有就只給下水），同一個主題的兩個時刻
 * 用同一顆幾何是準的。
 */
const EXPECTED = {
  heavy_sweat: "event-heavy-sweat",
  towel: "event-towel",
  friction: "event-friction",
  hand_wash: "event-hand-wash",
  water_start: "context-water",
  water_end: "context-water"
} as const;

describe("記錄狀況的選項圖示", () => {
  /*
   * 三件事分開守，因為它們可以互相掩護：只守「選項有 icon 欄位」→ 畫面
   * 可以不畫；只守「畫面有 <Icon>」→ 選項可以指到別顆；只守對應表 →
   * 型別欄位可以被拿掉、變成死資料。
   */
  it.each(Object.entries(EXPECTED))(
    "%s 的選項帶著 %s",
    (kind, icon) => {
      const source = stripComments(CONTROLLER);
      const block = new RegExp(
        `kind: "${kind}",[\\s\\S]{0,200}?icon: "([a-z-]+)"`
      ).exec(source);

      expect(block, `${kind} 的選項沒有 icon`).not.toBeNull();
      expect(block![1]).toBe(icon);
    }
  );

  it("每一顆指到的圖示都真的存在於註冊表", () => {
    for (const icon of Object.values(EXPECTED)) {
      expect(Object.keys(ICONS), icon).toContain(icon);
    }
  });

  /*
   * 型別上的 icon 欄位是必填的，所以少寫一個選項會 typecheck 失敗——但
   * 「畫面有沒有真的畫出來」型別管不到。這條守畫面那一半。
   */
  it("選項按鈕真的渲染圖示", () => {
    const page = stripComments(PAGE);

    expect(page).toContain('<Icon :name="choice.icon" :size="32" />');
  });
});
