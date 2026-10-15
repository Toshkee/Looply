import i18n from 'i18next';

import { iso } from '@/domain/__tests__/fixtures';

import { createFormatters } from '../format';
import { initI18n, resources } from '../index';
import { detectLanguage, formattingLocale } from '../languages';
import { selectPluralCategory } from '../pluralRules';

type Tree = { [key: string]: string | readonly string[] | Tree };

function flatten(tree: Tree, prefix = ''): Map<string, string | readonly string[]> {
  const out = new Map<string, string | readonly string[]>();
  for (const [key, value] of Object.entries(tree)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string' || Array.isArray(value)) out.set(path, value as string | readonly string[]);
    else for (const [k, v] of flatten(value as Tree, path)) out.set(k, v);
  }
  return out;
}

const variables = (text: string) => [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((m) => m[1]).sort();

describe('translations', () => {
  const reference = flatten(resources.cnr.translation as unknown as Tree);

  test.each(['en', 'ru'] as const)('%s has every key with matching interpolation variables', (language) => {
    const translated = flatten(resources[language].translation as unknown as Tree);
    expect([...translated.keys()].sort()).toEqual([...reference.keys()].sort());
    for (const [key, value] of reference) {
      const other = translated.get(key)!;
      if (Array.isArray(value)) {
        expect((other as readonly string[]).length).toBe(value.length);
      } else {
        expect({ key, vars: variables(other as string) }).toEqual({ key, vars: variables(value as string) });
      }
    }
  });

  test('no translation is empty', () => {
    for (const language of ['cnr', 'en', 'ru'] as const) {
      for (const [key, value] of flatten(resources[language].translation as unknown as Tree)) {
        const texts = Array.isArray(value) ? value : [value as string];
        for (const text of texts) expect({ language, key, empty: text.trim() === '' }).toEqual({ language, key, empty: false });
      }
    }
  });
});

describe('plural rules', () => {
  test.each([
    [1, 'one'],
    [2, 'few'],
    [4, 'few'],
    [5, 'other'],
    [11, 'other'],
    [12, 'other'],
    [21, 'one'],
    [22, 'few'],
    [25, 'other'],
    [0, 'other'],
  ])('Montenegrin %d → %s', (n, category) => expect(selectPluralCategory('cnr', n)).toBe(category));

  test.each([
    [1, 'one'],
    [3, 'few'],
    [5, 'many'],
    [11, 'many'],
    [21, 'one'],
    [24, 'few'],
    [0, 'many'],
  ])('Russian %d → %s', (n, category) => expect(selectPluralCategory('ru', n)).toBe(category));

  test('i18next picks the right forms', async () => {
    await initI18n('cnr');
    expect(i18n.t('counts.activeSubscriptions', { count: 1 })).toBe('1 aktivna pretplata');
    expect(i18n.t('counts.activeSubscriptions', { count: 3 })).toBe('3 aktivne pretplate');
    expect(i18n.t('counts.activeSubscriptions', { count: 7 })).toBe('7 aktivnih pretplata');
    await i18n.changeLanguage('ru');
    expect(i18n.t('counts.payments', { count: 2 })).toBe('2 платежа');
    expect(i18n.t('counts.payments', { count: 5 })).toBe('5 платежей');
    await i18n.changeLanguage('en');
    expect(i18n.t('counts.payments', { count: 1 })).toBe('1 payment');
  });
});

describe('language detection', () => {
  const locale = (languageTag: string) => ({ languageTag, languageCode: languageTag.split('-')[0]! });

  test('maps the Montenegrin language family, English and Russian', () => {
    expect(detectLanguage([locale('sr-Latn-ME')])).toBe('cnr');
    expect(detectLanguage([locale('hr-HR')])).toBe('cnr');
    expect(detectLanguage([locale('en-US')])).toBe('en');
    expect(detectLanguage([locale('ru-RU')])).toBe('ru');
  });

  test('uses the first supported preference and falls back to Montenegrin', () => {
    expect(detectLanguage([locale('de-DE'), locale('ru-RU')])).toBe('ru');
    expect(detectLanguage([locale('de-DE')])).toBe('cnr');
    expect(detectLanguage([])).toBe('cnr');
  });

  test('formatting locale', () => {
    expect(formattingLocale('cnr')).toBe('sr-Latn-ME');
    expect(formattingLocale('en', [locale('en-US')])).toBe('en-US');
    expect(formattingLocale('en', [locale('de-DE')])).toBe('en-GB');
  });
});

describe('date formatting', () => {
  test('per language, with Russian genitive month names', async () => {
    await initI18n('cnr');
    const today = iso('2026-10-15');
    let f = createFormatters(i18n.getFixedT('cnr'), 'cnr', []);
    expect(f.date(iso('2026-10-15'), 'full')).toBe('15. oktobar 2026.');
    expect(f.date(iso('2026-10-15'), 'weekday')).toBe('četvrtak, 15. oktobar');
    expect(f.date(iso('2026-10-15'), 'short')).toBe('15. okt');
    expect(f.relativeDay(iso('2026-10-16'), today)).toBe('Sjutra');
    expect(f.relativeDay(iso('2026-10-18'), today)).toBe('Za 3 dana');
    expect(f.monthYear(today)).toBe('Oktobar 2026.');

    f = createFormatters(i18n.getFixedT('ru'), 'ru', []);
    expect(f.date(iso('2026-10-15'), 'full')).toBe('15 октября 2026 г.');
    expect(f.relativeDay(iso('2026-10-20'), today)).toBe('Через 5 дней');
    expect(f.monthYear(today)).toBe('Октябрь 2026');

    f = createFormatters(i18n.getFixedT('en'), 'en', []);
    expect(f.date(iso('2026-10-15'), 'weekday')).toBe('Thursday, 15 October');
    expect(f.money(1299, 'EUR')).toBe('€12.99');
  });
});
