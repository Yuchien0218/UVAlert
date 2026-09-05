// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import Icon from "./Icon.vue";

/**
 * `mono` 是給實心色底用的（見 Icon.vue）。
 *
 * 這裡掛載真的元件而不是掃字串——要驗的是「渲染出來的 SVG 裡沒有寫死的
 * 色值」，那是屬性層級的事實，掃原始碼看不到。
 */
describe("Icon 的 mono", () => {
  /* more-install 的箭頭是琥珀金，也就是「下載」的語意本體。 */
  it("預設保留寫死的重點色", () => {
    const html = mount(Icon, { props: { name: "more-install" } }).html();

    expect(html).toContain("#C1832E");
  });

  it("mono 時所有明確色值改成 currentColor", () => {
    const html = mount(Icon, {
      props: { name: "more-install", mono: true }
    }).html();

    expect(html).not.toMatch(/#[0-9a-fA-F]{3,8}/);
    expect(html).toContain("currentColor");
  });

  /*
   * mono 不該把幾何吃掉——只換顏色。比對描邊數量，因為那是「圖形還在不在」
   * 最直接的證據。
   */
  it("mono 不改變幾何", () => {
    const plain = mount(Icon, { props: { name: "more-install" } }).html();
    const mono = mount(Icon, {
      props: { name: "more-install", mono: true }
    }).html();

    const paths = (html: string) => (html.match(/ d="[^"]+"/g) ?? []).join("|");
    expect(paths(mono)).toBe(paths(plain));
  });
});
