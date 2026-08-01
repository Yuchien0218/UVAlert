import type {
  ContextEventV1,
  WaterEndEventV1,
  WaterStartEventV1
} from "@sunshield/contracts";
import { resolveEventCorrectionLeaves } from "./corrections";
import { DomainInvariantError } from "./errors";
import { compareEventOrder } from "./ordering";

export type WaterInterval = {
  start: WaterStartEventV1;
  end: WaterEndEventV1 | null;
};

function sameZoneSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

export function validateWaterIntervals(
  contextEvents: ReadonlyArray<ContextEventV1>,
  trustedNow: string
): WaterInterval[] {
  const effective = resolveEventCorrectionLeaves(
    contextEvents,
    (event) => event.contextType
  ).sort(compareEventOrder);
  const intervals: WaterInterval[] = [];
  let open: WaterInterval | null = null;

  for (const event of effective) {
    if (event.contextType === "water_start") {
      if (open !== null) {
        throw new DomainInvariantError(
          "INVALID_WATER_INTERVAL",
          "水上活動區間不得重疊"
        );
      }
      if (
        event.activityStartedAt !== null &&
        (Date.parse(event.activityStartedAt) >
          Date.parse(event.effectiveOccurredAt) ||
          Date.parse(event.activityStartedAt) > Date.parse(trustedNow))
      ) {
        throw new DomainInvariantError(
          "INVALID_WATER_INTERVAL",
          "水上活動起點不得位於未來"
        );
      }
      open = { start: event, end: null };
      intervals.push(open);
      continue;
    }

    if (event.contextType !== "water_end") {
      continue;
    }
    if (
      open === null ||
      open.start.activityIntervalId !== event.activityIntervalId ||
      !sameZoneSet(open.start.zoneInstanceIds, event.zoneInstanceIds)
    ) {
      throw new DomainInvariantError(
        "INVALID_WATER_INTERVAL",
        "water_end 找不到唯一且部位集合相同的起點"
      );
    }
    const startAt = open.start.activityStartedAt;
    if (
      (startAt !== null && Date.parse(event.endedAt) < Date.parse(startAt)) ||
      Date.parse(event.endedAt) > Date.parse(event.effectiveOccurredAt) ||
      Date.parse(event.endedAt) > Date.parse(trustedNow)
    ) {
      throw new DomainInvariantError(
        "INVALID_WATER_INTERVAL",
        "water_end 時間不合法"
      );
    }
    open.end = event;
    open = null;
  }

  return intervals;
}

