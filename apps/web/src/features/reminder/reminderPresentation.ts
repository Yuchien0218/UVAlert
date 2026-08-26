import type {
  ActionKind,
  BodyZoneCode,
  PrimaryAction,
  ZoneProjection
} from "@sunshield/contracts";
import type { ConnectivityStatus } from "@sunshield/platform";
import { formatTime } from "../../helpers/datetime";
import { calculateRemainingProgress } from "./homeReminderClockPresentation";

export type ReminderTone = "timed" | "soon" | "due" | "untimed";

/**
 * S-07 的四則次要 CTA（2026-08-07 裁決）。
 *
 * 全數指向既有畫面或原地行為，不新增畫面——與 13 個 ActionKind 裁決同一原則。
 */
export type SecondaryActionKind =
  /** 查看最近紀錄 → 本頁最近事件清單（原地錨點並展開） */
  | "view_saved_records"
  /** 查看處理說明 → S-17 特殊狀況 */
  | "view_handling_guidance"
  /** 更新防護紀錄 → S-08 首次記錄變體 */
  | "update_protection_record"
  /** 更新防護方式 → S-04 原地 sheet */
  | "update_protection_method";

export interface SecondaryAction {
  kind: SecondaryActionKind;
  label: string;
}

export interface ReminderPresentation {
  tone: ReminderTone;
  eyebrow: string;
  title: string;
  body: string;
  timeLabel: string;
  remainingMinutes: number | null;
  /** 只有計時中的 tone 會有值；沒有可信起訖時間（例如標示等待）時為 null，此時不畫進度條而不是畫 0%。 */
  progressPercent: number | null;
  actionLabel: string;
  actionKind: ActionKind;
  ariaLabel: string;
  /** 沒有適用的次要 CTA 時為空陣列，不佔版位。 */
  secondaryActions: SecondaryAction[];
}

const SECONDARY_ACTION_LABELS: Record<SecondaryActionKind, string> = {
  view_saved_records: "查看最近紀錄",
  view_handling_guidance: "查看處理說明",
  update_protection_record: "更新防護紀錄",
  update_protection_method: "更新防護方式"
};

function secondary(...kinds: SecondaryActionKind[]): SecondaryAction[] {
  return kinds.map((kind) => ({
    kind,
    label: SECONDARY_ACTION_LABELS[kind]
  }));
}

export const BODY_ZONE_LABELS: Record<BodyZoneCode, string> = {
  face_forehead: "額頭",
  face_nose_cheeks: "鼻部與雙頰",
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
  feet: "足部",
  custom: "其他部位"
};

const ACTION_LABELS: Record<ActionKind, string> = {
  recalibrate_clock: "重新校準時間",
  view_conservative_reminder: "查看保守提醒",
  view_ended_state: "查看本次紀錄",
  switch_protection: "更新防護方式",
  complete_protection_record: "補上防護紀錄",
  confirm_protection_method: "確認防護方式",
  view_protection_options: "查看防護選項",
  resolve_water_start: "處理入水時間",
  resolve_cause: "查看原因",
  record_reapplication: "記錄補擦",
  view_product_label: "查看防曬乳標示",
  report_context_event: "記錄狀況",
  review_required_zones: "查看需要處理的部位"
};

export function getZoneLabel(zone: ZoneProjection): string {
  return zone.bodyZoneCode === "custom" && zone.customLabel !== null
    ? zone.customLabel
    : BODY_ZONE_LABELS[zone.bodyZoneCode];
}

export function isReminderActionDue(
  primaryAction: PrimaryAction,
  now: Date
): boolean {
  if (primaryAction.presentationType === "due_card") return true;
  if (
    primaryAction.presentationType !== "timed_ring" ||
    primaryAction.actionAt === null
  ) {
    return false;
  }

  const dueAt = Date.parse(primaryAction.actionAt);
  return Number.isFinite(dueAt) && dueAt <= now.getTime();
}

