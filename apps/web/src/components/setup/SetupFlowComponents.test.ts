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
    expect(indoorToggle.attributes("aria-expanded")).toBe("true");
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
    await wrapper.get('input[value="water_preparing"]').setValue(true);
    expect(wrapper.props("modelValue")).toBe("water_preparing");

    await wrapper.get('input[value="water_active"]').setValue(true);
    expect(wrapper.props("modelValue")).toBe("water_active");
    expect(wrapper.text()).toContain("不會提前開始耐水時間");
  });
});

describe("SetupStepShell", () => {
  /*
   * 2026-08-24：設定合併成單一頁面（/setup）後，這個外框不再有步驟指示器
   * 與「返回上一步」。原本的斷言檢查的是「步驟 X/2」與跨步驟連結，那些
   * 已隨兩步流程一起移除；改為確認外框本身該有的東西：標題、說明、取消，
   * 以及**不再出現**任何步驟字樣或設定流程內部連結。
   */
  it("顯示標題、說明與取消，且不再有步驟指示器或跨步驟連結", () => {
    const wrapper = mount(SetupStepShell, {
      props: {
        title: "開始防曬提醒",
        description: "測試說明",
        saveStatus: "idle"
      }
    });

    expect(wrapper.text()).toContain("開始防曬提醒");
    expect(wrapper.text()).toContain("測試說明");
    /*
     * 2026-08-24：按鈕改成只有圖示，文字移到 aria-label，所以不再出現在
     * text() 裡。
     *
     * 2026-08-30：語意由「取消設定」改成「回上一頁」，行為也跟著改成
     * 不刪草稿。這條斷言守的是**文案與行為的一致性**——如果有人把
     * aria-label 改回「取消設定」之類的破壞性字眼，卻沒有同步恢復刪除
     * 草稿的行為，這裡會紅。裁決見
     * docs/decisions/2026-08-30-pending-decisions.md 第二節。
     */
    expect(wrapper.get(".icon-button").attributes("aria-label")).toBe(
      "回上一頁"
    );

    /*
     * 2026-08-31：返回鈕與標題**同一列**（使用者回報標題上方空掉一大塊）。
     *
     * 先前它在一個獨立的工具列 div 裡，那個 div 在窄螢幕上幾乎全空卻仍佔
     * 44px，加上 --space-8 的間距，等於標題上方憑空多出約 76px。
     *
     * 守三件事：舊的工具列不得復活、按鈕在標題區裡、按鈕排在標題之後。
     * DOM 順序同時決定鍵盤 Tab 的先後。
     */
    expect(wrapper.find(".setup-shell__toolbar").exists()).toBe(false);

    const heading = wrapper.get(".setup-shell__heading");
    expect(heading.find(".icon-button").exists()).toBe(true);

    const children = [...heading.element.children];
    expect(
      children.findIndex((node) => node.classList.contains("icon-button"))
    ).toBeGreaterThan(
      children.findIndex((node) => node.tagName.toLowerCase() === "h1")
    );
    expect(
      wrapper.get(".icon-button").classes("icon-button--compact")
    ).toBe(true);

    expect(wrapper.text()).not.toContain("步驟");
    expect(wrapper.find('[role="progressbar"]').exists()).toBe(false);
    expect(wrapper.find("a").exists()).toBe(false);
  });

  /*
   * 2026-08-30：守「按鈕發的是導航事件，不是取消事件」。
   *
   * 這條看起來瑣碎，但它守的是一件會靜默壞掉的事：`defineEmits` 換成
   * `back` 之後，父層若還寫 `@cancel`，Vue 不會報錯也不會警告——按鈕
   * 就只是沒反應。反過來，若有人為了「順便讓它也能取消」把 cancel 加
   * 回來，這裡會提醒他先讀第二節的裁決。
   */
  it("返回鈕發出 back 而不是 cancel", async () => {
    const wrapper = mount(SetupStepShell, {
      props: {
        title: "開始防曬提醒",
        description: "測試說明",
        saveStatus: "idle"
      }
    });

    await wrapper.get(".icon-button").trigger("click");

    expect(wrapper.emitted("back")).toHaveLength(1);
    expect(wrapper.emitted("cancel")).toBeUndefined();
  });

  it("儲存狀態為 error 時提示草稿未儲存", () => {
    const wrapper = mount(SetupStepShell, {
      props: {
        title: "開始防曬提醒",
        description: "測試說明",
        saveStatus: "error"
      }
    });

    expect(wrapper.text()).toContain("草稿未儲存");
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

    /*
     * 2026-08-30（B 批）：不再斷言「快速提醒（推薦）」這個 eyebrow——它已
     * 隨去卡片化一起移除。這一區只在選好情境後才出現，本來就有脈絡，再標
     * 一次等於把同件事宣告三次。
     *
     * 真正要守的是「尚未確認時要有明確的確認動作」，也就是下面那顆按鈕。
     * 另外守住 preset 名稱仍然看得到——去掉外框之後它是唯一的標題。
     */
    expect(wrapper.text()).not.toContain("快速提醒（推薦）");
    expect(wrapper.text()).toContain("通勤常見追蹤部位");
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

    expect(wrapper.get('[role="dialog"]').attributes("aria-modal")).toBe(
      "true"
    );
    expect(wrapper.text()).toContain("調整要提醒的部位");
    await wrapper.get('button[aria-label="關閉"]').trigger("click");
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
      ProtectionDraftInput | undefined;
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
      ProtectionDraftInput | undefined;
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
      ProtectionDraftInput | undefined;
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

function findButton(wrapper: ReturnType<typeof mount>, label: string) {
  const button = wrapper
    .findAll("button")
    .find((candidate) => candidate.text().includes(label));
  if (button === undefined) {
    throw new Error(`找不到按鈕：${label}`);
  }
  return button;
}
