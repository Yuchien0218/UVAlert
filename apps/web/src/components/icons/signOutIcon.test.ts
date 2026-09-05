import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ICONS } from "../../generated/icons.generated";

/**
 * `tool-sign-out`：帳號頁「登出」的圖示（2026-09-05 新繪）。
 *
 * **這顆圖示存在的理由，就是它不能長成箭頭出框的樣子。**
 *
 * 全世界最通用的登出符號是「方框 ＋ 往外射出的箭頭」——但這個 repo 裡那個
 * 幾何**已經是 `tool-download`（匯出）**，而且兩者會出現在同一組設定頁：
 * 資料設定頁的「匯出本機資料」與帳號頁的「登出」。照抄通用符號等於讓同一
 * 個圖形在相鄰的兩頁代表兩件事。
 *
 * 所以改用電源符號（開口朝上的圓弧 ＋ 垂直膠囊線）。它同時符合圖示系統的
 * 造型 DNA——`docs/design/icon-system/README.md` 第一節：「實心圓點＋膠囊
 * 狀線條」、線寬 2.5、端點與轉角一律 round。
 */

const SOURCE = "docs/design/icon-system/icons/tool-sign-out.svg";
const DOWNLOAD = "docs/design/icon-system/icons/tool-download.svg";

/** 抓出一個 SVG 裡所有 path 的 `d`，用來比對幾何。 */
const geometry = (path: string): string[] =>
  [...readFileSync(path, "utf8").matchAll(/\sd="([^"]+)"/g)].map(
    (match) => match[1]!
  );

describe("tool-sign-out 進了圖示註冊表", () => {
  it("註冊成 24×24、標題是「登出」", () => {
    const icon = ICONS["tool-sign-out"];

    expect(icon, "tool-sign-out 不在註冊表裡").toBeDefined();
    expect(icon.viewBox).toBe("0 0 24 24");
    expect(icon.title).toBe("登出");
  });

  /*
   * 工具型圖示會出現在按鈕、連結、狀態列等各種語意情境，所以一律
   * `currentColor`（README 第二節）。寫死琥珀金會跟外層的語意色打架。
   */
  it("用 currentColor，沒有寫死顏色", () => {
    const markup = readFileSync(SOURCE, "utf8");

    expect(markup).toContain('stroke="currentColor"');
    expect(markup).not.toContain("#C1832E");
    expect(markup).not.toContain("#000");
  });
});

describe("造型語言（README 第一節）", () => {
  const markup = readFileSync(SOURCE, "utf8");

  it("畫布 24×24", () => {
    expect(markup).toContain('viewBox="0 0 24 24"');
  });

  /*
   * 線寬 2.5 ＋ round 端點，渲染出來才是膠囊形——那是從播報印記 Logo 的
   * 射線來的視覺 DNA，不是隨便挑的數字。
   */
  it("每一條路徑都是 2.5 寬的膠囊線", () => {
    const paths = [...markup.matchAll(/<path[^>]*>/g)].map((m) => m[0]);

    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      expect(path).toContain('stroke-width="2.5"');
      expect(path).toContain('stroke-linecap="round"');
    }
  });
});

describe("不可以與「匯出」撞成同一個圖形", () => {
  /*
   * **這是這顆圖示的核心約束**，也是最容易在日後被好意破壞的一條——
   * 「登出不是應該用箭頭出框嗎？」看起來完全合理，直到你發現那顆已經
   * 叫「匯出」了。
   */
  it("兩顆的幾何完全不重疊", () => {
    const signOut = geometry(SOURCE);
    const download = geometry(DOWNLOAD);

    expect(signOut.length).toBeGreaterThan(0);
    expect(download.length).toBeGreaterThan(0);
    expect(
      signOut.filter((d) => download.includes(d)),
      "登出與匯出共用了路徑——它們會出現在相鄰的兩個設定頁"
    ).toEqual([]);
  });

  /*
   * **反向：比對的必須是真的幾何。** 少了這條，`geometry()` 抓錯屬性
   * 回傳兩個空陣列時，上面那條也會綠——那時它守的是「兩個空集合不相交」。
   */
  it("匯出那顆確實是三段路徑的方框加箭頭", () => {
    expect(geometry(DOWNLOAD)).toHaveLength(3);
    expect(geometry(SOURCE)).toHaveLength(2);
  });
});
