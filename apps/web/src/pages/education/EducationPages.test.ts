import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { afterEach, describe, expect, it } from "vitest";
import EducationArticlePage from "./EducationArticlePage.vue";
import EducationCategoryPage from "./EducationCategoryPage.vue";
import EducationIndexPage from "./EducationIndexPage.vue";
import { ICONS } from "../../generated/icons.generated";
import {
  buildEducationTitle,
  clearEducationSeo
} from "../../features/education/educationSeo";

function makeRouter(component: object, path: string): Router {
  return createRouter({
    history: createMemoryHistory(),
    routes: [
      { path, component },
      { path: "/education", component: EducationIndexPage },
      { path: "/education/:category", component: EducationCategoryPage },
      { path: "/education/articles/:slug", component: EducationArticlePage }
    ]
  });
}

afterEach(() => {
  clearEducationSeo();
  document.body.innerHTML = "";
});

/** 掃描 apps/web/src 底下所有 .vue，用來確認某個樣式沒有外流。 */
function educationScanTargets(dir = "apps/web/src", out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "generated") educationScanTargets(path, out);
    } else if (entry.endsWith(".vue")) {
      out.push(path);
    }
  }
  return out;
}

describe("公開衛教頁", () => {
  it("首頁呈現六個使用流程分類", () => {
    const wrapper = mount(EducationIndexPage, {
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } }
    });

    expect(wrapper.text()).toContain("防曬衛教");
    expect(wrapper.text()).toContain("了解今天的 UV");
    expect(wrapper.text()).toContain("出門前準備");
    expect(wrapper.text()).toContain("外出中的補擦");
    expect(wrapper.text()).toContain("流汗或碰水後");
    expect(wrapper.text()).toContain("回家後與皮膚照顧");
    expect(wrapper.text()).toContain("特殊情況");
    /*
     * 2026-08-31：審閱狀態的**可見文字**整批抽掉（使用者要報告，內容還
     * 沒審完）。robots 的 noindex **刻意保留**——那是給搜尋引擎看的，
     * 不是給讀者看的；把未審閱的健康內容送進索引是另一回事。
     */
    expect(wrapper.text()).not.toContain("審閱");
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content
    ).toBe("noindex,follow");
  });

  it("文章頁以可見摘要與 canonical/Schema 呈現", async () => {
    const router = makeRouter(
      EducationArticlePage,
      "/education/articles/:slug"
    );
    await router.push("/education/articles/what-is-uv-index");
    await router.isReady();
    const wrapper = mount(EducationArticlePage, {
      global: { plugins: [router] }
    });

    expect(wrapper.find("h1").text()).toContain("UV 指數怎麼看");
    expect(wrapper.text(), "審閱狀態的可見文字已抽掉").not.toContain("審閱");
    const divider = wrapper.find(".education-article-body hr");
    expect(divider.exists()).toBe(true);
    /*
     * 2026-08-29：分隔線從結尾註記之前移到「文章限制」之前，作用改成標
     * 示「文章本體到此為止，以下是限制、來源與審閱狀態」。所以這裡守的
     * 是它緊接著「文章限制」標題，不再是緊接著結尾註記。
     */
    expect(wrapper.get(".education-article-body hr + h2").text()).toContain(
      "文章限制"
    );
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content
    ).toBe("noindex,follow");
    expect(
      document.querySelector('link[rel="canonical"]')?.getAttribute("href")
    ).toBe("http://localhost:4173/education/articles/what-is-uv-index");
    expect(
      document.querySelectorAll('script[type="application/ld+json"]')
    ).toHaveLength(3);
    expect(
      document.querySelector('script[data-uvalert-seo-kind="article"]')
        ?.textContent
    ).toContain("UV 指數怎麼看");
  });

  it("未知分類不會默默顯示錯誤文章", async () => {
    const router = makeRouter(EducationCategoryPage, "/education/:category");
    await router.push("/education/not-a-real-category");
    await router.isReady();
    const wrapper = mount(EducationCategoryPage, {
      global: { plugins: [router] }
    });

    expect(wrapper.text()).toContain("找不到這篇內容");
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content
    ).toBe("noindex,follow");
  });
});
/*
 * 2026-08-31：文章頁不重複顯示摘要。
 *
 * summary 與 takeawayHtml 講的是同一件事，只是換句話說——使用者回報
 * 「文章內重複顯示摘要」。留下 takeaway（文章自己寫的「先說結論」段落），
 * summary 改成只用在清單卡片與 meta description。
 */
