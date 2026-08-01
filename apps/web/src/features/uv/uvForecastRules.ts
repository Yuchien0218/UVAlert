import {
  FiveDayUvForecastSchema,
  type FiveDayUvForecast,
  type UvRiskLevel
} from "@sunshield/contracts";

export const EVENING_START_HOUR = 18;
export const EVENING_END_HOUR = 6;

export function isFixedEvening(date: Date): boolean {
  const hour = date.getHours();
  return hour >= EVENING_START_HOUR || hour < EVENING_END_HOUR;
}

export function getEveningCycleKey(date: Date): string | null {
  if (!isFixedEvening(date)) return null;

  const cycleDate = new Date(date);
  if (cycleDate.getHours() < EVENING_END_HOUR) {
    cycleDate.setDate(cycleDate.getDate() - 1);
  }

  return [
    cycleDate.getFullYear(),
    String(cycleDate.getMonth() + 1).padStart(2, "0"),
    String(cycleDate.getDate()).padStart(2, "0")
  ].join("-");
}

export function selectUpcomingForecast(
  forecast: FiveDayUvForecast,
  now: Date
): FiveDayUvForecast | null {
  if (Date.parse(forecast.usableUntil) <= now.getTime()) {
    return null;
  }

  const days = forecast.days
    .filter((day) => Date.parse(day.validTo) > now.getTime())
    .slice(0, 5);
  if (days.length === 0) return null;

  return FiveDayUvForecastSchema.parse({
    ...forecast,
    days
  });
}

export function getUvRiskLevelLabel(
  riskLevel: UvRiskLevel
): string {
  switch (riskLevel) {
    case "low":
      return "低量級";
    case "moderate":
      return "中量級";
    case "high":
      return "高量級";
    case "very_high":
      return "過量級";
    case "extreme":
      return "危險級";
  }
}

export function getHighestForecastDay(
  forecast: FiveDayUvForecast
): FiveDayUvForecast["days"][number] {
  return forecast.days.reduce((highest, day) =>
    day.uvi > highest.uvi ? day : highest
  );
}
