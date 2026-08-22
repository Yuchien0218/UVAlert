// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import type { ProtectionDraftInput } from "../../features/setup/createSetupController";
import ContextSelector from "./ContextSelector.vue";
import ProtectionAdjustmentSheet from "./ProtectionAdjustmentSheet.vue";
import QuickProtectionSummary from "./QuickProtectionSummary.vue";
import SetupStepShell from "./SetupStepShell.vue";
import ZoneProtectionForm from "./ZoneProtectionForm.vue";

describe("S-03 ContextSelector", () => {
  it("依戶外、室內、水上排序，並折疊室內與水上選項", async () => {
    const wrapper = mount(ContextSelector, {
      props: {
        modelValue: null,
        "onUpdate:modelValue": (value) =>
          wrapper.setProps({ modelValue: value })
      }
    });

    expect(wrapper.text().indexOf("一般戶外")).toBeLessThan(
      wrapper.text().indexOf("戶外運動")
    );
    expect(wrapper.text().indexOf("戶外運動")).toBeLessThan(
      wrapper.text().indexOf("室內活動")
    );
    expect(wrapper.text().indexOf("室內活動")).toBeLessThan(
      wrapper.text().indexOf("水上活動")
    );
    expect(
      wrapper
        .get('button[aria-controls="indoor-context-options"]')
        .attributes("aria-expanded")
    ).toBe("false");
    expect(
      wrapper
        .get('button[aria-controls="water-context-options"]')
        .attributes("aria-expanded")
    ).toBe("false");

    const indoorToggle = wrapper.get(
      'button[aria-controls="indoor-context-options"]'
    );
    await indoorToggle.trigger("click");
    expect(
      indoorToggle.attributes("aria-expanded")
    ).toBe("true");
  });

  it("區分準備下水與已在水中兩個真值", async () => {
    const wrapper = mount(ContextSelector, {
      props: {
        modelValue: null,
        "onUpdate:modelValue": (value) =>
          wrapper.setProps({ modelValue: value })
      }
    });

    await wrapper
      .get('button[aria-controls="water-context-options"]')
      .trigger("click");
    await wrapper
      .get('input[value="water_preparing"]')
      .setValue(true);
    expect(wrapper.props("modelValue")).toBe("water_preparing");

    await wrapper.get('input[value="water_active"]').setValue(true);
    expect(wrapper.props("modelValue")).toBe("water_active");
    expect(wrapper.text()).toContain("不會提前開始耐水時間");
  });
});