describe("衛教文章頁不重複摘要", () => {
  it("文章頁不再渲染 summary 段落", () => {
    const source = readFileSync(
      "apps/web/src/pages/education/EducationArticlePage.vue",
      "utf8"
    ).replace(/<!--[sS]*?-->/g, "");

    /*
     * 守的是**可見的插值**，不是「檔案裡不准出現 article.summary」——
     * EducationSeoHead 的 :description 仍然要用它，那不是畫面上的文字。
     */
    expect(source).not.toContain("{{ article.summary }}");
    // takeaway 必須還在——它才是文章的結論段落。
    expect(source).toContain("article.takeawayHtml");
  });

  /* summary 沒有被刪除，SEO 仍然要用它當 meta description。 */
  it("summary 仍然用於 meta description", () => {
    const seo = readFileSync(
      "apps/web/src/features/education/educationSeo.ts",
      "utf8"
    );

    expect(seo).toContain("description: article.summary");
  });
});

/*
 * 2026-08-31：分類卡從「左圖右文兩欄」改成「圖示併進標題列」的單欄。
 *
 * 起因是使用者回報「icon 下方空白太多」。實測那張卡：高 175px、圖示
 * 32px、**圖示下方是一根 122px 的空柱子**，每張卡重複一次。
 *
 * 三件事分開守。合成一條的話彼此掩護：只守「圖示在標題列」→ 卡片可以
 * 又變回兩欄；只守「單欄」→ 圖示可以整個消失；只守「主題頁有圖示」→
 * 它可以跟首頁指到不同的圖示。
 */
describe("衛教分類的圖示版型", () => {
  it("分類卡是單欄，沒有獨立的圖示欄", () => {
    const source = readFileSync(
      "apps/web/src/pages/education/EducationIndexPage.vue",
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\//g, "");

    expect(source).toContain(".education-category-card {");
    expect(source, "不該再有圖示專用的第一欄").not.toContain(
      "grid-template-columns: auto minmax(0, 1fr)"
    );
  });

  it("分類卡的圖示與標題在同一列", async () => {
    const router = makeRouter(EducationIndexPage, "/education");
    await router.push("/education");
    await router.isReady();
    const wrapper = mount(EducationIndexPage, { global: { plugins: [router] } });

    /*
     * **六張卡全部檢查，不是只看第一張。** 第一張是 hero，走的是另一段
     * 模板；只看它的話，另外五張的圖示被搬出標題列也不會被抓到（寫這條
     * 時實測過：只驗第一張時，把 secondary 卡的標題移出 IconLead 仍然全綠）。
     */
    const cards = wrapper.findAll("a.education-category-card");
    expect(cards).toHaveLength(6);

    for (const card of cards) {
      const lead = card.get(".icon-lead");
      // 標題必須在 IconLead 裡面，不是它的兄弟節點——那才是「同一列」。
      expect(lead.find("strong").exists()).toBe(true);
      expect(lead.find("svg").exists()).toBe(true);
    }
  });

  /*
   * 主題頁的圖示必須跟首頁那張卡是**同一顆**。從卡片點進來之後圖示還在
   * 原地，讀者才知道自己進了哪一個主題；兩邊各自維護一份對應表的話，
   * 遲早會指到不同的圖示。
   */
  it("主題頁標題帶著跟分類卡同一顆圖示", async () => {
    const router = makeRouter(EducationCategoryPage, "/education/:category");
    await router.push("/education/sweat-and-water");
    await router.isReady();
    const wrapper = mount(EducationCategoryPage, {
      global: { plugins: [router] }
    });

    const lead = wrapper.get(".page-heading .icon-lead");

    expect(lead.get("h1").text()).toBe("流汗或碰水後");
    /*
     * 比對圖示幾何裡一段獨有的 path，不比整段 body——DOM parse 之後屬性
     * 順序會變，比整段等於在比對瀏覽器的序列化細節而不是圖示本身。
     */
    const geometry = /d="([^"]+)"/.exec(
      ICONS["education-sweat-and-water"].body
    )?.[1];

    expect(geometry).toBeDefined();
    expect(lead.get("svg").html()).toContain(geometry!);
  });
});

