import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import { APP_LANGUAGES, FALLBACK_LANGUAGE, type AppLanguage } from './languages';
import cnr from './locales/cnr';
import en from './locales/en';
import ru from './locales/ru';
import { installPluralRulesPolyfill } from './pluralRules';

installPluralRulesPolyfill();

export const resources = {
  cnr: { translation: cnr },
  en: { translation: en },
  ru: { translation: ru },
} as const;

/** Initializes i18next once; later calls only switch the language. */
export async function initI18n(language: AppLanguage): Promise<void> {
  if (i18n.isInitialized) {
    if (i18n.language !== language) await i18n.changeLanguage(language);
    return;
  }
  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: [...APP_LANGUAGES],
    defaultNS: 'translation',
    interpolation: { escapeValue: false },
    returnNull: false,
    initAsync: false,
  });
}

export async function changeAppLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
}

export function currentLanguage(): AppLanguage {
  const language = i18n.language;
  return (APP_LANGUAGES as readonly string[]).includes(language) ? (language as AppLanguage) : FALLBACK_LANGUAGE;
}

export default i18n;
