/**
 * Calendar dates as `YYYY-MM-DD` strings.
 *
 * Billing happens on calendar days, not instants. Keeping dates free of time
 * and timezone means arithmetic can never shift a payment to a neighbouring
 * day (the classic `new Date('2026-01-31')` UTC-midnight bug). All arithmetic
 * goes through a proleptic Gregorian day count, so leap years and month
 * lengths are exact.
 */
export type ISODate = string & { readonly __brand: 'ISODate' };

export interface DateParts {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28;
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31;
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0');
}

export function makeDate(year: number, month: number, day: number): ISODate {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day) ||
    year < 1 ||
    year > 9999 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    throw new RangeError(`Invalid calendar date: ${year}-${month}-${day}`);
  }
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}` as ISODate;
}

export function parseISODate(value: string): ISODate | null {
  const match = ISO_DATE_PATTERN.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null;
  return value as ISODate;
}

export function getParts(date: ISODate): DateParts {
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  };
}

/** Days since 1970-01-01 (Howard Hinnant's days_from_civil). */
function toEpochDay({ year, month, day }: DateParts): number {
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yearOfEra = y - era * 400;
  const shiftedMonth = (month + 9) % 12; // March = 0
  const dayOfYear = Math.floor((153 * shiftedMonth + 2) / 5) + day - 1;
  const dayOfEra = yearOfEra * 365 + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100) + dayOfYear;
  return era * 146097 + dayOfEra - 719468;
}

function fromEpochDay(epochDay: number): DateParts {
  const z = epochDay + 719468;
  const era = Math.floor(z / 146097);
  const dayOfEra = z - era * 146097;
  const yearOfEra = Math.floor(
    (dayOfEra - Math.floor(dayOfEra / 1460) + Math.floor(dayOfEra / 36524) - Math.floor(dayOfEra / 146096)) / 365,
  );
  const dayOfYear = dayOfEra - (365 * yearOfEra + Math.floor(yearOfEra / 4) - Math.floor(yearOfEra / 100));
  const shiftedMonth = Math.floor((5 * dayOfYear + 2) / 153);
  const day = dayOfYear - Math.floor((153 * shiftedMonth + 2) / 5) + 1;
  const month = shiftedMonth < 10 ? shiftedMonth + 3 : shiftedMonth - 9;
  const year = yearOfEra + era * 400 + (month <= 2 ? 1 : 0);
  return { year, month, day };
}

function fromParts(parts: DateParts): ISODate {
  return makeDate(parts.year, parts.month, parts.day);
}

export function addDays(date: ISODate, days: number): ISODate {
  return fromParts(fromEpochDay(toEpochDay(getParts(date)) + days));
}

/**
 * Adds whole months, clamping to the last day of the target month.
 * `preferredDay` lets callers keep an original anchor day (e.g. 31) across
 * short months instead of drifting to the 28th.
 */
export function addMonths(date: ISODate, months: number, preferredDay?: number): ISODate {
  const { year, month, day } = getParts(date);
  const zeroBased = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(zeroBased / 12);
  const targetMonth = zeroBased - targetYear * 12 + 1;
  const targetDay = Math.min(preferredDay ?? day, daysInMonth(targetYear, targetMonth));
  return makeDate(targetYear, targetMonth, targetDay);
}

/** Number of days from `from` to `to` (negative when `to` is earlier). */
export function diffDays(from: ISODate, to: ISODate): number {
  return toEpochDay(getParts(to)) - toEpochDay(getParts(from));
}

/** Whole calendar months between the months of two dates, ignoring days. */
export function diffCalendarMonths(from: ISODate, to: ISODate): number {
  const a = getParts(from);
  const b = getParts(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

export function compareDates(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

/** ISO weekday: Monday = 1 … Sunday = 7. */
export function isoWeekday(date: ISODate): number {
  const epochDay = toEpochDay(getParts(date));
  return ((((epochDay + 3) % 7) + 7) % 7) + 1;
}

export function startOfMonth(date: ISODate): ISODate {
  const { year, month } = getParts(date);
  return makeDate(year, month, 1);
}

export function endOfMonth(date: ISODate): ISODate {
  const { year, month } = getParts(date);
  return makeDate(year, month, daysInMonth(year, month));
}

/** The device's current local calendar day. */
export function todayLocal(now: Date = new Date()): ISODate {
  return makeDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

/** A local wall-clock moment on the given day (used for notification triggers). */
export function toLocalDateTime(date: ISODate, hour: number, minute: number): Date {
  const { year, month, day } = getParts(date);
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}