/*
 * 2026-08-31：審閱狀態的可見文字整批抽掉（使用者「我要報告了，內容還沒
 * 做完」）。
 *
 * **三頁分開守。** 只守一頁的話，另外兩頁的徽章或提示可以留著——三頁各自
 * 有一套（首頁的分類卡徽章、主題頁的文章卡徽章、文章頁的 meta 與提示），
 * 是三份獨立的實作。
 *
 * 掃 wrapper.text() 而不是原始碼：原始碼裡的註解本來就會提到「審閱」，
 * 而這裡要守的正是「讀者看不到」，text() 才是讀者看到的東西。
 */
describe("衛教頁不顯示審閱狀態", () => {
  it("首頁沒有審閱字樣", () => {
    const wrapper = mount(EducationIndexPage, {
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } }
    });

    expect(wrapper.text()).not.toContain("審閱");
    expect(wrapper.text()).not.toContain("已發布");
  });

  it("主題頁沒有審閱字樣", async () => {
    const router = makeRouter(EducationCategoryPage, "/education/:category");
    await router.push("/education/sweat-and-water");
    await router.isReady();
    const wrapper = mount(EducationCategoryPage, {
      global: { plugins: [router] }
    });

    expect(wrapper.text()).not.toContain("審閱");
    expect(wrapper.text()).not.toContain("已發布");
  });

  it("文章頁沒有審閱字樣，連內文結尾那句也不再出現", async () => {
    const router = makeRouter(
      EducationArticlePage,
      "/education/articles/:slug"
    );
    await router.push("/education/articles/what-is-uv-index");
    await router.isReady();
    const wrapper = mount(EducationArticlePage, {
      global: { plugins: [router] }
    });

    expect(wrapper.text()).not.toContain("審閱");
    expect(wrapper.text()).not.toContain("已發布");
  });

  /*
   * 內文那句是 48 篇 markdown 各自帶的一行，不是元件渲染的——所以要往
   * 產生出來的內容裡查，元件層的斷言看不到它有沒有回來。
   */
  it("48 篇文章的內文都不含審閱狀態那句", () => {
    const generated = readFileSync(
      "apps/web/src/features/education/education-content.generated.ts",
      "utf8"
    );

    expect(generated).not.toContain("尚未完成 UVAlert 專業審閱");
  });

  /*
   * **noindex 必須留著。** 抽掉的是給讀者看的文字，不是給搜尋引擎看的
   * 狀態；未完成審閱的健康內容不該進索引。這條擋住「順手一起清掉」。
   */
  it("robots 仍然是 noindex", () => {
    mount(EducationIndexPage, {
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } }
    });

    expect(
      document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content
    ).toBe("noindex,follow");
  });
});

/*
 * 2026-08-31：文章頁的兩條分隔線統一成波浪。
 *
 * 原本內文那條 hr 是波浪、「同主題延伸閱讀」是橫跨整段的 1px 直線——同一
 * 篇文章裡兩種分隔語言。波浪承載的是**語氣的轉折**（從「教你怎麼做」轉到
 * 「這篇文章不負責什麼」、從正文轉到延伸閱讀），直線做不到，所以是把直線
 * 改成波浪，不是反過來。
 *
 * 三件事分開守，因為它們可以互相掩護：只守「延伸閱讀有波浪」→ 直線可以
 * 留著並存；只守「沒有 border-top」→ 波浪可以整個不見；只守「不外流」→
 * 衛教頁自己可以先變回直線。
 */