export function buildReminderPresentation(options: {
  primaryAction: PrimaryAction;
  zones: ZoneProjection[];
  connectivity: ConnectivityStatus;
  now?: Date;
}): ReminderPresentation {
  const { primaryAction, zones, connectivity } = options;
  const affectedZones = zones.filter((zone) =>
    primaryAction.affectedZoneInstanceIds.includes(zone.zoneInstanceId)
  );
  const presentationZones = affectedZones.length > 0 ? affectedZones : zones;
  const zoneLabel = getAffectedZoneLabel(presentationZones);
  const absoluteTime = formatAbsoluteTime(primaryAction.actionAt);
  const actionLabel = ACTION_LABELS[primaryAction.actionKind];

  if (primaryAction.presentationType === "timed_ring") {
    const now = options.now ?? new Date();
    const remainingMinutes = calculateRemainingMinutes(
      primaryAction.actionAt,
      now
    );
    const dueMs =
      primaryAction.actionAt === null
        ? null
        : Date.parse(primaryAction.actionAt);
    const progressPercent =
      dueMs !== null && Number.isFinite(dueMs)
        ? calculateProgressPercent(
            affectedZones[0]?.zoneTimerStartedAt ?? null,
            dueMs,
            now.getTime()
          )
        : null;
    if (isReminderActionDue(primaryAction, now)) {
      return buildReminderPresentation({
        primaryAction: {
          ...primaryAction,
          presentationType: "due_card"
        },
        zones,
        connectivity,
        now
      });
    }
    const isSoon = affectedZones.some(
      (zone) => zone.timingStatus === "reapply_soon"
    );
    if (isSoon) {
      return {
        tone: "soon",
        eyebrow: "快到補擦時間",
        title: `${zoneLabel}快到補擦時間`,
        body: `晴報員提醒：可以準備補擦了。預計時間 ${absoluteTime}。`,
        timeLabel: absoluteTime,
        remainingMinutes,
        progressPercent,
        actionLabel,
        actionKind: primaryAction.actionKind,
        ariaLabel: `${zoneLabel}快到補擦時間，預計 ${absoluteTime}。`,
        secondaryActions: []
      };
    }

    const relativeTime = formatRelativeTime(primaryAction.actionAt, now);
    return {
      tone: "timed",
      eyebrow: "提醒進行中",
      title: "接下來需要補擦",
      body: "請依產品標示使用，並搭配遮蔭、衣物、帽子或太陽眼鏡。",
      timeLabel: absoluteTime,
      remainingMinutes,
      progressPercent,
      actionLabel,
      actionKind: primaryAction.actionKind,
      ariaLabel: `${zoneLabel}提醒進行中，約在${relativeTime}需要檢查，預計 ${absoluteTime}。`,
      secondaryActions: []
    };
  }

  if (primaryAction.presentationType === "due_card") {
    return {
      tone: "due",
      eyebrow: "建議現在補擦",
      title: `${zoneLabel}建議現在補擦`,
      body: "已到建議補擦時間。請依實際情況與產品標示，確認是否需要補擦。",
      timeLabel: "現在",
      remainingMinutes: 0,
      progressPercent: 0,
      actionLabel,
      actionKind: primaryAction.actionKind,
      ariaLabel: `${zoneLabel}已到建議補擦時間。`,
      secondaryActions: []
    };
  }

  return buildUntimedPresentation({
    primaryAction,
    zoneLabel,
    absoluteTime,
    connectivity,
    actionLabel
  });
}

