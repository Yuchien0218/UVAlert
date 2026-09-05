// @vitest-environment happy-dom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import IconLead from "./IconLead.vue";

/**
 * IconLead 是圖示量表上緣（40／56）的唯一出口。
 *
 * 使用者 2026-08-31 的要求是「如果有共通元素可以建立的一起建，以免大小
 * 改一個又跑掉」——所以除了驗證這個元件本身，也要擋住「有人繞過它、
 * 直接在別處寫 :size="40"」，否則共通元素只是多了一個選項而不是唯一出口。
 */

const SRC = "apps/web/src/";

/** 掃描前先剝註解——理由見 CLAUDE.md「守門測試：坑一」。 */
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

describe("IconLead", () => {
  it("lead 檔位是 40px", () => {
    const wrapper = mount(IconLead, { props: { icon: "nav-reminder" } });

    expect(wrapper.get("svg").attributes("width")).toBe("40");
  });

  it("hero 檔位是 56px", () => {
    const wrapper = mount(IconLead, {
      props: { icon: "nav-reminder", size: "hero" }
    });

    expect(wrapper.get("svg").attributes("width")).toBe("56");
  });

  /*
   * 圖示是 decorative：這個元件的前提就是插槽裡有可見文字。若哪天改成
   * 非 decorative，螢幕閱讀器會把圖示的 <title> 連同插槽文字讀兩次。
   */
  it("圖示是 decorative，不重複播報", () => {
    const wrapper = mount(IconLead, { props: { icon: "nav-reminder" } });

    expect(wrapper.get("svg").attributes("aria-hidden")).toBe("true");
  });

  /*
   * **這條才是使用者真正要的保證。**
   *
   * 比對完整的屬性字串而不是數字片段——`:size="40"` 而不是 `40`，理由見
   * CLAUDE.md「守門測試：坑二」（toContain 比子字串，`400` 會誤中）。
   */
  it("40 與 56 不出現在 IconLead 以外的地方", () => {
    const offenders: string[] = [];
    for (const path of vueFiles(SRC)) {
      if (path.endsWith("IconLead.vue")) continue;
      const code = stripComments(readFileSync(path, "utf8"));
      for (const literal of ['size="40"', 'size="56"']) {
        if (code.includes(literal)) offenders.push(`${path} → ${literal}`);
      }
    }

    expect(offenders, "領銜尺寸只能經由 IconLead 使用").toEqual([]);
  });
});
