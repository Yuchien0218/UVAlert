// @vitest-environment happy-dom
import type { ZoneProjection } from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import ReapplicationReview from "./ReapplicationReview.vue";

/**
 * 確認區塊改成分組摘要（2026-09-03，使用者要求「這一頁太長」）。
 *
 * 改動前它把每個選取的部位一行一行再列一次，13 個部位量到 488px，是這一頁
 * 最高的區塊之一——而內容上面三張卡全部顯示過（部位清單就在正上方，勾選
 * 狀態看得見）。
 */

function zone(id: string, code: string): ZoneProjection {
  return {
    zoneInstanceId: id,
    bodyZoneCode: code,
    customLabel: null,
    trackingStatus: "active"
  } as unknown as ZoneProjection;
}

const ZONES = [
  zone("z1", "arms"),
  zone("z2", "legs"),
  zone("z3", "ears")
];

function mountReview(assignments: Record<string, string>) {
  return mount(ReapplicationReview, {
    props: {
      zones: ZONES,
      selectedZoneIds: ["z1", "z2", "z3"],
      choices: [
        { choiceId: "a", displayName: "A 防曬乳" },
        { choiceId: "b", displayName: "B 防曬乳" }
      ] as never,
      assignments,
      appliedAt: "2026-09-03T06:00:00.000Z"
    }
  });
}

describe("確認區塊", () => {
  it("先講會更新幾個部位", () => {
    const text = mountReview({ z1: "a", z2: "a", z3: "a" }).text();

    expect(text).toContain("將更新");
    expect(text).toContain("3");
  });

  /*
   * 只印產品名一次——改動前這裡是 13 行，每行右半邊都是同一個名字。
   */
  it("不逐項列出部位", () => {
    const wrapper = mountReview({ z1: "a", z2: "a", z3: "a" });

    expect(wrapper.find(".review__product").text()).toBe("A 防曬乳");
    // 部位名稱不再重複——那份清單就在這張卡的正上方。
    expect(wrapper.text()).not.toContain("手臂");
  });

  /*
   * **2026-09-03（使用者裁決）：不再分組。**
   *
   * 前一版依產品分組，是為了「不同部位用不同防曬乳」那個模式。使用者把
   * 那條路拿掉之後，指派不一致只會來自舊資料——那時要跟上方的下拉一樣顯示
   * 「尚未選擇」，顯示其中一瓶會是騙人的。
   */
  it("指派不一致時說尚未選擇，不挑一瓶顯示", () => {
    const text = mountReview({ z1: "a", z2: "b", z3: "b" }).text();

    expect(text).toContain("尚未選擇");
    expect(text).not.toContain("A 防曬乳");
    expect(text).not.toContain("B 防曬乳");
  });

  it("完全沒選產品時也說尚未選擇", () => {
    expect(mountReview({}).text()).toContain("尚未選擇");
  });
});
