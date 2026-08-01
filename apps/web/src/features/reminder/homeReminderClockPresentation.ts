import type {
  SessionProjection,
  ZoneProjection
} from "@sunshield/contracts";
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
      if (
        zone.trackingStatus !== "active" ||
        zone.zoneDueAt === null
      ) {
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
        left.dueMs - right.dueMs ||
        left.sourceIndex - right.sourceIndex
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
    earliestZones.length > 1
      ? `${firstZoneLabel}等部位`
      : firstZoneLabel;
  const remainingMs = Math.max(0, earliest.dueMs - now.getTime());
  const remainingMinutes = Math.ceil(remainingMs / 60_000);
  const progress = calculateRemainingProgress(
    earliest.zone.zoneTimerStartedAt,
    earliest.dueMs,
    now.getTime()
  );
  const tone = getTone(earliest.zone, remainingMs);
  const title = buildTitle(scope, zoneLabel);
  const absoluteTime = formatAbsoluteTime(earliest.dueAt);

  return {
    tone,
    scope,
    title,
    timeLabel: `預計 ${absoluteTime}`,
    remainingMinutes,
    progress,
    progressPercent:
      progress === null ? null : Math.round(progress * 100),
    ariaLabel: buildAriaLabel(
      scope,
      zoneLabel,
      remainingMinutes,
      absoluteTime
    )
  };
}

function buildTitle(
  scope: HomeReminderClockScope,
  zoneLabel: string
): string {
  if (scope === "priority") {
    return `建議優先補擦：${zoneLabel}`;
  }
  return "建議進行全面補擦";
}

function buildAriaLabel(
  scope: HomeReminderClockScope,
  zoneLabel: string,
  remainingMinutes: number,
  absoluteTime: string
): string {
  const timingLabel =
    remainingMinutes === 0
      ? "已到建議補擦時間"
      : `剩 ${remainingMinutes} 分鐘`;
  return scope === "priority"
    ? `建議優先補擦：${zoneLabel}，${timingLabel}，預計 ${absoluteTime}。`
    : `建議全面補擦，${timingLabel}，預計 ${absoluteTime}。`;
}

function calculateRemainingProgress(
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

function formatAbsoluteTime(value: string): string {
  return new Intl.DateTimeFormat("zh-TW", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}
