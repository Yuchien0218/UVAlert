import type { SessionProjection, ZoneProjection } from "@sunshield/contracts";
import { formatTime } from "../../helpers/datetime";
import { getZoneLabel } from "./reminderPresentation";

export type HomeReminderClockTone = "tracking" | "soon" | "due";
export type HomeReminderClockScope = "priority" | "all";

export interface HomeReminderClockPresentation {
  tone: HomeReminderClockTone;
  scope: HomeReminderClockScope;
  title: string;
  timeLabel: string;
  remainingMinutes: number;
  progress: number | null;
  progressPercent: number | null;
  ariaLabel: string;
  /**
   * 目前是否有進行中的水上活動。
   *
   * 2026-08-31 新增（使用者裁決：波浪只用在這裡）。
   *
   * **兩種情況都算**，因為它們都代表「現在在水裡」：
   *
   * 1. `activeWaterDeadline` 還沒過期——防曬乳標示有耐水分鐘數，倒數照
   *    那個算
   * 2. `reasonCodes` 含 `WATER_RESISTANCE_UNKNOWN`——標示沒說耐水多久，
   *    reducer 只能記下「不知道」
   *
   * 第一版只判斷第 1 種，**畫面實測才發現漏了第 2 種**：拿一件沒有填包裝
   * 標示的防曬乳記錄「游泳／下水」，事件流看得到入水、首頁卻完全沒有反應
   * ——而那正是最需要提示的情況（連系統都不知道還能撐多久）。單元測試對
   * 這件事是綠的，因為測試資料是我自己捏的。
   *
   * 兩個訊號都來自 reducer 的同一段（reducer.ts 第 735 行起的水上區間
   * 分支），所以 `WATER_RESISTANCE_UNKNOWN` 一定隱含「有進行中的水上
   * 區間」，不會誤報。
   *
   * 不另外從 `openWaterInterval` 拉一條路進來：那是 repository 層的東西，
   * 而首頁這裡拿得到的是投影。同一件事有兩個來源就會有兩種答案。
   */
  inWater: boolean;
}

type TimedZone = {
  zone: ZoneProjection;
  dueAt: string;
  dueMs: number;
  sourceIndex: number;
};

export function buildHomeReminderClockPresentation(
  session: SessionProjection,
  now: Date
): HomeReminderClockPresentation | null {
  if (session.primaryAction.presentationType === "untimed_action_card") {
    return null;
  }

  const timedZones = session.zones
    .map((zone, sourceIndex): TimedZone | null => {
      if (zone.trackingStatus !== "active" || zone.zoneDueAt === null) {
        return null;
      }
      const dueMs = Date.parse(zone.zoneDueAt);
      if (!Number.isFinite(dueMs)) return null;
      return {
        zone,
        dueAt: zone.zoneDueAt,
        dueMs,
        sourceIndex
      };
    })
    .filter((entry): entry is TimedZone => entry !== null)
    .sort(
      (left, right) =>
        left.dueMs - right.dueMs || left.sourceIndex - right.sourceIndex
    );

  const earliest = timedZones[0];
  if (earliest === undefined) return null;

  const earliestZones = timedZones.filter(
    (entry) => entry.dueMs === earliest.dueMs
  );
  const activeZoneCount = session.zones.filter(
    (zone) => zone.trackingStatus === "active"
  ).length;
  const scope: HomeReminderClockScope =
    timedZones.length > 1 &&
    timedZones.length === activeZoneCount &&
    earliestZones.length === timedZones.length
      ? "all"
      : "priority";
  const firstZoneLabel = getZoneLabel(earliest.zone);
  const zoneLabel =
    earliestZones.length > 1 ? `${firstZoneLabel}等部位` : firstZoneLabel;
  const remainingMs = Math.max(0, earliest.dueMs - now.getTime());
  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  const progress = calculateRemainingProgress(
    earliest.zone.zoneTimerStartedAt,
    earliest.dueMs,
    now.getTime()
  );
  const tone = getTone(earliest.zone, remainingMs);
  const inWater = session.zones.some((zone) => {
    if (zone.trackingStatus !== "active") return false;
    if (zone.reasonCodes.includes("WATER_RESISTANCE_UNKNOWN")) return true;
    return (
      zone.activeWaterDeadline !== null &&
      Date.parse(zone.activeWaterDeadline) > now.getTime()
    );
  });
  const title = buildTitle(scope, zoneLabel, tone);
  const absoluteTime = formatTime(earliest.dueAt);

  return {
    tone,
    scope,
    title,
    timeLabel: `預計 ${absoluteTime}`,
    remainingMinutes,
    progress,
    progressPercent: progress === null ? null : Math.round(progress * 100),
    inWater,
    ariaLabel: buildAriaLabel(
      scope,
      zoneLabel,
      remainingMinutes,
      absoluteTime,
      tone
    )
  };
}

/**
 * 標題必須跟著 tone 走。倒數還剩兩小時卻寫「建議進行全面補擦」，
 * 會被讀成「現在就去補」，與提醒頁同一時刻的「接下來需要檢查」互相矛盾。
 * 祈使語氣只留給已到期的情況。
 */
function buildTitle(
  scope: HomeReminderClockScope,
  zoneLabel: string,
  tone: HomeReminderClockTone
): string {
  if (scope === "priority") {
    return `${PRIORITY_LEAD_BY_TONE[tone]}：${zoneLabel}`;
  }
  return ALL_TITLE_BY_TONE[tone];
}

/** `due` 兩則沿用既有核准文案，不隨這次修正變動。 */
const PRIORITY_LEAD_BY_TONE: Record<HomeReminderClockTone, string> = {
  due: "建議優先補擦",
  soon: "快到補擦時間",
  tracking: "接下來需要補擦"
};

const ALL_TITLE_BY_TONE: Record<HomeReminderClockTone, string> = {
  due: "建議全面補擦",
  soon: "快到全面補擦時間",
  tracking: "接下來需要全面補擦"
};

function buildAriaLabel(
  scope: HomeReminderClockScope,
  zoneLabel: string,
  remainingMinutes: number,
  absoluteTime: string,
  tone: HomeReminderClockTone
): string {
  const timingLabel =
    remainingMinutes === 0 ? "已到建議補擦時間" : `剩 ${remainingMinutes} 分鐘`;
  return scope === "priority"
    ? `${PRIORITY_LEAD_BY_TONE[tone]}：${zoneLabel}，${timingLabel}，預計 ${absoluteTime}。`
    : `${ALL_ARIA_LEAD_BY_TONE[tone]}，${timingLabel}，預計 ${absoluteTime}。`;
}

const ALL_ARIA_LEAD_BY_TONE: Record<HomeReminderClockTone, string> = {
  due: "建議全面補擦",
  soon: "快到全面補擦時間",
  tracking: "接下來需要全面補擦"
};

export function calculateRemainingProgress(
  startedAt: string | null,
  dueMs: number,
  nowMs: number
): number | null {
  if (startedAt === null) return null;
  const startedMs = Date.parse(startedAt);
  const durationMs = dueMs - startedMs;
  if (!Number.isFinite(startedMs) || durationMs <= 0) return null;
  return Math.min(1, Math.max(0, (dueMs - nowMs) / durationMs));
}

function getTone(
  zone: ZoneProjection,
  remainingMs: number
): HomeReminderClockTone {
  if (remainingMs <= 0 || zone.timingStatus === "reapply_due") {
    return "due";
  }
  if (zone.timingStatus === "reapply_soon") return "soon";
  return "tracking";
}
