// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import HomeUvHeadline from "./HomeUvHeadline.vue";

const source = readFileSync(
  "apps/web/src/components/home/HomeUvHeadline.vue",
  "utf8"
).replace(/\/\*[\s\S]*?\*\//g, "");

/*
 * 2026-08-31：讀數右側多了前往五日預報的 RouterLink，所以掛載時要 stub
 * 掉它——這個元件本身不需要 router，只是借用連結。
 */
const GLOBAL = { stubs: { RouterLink: { template: "<a><slot /></a>" } } };

function mountHeadline(riskLevel: string | null, uvi: number | null) {
  return mount(HomeUvHeadline, {
    props: {
      eyebrow: "今日 UV",
      uvi,
      riskLevel,
      note: null
    } as never,
    global: GLOBAL
  });
}

describe("HomeUvHeadline 風險色", () => {
  it("讀數與等級都帶上風險等級的修飾類別", () => {
    const value = mountHeadline("moderate", 5).get(".uv-headline__value");

    expect(value.classes()).toContain("uv-headline__value--moderate");
  });

  /*
   * 沒有資料時不上色，也不顯示 0——0 是合法的 UV 值，拿它當「沒資料」會讓
   * 使用者以為紫外線很低。
   */
  it("沒有資料時不套用任何風險色", () => {
    const wrapper = mountHeadline(null, null);

    expect(wrapper.find(".uv-headline__value").exists()).toBe(false);
    expect(wrapper.text()).toContain("無資料");
    expect(wrapper.text()).not.toContain("0");
  });

  /**
   * 抓「這個等級的這個元素」實際拿到的宣告。
   *
   * 兩個元素現在共用同一條規則（選擇器逗號並列），所以只比對整段規則
   * 文字會讓讀數與標籤互相掩護——拿掉任何一邊都還是綠的。因此逐一確認
   * **各自**出現在選擇器清單裡。
   */
  function declaredColor(level: string, element: string): string | null {
    const selector = `.uv-headline__value--${level} .uv-headline__${element}`;
    for (const match of source.matchAll(/([^{}]+){([^}]*)}/g)) {
      const selectors = match[1]!.split(",").map((part) => part.trim());
      if (selectors.includes(selector)) return match[2]!;
    }
    return null;
  }

  /*
   * 2026-08-31：讀數與等級標籤都直接上 UV 風險色。
   *
   * 這條之前是反過來的——標籤必須用 color-mix 的淡色底，因為 UV 五色在
   * 暖象牙底上有三個過不了一般字級的 4.5:1。同日色票壓暗後五級全部及格
   * （對比度由 packages/ui/src/uvRiskContrast.test.ts 守著），繞道的理由
   * 消失，兩者統一。
   *
   * 讀數與標籤分成兩條測試，不合併：合併的話少上色任何一邊都會被另一邊
   * 掩護。
   */
  const LEVEL_TOKENS = [
      ["low", "--color-uvi-low"],
      ["moderate", "--color-uvi-moderate"],
      ["high", "--color-uvi-high"],
      ["very_high", "--color-uvi-very-high"],
      ["extreme", "--color-uvi-extreme"]
  ] as const;

  it("讀數直接上風險色", () => {
    for (const [level, token] of LEVEL_TOKENS) {
      expect(declaredColor(level, "figure"), level).toContain(
        `color: var(${token});`
      );
    }
  });

  it("等級標籤直接上風險色，不再用 color-mix 淡色底繞道", () => {
    for (const [level, token] of LEVEL_TOKENS) {
      const declarations = declaredColor(level, "level");
      expect(declarations, level).toContain(`color: var(${token});`);
      expect(declarations, `${level} 不該還留著淡色底`).not.toContain(
        "color-mix"
      );
    }
  });
});

/*
 * 2026-08-31：拿掉地區與溫度那一行，並把 UV 區塊上下框上分隔線
 * （使用者要求，位置由截圖指定）。
 *
 * 三件事分開守，因為它們可以互相掩護：只守「沒有地區」→ 溫度可以留著；
 * 只守「有分隔線」→ 地區可以回來；只守「note 有條件」→ 白天可以又固定
 * 顯示「地區預報」。
 */
describe("HomeUvHeadline 的精簡與分隔線", () => {
  const source = readFileSync(
    "apps/web/src/components/home/HomeUvHeadline.vue",
    "utf8"
  )
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

  it("不再接收地區與溫度", () => {
    expect(source).not.toContain("regionName");
    expect(source).not.toContain("temperatureCelsius");
  });

  it("UV 區塊上下都有分隔線", () => {
    expect(source).toContain("border-block: 1px solid var(--border-subtle);");
  });

  /*
   * note 只在真的有話說時才佔位。原本白天固定送「地區預報」，那四個字
   * 沒有資訊量——這個 App 的 UV 本來就只有地區預報一種來源。
   */
  it("沒有 note 時不留空的一列", () => {
    const wrapper = mount(HomeUvHeadline, {
      props: { eyebrow: "今日 UV", uvi: 4, riskLevel: "moderate", note: null },
      global: GLOBAL
    });

    expect(wrapper.find(".uv-headline__note").exists()).toBe(false);
  });

  it("有 note 時照常顯示（夜間的今明對比）", () => {
    const wrapper = mount(HomeUvHeadline, {
      props: {
        eyebrow: "明日 UV 預報",
        uvi: 5,
        riskLevel: "moderate",
        note: "明天比今天高 1"
      },
      global: GLOBAL
    });

    expect(wrapper.get(".uv-headline__note").text()).toBe("明天比今天高 1");
  });
});

/*
 * 2026-08-31：讀數右側加上前往五日預報的入口（使用者要求）。
 *
 * 這推翻了 2026-08-24 的「這裡不再重複一個入口」——當時的顧慮是重複，但
 * 頁首那個入口看起來像狀態顯示而不是連結，實際可點卻沒人知道可點。
 */
describe("HomeUvHeadline 的五日預報入口", () => {
  it("有 UV 值時顯示前往 /forecast 的連結", () => {
    const wrapper = mount(HomeUvHeadline, {
      props: { eyebrow: "今日 UV", uvi: 4, riskLevel: "moderate", note: null },
      global: {
        stubs: {
          RouterLink: {
            props: ["to"],
            template: '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    const link = wrapper.get(".uv-headline__more");
    expect(link.attributes("href")).toBe("/forecast");
    expect(link.text()).toContain("五日預報");
  });

  /*
   * 沒有 UV 值時整個 value 區塊都不渲染，入口自然也不在——那是對的：
   * 沒有資料可看時，「看更多」沒有意義。
   */
  it("沒有 UV 值時不顯示入口", () => {
    const wrapper = mountHeadline(null, null);

    expect(wrapper.find(".uv-headline__more").exists()).toBe(false);
  });
});
