import { annualEstimateMinor, monthlyEstimateMinor, nextBillingDate } from './billing';
import type { ISODate } from './calendarDate';
import { currencyDecimals, type CurrencyCode } from './currency';
import type { Subscription } from './subscription';

export const EXPORT_FORMAT = 'looply-export';
export const EXPORT_VERSION = 1;

/** Plain decimal string with a dot separator, independent of locale. */
function toDecimalString(minor: number, currency: CurrencyCode): string {
  const decimals = currencyDecimals(currency);
  return (Math.round(minor) / 10 ** decimals).toFixed(decimals);
}

export interface ExportContext {
  today: ISODate;
  exportedAt: string;
  defaultCurrency: CurrencyCode;
}

export function buildJsonExport(subscriptions: readonly Subscription[], context: ExportContext): string {
  const payload = {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: context.exportedAt,
    defaultCurrency: context.defaultCurrency,
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      name: s.name,
      amount: toDecimalString(s.amountMinor, s.currency),
      amountMinor: s.amountMinor,
      currency: s.currency,
      interval: s.interval,
      anchorDate: s.anchorDate,
      nextBillingDate: nextBillingDate(s, context.today),
      category: s.category,
      status: s.status,
      url: s.url,
      notes: s.notes,
      reminderDaysBefore: s.reminderDaysBefore,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

const CSV_COLUMNS = [
  'name',
  'amount',
  'currency',
  'billing_interval',
  'next_billing_date',
  'category',
  'status',
  'monthly_estimate',
  'annual_estimate',
  'reminder_days_before',
  'url',
  'notes',
  'created_at',
] as const;

/**
 * Quotes per RFC 4180 and neutralizes spreadsheet formulas: a cell starting
 * with `=`, `+`, `-` or `@` would otherwise be executed by Excel and friends.
 */
export function escapeCsvCell(value: string): string {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]|^\s|\s$/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** UTF-8 CSV with a byte-order mark so spreadsheet apps detect Cyrillic correctly. */
export function buildCsvExport(subscriptions: readonly Subscription[], today: ISODate): string {
  const rows = subscriptions.map((s) => [
    s.name,
    toDecimalString(s.amountMinor, s.currency),
    s.currency,
    s.interval,
    nextBillingDate(s, today),
    s.category,
    s.status,
    toDecimalString(monthlyEstimateMinor(s.amountMinor, s.interval), s.currency),
    toDecimalString(annualEstimateMinor(s.amountMinor, s.interval), s.currency),
    s.reminderDaysBefore === null ? '' : String(s.reminderDaysBefore),
    s.url ?? '',
    s.notes ?? '',
    s.createdAt,
  ]);
  const lines = [CSV_COLUMNS.join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))];
  return `﻿${lines.join('\r\n')}\r\n`;
}
