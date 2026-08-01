import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  getEveningCycleKey,
  getHighestForecastDay,
  getUvRiskLevelLabel,
  isFixedEvening,
  selectUpcomingForecast
} from "./uvForecastRules";

describe("fixed evening and five-day UV rules", () => {
  it("以裝置當地時間 18:00～05:59 判斷晚間", () => {
    expect(isFixedEvening(new Date(2026, 6, 30, 17, 59))).toBe(false);
    expect(isFixedEvening(new Date(2026, 6, 30, 18, 0))).toBe(true);
    expect(isFixedEvening(new Date(2026, 6, 31, 5, 59))).toBe(true);
    expect(isFixedEvening(new Date(2026, 6, 31, 6, 0))).toBe(false);
  });

  it("跨午夜仍屬於同一個晚間提醒週期", () => {
    expect(getEveningCycleKey(new Date(2026, 6, 30, 23, 0))).toBe(
      "2026-07-30"
    );
    expect(getEveningCycleKey(new Date(2026, 6, 31, 2, 0))).toBe(
      "2026-07-30"
    );
    expect(getEveningCycleKey(new Date(2026, 6, 31, 12, 0))).toBeNull();
  });

  it("只保留仍有效的白日時段，不沿用過期資料", () => {
    const forecast = makeFiveDayUvForecast();
    const upcoming = selectUpcomingForecast(
      forecast,
      new Date("2026-08-01T12:00:00.000Z")
    );

    expect(upcoming).toBeNull();
  });

  it("提供 CWA 中文分級並找出五日最高值", () => {
    const forecast = makeFiveDayUvForecast();

    expect(getUvRiskLevelLabel("very_high")).toBe("過量級");
    expect(getHighestForecastDay(forecast)).toMatchObject({
      uvi: 11,
      riskLevel: "extreme"
    });
  });
});
