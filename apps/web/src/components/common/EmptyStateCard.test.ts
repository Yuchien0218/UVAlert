// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import EmptyStateCard from "./EmptyStateCard.vue";

describe("EmptyStateCard", () => {
  it("預設用 h2，沒有 role", () => {
    const wrapper = mount(EmptyStateCard, {
      props: { title: "還沒有任何裝備", body: "把常用的防曬乳與裝備記在這裡。" }
    });
    expect(wrapper.get("h2").text()).toBe("還沒有任何裝備");
    expect(wrapper.get("h2").attributes("data-typography-role")).toBe(
      "section-title"
    );
    expect(wrapper.find("h1").exists()).toBe(false);
    expect(wrapper.attributes("role")).toBeUndefined();
    expect(wrapper.get("p").text()).toBe("把常用的防曬乳與裝備記在這裡。");
  });

  it("titleTag=h1 與 role=alert 可覆寫，用於錯誤狀態", () => {
    const wrapper = mount(EmptyStateCard, {
      props: {
        title: "找不到這件裝備",
        body: "這筆裝備紀錄可能已被刪除，或是網址有誤。",
        titleTag: "h1",
        role: "alert"
      }
    });
    expect(wrapper.find("h1").text()).toBe("找不到這件裝備");
    expect(wrapper.get("h1").attributes("data-typography-role")).toBe(
      "page-title"
    );
    expect(wrapper.find("h2").exists()).toBe(false);
    expect(wrapper.attributes("role")).toBe("alert");
  });

  it("actions slot 會渲染在 body 之後", () => {
    const wrapper = mount(EmptyStateCard, {
      props: { title: "標題", body: "說明" },
      slots: { actions: '<button type="button">新增</button>' }
    });
    expect(wrapper.get("button").text()).toBe("新增");
  });
});

/**
 * 2026-09-05：空狀態接上 DESIGN.md 第八節的 56px 檔位。
 *
 * 那個檔位的定義就是「空狀態裡唯一的視覺主體」，但這個元件——全站真正的
 * 空狀態卡——原本完全沒有圖示，而 `IconLead size="hero"` 只用在
 * `HomeNightNotice` 一個地方。**檔位說它是給空狀態的，空狀態卻沒有用它。**
 */
describe("空狀態的 56px 圖示", () => {
  const mountWith = (props: Record<string, unknown>) =>
    mount(EmptyStateCard, {
      props: { title: "還沒有任何裝備", body: "說明", ...props }
    });

  /*
   * 比對 `icon-lead--hero` 這個完整的類別，不是 `icon-lead`——後者連 40px
   * 的 lead 檔位也會滿足，而 40 與 56 是**角色不同**（一個與標題平起平坐、
   * 一個是唯一的視覺主體），不是大小不同。
   */
  it("傳 icon 時走 IconLead 的 hero 檔位", () => {
    const wrapper = mountWith({ icon: "nav-gear" });
    const lead = wrapper.find(".icon-lead--hero");

    expect(lead.exists()).toBe(true);
    expect(lead.get("svg").attributes("width")).toBe("56");
  });

  /*
   * **標題必須在 IconLead 裡面。** hero 的排法是「圖示在上、文字在下」的
   * column，標題留在外面的話圖示會變成一個孤立的區塊，下面才是標題——那
   * 不是「領銜圖示」，是「圖示 ＋ 另一段內容」。
   */
  it("標題被 hero 的 column 佈局管到", () => {
    const wrapper = mountWith({ icon: "nav-gear" });

    expect(wrapper.get(".icon-lead--hero h2").text()).toBe("還沒有任何裝備");
  });

  /*
   * **反向：不傳 icon 就完全不渲染 IconLead。**
   *
   * 少了這條，「永遠渲染、只是沒有圖形」的實作也會過上面那兩條——那會讓
   * 三個 `role="alert"` 的讀取失敗多出一個空的 flex 容器與它的 gap。
   */
  it("不傳 icon 時沒有 IconLead", () => {
    const wrapper = mountWith({});

    expect(wrapper.find(".icon-lead").exists()).toBe(false);
    expect(wrapper.find("svg").exists()).toBe(false);
    expect(wrapper.get("h2").text()).toBe("還沒有任何裝備");
  });

  /* 有圖示時 body 與 actions 仍在原本的位置。 */
  it("圖示不影響 body 與 actions", () => {
    const wrapper = mount(EmptyStateCard, {
      props: { title: "標題", body: "說明", icon: "nav-gear" },
      slots: { actions: '<button type="button">新增</button>' }
    });

    expect(wrapper.get("p").text()).toBe("說明");
    expect(wrapper.get("button").text()).toBe("新增");
  });
});

/**
 * 呼叫端的判準：**只有「本來就沒有東西」的空狀態配圖示，錯誤狀態不配。**
 *
 * 56 檔位是為「旁邊沒有別的內容」設計的。讀取失敗是暫時性的狀況，不是一個
 * 章節；配一顆 56px 的圖示會把「等一下再試」放大成「這裡就是這樣」。
 */
describe("哪些呼叫端該配圖示", () => {
  const read = (path: string) =>
    readFileSync(path, "utf8").replace(/<!--[\s\S]*?-->/g, "");

  const CALL_SITES = [
    {
      path: "apps/web/src/pages/ProductsPage.vue",
      title: "還沒有任何裝備",
      icon: "nav-gear"
    },
    {
      path: "apps/web/src/pages/help/HelpIndexPage.vue",
      title: "目前沒有可查看的內容",
      icon: "more-about"
    }
  ];

  /*
   * 圖示與各自的入口用**同一顆**：/products 是底部導覽的「裝備」，
   * /help 是 MorePage 清單裡「常見問題」那一列。收起來的東西與它的入口
   * 用同一個記號，讀者才知道自己在看哪一區（同 SetupPage 摘要列的理由）。
   */
  it.each(CALL_SITES)(
    "「$title」用 $icon，與它的入口同一顆",
    ({ path, title, icon }) => {
      const source = read(path);
      const card = new RegExp(
        `<EmptyStateCard[^>]*?title="${title}"`,
        "s"
      ).exec(source)?.[0];

      expect(card, `找不到「${title}」的 EmptyStateCard`).toBeDefined();
      expect(card).toContain(`icon="${icon}"`);
    }
  );

  /*
   * **反向：`role="alert"` 的讀取失敗不可以有圖示。** 少了這條，「所有
   * EmptyStateCard 都加圖示」也會過上面那條。
   */
  it("讀取失敗的那三處沒有圖示", () => {
    const sources = [
      "apps/web/src/pages/ProductsPage.vue",
      "apps/web/src/pages/settings/DataSettingsPage.vue"
    ].map(read);

    const alertCards = sources.flatMap(
      (source) => source.match(/<EmptyStateCard[^>]*?role="alert"[^>]*?\/>/gs) ?? []
    );

    expect(alertCards.length).toBeGreaterThan(0);
    for (const card of alertCards) {
      expect(card, "錯誤狀態不配 56px 圖示").not.toContain("icon=");
    }
  });
});
