import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { ICONS } from "../../generated/icons.generated";

/**
 * 2026-08-31 第七批（§18.2、§18.4）：夜間的圖示與版面。
 *
 * 兩件事都是使用者看過畫面才提出的，而且都推翻了同一天稍早的選擇——所以
 * 守門要寫清楚「回到舊做法」長什麼樣子，避免下次又被順手改回去。
 */

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const NIGHT_FILES = [
  "apps/web/src/components/home/HomeNightNotice.vue",
  "apps/web/src/components/home/HomeNightSession.vue"
];

describe("夜間圖示", () => {
  it("state-night 有登記進圖示表", () => {
    expect(ICONS).toHaveProperty("state-night");
    expect(ICONS["state-night"].title).toBe("夜間");
  });

  for (const file of NIGHT_FILES) {
    /*
     * 比對完整的屬性（`icon="state-night"` / `name="state-night"`），不是
     * 只找 id 片段——只找片段的話註解裡提一次就會綠（CLAUDE.md 坑一＋坑二）。
     */
    it(`${file} 用月亮`, () => {
      const source = strip(readFileSync(file, "utf8"));
      expect(
        source.includes('icon="state-night"') ||
          source.includes('name="state-night"')
      ).toBe(true);
    });
  }
});

describe("夜間版面靠左", () => {
  /*
   * 使用者回報「置中，跟其他頁有點不太像」。全站其他內容區塊一律靠左，
   * 置中的只有這裡。
   *
   * hero 檔位只有夜間空狀態在用，所以水平對齊改在 IconLead 裡——但也因此
   * 要在這裡守住，否則之後有人為了別的用途把 hero 改回置中，夜間頁會跟著
   * 變回去而沒有任何測試出聲。
   */
  it("IconLead 的 hero 檔位靠左，不置中", () => {
    const source = strip(
      readFileSync("apps/web/src/components/common/IconLead.vue", "utf8")
    );

    expect(source).toContain("align-items: flex-start;");
    expect(source).not.toContain("text-align: center;");
  });

  it("夜間說明區塊本身也靠左", () => {
    const source = strip(
      readFileSync("apps/web/src/components/home/HomeNightNotice.vue", "utf8")
    );

    expect(source).toContain("justify-items: start;");
    expect(source).not.toContain("justify-items: center;");
    expect(source, "逃生出口也要跟著靠左").not.toContain(
      "justify-self: center;"
    );
  });
});

describe("最近事件的展開控制", () => {
  const SOURCE = strip(
    readFileSync(
      "apps/web/src/components/reminder/RecentEventsList.vue",
      "utf8"
    )
  );

  it("文字縮短成「更多 N 筆」", () => {
    expect(SOURCE).toContain("`更多 ${displayEvents.length - 1} 筆`");
  });

  /*
   * **不可以縮成純箭頭。** 使用者原本要求「只要 `>` 符號」，實測不能做：
   * 裸箭頭沒有可及名稱、命中區從 44px 掉到 20px（SC 2.5.5）、看不出按下去
   * 會發生什麼。這條擋的是「之後有人真的把文字拿掉」。
   */
  it("展開控制仍然有文字與可及標籤", () => {
    expect(SOURCE).toContain("收合");
    expect(SOURCE).toContain(":label=");
  });

  /*
   * aria-controls 指向的容器不可以包含這顆按鈕自己——那等於宣告「這個按鈕
   * 會展開包含它自己的區域」。使用者要求「移到清單最後」，做法是視覺上接
   * 成最後一列，DOM 仍在受控容器外面。
   */
  it("展開控制在受控容器外面", () => {
    const list = /<div id="recent-events-list"[\s\S]*?<\/div>/.exec(SOURCE)?.[0];

    expect(list, "找不到事件清單容器").toBeDefined();
    expect(list).not.toContain("ChevronLink");
  });
});
