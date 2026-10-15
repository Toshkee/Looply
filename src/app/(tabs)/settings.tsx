import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SelectSheet } from '@/components/SelectSheet';
import { AppText } from '@/components/ui/AppText';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { ScreenScroll } from '@/components/ui/ScreenScroll';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CURRENCY_CODES, type CurrencyCode } from '@/domain/currency';
import type { ThemePreference } from '@/domain/settings';
import { APP_LANGUAGES, LANGUAGE_NATIVE_NAMES, type AppLanguage } from '@/i18n/languages';
import { useSettingsStore } from '@/state/settingsStore';
import { spacing } from '@/theme/tokens';

export default function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const [sheet, setSheet] = useState<'language' | 'currency' | null>(null);

  const save = (patch: Parameters<typeof update>[0]) => update(patch).catch(() => Alert.alert(t('errors.generic')));

  return (
    <ScreenScroll title={t('settings.title')}>
      <ListSection title={t('settings.general')}>
        <ListRow
          icon="language-outline"
          title={t('settings.language')}
          value={settings.language ? LANGUAGE_NATIVE_NAMES[settings.language] : undefined}
          onPress={() => setSheet('language')}
        />
        <ListRow icon="cash-outline" title={t('settings.currency')} value={settings.currency} onPress={() => setSheet('currency')} />
      </ListSection>

      <View style={styles.group}>
        <AppText variant="label" tone="secondary" style={styles.groupLabel}>
          {t('settings.theme')}
        </AppText>
        <SegmentedControl<ThemePreference>
          accessibilityLabel={t('settings.theme')}
          options={[
            { value: 'light', label: t('settings.themeLight') },
            { value: 'dark', label: t('settings.themeDark') },
            { value: 'system', label: t('settings.themeSystem') },
          ]}
          value={settings.theme}
          onChange={(theme) => save({ theme })}
        />
      </View>

      <ListSection title={t('settings.about')}>
        <ListRow icon="shield-checkmark-outline" title={t('settings.privacy')} onPress={() => router.push('/privacy')} />
        <ListRow icon="information-circle-outline" title={t('settings.version')} value={Constants.expoConfig?.version ?? '—'} />
      </ListSection>

      <SelectSheet<AppLanguage>
        visible={sheet === 'language'}
        title={t('settings.language')}
        closeLabel={t('common.close')}
        value={settings.language}
        onSelect={(language) => save({ language })}
        onClose={() => setSheet(null)}
        options={APP_LANGUAGES.map((code) => ({ value: code, label: LANGUAGE_NATIVE_NAMES[code] }))}
      />
      <SelectSheet<CurrencyCode>
        visible={sheet === 'currency'}
        title={t('settings.currency')}
        closeLabel={t('common.close')}
        value={settings.currency}
        onSelect={(currency) => save({ currency })}
        onClose={() => setSheet(null)}
        options={CURRENCY_CODES.map((code) => ({ value: code, label: t(`currencyName.${code}`), detail: code }))}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  groupLabel: { marginLeft: spacing.xs },
});
