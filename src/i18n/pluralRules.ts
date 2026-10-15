/**
 * Minimal CLDR cardinal plural rules for the app's languages.
 *
 * i18next selects plural forms through `Intl.PluralRules`. Hermes does not
 * always ship it, and engines that do may not know the `cnr` tag and silently
 * fall back to English rules ("2 pretplata" instead of "2 pretplate"). The
 * polyfill below is installed only when the native implementation is missing
 * or gets Montenegrin/Russian wrong.
 */
type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';

function slavicCategory(n: number, hasManyForm: boolean): PluralCategory {
  if (!Number.isInteger(n)) return 'other';
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'one';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'few';
  return hasManyForm ? 'many' : 'other';
}

export function selectPluralCategory(language: string, count: number): PluralCategory {
  const n = Math.abs(count);
  const base = language.toLowerCase().split(/[-_]/)[0];
  switch (base) {
    case 'cnr':
    case 'sr':
    case 'hr':
    case 'bs':
      // CLDR also treats fractions by their digits; the app only pluralizes integers.
      return slavicCategory(n, false);
    case 'ru':
    case 'uk':
      return slavicCategory(n, true);
    default:
      return n === 1 ? 'one' : 'other';
  }
}

function categoriesFor(language: string): PluralCategory[] {
  const base = language.toLowerCase().split(/[-_]/)[0];
  if (base === 'ru' || base === 'uk') return ['one', 'few', 'many', 'other'];
  if (base === 'cnr' || base === 'sr' || base === 'hr' || base === 'bs') return ['one', 'few', 'other'];
  return ['one', 'other'];
}

function nativeRulesAreReliable(): boolean {
  try {
    if (typeof Intl === 'undefined' || typeof Intl.PluralRules !== 'function') return false;
    return new Intl.PluralRules('cnr').select(2) === 'few' && new Intl.PluralRules('ru').select(5) === 'many';
  } catch {
    return false;
  }
}

class AppPluralRules {
  private readonly locale: string;

  constructor(locales?: string | readonly string[]) {
    this.locale = (Array.isArray(locales) ? locales[0] : (locales as string | undefined)) ?? 'en';
  }

  select(count: number): PluralCategory {
    return selectPluralCategory(this.locale, count);
  }

  resolvedOptions() {
    return { locale: this.locale, pluralCategories: categoriesFor(this.locale) };
  }

  static supportedLocalesOf(locales: string | readonly string[]): string[] {
    return Array.isArray(locales) ? [...locales] : [locales as string];
  }
}

export function installPluralRulesPolyfill(): void {
  if (nativeRulesAreReliable()) return;
  const intl = (globalThis as { Intl?: Record<string, unknown> }).Intl ?? {};
  intl.PluralRules = AppPluralRules;
  (globalThis as { Intl?: Record<string, unknown> }).Intl = intl;
}
