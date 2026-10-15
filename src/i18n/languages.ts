export const APP_LANGUAGES = ['cnr', 'en', 'ru'] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];

/** Montenegrin is both the primary language and the fallback. */
export const FALLBACK_LANGUAGE: AppLanguage = 'cnr';

/** Names are always shown in the language itself, never translated. */
export const LANGUAGE_NATIVE_NAMES: Record<AppLanguage, string> = {
  cnr: 'Crnogorski',
  en: 'English',
  ru: 'Русский',
};

export function isAppLanguage(value: unknown): value is AppLanguage {
  return typeof value === 'string' && (APP_LANGUAGES as readonly string[]).includes(value);
}

/** Device languages that Montenegrin speakers commonly have configured. */
const MONTENEGRIN_FAMILY = new Set(['cnr', 'sr', 'hr', 'bs', 'sh']);

export interface DeviceLocale {
  languageTag: string;
  languageCode: string | null;
}

/**
 * Picks the app language on first launch from the device's preferred
 * languages, in order. Unsupported languages fall back to Montenegrin.
 */
export function detectLanguage(deviceLocales: readonly DeviceLocale[]): AppLanguage {
  for (const locale of deviceLocales) {
    const code = (locale.languageCode ?? locale.languageTag.split(/[-_]/)[0] ?? '').toLowerCase();
    if (MONTENEGRIN_FAMILY.has(code)) return 'cnr';
    if (code === 'en') return 'en';
    if (code === 'ru') return 'ru';
  }
  return FALLBACK_LANGUAGE;
}

/**
 * BCP 47 tag used for number and currency formatting. Montenegrin uses the
 * Montenegrin regional conventions (`sr-Latn-ME`: 1.234,50 €). English
 * follows the device's English region when there is one, otherwise British
 * conventions, which match day-month order used across Europe.
 */
export function formattingLocale(language: AppLanguage, deviceLocales: readonly DeviceLocale[] = []): string {
  switch (language) {
    case 'cnr':
      return 'sr-Latn-ME';
    case 'ru':
      return 'ru-RU';
    case 'en': {
      const english = deviceLocales.find((l) => (l.languageCode ?? '').toLowerCase() === 'en');
      return english && /^en-[A-Z]{2}$/i.test(english.languageTag) ? english.languageTag : 'en-GB';
    }
  }
}

export function decimalSeparator(language: AppLanguage): string {
  return language === 'en' ? '.' : ',';
}
