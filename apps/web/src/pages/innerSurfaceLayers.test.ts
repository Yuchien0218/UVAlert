import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * 卡片裡的內層區塊不可以與卡片同色（2026-09-04，待修清單第 3／4 項）。
 *
 * 兩頁踩到同一個坑：內層框用了 `--surface-soft`／`--color-surface-soft`，
 * 而那正是 `.app-card` 自己的底色（`--surface-primary` 就是它的別名）。
 * 於是那個框只做了一件事——把文字往內縮 12px，畫面上卻沒有任何可見的理由。
 *
 * 實測通知設定頁：卡片標題起於 41px、框內文字起於 53px、另一個框 58px。
 * 三種左緣沒有一種是刻意的層級。
 */

const strip = (source: string): string =>
  source.replace(/<!--[\s\S]*?-->/g, "").replace(/\/\*[\s\S]*?\*\//g, "");

const read = (path: string): string => strip(readFileSync(path, "utf8"));

function rule(css: string, selector: string): string {
  const start = css.indexOf(`${selector} {`);
  expect(start, `找不到 ${selector}`).toBeGreaterThanOrEqual(0);
  return css.slice(start, css.indexOf("}", start));
}

const GEAR_FORM = read("apps/web/src/components/product/GearForm.vue");
const NOTIFY = read("apps/web/src/pages/settings/NotificationSettingsPage.vue");

describe("內層區塊用深一階的表面", () => {
  it.each([
    ["GearForm 的品類提示", GEAR_FORM, ".category-effect"],
    ["通知設定的狀態框", NOTIFY, ".note-box"]
  ])("%s 用 --color-surface-card", (_name, css, selector) => {
    expect(rule(css, selector)).toContain(
      "background: var(--color-surface-card);"
    );
  });

  /*
   * **反向：不可以退回卡片自己的底色。** 這是這次要修掉的東西——
   * `--surface-soft` 與 `--color-surface-soft` 都是同一個值。
   */
  it.each([
    ["GearForm 的品類提示", GEAR_FORM, ".category-effect"],
    ["通知設定的狀態框", NOTIFY, ".note-box"]
  ])("%s 不再用卡片自己的底色", (_name, css, selector) => {
    const declarations = rule(css, selector);

    expect(declarations).not.toContain("background: var(--surface-soft);");
    expect(declarations).not.toContain(
      "background: var(--color-surface-soft);"
    );
  });

  /*
   * 同一頁的兩個內層框用同一個內距。原本一個 16px 一個 12px，於是同一張
   * 卡上有兩種內縮節奏。
   */
  it("通知設定的兩個內層框內距一致", () => {
    expect(rule(NOTIFY, ".note-box")).toContain("padding: var(--space-3);");
    expect(rule(NOTIFY, ".delivery-emphasis")).toContain(
      "padding: var(--space-3);"
    );
  });
});

describe("新增裝備的文案收斂", () => {
  /*
   * 「請依包裝標示填寫。」刪掉——eyebrow「包裝標示」＋ 標題「防曬乳規格
   * 確認」已經說完同一件事，第三次講只是佔一行。
   */
  it("防曬乳那一支不再給說明", () => {
    expect(GEAR_FORM).not.toContain("請依包裝標示填寫。");
  });

  /*
   * **反向一：衣物那一支要留著。** 它講的是「這裡為什麼沒有倒數相關
   * 欄位」，標題沒有涵蓋。
   */
  it("衣物那一支的說明還在", () => {
    expect(GEAR_FORM).toContain("衣物只需要確認身分");
  });

  /*
   * **反向二：空字串時整段不渲染。** 沒有這個 `v-if` 會留下一個空的
   * `<p>`，用空元素撐間距正是 B9 §5 明文禁止的事。
   */
  it("說明是空字串時不渲染空段落", () => {
    expect(
      read("apps/web/src/components/product/ProductSnapshotEditor.vue")
    ).toContain('v-if="description !== \'\'"');
  });

  it("SPF／PA 的說明只留「不影響倒數」", () => {
    expect(GEAR_FORM).not.toContain("只用來認出是哪一罐");
    expect(GEAR_FORM).toContain("SPF 與 PA <strong>不影響補擦倒數</strong>");
  });
});
