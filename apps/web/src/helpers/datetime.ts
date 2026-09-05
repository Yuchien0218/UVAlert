export type DateTimeInput = string | number | Date;

interface FormatMonthDayTimeOptions {
  timeZone?: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
  second: "2-digit"
});

const timeFormatter = new Intl.DateTimeFormat("zh-TW", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false
});

const weekdayFormatter = new Intl.DateTimeFormat("zh-TW", {
  weekday: "short"
});

const dateFormatter = new Intl.DateTimeFormat("zh-TW", {
  month: "numeric",
  day: "numeric"
});

/**
 * 帶年份的日期。
 *
 * `formatDate` 刻意只有月／日——App 裡的日期都在「今天前後幾天」的脈絡
 * 中，年份是多餘的噪音。**分享圖不一樣**：圖會被存下來、被轉傳，看到它的
 * 人沒有那個脈絡，隔年再看到「9/2」就分不出是哪一年的清單。
 */
const fullDateFormatter = new Intl.DateTimeFormat("zh-TW", {
  year: "numeric",
  month: "numeric",
  day: "numeric"
});

export function formatDateTime(value: DateTimeInput): string {
  return dateTimeFormatter.format(toDate(value));
}

export function formatTime(value: DateTimeInput): string {
  return timeFormatter.format(toDate(value));
}

export function formatMonthDayTime(
  value: DateTimeInput,
  options: FormatMonthDayTimeOptions = {}
): string {
  return new Intl.DateTimeFormat("zh-TW", {
    timeZone: options.timeZone,
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(toDate(value));
}

export function formatWeekday(value: DateTimeInput): string {
  return weekdayFormatter.format(toDate(value));
}

export function formatDate(value: DateTimeInput): string {
  return dateFormatter.format(toDate(value));
}

/** 帶年份的日期，給會離開 App 脈絡的內容用（目前只有分享圖）。 */
export function formatFullDate(value: DateTimeInput): string {
  return fullDateFormatter.format(toDate(value));
}

function toDate(value: DateTimeInput): Date {
  return value instanceof Date ? value : new Date(value);
}
