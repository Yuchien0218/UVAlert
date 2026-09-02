// @vitest-environment happy-dom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { RouterLinkStub, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import BackToMoreLink from "./BackToMoreLink.vue";

/**
 * `2026-08-27-copy-a11y-test-dead-code-audit.md` 的結論：「返回更多」是
 * 目前唯一明確「改一次需要 grep 全站」的導覽文案，應抽成元件。
 *
 * 2026-09-02 抽出時有 5 份逐字相同的副本。這一組守的是「不要再長出第六份」
 * ——沒有守門的話，下一個要加返回連結的人最自然的動作就是複製貼上，而那
 * 正是抽出來想解決的事。
 */

const SRC = "apps/web/src/";

/** 掃原始碼前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
function stripComments(source: string): string {
  return source
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

function vueFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry !== "generated") vueFiles(path, out);
    } else if (entry.endsWith(".vue")) {
      out.push(path);
    }
  }
  return out;
}

describe("BackToMoreLink", () => {
  it("指向 /more，文字與可及名稱都是「返回更多」", () => {
    const wrapper = mount(BackToMoreLink, {
      global: { stubs: { RouterLink: RouterLinkStub } }
    });

    expect(wrapper.text()).toBe("返回更多");
    expect(wrapper.getComponent(RouterLinkStub).props("to")).toBe("/more");
  });

  /* 樣式沿用既有的 muted 文字連結——抽元件是收斂，不是重新設計。 */
  it("沿用 text-link--muted，外觀不變", () => {
    const wrapper = mount(BackToMoreLink, {
      global: { stubs: { RouterLink: RouterLinkStub } }
    });

    expect(wrapper.classes()).toContain("text-link");
    expect(wrapper.classes()).toContain("text-link--muted");
  });

  /**
   * **這條才是重點。**
   *
   * 比對完整的 `to="/more"` 屬性而不是「返回更多」四個字：後者會誤傷
   * `NotificationSettingsPage` 的 `IconButton label="返回更多"`，那是另一種
   * 出口（右上圖示鈕），它要不要改成箭頭仍在 §1 待裁決，不歸這條管。
   */
  it("沒有人自己貼一份頁尾返回連結", () => {
    const offenders: string[] = [];
    for (const path of vueFiles(SRC)) {
      if (path.endsWith("BackToMoreLink.vue")) continue;
      const code = stripComments(readFileSync(path, "utf8"));
      if (/<RouterLink[^>]*to="\/more"/.test(code)) offenders.push(path);
    }

    expect(offenders, "頁尾返回連結一律用 BackToMoreLink").toEqual([]);
  });
});
