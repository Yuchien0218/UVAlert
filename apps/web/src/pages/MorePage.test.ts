// @vitest-environment happy-dom

import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import MorePage from "./MorePage.vue";

/**
 * 讓被審查閘門擋住的兩張卡也渲染出來。
 *
 * `/help` 與 `/special-situation` 的內容尚未過審，正常情況下不會列出。
 * 但這個檔案守的是「說明文字不可被刪」，跟內容有沒有上線無關——內容
 * 一上線那兩張卡就會出現，那時文字必須還在。
 */
vi.mock("../features/help/helpTopics", () => ({
  listPublishableTopics: () => [{ slug: "beach" }],
  isSpecialSituationPublishable: () => true
}));

function mountPage() {
  /*
   * RouterLink 要用會渲染插槽的 stub——預設 stub 會把插槽內容整個吃掉，
   * 那樣測試永遠是綠的（DOM 裡什麼都沒有，自然也不會有被刪的文字），
   * 等於守門完全失效。
   */
  return mount(MorePage, {
    global: {
      stubs: {
        RouterLink: { template: "<a><slot /></a>" },
        Icon: true
      }
    }
  });
}

/**
 * B9 第一輪最大的風險不是做錯，是**之後有人為了「再清爽一點」把不該
 * 收的收掉**。
 *
 * 下面四段說明文字在 B9 分類表裡標為「必須常駐」，依 B9 §3 與
 * `DESIGN.md` 第五節的不可隱藏清單，它們不能被刪、也不能收進展開。
 * 每條斷言都註明為什麼。
 *
 * 計畫：docs/superpowers/plans/2026-08-29-b9-icon-first-more-page.md
 */
const mustStay = [
  {
    card: "特殊狀況",
    text: "醫療邊界與功能限制。",
    why: "健康／安全邊界。DESIGN.md 第九節：不作疾病診斷或求助分級，所以邊界必須在進入前就說清楚"
  },
  {
    card: "安裝到手機桌面",
    text: "安裝後資料較不易遺失；不安裝也可正常使用。",
    why: "決策條件。第二句在防止使用者誤以為非裝不可——少了它，這張卡會變成半個強迫安裝的提示"
  },
  {
    card: "本機資料與隱私",
    text: "資料留在這台裝置；要跨裝置同步才需登入，同步前會先讓你確認內容。",
    why: "隱私決策條件。免登入是這個產品的核心承諾，「同步前會先讓你確認內容」是採取動作前必須知道的前提（2026-08-29 合併裁決）"
  },
  {
    card: "問題回報與意見回饋",
    text: "不用登入也可以回報錯誤或提供建議。",
    why: "決策條件，直接影響使用者要不要點進去"
  }
] as const;

describe("「更多」頁不可隱藏的說明文字", () => {
  for (const { card, text, why } of mustStay) {
    it(`${card} 的說明仍在 DOM 裡`, () => {
      expect(mountPage().text(), `不可刪的理由：${why}`).toContain(text);
    });
  }
});

describe("「更多」頁 B9 第一輪的處置", () => {
  it("通知設定沒有說明文字——原文純重述標題，已依分類表刪除", () => {
    const html = mountPage().html();
    expect(html).toContain("通知設定");
    expect(html).not.toContain("開啟或管理補擦提醒通知");
  });

  it("沒有說明的卡片不留空的 <small> 撐出間距", () => {
    const wrapper = mountPage();
    for (const small of wrapper.findAll("small")) {
      expect(small.text()).not.toBe("");
    }
  });
});

/**
 * 「共六個主題」是文案裡唯一一個**會過期的事實**。
 *
 * 2026-08-29 裁決時就知道這個代價：加第七個衛教分類，那句話會變成錯
 * 的，而且沒有任何機制會提醒。這條測試就是那個機制。
 *
 * 分類的真實來源是 `docs/education/articles/*.md` 的 `category:`
 * frontmatter，不是產生出來的檔案——產生器只是把它讀過去。
 */
describe("衛教卡的主題數與實際內容一致", () => {
  const articlesDir = "docs/education/articles";

  function countCategories(): number {
    const categories = new Set<string>();
    for (const file of readdirSync(articlesDir)) {
      if (!file.endsWith(".md")) continue;
      const match = /^category:\s*(\S+)\s*$/m.exec(
        readFileSync(join(articlesDir, file), "utf8")
      );
      if (match?.[1] !== undefined) categories.add(match[1]);
    }
    return categories.size;
  }

  const numerals = ["零", "一", "二", "三", "四", "五", "六", "七", "八", "九"];

  it("MorePage 文案裡的數字等於實際分類數", () => {
    const actual = countCategories();
    const copy = /共(.)個主題/.exec(
      readFileSync("apps/web/src/pages/MorePage.vue", "utf8")
    );

    expect(
      copy?.[1],
      "「防曬衛教」卡的說明文字不再是「共 N 個主題」的句型"
    ).toBeDefined();

    expect(
      numerals.indexOf(copy?.[1] ?? ""),
      `衛教分類實際有 ${actual} 類，但 MorePage.vue 的文案寫「共${copy?.[1]}個主題」。` +
        `改了 ${articlesDir} 的分類數就要一起改那句文案——` +
        `見 docs/decisions/2026-08-29-b9-pre-decision.md 第八節。`
    ).toBe(actual);
  });
});
