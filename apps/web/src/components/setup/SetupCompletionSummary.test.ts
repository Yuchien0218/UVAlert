// @vitest-environment happy-dom
import { mount } from "@vue/test-utils";
import { makeProductSnapshot } from "@sunshield/test-fixtures";
import type { SetupDraftV1 } from "@sunshield/contracts";
import { describe, expect, it } from "vitest";
import SetupCompletionSummary from "./SetupCompletionSummary.vue";

/**
 * S-05 提交前必顯內容（AC-34 Scenario B）。
 *
 * 兩步流程後這是唯一的揭露點——快速提醒自動寫入建議部位，使用者沒有逐一挑選，
 * 所以摘要缺項等同於「系統加入了摘要中未揭露的內容」。
 */

function makeDraft(overrides: Partial<SetupDraftV1> = {}): SetupDraftV1 {
  return {
    schemaVersion: "1.0.0",
    id: "guest:test",
    localDraftFlowId: "flow-test",
    ownerKey: "guest:test",
    currentStep: "timing",
    bodyZoneSchemaVersion: "BODY_ZONE_V3",
    setupEntryMode: "quick_preset",
    suggestedPresetId: "face_ears_neck",
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
      },
      {
        draftZoneKey: "hand_backs",
        bodyZoneCode: "hand_backs",
        customLabel: null,
        skinExposureStatus: "exposed",
        methodComponents: ["sunscreen"]
      }
    ],
    applications: [],
    pendingTiming: null,
    createdAt: "2026-08-07T10:00:00.000Z",
    updatedAt: "2026-08-07T10:00:00.000Z",
    expiresAt: "2026-08-08T10:00:00.000Z",
    ...overrides
  } as SetupDraftV1;
}

describe("S-05 SetupCompletionSummary 必顯內容", () => {
  it("揭露情境、每個追蹤部位與「不代表安全曝曬時間」", () => {
    const wrapper = mount(SetupCompletionSummary, {
      props: {
        draft: makeDraft(),
        applicationTime: "2026-08-07T10:00:00.000Z"
      }
    });

    expect(wrapper.text()).toContain("一般戶外");
    expect(wrapper.text()).toContain("額頭");
    expect(wrapper.text()).toContain("手背");
    expect(wrapper.text()).toContain("不代表安全曝曬時間");
  });

  it("揭露產品包裝標示的曝曬前等待、補擦間隔與耐水", () => {
    const wrapper = mount(SetupCompletionSummary, {
      props: {
        draft: makeDraft(),
        applicationTime: "2026-08-07T10:00:00.000Z",
        productSnapshot: makeProductSnapshot({
          spf: 50,
          paGrade: "PA++++",
          preExposureWaitStatus: "explicit_minutes",
          preExposureWaitMinutes: 20,
          reapplicationIntervalStatus: "explicit_minutes",
          reapplicationIntervalMinutes: 80,
          waterResistanceStatus: "80",
          waterResistanceMinutes: 80
        })
      }
    });

    expect(wrapper.text()).toContain("SPF 50");
    expect(wrapper.text()).toContain("PA++++");
    expect(wrapper.text()).toContain("曝曬前需等待 20 分鐘");
    expect(wrapper.text()).toContain("包裝標示補擦間隔 80 分鐘");
    expect(wrapper.text()).toContain("耐水 80 分鐘");
  });

  it("產品不具資格時以 alert 顯眼呈現警示", () => {
    const wrapper = mount(SetupCompletionSummary, {
      props: {
        draft: makeDraft(),
        applicationTime: "2026-08-07T10:00:00.000Z",
        productSnapshot: makeProductSnapshot({
          sunscreenClaimStatus: "no_claim",
          ruleEligibilityAtApplication: "no_sunscreen_claim",
          reapplicationIntervalStatus: "unknown",
          reapplicationIntervalMinutes: null,
          preExposureWaitStatus: "unknown",
          preExposureWaitMinutes: null,
          waterResistanceStatus: "unknown",
          waterResistanceMinutes: null
        })
      }
    });

    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toContain("沒有明確防曬標示");
    expect(alert.text()).toContain("不會產生 120、40 或 80 分鐘期限");
  });

  it("產品合格時不顯示警示，也不佔版位", () => {
    const wrapper = mount(SetupCompletionSummary, {
      props: {
        draft: makeDraft(),
        applicationTime: "2026-08-07T10:00:00.000Z",
        productSnapshot: makeProductSnapshot()
      }
    });

    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("水上活動揭露入水狀態，不確定時標明採保守提醒", () => {
    const wrapper = mount(SetupCompletionSummary, {
      props: {
        draft: makeDraft({ initialContext: "water_active" }),
        applicationTime: "2026-08-07T10:00:00.000Z",
        waterStart: { confidence: "unknown", activityStartedAt: null }
      }
    });

    expect(wrapper.text()).toContain("水上活動（已在水中）");
    expect(wrapper.text()).toContain("入水時間不確定");
    expect(wrapper.text()).toContain("保守提醒");
  });
});
