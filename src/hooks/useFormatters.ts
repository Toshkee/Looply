import { getLocales } from 'expo-localization';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { createFormatters, type Formatters } from '@/i18n/format';
import { FALLBACK_LANGUAGE, isAppLanguage } from '@/i18n/languages';

/** Formatters for the current app language; re-created when the language changes. */
export function useFormatters(): Formatters {
  const { t, i18n } = useTranslation();
  const language = isAppLanguage(i18n.language) ? i18n.language : FALLBACK_LANGUAGE;
  return useMemo(() => createFormatters(t, language, getLocales()), [t, language]);
}
