import type {
  BodyZoneCode,
  SessionContext,
  SetupDraftV1,
  SetupDraftZoneV1
} from "@sunshield/contracts";
import type { IconName } from "../../generated/icons.generated";

export const SETUP_PRESET_VERSION = "BODY_ZONE_PRESET_V3@1";

export type BodyZoneGroupId =
  | "face"
  | "ears"
  | "neck"
  | "arms"
  | "hand_backs"
  | "torso"
  | "legs"
  | "feet"
  | "scalp"
  | "lips";

export interface BodyZoneGroup {
  readonly id: BodyZoneGroupId;
  readonly label: string;
  readonly description: string;
  readonly zoneCodes: readonly BodyZoneCode[];
}

export interface SetupPreset {
  readonly id:
    "face_ears_neck" | "commute_tracked" | "broad_tracked" | "beach_tracked";
  readonly label: string;
  readonly summary: string;
  readonly groupIds: readonly BodyZoneGroupId[];
}

export const BODY_ZONE_GROUPS: readonly BodyZoneGroup[] = [
  {
    id: "face",
    label: "臉部",
    description: "額頭、鼻子與雙頰、臉部下半部",
    zoneCodes: ["face_forehead", "face_nose_cheeks", "face_lower"]
  },
  {
    id: "ears",
    label: "耳朵",
    description: "耳朵保持獨立，方便個別調整",
    zoneCodes: ["ears"]
  },
  {
    id: "neck",
    label: "頸部",
    description: "前頸與後頸",
    zoneCodes: ["neck_front", "neck_back"]
  },
  {
    id: "arms",
    label: "手臂",
    description: "左右手臂",
    zoneCodes: ["arms"]
  },
  {
    id: "hand_backs",
    label: "手背",
    description: "不包含手掌",
    zoneCodes: ["hand_backs"]
  },
  {
    id: "torso",
    label: "肩膀與身體",
    description: "肩膀、身體前側與後側",
    zoneCodes: ["shoulders", "torso_front", "torso_back"]
  },
  {
    id: "legs",
    label: "腿部",
    description: "左右腿部",
    zoneCodes: ["legs"]
  },
  {
    id: "feet",
    label: "腳背",
    description: "目前露出的足部",
    zoneCodes: ["feet"]
  },
  {
    id: "scalp",
    label: "頭皮",
    description: "不會因選擇臉部而自動加入",
    zoneCodes: ["scalp"]
  },
  {
    id: "lips",
    label: "嘴唇",
    description: "不會因選擇臉部而自動加入",
    zoneCodes: ["lips"]
  }
];

export const SETUP_PRESETS: readonly SetupPreset[] = [
  {
    id: "face_ears_neck",
    label: "臉／耳／頸",
    summary: "臉部、耳朵、頸部",
    groupIds: ["face", "ears", "neck"]
  },
  {
    id: "commute_tracked",
    label: "通勤常曬部位",
    summary: "臉部、耳朵、頸部、手臂、手背",
    groupIds: ["face", "ears", "neck", "arms", "hand_backs"]
  },
  {
    id: "broad_tracked",
    label: "臉頸＋手腳",
    summary: "通勤常曬部位，加上腿部與腳背",
    groupIds: ["face", "ears", "neck", "arms", "hand_backs", "legs", "feet"]
  },
  {
    id: "beach_tracked",
    label: "海邊常見部位",
    summary: "臉、耳、頸、肩膀與身體、手臂、手背、腿與腳",
    groupIds: [
      "face",
      "ears",
      "neck",
      "torso",
      "arms",
      "hand_backs",
      "legs",
      "feet"
    ]
  }
];

export const CONTEXT_LABELS: Record<SessionContext, string> = {
  indoor_away: "室內（遠離窗戶）",
  indoor_window: "室內（靠窗邊）",
  outdoor_general: "一般戶外",
  outdoor_exercise: "戶外運動",
  water_preparing: "水上活動・準備下水",
  water_active: "水上活動・已在水中"
};

