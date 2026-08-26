import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMonthDayTime,
  formatTime,
  formatWeekday
} from "./datetime";

describe("datetime formatters", () => {
  const localDate = new Date(2026, 7, 26, 14, 5, 9);

  it("formats a complete zh-TW date and time", () => {
    expect(formatDateTime(localDate)).toBe("2026/8/26\u2009下午2:05:09");
  });

  it("formats time with a stable 24-hour clock", () => {
    expect(formatTime(localDate)).toBe("14:05");
  });

  it("formats month, day and time with an optional time zone", () => {
    expect(
      formatMonthDayTime("2026-08-26T06:05:00.000Z", {
        timeZone: "Asia/Taipei"
      })
    ).toBe("8/26\u200914:05");
  });

  it("formats the short weekday", () => {
    expect(formatWeekday(localDate)).toBe("週三");
  });

  it("formats a numeric month and day", () => {
    expect(formatDate(localDate)).toBe("8/26");
  });
});