function buildUntimedPresentation(options: {
  primaryAction: PrimaryAction;
  zoneLabel: string;
  absoluteTime: string;
  connectivity: ConnectivityStatus;
  actionLabel: string;
}): ReminderPresentation {
  const { primaryAction, zoneLabel, absoluteTime, connectivity, actionLabel } =
    options;
  const reasons = new Set(primaryAction.reasonCodes);
  const base = {
    tone: "untimed" as const,
    remainingMinutes: null,
    progressPercent: null,
    actionLabel,
    actionKind: primaryAction.actionKind,
    secondaryActions: [] as SecondaryAction[]
  };

  if (primaryAction.variant === "multi_action") {
    return {
      ...base,
      eyebrow: "有多個部位需要處理",
      title: "不同部位需要不同處理方式",
      body: "請先查看各部位的原因與下一步。",
      timeLabel: "多部位",
      ariaLabel: "有多個部位需要不同處理方式。"
    };
  }
  if (reasons.has("CLOCK_UNTRUSTED")) {
    const online = connectivity === "online";
    return {
      ...base,
      eyebrow: online ? "時間需要重新確認" : "目前無法校準時間",
      title: "裝置時間可能不正確",
      body: online
        ? "為避免錯誤延長提醒，請重新連線校準。目前採較短的保守狀態。"
        : "目前離線，無法確認可信時間。系統不會因此延長期限，請查看保守提醒。",
      timeLabel: "保守提醒",
      ariaLabel: "裝置時間可能不正確，目前使用保守提醒。",
      // 時鐘不可信時使用者要確認的是「我已經記了什麼」，資料就在本頁下方，
      // 離開頁面反而失去脈絡——所以是原地錨點而不是換頁。
      secondaryActions: secondary("view_saved_records")
    };
  }
  if (reasons.has("METHOD_UNRECORDED")) {
    return {
      ...base,
      eyebrow: "需要補上紀錄",
      title: `${zoneLabel}尚未記錄防護方式`,
      body: "目前沒有可用來建立提醒的防護紀錄。請確認實際採用的方式。",
      timeLabel: "未計時",
      ariaLabel: `${zoneLabel}尚未記錄防護方式。`
    };
  }
  if (reasons.has("METHOD_UNKNOWN")) {
    return {
      ...base,
      eyebrow: "防護方式不確定",
      title: `請確認${zoneLabel}目前的防護方式`,
      body: "防護方式尚未確認，目前會採用保守提醒，暫不顯示補擦倒數。確認防護方式後，即可建立對應的提醒時間。",
      timeLabel: "未計時",
      ariaLabel: `${zoneLabel}防護方式不確定。`
    };
  }
  // 產品安全事件三則。先前沒有對應分支，全部掉進通用 fallback，
  // 使用者看不到「為什麼停止計時」與「該怎麼處理」。
  if (reasons.has("PRODUCT_ABNORMAL_REPORTED")) {
    return {
      ...base,
      eyebrow: "已停止使用這項防曬乳",
      title: "已停止使用這項防曬乳建立提醒",
      body: "你回報防曬乳有異常，因此相關部位不再顯示這瓶防曬乳的補擦期限。請停止使用並依包裝警語處理。",
      timeLabel: "未計時",
      ariaLabel: `${zoneLabel}已回報防曬乳異常，停止使用這瓶防曬乳計時。`,
      secondaryActions: secondary("view_handling_guidance")
    };
  }
  if (reasons.has("PRODUCT_DISCOMFORT_REPORTED")) {
    return {
      ...base,
      eyebrow: "已停止使用這項防曬乳",
      title: "已停止使用這項防曬乳建立提醒",
      body: "你回報使用後感到不適。請停止使用並依包裝警語處理；需要時尋求醫療協助。系統不會判斷不適原因。",
      timeLabel: "未計時",
      ariaLabel: `${zoneLabel}已回報使用後不適，停止使用這瓶防曬乳計時。`,
      secondaryActions: secondary("view_handling_guidance")
    };
  }
  if (reasons.has("PRODUCT_EXPIRED")) {
    return {
      ...base,
      eyebrow: "防曬乳已過期",
      title: "這瓶防曬乳已超過紀錄的有效期限",
      body: "這瓶防曬乳已過期，無法用來建立新的補擦提醒。請改用標示清楚且未過期的防曬乳。",
      timeLabel: "未計時",
      ariaLabel: `${zoneLabel}使用的防曬乳已過期。`,
      secondaryActions: secondary("update_protection_record")
    };
  }
  if (reasons.has("PRODUCT_IDENTITY_UNKNOWN")) {
    return {
      ...base,
      eyebrow: "無法計算可信時間",
      title: `${zoneLabel}使用的防曬乳身分尚未確認`,
      body: "防曬乳的標示尚未確認，暫時無法建立補擦倒數。",
      timeLabel: "未計時",
      ariaLabel: `${zoneLabel}使用的防曬乳身分尚未確認。`,
      secondaryActions: secondary("update_protection_record")
    };
  }
  if (reasons.has("PRODUCT_NO_SUNSCREEN_CLAIM")) {
    return {
      ...base,
      eyebrow: "沒有防曬乳補擦倒數",
      title: `${zoneLabel}記錄的防曬乳沒有明確的防曬標示`,
      body: "目前不建立防曬乳補擦倒數。請查看其他防護選項。",
      timeLabel: "未計時",
      ariaLabel: `${zoneLabel}記錄的防曬乳沒有明確防曬標示。`,
      secondaryActions: secondary("update_protection_record")
    };
  }
  if (reasons.has("LABEL_WAIT_ACTIVE")) {
    return {
      ...base,
      eyebrow: "請依防曬乳標示等待",
      title: `${zoneLabel}仍在防曬乳標示的等待時間內`,
      body: `依包裝標示等待至 ${absoluteTime}。期間請搭配衣物或遮蔭；等待結束不代表系統已確認防護效果，也不代表可以放心待在陽光下。`,
      timeLabel: absoluteTime,
      ariaLabel: `${zoneLabel}仍在防曬乳標示的等待時間內，標示等待至 ${absoluteTime}。`
    };
  }
  if (reasons.has("CLOTHING_COVERED")) {
    return {
      ...base,
      eyebrow: "已記錄衣物覆蓋",
      title: `${zoneLabel}目前被衣物完整遮住`,
      body: "目前不計算防曬乳補擦時間。衣物移開或防護方式改變時，請更新實際狀態。",
      timeLabel: "不使用倒數",
      ariaLabel: `${zoneLabel}目前被衣物完整遮住。`,
      secondaryActions: secondary("update_protection_method")
    };
  }
  if (reasons.has("WATER_START_UNKNOWN")) {
    return {
      ...base,
      eyebrow: "入水時間不確定",
      title: `無法判斷${zoneLabel}剩餘的耐水時間`,
      body: "無法確認你的實際入水時間，因此不會以記錄時間代替。你可以補上或更正入水時間；若仍不確定，請依產品標示保守處理。",
      timeLabel: "未計時",
      ariaLabel: `無法判斷${zoneLabel}剩餘的耐水時間。`
    };
  }
  if (reasons.has("WATER_RESISTANCE_UNKNOWN")) {
    return {
      ...base,
      eyebrow: "抗水標示不明",
      title: "目前不建立水中 40／80 分鐘提醒",
      body: "沒有看到明確的抗水標示，或標示看不清楚時，不能依賴系統判斷水中剩餘防護時間。",
      timeLabel: "未計時",
      ariaLabel: "抗水標示不明，目前不建立水中期限。"
    };
  }
  if (reasons.has("SESSION_ENDED")) {
    return {
      ...base,
      eyebrow: "本次提醒已結束",
      title: "本次提醒已結束",
      body: "結束不代表已完成補擦，也不代表防護完成或可以放心待在陽光下。需要時可以重新開始新的提醒。",
      timeLabel: "已結束",
      ariaLabel: "本次提醒已結束。"
    };
  }

  return {
    ...base,
    eyebrow: "需要確認目前狀況",
    title: `${zoneLabel}目前無法提供時間型提醒`,
    body: "請查看原因並確認實際防護方式，完成後再繼續追蹤。",
    timeLabel: "未計時",
    ariaLabel: `${zoneLabel}目前無法提供時間型提醒。`
  };
}

