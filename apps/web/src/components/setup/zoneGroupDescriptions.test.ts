import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BODY_ZONE_GROUPS } from "../../features/setup/setupCatalog";

/**
 * 部位群組的說明文字（`2026-09-03-setup-gear-form-layout-todo.md` 第二項，
 * 裁決：乙案 ＋ 版面調整）。
 *
 * 改動前十個群組每個都有一條說明、每條各佔一行，把這份清單拉得很長。
 * 盤點後只留「從標籤推不出來」的那幾條，並改成接在名稱後面、字級小一階。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const FORM = strip(
  readFileSync("apps/web/src/components/setup/ZoneProtectionForm.vue", "utf8")
);

describe("只有講了新東西的群組才有說明", () => {
  /*
   * 留下來的三種：群組其實是幾個部位、排除範圍、跨項規則。
   * 後兩種從標籤完全推不出來——拿掉等於把資訊搬到客服。
   */
  const KEEPS = ["face", "neck", "torso", "hand_backs", "scalp", "lips"];

  /* 拿掉的四條等於重講標籤（「左右手臂」「左右腿部」…）。 */
  const DROPS = ["ears", "arms", "legs", "feet"];

  it.each(KEEPS)("%s 保留說明", (id) => {
    const group = BODY_ZONE_GROUPS.find((item) => item.id === id);

    expect(group, id).toBeDefined();
    expect(group?.description, id).toBeTruthy();
  });

  /*
   * **反向：不能只刪不留，也不能只留不刪。**
   *
   * 只守上面那條的話，十條全留也是綠的（那時什麼都沒精簡）；只守這條的話，
   * 十條全刪也是綠的（那時「不包含手掌」「不會因選擇臉部而自動加入」這兩
   * 則規則就消失了）。兩個方向都要守。
   */
  it.each(DROPS)("%s 不再有說明", (id) => {
    const group = BODY_ZONE_GROUPS.find((item) => item.id === id);

    expect(group, id).toBeDefined();
    expect(group?.description, id).toBeUndefined();
  });

  /* 那兩則安全相關的規則要逐字還在，不能只是「有東西」。 */
  it("排除範圍與跨項規則逐字保留", () => {
    const byId = (id: string) =>
      BODY_ZONE_GROUPS.find((group) => group.id === id)?.description;

    expect(byId("hand_backs")).toBe("不包含手掌");
    expect(byId("scalp")).toBe("不會因選擇臉部而自動加入");
    expect(byId("lips")).toBe("不會因選擇臉部而自動加入");
  });

  /* 沒有說明的群組不可以渲染出空的 `<small>`——那會留下一段空白。 */
  it("沒有說明時不渲染 small", () => {
    expect(FORM).toContain(
      '<small v-if="group.description">{{ group.description }}</small>'
    );
  });
});

describe("說明接在名稱後面，不自己佔一行", () => {
  function rule(selector: string): string {
    const match = new RegExp(
      `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`
    ).exec(FORM);
    expect(match, `找不到 ${selector} 的規則`).not.toBeNull();
    return match![1]!;
  }

  it("名稱與說明在同一個 flex 行裡", () => {
    const text = rule(".zone-group-choice__text");

    expect(text).toContain("display: flex;");
    expect(text).toContain("align-items: baseline;");
  });

  /*
   * 改動前是 `.zone-group-choice strong, small { display: block }`——
   * 那正是「各佔一行」的來源。
   */
  it("不再把名稱與說明各自撐成一行", () => {
    expect(FORM).not.toMatch(
      /\.zone-group-choice strong,\s*\.zone-group-choice small \{[^}]*display:\s*block;/
    );
  });

  /*
   * 字級小一階（使用者要求）。**這是明知反轉 2026-08-30 的決定**：那天才
   * 把這裡從 caption 改成 supporting，理由是「跟 ContextSelector 的
   * `.context-suboption small` 同一種角色」——那在說明自己佔一行時成立。
   */
  it("說明用 caption，比名稱小一階", () => {
    expect(rule(".zone-group-choice small")).toContain(
      "font-size: var(--font-size-caption);"
    );
  });

  /* ContextSelector 不跟著改——它的說明仍然是獨立一行。 */
  it("ContextSelector 的說明維持原本字級", () => {
    const selector = strip(
      readFileSync(
        "apps/web/src/components/setup/ContextSelector.vue",
        "utf8"
      )
    );

    expect(selector).not.toContain("--font-size-caption");
  });

  /*
   * 列高從 4.25rem（為了兩行）降到 tap-target。可點區沒有變小，
   * 但每一列不再留一截空白。
   */
  it("列高降到 tap-target，且沒有變得更小", () => {
    const choice = rule(".zone-group-choice");

    expect(choice).toContain("min-height: var(--tap-target);");
    expect(choice).not.toContain("4.25rem");
  });
});
