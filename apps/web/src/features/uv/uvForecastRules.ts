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

/**
 * 裝置本地的 `YYYY-MM-DD`，格式與預報的 `localDate` 相同。
 *
 * 不用 `toISOString().slice(0, 10)`——那是 UTC，台灣時間凌晨 0–8 點會被算成
 * 前一天。
 */
export function toLocalDateKey(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

export function getEveningCycleKey(date: Date): string | null {
  if (!isFixedEvening(date)) return null;

  const cycleDate = new Date(date);
  if (cycleDate.getHours() < EVENING_END_HOUR) {
    cycleDate.setDate(cycleDate.getDate() - 1);
  }

  return toLocalDateKey(cycleDate);
}

export function selectUpcomingForecast(
  forecast: FiveDayUvForecast,
  now: Date
): FiveDayUvForecast | null {
  if (Date.parse(forecast.usableUntil) <= now.getTime()) {
    return null;
  }

  /*
   * 2026-09-04：改用**日曆日**判斷，不再用 `validTo`。
   *
   * 起因是使用者回報「有時候晚上打開會少一天」。原本是
   * `.filter((day) => Date.parse(day.validTo) > now)`，而今天那筆的 `validTo`
   * 是**日落**——太陽下山之後今天整格就消失，五日條變四格。
   *
   * 少一天的窗口是「日落 → `usableUntil`」。`usableUntil` 是抓取後 6 小時，
   * 所以下午四點開過 App 的話，這個窗口從 18:20 一路到 22:00，將近四小時。
   *
   * **日落是「這個數字還是不是即時預報」的界線，不是「這天該不該出現在五日
   * 條」的界線。** 傍晚看到的「今天 7」是今天已經發生的高峰，那是事實不是
   * 過期資料；把它抽掉只會讓版面在日落瞬間跳一下，還少一天資訊。
   *
   * 換成日曆日之後，今天會待到當地午夜，五日條整天都是五格。
   *
   * 為什麼不是改成「重抓補回第五天」：`parseCachedForecast` 不會濾掉過期的
   * 天數，而後端快取只存 5 天（`.slice(0, 5)` 在寫入快取之前），所以上游回
   * 304 時補不回來——而且客戶端會因為「還是看到過期的天」每次前景都重抓，
   * 變成迴圈。那個方向要動後端快取的形狀，不是這裡能解的。
   */
  const today = toLocalDateKey(now);
  const days = forecast.days
    .filter((day) => day.localDate >= today)
    .slice(0, 5);
  if (days.length === 0) return null;

  return FiveDayUvForecastSchema.parse({
    ...forecast,
    days
  });
}

export function getUvRiskLevelLabel(riskLevel: UvRiskLevel): string {
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
