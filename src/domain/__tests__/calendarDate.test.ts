import {
  addDays,
  addMonths,
  daysInMonth,
  diffCalendarMonths,
  diffDays,
  endOfMonth,
  isLeapYear,
  isoWeekday,
  makeDate,
  parseISODate,
  todayLocal,
  toLocalDateTime,
  type ISODate,
} from '../calendarDate';

const d = (value: string) => value as ISODate;

describe('calendarDate', () => {
  test('leap years follow the Gregorian rules', () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(1900)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2026, 4)).toBe(30);
    expect(daysInMonth(2026, 12)).toBe(31);
  });

  test('parses only real calendar dates', () => {
    expect(parseISODate('2026-02-28')).toBe('2026-02-28');
    expect(parseISODate('2026-02-29')).toBeNull();
    expect(parseISODate('2024-02-29')).toBe('2024-02-29');
    expect(parseISODate('2026-13-01')).toBeNull();
    expect(parseISODate('2026-1-01')).toBeNull();
    expect(parseISODate('2026-01-01T00:00:00Z')).toBeNull();
    expect(() => makeDate(2026, 2, 30)).toThrow(RangeError);
  });

  test('adds days across month, year and leap boundaries', () => {
    expect(addDays(d('2026-01-31'), 1)).toBe('2026-02-01');
    expect(addDays(d('2026-12-31'), 1)).toBe('2027-01-01');
    expect(addDays(d('2024-02-28'), 1)).toBe('2024-02-29');
    expect(addDays(d('2024-03-01'), -1)).toBe('2024-02-29');
    expect(addDays(d('2026-03-01'), -1)).toBe('2026-02-28');
    expect(addDays(d('2026-10-15'), 365)).toBe('2027-10-15');
  });

  test('adds months with end-of-month clamping', () => {
    expect(addMonths(d('2026-01-31'), 1)).toBe('2026-02-28');
    expect(addMonths(d('2024-01-31'), 1)).toBe('2024-02-29');
    expect(addMonths(d('2026-03-31'), 1)).toBe('2026-04-30');
    expect(addMonths(d('2026-11-15'), 3)).toBe('2027-02-15');
    expect(addMonths(d('2026-02-15'), -3)).toBe('2025-11-15');
    // A preferred day restores the anchor day after a short month.
    expect(addMonths(d('2026-02-28'), 1, 31)).toBe('2026-03-31');
  });

  test('differences', () => {
    expect(diffDays(d('2026-01-01'), d('2026-12-31'))).toBe(364);
    expect(diffDays(d('2024-01-01'), d('2025-01-01'))).toBe(366);
    expect(diffDays(d('2026-03-10'), d('2026-03-01'))).toBe(-9);
    expect(diffCalendarMonths(d('2025-11-30'), d('2026-02-01'))).toBe(3);
  });

  test('ISO weekday', () => {
    expect(isoWeekday(d('1970-01-01'))).toBe(4); // Thursday
    expect(isoWeekday(d('2026-10-15'))).toBe(4); // Thursday
    expect(isoWeekday(d('2026-10-18'))).toBe(7); // Sunday
    expect(isoWeekday(d('2026-10-19'))).toBe(1); // Monday
    expect(isoWeekday(d('1969-12-31'))).toBe(3); // Wednesday, negative epoch day
  });

  test('end of month', () => {
    expect(endOfMonth(d('2024-02-10'))).toBe('2024-02-29');
    expect(endOfMonth(d('2026-02-10'))).toBe('2026-02-28');
  });

  test('local today and local wall-clock times do not depend on UTC', () => {
    // 00:30 local time: a UTC-based conversion would report the previous day east of UTC.
    const justAfterMidnight = new Date(2026, 9, 15, 0, 30);
    expect(todayLocal(justAfterMidnight)).toBe('2026-10-15');
    const lateEvening = new Date(2026, 9, 15, 23, 59);
    expect(todayLocal(lateEvening)).toBe('2026-10-15');
    const moment = toLocalDateTime(d('2026-03-29'), 9, 0); // EU DST switch day
    expect([moment.getFullYear(), moment.getMonth(), moment.getDate(), moment.getHours()]).toEqual([2026, 2, 29, 9]);
  });
});
