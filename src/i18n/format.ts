import type { TFunction } from 'i18next';

import { diffDays, getParts, isoWeekday, type ISODate } from '@/domain/calendarDate';
import type { CurrencyCode } from '@/domain/currency';
import { formatMoney, type FormatMoneyOptions } from '@/domain/money';

import { decimalSeparator, formattingLocale, type AppLanguage, type DeviceLocale } from './languages';

export type DateStyle = 'short' | 'long' | 'full' | 'weekday';

/**
 * Locale-aware formatting bound to one language.
 *
 * Dates use the app's own translated month and weekday names rather than
 * `Intl.DateTimeFormat`: the app language can differ from the device
 * language, and output must be identical on every engine and platform.
 * Money uses `Intl.NumberFormat`, which is reliable for the supported locales.
 */
export interface Formatters {
  language: AppLanguage;
  locale: string;
  decimalSeparator: string;
  money(minor: number, currency: CurrencyCode, options?: FormatMoneyOptions): string;
  date(date: ISODate, style?: DateStyle): string;
  monthYear(date: ISODate): string;
  /** "Today", "Tomorrow", "In 3 days" for the coming week, otherwise a short date. */
  relativeDay(date: ISODate, today: ISODate): string;
  weekdayMin(isoWeekdayIndex: number): string;
  weekdayShort(date: ISODate): string;
  percent(share: number): string;
}

export function createFormatters(t: TFunction, language: AppLanguage, deviceLocales: readonly DeviceLocale[]): Formatters {
  const locale = formattingLocale(language, deviceLocales);
  const list = (
    key: 'dates.months' | 'dates.monthsInDate' | 'dates.monthsShort' | 'dates.weekdays' | 'dates.weekdaysShort' | 'dates.weekdaysMin',
  ) =>
    t(key, { returnObjects: true }) as unknown as readonly string[];
  const months = list('dates.months');
  const monthsInDate = list('dates.monthsInDate');
  const monthsShort = list('dates.monthsShort');
  const weekdays = list('dates.weekdays');
  const weekdaysShort = list('dates.weekdaysShort');
  const weekdaysMin = list('dates.weekdaysMin');

  const date = (value: ISODate, style: DateStyle = 'long'): string => {
    const { year, month, day } = getParts(value);
    switch (style) {
      case 'short':
        return t('dates.format.dayMonthShort', { day, month: monthsShort[month - 1] });
      case 'long':
        return t('dates.format.dayMonth', { day, month: monthsInDate[month - 1] });
      case 'full':
        return t('dates.format.full', { day, month: monthsInDate[month - 1], year });
      case 'weekday':
        return t('dates.format.weekdayDayMonth', {
          weekday: weekdays[isoWeekday(value) - 1],
          day,
          month: monthsInDate[month - 1],
        });
    }
  };

  const percentFormat = (() => {
    try {
      return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    } catch {
      return null;
    }
  })();

  return {
    language,
    locale,
    decimalSeparator: decimalSeparator(language),
    money: (minor, currency, options) => formatMoney(minor, currency, locale, options),
    date,
    monthYear: (value) => {
      const { year, month } = getParts(value);
      return t('dates.format.monthYear', { month: months[month - 1], year });
    },
    relativeDay: (value, today) => {
      const days = diffDays(today, value);
      if (days === 0) return t('relative.today');
      if (days === 1) return t('relative.tomorrow');
      if (days > 1 && days < 7) return t('relative.inDays', { count: days });
      return date(value, 'short');
    },
    weekdayMin: (index) => weekdaysMin[index - 1] ?? '',
    weekdayShort: (value) => weekdaysShort[isoWeekday(value) - 1] ?? '',
    percent: (share) => {
      const value = Math.round(share * 100);
      return t('insights.shareOfTotal', { percent: percentFormat ? percentFormat.format(value) : String(value) });
    },
  };
}