describe("衛教長文的波浪分隔線", () => {
  const articleSource = readFileSync(
    "apps/web/src/pages/education/EducationArticlePage.vue",
    "utf8"
  ).replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

  it("延伸閱讀用波浪，不是直線", async () => {
    const router = makeRouter(
      EducationArticlePage,
      "/education/articles/:slug"
    );
    await router.push("/education/articles/what-is-uv-index");
    await router.isReady();
    const wrapper = mount(EducationArticlePage, {
      global: { plugins: [router] }
    });

    expect(
      wrapper.get(".education-related").find("hr.wave-divider").exists()
    ).toBe(true);
  });

  it("延伸閱讀不再有 border-top", () => {
    // 比對完整宣告而不是 "border-top" 片段——理由見 CLAUDE.md「坑二」。
    expect(articleSource).not.toContain(
      "border-top: 1px solid var(--border-subtle);"
    );
  });

  /*
   * 波浪只用在衛教長文。它一旦變成通用分隔元素就退回裝飾了，而且波浪在
   * 這個 App 的其他地方已經有語意（水：入水時間、耐水時間、水上活動），
   * 拿去當通用裝飾會稀釋掉那個意義。
   */
  it("wave-divider 不外流到衛教以外的頁面", () => {
    const offenders: string[] = [];
    for (const path of educationScanTargets()) {
      if (path.includes("education")) continue;
      const code = readFileSync(path, "utf8")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\/\*[\s\S]*?\*\//g, "");
      if (code.includes("wave-divider")) offenders.push(path);
    }

    expect(offenders, "波浪只用在衛教長文").toEqual([]);
  });
});

/*
 * 2026-08-31：<title> 不重複相鄰的同名區段。
 *
 * 衛教首頁自己的標題就叫「防曬衛教」，套進 `${title}｜防曬衛教｜UVAlert`
 * 之後實際輸出是「防曬衛教｜防曬衛教｜UVAlert」——同一個詞連著出現兩次。
 *
 * 修法是「去掉與前一段相同的段落」而不是特判首頁：將來若有別的頁面剛好
 * 叫「防曬衛教」，或區段名改了，都不必再改一次。
 */
describe("衛教頁的 <title>", () => {
  /*
   * 兩件事分開守：首頁是**會**去重的那一個，主題頁是**不該**被去重誤傷的
   * 那一個。只守首頁的話，把整個尾綴拿掉也會過。
   */
  it("首頁不重複「防曬衛教」", () => {
    expect(buildEducationTitle("防曬衛教")).toBe("防曬衛教｜UVAlert");
  });

  it("一般頁面仍然保留完整的三段", () => {
    expect(buildEducationTitle("流汗或碰水後")).toBe(
      "流汗或碰水後｜防曬衛教｜UVAlert"
    );
  });

  it("實際掛載首頁時 document.title 沒有重複", () => {
    mount(EducationIndexPage, {
      global: { stubs: { RouterLink: { template: "<a><slot /></a>" } } }
    });

    expect(document.title).toBe("防曬衛教｜UVAlert");
  });

  /*
   * SPA 與靜態產生器必須輸出同一個標題，否則同一個網址在有無 JS 兩種情況
   * 下標題不一樣。這條掃產生器的原始碼，確認它也走了同一條規則。
   */
  it("靜態產生器用同一條規則", () => {
    const generator = readFileSync(
      "tools/education/generate-public-site.mjs",
      "utf8"
    ).replace(/\/\*[\s\S]*?\*\//g, "");

    expect(generator).toContain("function buildTitle(pageTitle)");
    expect(
      generator,
      "不該再有寫死的三段尾綴"
    ).not.toContain("｜防曬衛教｜UVAlert</title>");
  });
});
