// @vitest-environment happy-dom

import type { ZoneProjection } from "@sunshield/contracts";
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ReapplicationProductChoice } from "../../features/reapplication/createReapplicationController";
import ReapplicationProductAssignments from "./ReapplicationProductAssignments.vue";

function zone(
  id: string,
  code: ZoneProjection["bodyZoneCode"]
): ZoneProjection {
  return {
    zoneInstanceId: id,
    bodyZoneCode: code,
    customLabel: null,
    trackingStatus: "active"
  } as ZoneProjection;
}

const zones = [
  zone("z-forehead", "face_forehead"),
  zone("z-arms", "arms"),
  zone("z-hands", "hand_backs")
];

const choices: ReapplicationProductChoice[] = [
  {
    choiceId: "product:a",
    displayName: "日常防曬",
    sourceProductId: "a",
    snapshotFingerprint: "fp-a",
    snapshot: {} as ReapplicationProductChoice["snapshot"],
    selectable: true,
    restriction: null
  },
  {
    choiceId: "product:b",
    displayName: "海邊防曬",
    sourceProductId: "b",
    snapshotFingerprint: "fp-b",
    snapshot: {} as ReapplicationProductChoice["snapshot"],
    selectable: true,
    restriction: null
  }
];

function mountWith(assignments: Record<string, string>) {
  return mount(ReapplicationProductAssignments, {
    props: {
      zones,
      selectedZoneIds: zones.map((item) => item.zoneInstanceId),
      choices,
      assignments,
      errors: {}
    }
  });
}

describe("ReapplicationProductAssignments", () => {
  it("預設收成單一選單，不是每個部位一個", () => {
    const wrapper = mountWith({});
    // 改版前八個部位就八個選單，整頁 3000px 以上。
    expect(wrapper.findAll("select")).toHaveLength(1);
  });

  it("收合模式選一次產品就指派給所有選取的部位", async () => {
    const wrapper = mountWith({});

    await wrapper.get("select").setValue("product:a");

    const emitted = wrapper.emitted("assign") ?? [];
    expect(emitted).toHaveLength(zones.length);
    expect(emitted.map((call) => call[0])).toEqual([
      "z-forehead",
      "z-arms",
      "z-hands"
    ]);
    expect(emitted.every((call) => call[1] === "product:a")).toBe(true);
  });

  /*
   * **2026-09-03（使用者裁決）：整條「不同部位用不同防曬乳」拿掉。**
   *
   * 原本這裡有兩條測試守著「既有紀錄分開指派時自動展開」與「可以手動
   * 展開成逐部位」。那個模式已經不存在——使用者的原話是「不用去紀錄不同
   * 防曬擦不同部位」。
   *
   * 換成守新的規則：永遠只有一個下拉，而且各部位指派不一致時它是空的
   * （顯示其中一瓶會是騙人的，因為介面已經沒辦法表達「分開」）。
   */
  it("永遠只有一個下拉", () => {
    const wrapper = mountWith({
      "z-forehead": "product:a",
      "z-arms": "product:a",
      "z-hands": "product:a"
    });

    expect(wrapper.findAll("select")).toHaveLength(1);
  });

  it("舊資料分開指派過時，下拉是空的，要求重新選一次", () => {
    const wrapper = mountWith({
      "z-forehead": "product:a",
      "z-arms": "product:b",
      "z-hands": "product:a"
    });

    expect(wrapper.findAll("select")).toHaveLength(1);
    expect((wrapper.get("select").element as HTMLSelectElement).value).toBe("");
  });

  /* 反向：一致時要真的把那一瓶顯示出來，不是永遠空白。 */
  it("一致時顯示目前那一瓶", () => {
    const wrapper = mountWith({
      "z-forehead": "product:a",
      "z-arms": "product:a",
      "z-hands": "product:a"
    });

    expect((wrapper.get("select").element as HTMLSelectElement).value).toBe(
      "product:a"
    );
  });
});
