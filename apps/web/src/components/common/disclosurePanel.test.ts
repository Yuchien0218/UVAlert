// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import DisclosurePanel from "./DisclosurePanel.vue";

const SOURCE = readFileSync(
  "apps/web/src/components/common/DisclosurePanel.vue",
  "utf8"
);

/** 掃原始碼前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
const stripped = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(
  /<!--[\s\S]*?-->/g,
  ""
);

const mountPanel = (open: boolean) =>
  mount(DisclosurePanel, {
    props: { open },
    slots: { default: '<button type="button">面板裡的按鈕</button>' }
  });

describe("DisclosurePanel", () => {
  it("展開狀態寫在 data-open 上", () => {
    expect(mountPanel(false).get(".disclosure").attributes("data-open")).toBe(
      "false"
    );
    expect(mountPanel(true).get(".disclosure").attributes("data-open")).toBe(
      "true"
    );
  });

  /*
   * **這條守的是從 v-if 改過來時最容易漏掉的那一半。**
   *
   * 面板改成常駐 DOM 之後，收合的內容仍然在焦點順序與無障礙樹裡——高度是 0、
   * 看不見，但 Tab 得進去、螢幕閱讀器照讀。`v-if` 免費提供了這個語意，換成
   * 高度動畫就必須自己補回來，否則是一個看不見的無障礙退步。
   */
  it("收合時整棵子樹是 inert，展開時不是", () => {
    expect(
      mountPanel(false).get(".disclosure__inner").attributes("inert")
    ).toBeDefined();
    expect(
      mountPanel(true).get(".disclosure__inner").attributes("inert")
    ).toBeUndefined();
  });

  /*
   * 裁切只在收合期間存在。一直開著 overflow: hidden 會裁掉焦點框
   * （outline ＋ outline-offset 畫在邊界外面），那是 v-if 時代沒有的問題。
   */
  it("展開動畫結束後解除裁切，開始收合時立刻恢復", async () => {
    const wrapper = mountPanel(false);
    const inner = () => wrapper.get(".disclosure__inner");
    expect(inner().classes()).toContain("is-clipped");

    await wrapper.setProps({ open: true });
    expect(inner().classes(), "展開途中仍要裁切，否則內容會溢出").toContain(
      "is-clipped"
    );

    await wrapper
      .get(".disclosure")
      .trigger("transitionend", { propertyName: "grid-template-rows" });
    expect(inner().classes()).not.toContain("is-clipped");

    await wrapper.setProps({ open: false });
    expect(inner().classes(), "收合一開始就要恢復裁切").toContain("is-clipped");
  });

  /* 內容自己的 opacity／color 過渡也會冒泡上來，不能當成高度動畫結束。 */
  it("只認格線列的過渡，不被冒泡上來的其他過渡騙到", async () => {
    const wrapper = mountPanel(false);
    await wrapper.setProps({ open: true });

    await wrapper
      .get(".disclosure")
      .trigger("transitionend", { propertyName: "opacity" });

    expect(wrapper.get(".disclosure__inner").classes()).toContain("is-clipped");
  });

  /*
   * 高度動畫必須用 grid-template-rows，**不能用 interpolate-size**。
   *
   * interpolate-size 是原訂做法，查證後否決：只有 Chromium 支援
   * （Chrome/Edge 129+），Firefox 與 Safari 都沒有。這是給台灣使用者的
   * 行動優先 PWA，iOS Safari 佔比很高，用它等於多數人看不到動畫。
   */
  it("用 grid-template-rows 而不是 interpolate-size", () => {
    expect(stripped).toContain("grid-template-rows: 0fr;");
    expect(stripped).toContain("grid-template-rows: 1fr;");
    expect(stripped).not.toContain("interpolate-size");
  });

  /*
   * min-height: 0 少了的話，格線項目的預設 min-height: auto 會擋住 0fr，
   * 動畫看起來完全沒發生——而且 DOM、類別、data-open 全都是對的。
   */
  it("內層有 min-height: 0", () => {
    expect(stripped).toMatch(/\.disclosure__inner\s*\{[^}]*min-height:\s*0;/);
  });
});
