import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 倒數下面那行說明要拿得到整個寬度（2026-09-03，使用者回報它「莫名其妙
 * 換行」並猜是叉叉造成的——**是**）。
 *
 * 改動前 `.home__session-head` 是 `minmax(0, 1fr) auto` 兩欄：叉叉只有 44px
 * 高，卻讓**整個倒數區塊**（eyebrow、數字、進度條、說明）都被壓到 280px。
 * 實測 375px 視窗：可用 336px、倒數只拿到 280px——少掉的 56px 正好夠讓
 * 「建議優先補擦：手背・預計 15:52」折成兩行。
 *
 * 改成單欄重疊之後實測：那句話與更長的「建議優先補擦：鼻子與雙頰・預計
 * 15:52」都是一行。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const HOME = strip(readFileSync("apps/web/src/pages/HomePage.vue", "utf8"));

function rule(selector: string): string {
  const match = new RegExp(
    `${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{([^}]*)\\}`
  ).exec(HOME);
  expect(match, `找不到 ${selector} 的規則`).not.toBeNull();
  return match![1]!;
}

describe("結束鈕不再佔走倒數的寬度", () => {
  /*
   * 比對完整宣告：`minmax(0, 1fr) auto` 就是把叉叉排成第二欄的那一版。
   */
  it("不再有「內容一欄、叉叉一欄」", () => {
    expect(rule(".home__session-head")).not.toContain(
      "grid-template-columns: minmax(0, 1fr) auto;"
    );
  });

  it("兩個子元素疊在同一個 grid 區域", () => {
    expect(rule(".home__session-head > *")).toContain("grid-area: 1 / 1;");
  });

  /*
   * **反向：叉叉必須還在右上角。** 只守上面兩條的話，把重疊寫成左上角
   * （或忘了 `justify-self`）也是綠的——那時叉叉會蓋在「補擦倒數」上面。
   */
  it("叉叉靠右", () => {
    expect(rule(".home__session-head > .session-end")).toContain(
      "justify-self: end;"
    );
  });

  /*
   * 重疊之所以安全，是因為 `SessionEndControl` 的確認彈窗是 `position:
   * fixed` 的遮罩，不是就地展開——`.session-end` 永遠只有那顆 44×44 的
   * 按鈕。這條擋的是「有人把彈窗改成就地展開」，那時重疊會蓋住倒數。
   */
  it("結束鈕的確認彈窗仍然是固定定位的遮罩", () => {
    const control = strip(
      readFileSync(
        "apps/web/src/components/session/SessionEndControl.vue",
        "utf8"
      )
    );
    const backdrop = /\.session-end__backdrop \{([^}]*)\}/.exec(control)?.[1];

    expect(backdrop, "找不到 .session-end__backdrop").toBeDefined();
    expect(backdrop).toContain("position: fixed;");
  });
});
