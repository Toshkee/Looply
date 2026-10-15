import { currencyDecimals, type CurrencyCode } from './currency';

/** Longest digit run we accept; keeps every parsed value a safe integer. */
const MAX_DIGITS = 12;

/**
 * Parses a user-typed amount into integer minor units (e.g. cents).
 *
 * Users type with whatever separators their keyboard offers, so both
 * `9,99` and `9.99` are accepted, as are grouped forms like `1.234,56`,
 * `1,234.56` and `1 234,56`. When only one separator kind appears once and is
 * followed by exactly three digits (`1.299`), it is read as a thousands
 * separator, which matches how prices are written in Montenegro.
 *
 * Returns `null` for anything that is not a non-negative amount with at most
 * the currency's number of fraction digits.
 */
export function parseAmountInput(input: string, currency: CurrencyCode): number | null {
  const decimals = currencyDecimals(currency);
  const compact = input.trim().replace(/[\s  ']/g, '');
  if (compact === '' || !/^[\d.,]+$/.test(compact) || !/\d/.test(compact)) return null;

  const lastDot = compact.lastIndexOf('.');
  const lastComma = compact.lastIndexOf(',');
  let integerPart: string;
  let fractionPart = '';

  if (lastDot >= 0 && lastComma >= 0) {
    const decimalIndex = Math.max(lastDot, lastComma);
    const groupSeparator = decimalIndex === lastDot ? ',' : '.';
    integerPart = compact.slice(0, decimalIndex);
    fractionPart = compact.slice(decimalIndex + 1);
    if (!isValidGrouping(integerPart, groupSeparator)) return null;
    integerPart = integerPart.split(groupSeparator).join('');
  } else if (lastDot >= 0 || lastComma >= 0) {
    const separator = lastDot >= 0 ? '.' : ',';
    const pieces = compact.split(separator);
    const head = pieces[0] ?? '';
    const tail = pieces[pieces.length - 1] ?? '';
    const looksGrouped =
      pieces.length > 2 || (pieces.length === 2 && tail.length === 3 && head !== '' && head !== '0' && decimals < 3);
    if (looksGrouped) {
      if (!isValidGrouping(compact, separator)) return null;
      integerPart = pieces.join('');
    } else {
      integerPart = head;
      fractionPart = tail;
    }
  } else {
    integerPart = compact;
  }

  if (integerPart === '') integerPart = '0';
  if (!/^\d+$/.test(integerPart) || (fractionPart !== '' && !/^\d+$/.test(fractionPart))) return null;

  // Extra trailing zeros are harmless ("10,00" for a zero-decimal currency).
  const significantFraction = fractionPart.replace(/0+$/, '');
  if (significantFraction.length > decimals) return null;

  const digits = integerPart.replace(/^0+(?=\d)/, '');
  if (digits.length > MAX_DIGITS) return null;

  const fraction = significantFraction.padEnd(decimals, '0');
  return Number(digits) * 10 ** decimals + (decimals > 0 ? Number(fraction) : 0);
}

function isValidGrouping(value: string, separator: string): boolean {
  const groups = value.split(separator);
  if (groups.length === 1) return true;
  const [first, ...rest] = groups;
  return (
    first !== undefined && /^\d{1,3}$/.test(first) && rest.every((group) => /^\d{3}$/.test(group))
  );
}

/** Formats minor units for an editable text field, e.g. `1299` → `12,99`. */
export function formatAmountForInput(minor: number, currency: CurrencyCode, decimalSeparator: string): string {
  const decimals = currencyDecimals(currency);
  const rounded = Math.round(minor);
  if (decimals === 0) return String(rounded);
  const scale = 10 ** decimals;
  const whole = Math.floor(rounded / scale);
  const fraction = String(rounded % scale).padStart(decimals, '0');
  return `${whole}${decimalSeparator}${fraction}`;
}

const formatterCache = new Map<string, Intl.NumberFormat | null>();

function createFormatter(locale: string, currency: CurrencyCode): Intl.NumberFormat | null {
  const decimals = currencyDecimals(currency);
  // `narrowSymbol` ("$" instead of "US$") is not available on every engine.
  for (const currencyDisplay of ['narrowSymbol', 'symbol'] as const) {
    try {
      return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency,
        currencyDisplay,
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch {
      // try the next, more widely supported option
    }
  }
  return null;
}

function getFormatter(locale: string, currency: CurrencyCode): Intl.NumberFormat | null {
  const key = `${locale}|${currency}`;
  if (!formatterCache.has(key)) formatterCache.set(key, createFormatter(locale, currency));
  return formatterCache.get(key) ?? null;
}

export interface FormatMoneyOptions {
  /** Prefix positive values with "+" and negative ones with "−"; used for differences. */
  signed?: boolean;
}

/**
 * Formats minor units as a localized currency string. Normalized estimates
 * can be fractional minor units; they are rounded half away from zero here,
 * once, at display time.
 */
export function formatMoney(
  minor: number,
  currency: CurrencyCode,
  locale: string,
  { signed = false }: FormatMoneyOptions = {},
): string {
  const decimals = currencyDecimals(currency);
  const roundedAbs = Math.round(Math.abs(minor));
  const major = roundedAbs / 10 ** decimals;
  const formatter = getFormatter(locale, currency);
  const body = formatter ? formatter.format(major) : `${major.toFixed(decimals)} ${currency}`;
  const isNegative = minor < 0 && roundedAbs > 0;
  if (isNegative) return `−${body}`;
  if (signed && roundedAbs > 0) return `+${body}`;
  return body;
}
