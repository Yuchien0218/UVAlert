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

function toDate(value: DateTimeInput): Date {
  return value instanceof Date ? value : new Date(value);
}
