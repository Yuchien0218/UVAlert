import { makeFiveDayUvForecast } from "@sunshield/test-fixtures";
import { describe, expect, it } from "vitest";
import {
  getEveningCycleKey,
  getHighestForecastDay,
  getUvRiskLevelLabel,
  isFixedEvening,
  selectUpcomingForecast,
  toLocalDateKey
} from "./uvForecastRules";

describe("fixed evening and five-day UV rules", () => {
  it("以裝置當地時間 18:00～05:59 判斷晚間", () => {
    expect(isFixedEvening(new Date(2026, 6, 30, 17, 59))).toBe(false);
    expect(isFixedEvening(new Date(2026, 6, 30, 18, 0))).toBe(true);
    expect(isFixedEvening(new Date(2026, 6, 31, 5, 59))).toBe(true);
    expect(isFixedEvening(new Date(2026, 6, 31, 6, 0))).toBe(false);
  });

  it("跨午夜仍屬於同一個晚間提醒週期", () => {
    expect(getEveningCycleKey(new Date(2026, 6, 30, 23, 0))).toBe("2026-07-30");
    expect(getEveningCycleKey(new Date(2026, 6, 31, 2, 0))).toBe("2026-07-30");
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

  /*
   * **日落之後今天不能消失**（2026-09-04，使用者回報「有時候晚上打開會少一
   * 天」）。
   *
   * 原本是用 `validTo` 過濾，而今天那筆的 `validTo` 是日落——太陽下山之後
   * 今天整格就不見了，五日條變四格。少一天的窗口是「日落 → usableUntil」，
   * 而 usableUntil 是抓取後 6 小時，所以下午開過 App 的話這個窗口接近四小時。
   *
   * 時間刻意挑在 **19:30**：今天的白日時段（17:00 結束）已經過了，但預報整體
   * 還在 usableUntil 之內。只驗白天正常的話，回去用 validTo 過濾仍然會全綠。
   */
  it("日落之後今天仍留在五日條上，不會少一天", () => {
    const now = new Date(2026, 8, 4, 19, 30);

    const forecast = makeFiveDayUvForecast({
      fetchedAt: new Date(2026, 8, 4, 16, 0).toISOString(),
      usableUntil: new Date(2026, 8, 4, 22, 0).toISOString(),
      days: buildDays(new Date(2026, 8, 4), 5)
    });

    const upcoming = selectUpcomingForecast(forecast, now);

    expect(upcoming).not.toBeNull();
    expect(upcoming!.days).toHaveLength(5);
    expect(upcoming!.days[0]!.localDate).toBe("2026-09-04");
  });

  /*
   * 但過了本地午夜，昨天就該掉出去——不是「永遠不濾」，是把界線從日落換成
   * 日曆日。少了這條，一個完全不過濾的實作也會過上面那條。
   */
  it("跨過本地午夜之後，昨天會掉出去", () => {
    const now = new Date(2026, 8, 5, 8, 0);

    const forecast = makeFiveDayUvForecast({
      fetchedAt: new Date(2026, 8, 5, 7, 0).toISOString(),
      usableUntil: new Date(2026, 8, 5, 13, 0).toISOString(),
      days: buildDays(new Date(2026, 8, 4), 5)
    });

    const upcoming = selectUpcomingForecast(forecast, now);

    expect(upcoming).not.toBeNull();
    expect(upcoming!.days).toHaveLength(4);
    expect(
      upcoming!.days.some((day) => day.localDate === "2026-09-04")
    ).toBe(false);
  });
});

/** 從 `start` 起連續 n 天，白日時段設成 09:00–17:00 本地時間。 */
function buildDays(start: Date, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(start);
    date.setDate(date.getDate() + index);
    const from = new Date(date);
    from.setHours(9, 0, 0, 0);
    const to = new Date(date);
    to.setHours(17, 0, 0, 0);
    return {
      localDate: toLocalDateKey(date),
      validFrom: from.toISOString(),
      validTo: to.toISOString(),
      uvi: 7,
      riskLevel: "high" as const,
      temperatureCelsius: 30
    };
  });
}