describe("SetupStepShell", () => {
  it("顯示情境、塗抹時間、確認設定三步，並讓已完成步驟返回", () => {
    const wrapper = mount(SetupStepShell, {
      props: {
        step: 2,
        eyebrow: "Setup / Protection",
        title: "這次要追蹤哪些部位？",
        description: "測試說明",
        saveStatus: "idle"
      },
      global: {
        stubs: {
          RouterLink: {
            props: ["to"],
            template:
              '<a :href="to"><slot /></a>'
          }
        }
      }
    });

    expect(
      wrapper
        .get('a[aria-label="返回步驟 1：情境"]')
        .attributes("href")
    ).toBe("/setup/context");
    expect(wrapper.find('a[href="/setup/timing"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("防護");
    expect(wrapper.text()).toContain("塗抹時間");
  });
});

describe("QuickProtectionSummary", () => {
  it("尚未確認時保留快速提醒與明確確認按鈕", async () => {
    const wrapper = mount(QuickProtectionSummary, {
      props: {
        context: "outdoor_general",
        pending: true,
        zones: [
          {
            draftZoneKey: "face_forehead",
            bodyZoneCode: "face_forehead",
            customLabel: null,
            skinExposureStatus: "exposed",
            methodComponents: ["sunscreen"]
          }
        ]
      }
    });

    expect(wrapper.text()).toContain("快速提醒（推薦）");
    expect(wrapper.text()).toContain("使用這組並繼續");
    await findButton(wrapper, "使用這組並繼續").trigger("click");
    expect(wrapper.emitted("accept")).toHaveLength(1);
  });
});

describe("ProtectionAdjustmentSheet", () => {
  it("以對話框顯示調整表單並提供清楚的關閉操作", async () => {
    const wrapper = mount(ProtectionAdjustmentSheet, {
      props: {
        open: true,
        context: "outdoor_general",
        draft: {
          schemaVersion: "1.0.0",
          id: "guest:test",
          localDraftFlowId: "flow-test",
          ownerKey: "guest:test",
          currentStep: "timing",
          bodyZoneSchemaVersion: "BODY_ZONE_V3",
          setupEntryMode: "quick_preset",
          suggestedPresetId: "commute_tracked",
          suggestedPresetVersion: "BODY_ZONE_PRESET_V3@1",
          presetDecision: "accepted",
          initialContext: "outdoor_general",
          initialShade: "unknown",
          zones: [
            {
              draftZoneKey: "face_forehead",
              bodyZoneCode: "face_forehead",
              customLabel: null,
              skinExposureStatus: "exposed",
              methodComponents: ["sunscreen"]
            }
          ],
          applications: [],
          pendingTiming: null,
          createdAt: "2026-07-29T10:00:00.000Z",
          updatedAt: "2026-07-29T10:00:00.000Z",
          expiresAt: "2026-07-30T10:00:00.000Z"
        }
      },
      global: {
        stubs: {
          Teleport: true,
          Transition: false
        }
      }
    });

    expect(wrapper.get('[role="dialog"]').attributes("aria-modal"))
      .toBe("true");
    expect(wrapper.text()).toContain("調整要提醒的部位");
    await wrapper.get('button[aria-label="關閉調整"]').trigger("click");
    expect(wrapper.emitted("close")).toHaveLength(1);
  });
});

describe("S-04 ZoneProtectionForm", () => {
  it("接受推薦 preset 後展開為 V3 原子部位，且不自動加入頭皮或嘴唇", async () => {
    const wrapper = mount(ZoneProtectionForm, {
      props: {
        context: "indoor_away",
        initialZones: [],
        initialEntryMode: "quick_preset",
        initialSuggestedPresetId: null,
        initialSuggestedPresetVersion: null,
        initialPresetDecision: null
      }
    });

    await findButton(wrapper, "使用這組").trigger("click");
    await findButton(wrapper, "下一步").trigger("click");

    const emitted = wrapper.emitted("submit")?.[0]?.[0] as
      | ProtectionDraftInput
      | undefined;
    expect(emitted).toBeDefined();
    if (emitted === undefined) {
      throw new Error("預期元件送出防護設定");
    }
    expect(emitted).toMatchObject({
      setupEntryMode: "quick_preset",
      presetDecision: "accepted",
      suggestedPresetId: "face_ears_neck"
    });
    const codes = emitted.zones.map((zone) => zone.bodyZoneCode);
    expect(codes).toEqual([
      "face_forehead",
      "face_nose_cheeks",
      "face_lower",
      "ears",
      "neck_front",
      "neck_back"
    ]);
    expect(codes).not.toContain("scalp");
    expect(codes).not.toContain("lips");
  });

  it("不再詢問防護方式，畫面上沒有任何方式單選鈕", async () => {
    const wrapper = mount(ZoneProtectionForm, {
      props: {
        context: "indoor_away",
        initialZones: [],
        initialEntryMode: "quick_preset",
        initialSuggestedPresetId: null,
        initialSuggestedPresetVersion: null,
        initialPresetDecision: null
      }
    });

    await findButton(wrapper, "使用這組").trigger("click");

    expect(wrapper.find('input[type="radio"]').exists()).toBe(false);
    expect(wrapper.text()).not.toContain("已擦防曬產品");
    expect(wrapper.text()).not.toContain("被衣物完整遮住");
  });

  it("追蹤中的部位一律送出 exposed 且 methodComponents 只有 sunscreen", async () => {
    const wrapper = mount(ZoneProtectionForm, {
      props: {
        context: "indoor_away",
        initialZones: [],
        initialEntryMode: "quick_preset",
        initialSuggestedPresetId: null,
        initialSuggestedPresetVersion: null,
        initialPresetDecision: null
      }
    });

    await findButton(wrapper, "使用這組").trigger("click");
    await findButton(wrapper, "下一步").trigger("click");

    const emitted = wrapper.emitted("submit")?.[0]?.[0] as
      | ProtectionDraftInput
      | undefined;
    expect(emitted?.zones.length).toBeGreaterThan(0);
    for (const zone of emitted?.zones ?? []) {
      expect(zone.skinExposureStatus).toBe("exposed");
      expect(zone.methodComponents).toEqual(["sunscreen"]);
    }
  });

  it("取消勾選部位會從送出結果移除，且標記 preset 已調整", async () => {
    const wrapper = mount(ZoneProtectionForm, {
      props: {
        context: "indoor_away",
        initialZones: [],
        initialEntryMode: "quick_preset",
        initialSuggestedPresetId: null,
        initialSuggestedPresetVersion: null,
        initialPresetDecision: null
      }
    });

    await findButton(wrapper, "使用這組").trigger("click");

    const earsCheckbox = wrapper
      .findAll('input[type="checkbox"]')
      .find((_input, index) =>
        wrapper.findAll(".zone-group-choice")[index]?.text().includes("耳朵")
      );
    if (earsCheckbox === undefined) {
      throw new Error("找不到耳朵的勾選框");
    }
    await earsCheckbox.setValue(false);
    await findButton(wrapper, "下一步").trigger("click");

    const emitted = wrapper.emitted("submit")?.[0]?.[0] as
      | ProtectionDraftInput
      | undefined;
    expect(emitted?.zones.map((zone) => zone.bodyZoneCode)).not.toContain(
      "ears"
    );
    expect(emitted?.presetDecision).toBe("adjusted");
  });

  it("一個部位都沒選時擋下送出", async () => {
    const wrapper = mount(ZoneProtectionForm, {
      props: {
        context: "indoor_away",
        initialZones: [],
        initialEntryMode: "self_select",
        initialSuggestedPresetId: null,
        initialSuggestedPresetVersion: null,
        initialPresetDecision: null
      }
    });

    await findButton(wrapper, "自己選擇部位").trigger("click");
    await findButton(wrapper, "下一步").trigger("click");

    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(wrapper.text()).toContain("請至少選擇一個實際要追蹤的部位。");
  });

  it("勾了其他部位卻沒填名稱時擋下送出", async () => {
    const wrapper = mount(ZoneProtectionForm, {
      props: {
        context: "indoor_away",
        initialZones: [],
        initialEntryMode: "self_select",
        initialSuggestedPresetId: null,
        initialSuggestedPresetVersion: null,
        initialPresetDecision: null
      }
    });

    await findButton(wrapper, "自己選擇部位").trigger("click");
    const checkboxes = wrapper.findAll('input[type="checkbox"]');
    await checkboxes[checkboxes.length - 1]?.setValue(true);
    await findButton(wrapper, "下一步").trigger("click");

    expect(wrapper.emitted("submit")).toBeUndefined();
    expect(wrapper.text()).toContain("請填寫其他部位名稱。");
  });
});

function findButton(
  wrapper: ReturnType<typeof mount>,
  label: string
) {
  const button = wrapper
    .findAll("button")
    .find((candidate) => candidate.text().includes(label));
  if (button === undefined) {
    throw new Error(`找不到按鈕：${label}`);
  }
  return button;
}