/**
 * 每個情境對應的圖示。
 *
 * 圖示只有四顆（戶外／運動／室內／水上），但情境有六個——室內與水上各有
 * 兩個子選項，它們共用所屬群組的圖示。這是刻意的：`ContextSelector` 的
 * 版面就是「四個磚，其中兩個展開後有子選項」，子選項本來就不是獨立的
 * 視覺層級，各給一顆圖示反而會讓群組關係讀不出來。
 *
 * **2026-08-31 抽到這裡。** 原本這份對應只存在於 `ContextSelector.vue`
 * 的 `DIRECT_OPTIONS` 與 `groups` 裡，而且**只涵蓋得到四個磚**；
 * `/setup` 收合後的摘要要顯示已選情境的圖示，需要的是六個情境都查得到
 * 的表。放在 `CONTEXT_LABELS` 旁邊——同一種東西（情境 → 呈現用的常數），
 * 跟 `GEAR_CATEGORY_ICONS` 收斂到 `gearPresentation.ts` 是同一個判斷。
 */
export const CONTEXT_ICONS: Record<SessionContext, IconName> = {
  indoor_away: "context-indoor",
  indoor_window: "context-indoor",
  outdoor_general: "context-outdoor",
  outdoor_exercise: "context-exercise",
  water_preparing: "context-water",
  water_active: "context-water"
};

export const BODY_ZONE_LABELS: Record<BodyZoneCode, string> = {
  face_forehead: "額頭",
  face_nose_cheeks: "鼻子與雙頰",
  face_lower: "臉部下半部",
  ears: "耳朵",
  lips: "嘴唇",
  scalp: "頭皮",
  neck_front: "前頸",
  neck_back: "後頸",
  shoulders: "肩膀",
  torso_front: "身體前側",
  torso_back: "身體後側",
  arms: "手臂",
  hand_backs: "手背",
  legs: "腿部",
  feet: "腳背",
  custom: "其他部位"
};

export function recommendedPresetFor(context: SessionContext): SetupPreset {
  const presetId =
    context === "water_preparing" || context === "water_active"
      ? "beach_tracked"
      : context === "outdoor_exercise"
        ? "broad_tracked"
        : context === "outdoor_general"
          ? "commute_tracked"
          : "face_ears_neck";

  return SETUP_PRESETS.find((preset) => preset.id === presetId)!;
}

export interface QuickProtectionDraft {
  readonly zones: SetupDraftZoneV1[];
  readonly setupEntryMode: SetupDraftV1["setupEntryMode"];
  readonly suggestedPresetId: string;
  readonly suggestedPresetVersion: string;
  readonly presetDecision: SetupDraftV1["presetDecision"];
}

export function makeQuickProtectionDraft(
  context: SessionContext
): QuickProtectionDraft {
  const preset = recommendedPresetFor(context);
  const zones = preset.groupIds.flatMap((groupId) =>
    getBodyZoneGroup(groupId).zoneCodes.map(
      (bodyZoneCode): SetupDraftZoneV1 => ({
        draftZoneKey: bodyZoneCode,
        bodyZoneCode,
        customLabel: null,
        skinExposureStatus: "exposed",
        methodComponents: ["sunscreen"]
      })
    )
  );

  return {
    zones,
    setupEntryMode: "quick_preset",
    suggestedPresetId: preset.id,
    suggestedPresetVersion: SETUP_PRESET_VERSION,
    presetDecision: "accepted"
  };
}

export function getBodyZoneGroup(groupId: BodyZoneGroupId): BodyZoneGroup {
  return BODY_ZONE_GROUPS.find((group) => group.id === groupId)!;
}

export function groupForBodyZone(
  bodyZoneCode: BodyZoneCode
): BodyZoneGroup | null {
  return (
    BODY_ZONE_GROUPS.find((group) => group.zoneCodes.includes(bodyZoneCode)) ??
    null
  );
}
