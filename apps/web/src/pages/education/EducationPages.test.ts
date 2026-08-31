import { readFileSync } from "node:fs";
// @vitest-environment happy-dom

import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter, type Router } from "vue-router";
import { afterEach, describe, expect, it } from "vitest";
import EducationArticlePage from "./EducationArticlePage.vue";
import EducationCategoryPage from "./EducationCategoryPage.vue";
import EducationIndexPage from "./EducationIndexPage.vue";
import { clearEducationSeo } from "../../features/education/educationSeo";

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

describe("公開衛教頁", () => {
  it("首頁呈現六個使用流程分類與草稿審閱提示", () => {
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
    expect(wrapper.text()).toContain("暫不列入搜尋索引");
    expect(
      document.querySelector<HTMLMetaElement>('meta[name="robots"]')?.content
    ).toBe("noindex,follow");
  });

  it("文章頁以可見摘要、審閱狀態與 canonical/Schema 呈現", async () => {
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
    expect(wrapper.text()).toContain("專業審閱中");
    expect(wrapper.text()).toContain("本文為一般衛教草稿");
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
