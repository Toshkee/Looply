/**
 * Supported ISO 4217 currencies.
 *
 * Fraction digits are fixed here rather than read from `Intl` at runtime:
 * amounts are stored as integer minor units, so the scale must never differ
 * between devices or JS engines.
 */
export const CURRENCIES = {
  EUR: { decimals: 2 },
  USD: { decimals: 2 },
  GBP: { decimals: 2 },
  CHF: { decimals: 2 },
  RSD: { decimals: 2 },
  BAM: { decimals: 2 },
  ALL: { decimals: 0 },
  MKD: { decimals: 2 },
  RUB: { decimals: 2 },
  UAH: { decimals: 2 },
  TRY: { decimals: 2 },
  PLN: { decimals: 2 },
  CZK: { decimals: 2 },
  HUF: { decimals: 0 },
  SEK: { decimals: 2 },
  NOK: { decimals: 2 },
  DKK: { decimals: 2 },
  CAD: { decimals: 2 },
  AUD: { decimals: 2 },
  JPY: { decimals: 0 },
} as const satisfies Record<string, { decimals: number }>;

export type CurrencyCode = keyof typeof CURRENCIES;

export const CURRENCY_CODES = Object.keys(CURRENCIES) as CurrencyCode[];

export const DEFAULT_CURRENCY: CurrencyCode = 'EUR';

export function isCurrencyCode(value: unknown): value is CurrencyCode {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(CURRENCIES, value);
}

export function currencyDecimals(currency: CurrencyCode): number {
  return CURRENCIES[currency].decimals;
}
