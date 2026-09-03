// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import MorePage from "./MorePage.vue";

/**
 * 讓被審查閘門擋住的兩張卡也渲染出來。
 *
 * `/help` 與 `/special-situation` 的內容尚未過審，正常情況下不會列出，
 * 但這個檔案守的是版型與邊界文字，跟內容有沒有上線無關。
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
 * 「更多」頁的入口卡只有標題（2026-09-03 使用者裁決）。
 *
 * 這推翻了 2026-08-29 B9 第一輪的逐項分類——當時七張裡四張留著說明，
 * 結果六列有、一列沒有，那一列比其他矮一截（稽核 §E）。
 */
describe("入口卡只有標題", () => {
  it("沒有任何說明文字", () => {
    const wrapper = mountPage();

    expect(wrapper.findAll("small")).toHaveLength(0);
    /*
     * `description` 這個選填欄位也一併收掉，不是只在模板裡藏起來。
     * 註解要先剝掉——上面那段說明為什麼拿掉的註解裡就有這個字。
     */
    const source = readFileSync("apps/web/src/pages/MorePage.vue", "utf8")
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");

    expect(source).not.toContain("description");
  });

  /*
   * **反向：入口本身要還在。** 只守「沒有說明」的話，把整份清單刪光也是
   * 綠的——那時這六頁在 App 裡又沒有進入點了（那正是這一頁當初存在的理由）。
   */
  it("七個入口都還在", () => {
    const text = mountPage().text();

    for (const label of [
      "通知設定",
      "防曬衛教",
      "常見問題",
      "特殊狀況",
      "安裝到手機桌面",
      "本機資料與隱私",
      "問題回報與意見回饋"
    ]) {
      expect(text).toContain(label);
    }
  });
});

/**
 * **拿掉說明的代價，由目的頁承擔。**
 *
 * 原本那四句在 B9 §3 的「不可隱藏清單」裡，理由是醫療邊界與決策條件要
 * 「進入前就說清楚」。現在改成點進去才看得到——資訊不能因此消失，所以
 * 這裡守著四個目的頁各自都還在說同一件事。
 *
 * 比對的是**語意的關鍵字**而不是整句：目的頁的句子本來就與卡片上的措辭
 * 不同（那是兩個位置的文案），逐字比會綁死一份不該綁的文案。
 */
describe("被拿掉的四句話仍然在目的頁上", () => {
  const destinations = [
    {
      page: "apps/web/src/pages/SpecialSituationPage.vue",
      keywords: ["不提供診斷", "無法判斷你能否曝曬"],
      why: "醫療邊界。DESIGN.md 第九節：不作疾病診斷或求助分級"
    },
    {
      page: "apps/web/src/pages/InstallPage.vue",
      keywords: ["不安裝仍可使用核心功能"],
      why: "決策條件：防止使用者誤以為非裝不可"
    },
    {
      page: "apps/web/src/pages/settings/DataSettingsPage.vue",
      keywords: ["免登入即可使用", "只留於本機"],
      why: "隱私決策條件：免登入是這個產品的核心承諾"
    },
    {
      page: "apps/web/src/pages/FeedbackPage.vue",
      keywords: ["免登入即可回報"],
      why: "決策條件，直接影響使用者要不要填"
    }
  ] as const;

  for (const { page, keywords, why } of destinations) {
    it.each(keywords)(`${page} 仍然說「%s」`, (keyword) => {
      expect(readFileSync(page, "utf8"), `不可刪的理由：${why}`).toContain(
        keyword
      );
    });
  }
});
