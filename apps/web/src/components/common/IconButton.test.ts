// @vitest-environment happy-dom
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import IconButton from "./IconButton.vue";

/**
 * 共用圖示按鈕的守門（2026-08-31）。
 *
 * 使用者的原話是「可以做成共用元件嗎？我怕改一個其他沒一起動到」——那個
 * 顧慮當時就是事實：`.icon-button` 只規定圓圈與命中區，圖示尺寸由八個
 * 呼叫端各自決定，所以把叉叉縮成 compact 時只動到兩處，其餘六處還是
 * 24px 圖示配 44px 圓圈。
 *
 * 所以這裡守兩件事：元件本身的不變式，以及**沒有人繞過它**。
 */

const sourceRoot = "apps/web/src";

/** 元件自己與這個測試檔以外，不得再出現 `class="icon-button"`。 */
const ALLOWED_RAW_CLASS = new Set([
  "apps/web/src/components/common/IconButton.vue"
]);

const strip = (source: string): string =>
  source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

function discoverVueFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) return discoverVueFiles(entryPath);
    return entry.name.endsWith(".vue") ? [entryPath] : [];
  });
}

describe("IconButton", () => {
  it("命中區維持 44px 的 compact 外觀，圖示 20px", () => {
    const wrapper = mount(IconButton, {
      props: { icon: "tool-close", label: "關閉" }
    });

    const button = wrapper.get("button");
    expect(button.classes()).toContain("icon-button");
    expect(button.classes()).toContain("icon-button--compact");
    expect(button.attributes("type")).toBe("button");
    expect(button.get("svg").attributes("width")).toBe("20");
  });

  /*
   * 只有圖示的按鈕沒有可讀名稱就是無名控制項。label 在型別上是必填，
   * 這條守的是「必填的那個值真的接到 aria-label 上」——型別擋得住忘記
   * 傳，擋不住傳了卻沒接。
   */
  it("label 接到 aria-label", () => {
    const wrapper = mount(IconButton, {
      props: { icon: "tool-arrow-left", label: "回上一頁" }
    });

    expect(wrapper.get("button").attributes("aria-label")).toBe("回上一頁");
  });

  /*
   * fallthrough 是這個元件能取代八個呼叫端的前提：額外的 class 與
   * disabled 都要落到 <button> 上，否則呼叫端只好自己重寫一顆按鈕，
   * 又回到收斂前的狀態。
   */
  it("額外的 class 與 disabled 會落到 button 上", () => {
    const wrapper = mount(IconButton, {
      props: { icon: "tool-close", label: "關閉" },
      attrs: { class: "setup-shell__back", disabled: true }
    });

    const button = wrapper.get("button");
    expect(button.classes()).toContain("setup-shell__back");
    expect(button.attributes("disabled")).toBeDefined();
  });
});

describe("沒有人繞過 IconButton", () => {
  const files = discoverVueFiles(sourceRoot).sort();

  it("有掃到檔案（避免走訪壞掉時靜默通過）", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  for (const file of files.filter(
    (path) => !ALLOWED_RAW_CLASS.has(path.replaceAll("\\", "/"))
  )) {
    it(`${file} 不直接寫 class="icon-button"`, () => {
      /*
       * 比對完整的 class 屬性值而不是子字串——`toContain("icon-button")`
       * 會被 `.icon-button--compact` 的 CSS 選擇器與 `setup-shell__back`
       * 這類名稱干擾（CLAUDE.md 守門測試段的坑二）。這裡只抓 template 裡
       * 直接掛在元素上的那一種寫法。
       */
      expect(strip(readFileSync(file, "utf8"))).not.toMatch(
        /class="icon-button(?:[ "])/
      );
    });
  }
});
