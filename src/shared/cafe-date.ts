import { subDays } from "date-fns";

export const CAFE_TIMEZONE = "Asia/Jakarta";
const CAFE_UTC_OFFSET = "+07:00";

const cafeDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: CAFE_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const cafeDateLabelFormatter = new Intl.DateTimeFormat("id-ID", {
  timeZone: CAFE_TIMEZONE,
  day: "2-digit",
  month: "short",
});

export function getCafeDateKey(date = new Date()) {
  return cafeDateFormatter.format(date);
}

export function getCafeDateLabel(dateKey: string) {
  return cafeDateLabelFormatter.format(parseDateOnly(dateKey));
}

export function parseDateOnly(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

export function parseCafeDateTime(dateKey: string, time: string) {
  return new Date(`${dateKey}T${time}${CAFE_UTC_OFFSET}`);
}

export function parseCafeLocalDateTime(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value.includes("T")) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const normalized = `${value.replace(" ", "T")}${CAFE_UTC_OFFSET}`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getCafeDayRange(date = new Date()) {
  const dateKey = getCafeDateKey(date);

  return {
    dateKey,
    start: parseCafeDateTime(dateKey, "00:00:00.000"),
    end: parseCafeDateTime(dateKey, "23:59:59.999"),
  };
}

export function getCafeDateTimeRange(days: number, endDate = new Date()) {
  const safeDays = Math.max(1, days);
  const dateKeys = Array.from({ length: safeDays }, (_, index) =>
    getCafeDateKey(subDays(endDate, safeDays - index - 1)),
  );

  return {
    dateKeys,
    start: parseCafeDateTime(dateKeys[0], "00:00:00.000"),
    end: parseCafeDateTime(dateKeys[dateKeys.length - 1], "23:59:59.999"),
  };
}

export function getCafeDateTimeRangeFromDates(startDateStr: string, endDateStr: string) {
  const startObj = new Date(`${startDateStr}T12:00:00.000Z`); // use 12:00 UTC to avoid local timezone boundary issues
  const endObj = new Date(`${endDateStr}T12:00:00.000Z`);

  if (startObj > endObj) {
    throw new Error("Start date must be before end date");
  }

  const dateKeys: string[] = [];
  const current = new Date(startObj);

  // max 366 days loop to prevent infinite loop memory bloat
  let counter = 0;
  while (current <= endObj && counter < 366) {
    dateKeys.push(getCafeDateKey(current));
    current.setDate(current.getDate() + 1);
    counter++;
  }

  return {
    dateKeys,
    start: parseCafeDateTime(dateKeys[0], "00:00:00.000"),
    end: parseCafeDateTime(dateKeys[dateKeys.length - 1], "23:59:59.999"),
  };
}