function getAffectedZoneLabel(zones: ZoneProjection[]): string {
  if (zones.length === 0) return "目前部位";
  if (zones.length === 1 && zones[0] !== undefined) {
    return getZoneLabel(zones[0]);
  }
  return `${zones.length} 個部位`;
}

function formatAbsoluteTime(value: string | null): string {
  if (value === null) return "還沒有時間";
  return formatTime(value);
}

function formatRelativeTime(value: string | null, now: Date): string {
  const minutes = calculateRemainingMinutes(value, now);
  if (minutes === null) return "稍後";
  if (minutes <= 0) return "接近預計時間";
  if (minutes < 60) return `${minutes} 分鐘後`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder === 0
    ? `${hours} 小時後`
    : `${hours} 小時 ${remainder} 分鐘後`;
}

function calculateProgressPercent(
  startedAt: string | null,
  dueMs: number,
  nowMs: number
): number | null {
  const progress = calculateRemainingProgress(startedAt, dueMs, nowMs);
  return progress === null ? null : Math.round(progress * 100);
}

function calculateRemainingMinutes(
  value: string | null,
  now: Date
): number | null {
  if (value === null) return null;
  const dueAt = Date.parse(value);
  if (!Number.isFinite(dueAt)) return null;
  return Math.max(0, Math.ceil((dueAt - now.getTime()) / 60_000));
}
