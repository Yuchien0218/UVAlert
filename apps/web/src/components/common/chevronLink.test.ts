// @vitest-environment happy-dom
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ChevronLink from "./ChevronLink.vue";

/**
 * 「文字 ＋ 右側箭頭」的次要入口只有一份實作。
 *
 * 2026-08-31 清點時這個形狀在三個地方各寫一份，而且三份長得不一樣（12px
 * vs 16px、gap space-1 vs space-2、有無 44px 命中區）。使用者的原話是
 * 「我怕改一個其他沒跟著改到」——這條測試把那個擔心換成機制。
 *
 * vitest 的 cwd 是 repo 根目錄。
 */

const SRC = "apps/web/src";

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

/**
 * 「文字後面接一個 chevron」以外的用法。
 *
 * 這些是**另一種形狀**，不是漏改：chevron 在文字左邊、包在有邊框的
 * `button--quiet` 裡（補上購買紀錄／填寫包裝標示），或是卡片標題列右端的
 * 指示（情境群組、快速防護摘要、裝備清單項目）。它們的容器本身就是按鈕，
 * 套 ChevronLink 會變成按鈕裡包按鈕。
 *
 * 列成白名單而不是放寬條件：之後多一個 chevron 使用點時這條會紅，逼人
 * 回來判斷它屬於哪一種，而不是默默地又長出第四種樣子。
 */
const CHEVRON_OUTSIDE_COMPONENT = [
  "components/product/GearForm.vue",
  "components/product/GearListItem.vue",
  "components/product/ProductSnapshotEditor.vue",
  "components/setup/ContextSelector.vue",
  "components/setup/QuickProtectionSummary.vue"
];

describe("ChevronLink", () => {
  it("導覽用法渲染成連結，且沒有 aria-expanded", () => {
    const wrapper = mount(ChevronLink, {
      props: { to: "/forecast" },
      slots: { default: "五日預報" },
      global: {
        stubs: {
          RouterLink: { props: ["to"], template: '<a :href="to"><slot /></a>' }
        }
      }
    });

    expect(wrapper.get("a").attributes("href")).toBe("/forecast");
    expect(wrapper.get("a").attributes("aria-expanded")).toBeUndefined();
  });

  /*
   * **Vue 的 boolean prop 轉型是這裡的陷阱。** 型別宣告的 boolean prop
   * 沒傳時會變成 `false` 而不是 `undefined`，所以不能用「expanded 是不是
   * undefined」判斷這是不是展開控制——寫這條測試時實測到導覽連結長出了
   * `aria-expanded="false"`。改用有沒有給 `controls` 判斷。
   */
  it("展開用法渲染成按鈕，帶 aria-expanded 與 aria-controls", () => {
    const wrapper = mount(ChevronLink, {
      props: { expanded: false, controls: "panel-1" },
      slots: { default: "查看其他 1 筆事件" },
      global: { stubs: { Icon: true } }
    });

    const button = wrapper.get("button");
    expect(button.attributes("type")).toBe("button");
    expect(button.attributes("aria-expanded")).toBe("false");
    expect(button.attributes("aria-controls")).toBe("panel-1");
  });

  /* chevron 換的是圖示 name，不是 transform: rotate（DESIGN.md 第五節）。 */
  it("展開時箭頭朝下，收合時朝右", () => {
    const closed = mount(ChevronLink, {
      props: { expanded: false },
      global: { stubs: { Icon: { props: ["name"], template: "<i>{{ name }}</i>" } } }
    });
    const open = mount(ChevronLink, {
      props: { expanded: true },
      global: { stubs: { Icon: { props: ["name"], template: "<i>{{ name }}</i>" } } }
    });

    expect(closed.text()).toContain("tool-chevron-right");
    expect(open.text()).toContain("tool-chevron-down");
  });

  /*
   * **這條才是使用者要的保證。** 三個使用點必須都走這個元件，而且不能有
   * 第四個地方自己寫一份「文字＋尾端 chevron」。
   */
  it.each([
    "apps/web/src/components/home/HomeUvHeadline.vue",
    "apps/web/src/components/reminder/RecentEventsList.vue",
    "apps/web/src/components/reminder/ZoneStatusList.vue"
  ])("%s 使用 ChevronLink", (path) => {
    expect(stripComments(readFileSync(path, "utf8"))).toContain("<ChevronLink");
  });

  it("沒有別的地方自己刻文字＋尾端 chevron", () => {
    const offenders: string[] = [];
    for (const path of vueFiles(SRC)) {
      const normalized = path.split("\\").join("/");
      if (normalized.endsWith("components/common/ChevronLink.vue")) continue;
      if (
        CHEVRON_OUTSIDE_COMPONENT.some((allowed) =>
          normalized.endsWith(allowed)
        )
      ) {
        continue;
      }

      const code = stripComments(readFileSync(path, "utf8"));
      if (code.includes("tool-chevron-right") && !code.includes("<ChevronLink")) {
        offenders.push(path);
      }
    }

    expect(offenders, "文字＋尾端 chevron 一律用 ChevronLink").toEqual([]);
  });
});
