// @vitest-environment happy-dom

import { readFileSync } from "node:fs";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ZoneProjection } from "@sunshield/contracts";
import ZoneScopeBadge from "./ZoneScopeBadge.vue";

/**
 * 2026-08-31 第七批（§18.1）：「這件事影響哪些部位」只有一種寫法。
 *
 * 使用者的原話是「所有這種敘述，文字樣式、文字內容、數值都要統一，幫我
 * 檢查」。收斂前有兩份實作，其中夜間首頁還在報數字（「8 個追蹤部位」）。
 */

function zone(id: string, active = true): ZoneProjection {
  return {
    zoneInstanceId: id,
    trackingStatus: active ? "active" : "stopped"
  } as unknown as ZoneProjection;
}

describe("ZoneScopeBadge", () => {
  /*
   * 兩個方向分開守。只守「全部就寫全部位」的話，**全部都寫「全部位」也會
   * 過**——那時就看不出哪一次只影響手臂了。這是 CLAUDE.md 說的「兩個案例
   * 互相掩護」那個坑的反面寫法：固定 A 變 B、固定 B 變 A。
   */
  it("涵蓋全部追蹤中的部位時寫「全部位」，而且是膠囊", () => {
    const zones = [zone("a"), zone("b")];
    const wrapper = mount(ZoneScopeBadge, {
      props: { zoneIds: ["a", "b"], zones }
    });

    expect(wrapper.text()).toBe("全部位");
    expect(wrapper.classes()).toContain("zone-scope--all");
  });

  it("只涵蓋一部分時寫實際名稱，而且不是膠囊", () => {
    const zones = [zone("a"), zone("b")];
    const wrapper = mount(ZoneScopeBadge, {
      props: { zoneIds: ["a"], zones }
    });

    expect(wrapper.text()).not.toBe("全部位");
    expect(wrapper.classes()).not.toContain("zone-scope--all");
  });

  /*
   * 分母只算追蹤中的部位。把停止追蹤的也算進去的話，「全部位」永遠成立
   * 不了——這條擋的正是那種寫法。
   */
  it("已停止追蹤的部位不算進分母", () => {
    const zones = [zone("a"), zone("b", false)];
    const wrapper = mount(ZoneScopeBadge, {
      props: { zoneIds: ["a"], zones }
    });

    expect(wrapper.text()).toBe("全部位");
  });

  it("沒有部位時整個元件不輸出", () => {
    const wrapper = mount(ZoneScopeBadge, {
      props: { zoneIds: [], zones: [zone("a")] }
    });

    expect(wrapper.find("span").exists()).toBe(false);
  });
});

describe("兩個使用點都走同一個元件", () => {
  const strip = (source: string): string =>
    source
      .replace(/<!--[\s\S]*?-->/g, "")
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .replace(/^\s*\/\/.*$/gm, "");

  const files = [
    "apps/web/src/components/reminder/RecentEventsList.vue",
    "apps/web/src/components/home/HomeNightSession.vue"
  ];

  for (const file of files) {
    /*
     * 比對完整的開標籤而不是「ZoneScopeBadge」這個字串——後者連 import 那
     * 一行都算數，元件從畫面上被拿掉之後測試仍然會綠（CLAUDE.md 坑二，
     * 2026-08-31 在 CONTEXT_ICONS 上實際踩過一次）。
     */
    it(`${file} 用 ZoneScopeBadge 顯示部位範圍`, () => {
      expect(strip(readFileSync(file, "utf8"))).toContain("<ZoneScopeBadge");
    });
  }

  it("夜間首頁不再報部位數量", () => {
    expect(
      strip(readFileSync("apps/web/src/components/home/HomeNightSession.vue", "utf8"))
    ).not.toContain("個追蹤部位");
  });

  /*
   * **各部位狀態的「N 個部位」維持純文字**（使用者 2026-08-31 確認）。
   *
   * 那是「這個群組裡有幾個」的計數，不是範圍描述。三處都套膠囊的話，膠囊
   * 就從「這是一個分類」退化成裝飾。這條擋的是「順手一起統一」。
   */
  it("各部位狀態的計數不改用膠囊", () => {
    const source = strip(
      readFileSync("apps/web/src/components/reminder/ZoneStatusList.vue", "utf8")
    );

    expect(source).toContain("個部位");
    expect(source).not.toContain("<ZoneScopeBadge");
  });
});
