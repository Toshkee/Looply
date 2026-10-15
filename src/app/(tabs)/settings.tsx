import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SelectSheet } from '@/components/SelectSheet';
import { AppText } from '@/components/ui/AppText';
import { ListRow, ListSection, SwitchRow } from '@/components/ui/ListRow';
import { ScreenScroll } from '@/components/ui/ScreenScroll';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CURRENCY_CODES, type CurrencyCode } from '@/domain/currency';
import { REMINDER_HOURS, type AppSettings, type ThemePreference } from '@/domain/settings';
import { REMINDER_OPTIONS } from '@/domain/subscription';
import { useNotificationPermission } from '@/hooks/useNotificationPermission';
import { APP_LANGUAGES, LANGUAGE_NATIVE_NAMES, type AppLanguage } from '@/i18n/languages';
import { shareExport, type ExportFormat } from '@/services/exportService';
import { haptics } from '@/services/haptics';
import { cancelAllReminders } from '@/services/notifications';
import { resetAllData } from '@/state/bootstrap';
import { useSettingsStore } from '@/state/settingsStore';
import { useSubscriptionStore } from '@/state/subscriptionStore';
import { spacing } from '@/theme/tokens';

type Sheet = 'language' | 'currency' | 'defaultReminder' | 'reminderTime' | null;

const clock = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

export default function SettingsScreen() {
  const { t } = useTranslation();
  const settings = useSettingsStore((s) => s.settings);
  const update = useSettingsStore((s) => s.update);
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const permission = useNotificationPermission();
  const [sheet, setSheet] = useState<Sheet>(null);
  const [exporting, setExporting] = useState(false);

  const save = (patch: Partial<AppSettings>) => update(patch).catch(() => Alert.alert(t('errors.generic')));

  const reminderLabel = (days: number | null) =>
    days === null ? t('reminder.off') : days === 0 ? t('reminder.sameDay') : t('reminder.daysBefore', { count: days });

  const permissionLabel =
    permission.state === 'granted'
      ? t('settings.permissionGranted')
      : permission.state === 'denied'
        ? t('settings.permissionDenied')
        : t('settings.permissionUndetermined');

  const toggleReminders = async (enabled: boolean) => {
    await save({ remindersEnabled: enabled });
    if (enabled && permission.state === 'undetermined') await permission.request().catch(() => undefined);
  };

  const handlePermission = () => {
    if (permission.state === 'denied') Linking.openSettings().catch(() => undefined);
    else if (permission.state === 'undetermined') permission.request().catch(() => undefined);
  };

  const runExport = async (format: ExportFormat) => {
    if (subscriptions.length === 0) {
      Alert.alert(t('settings.exportEmpty'));
      return;
    }
    setExporting(true);
    try {
      await shareExport(format, subscriptions, settings.currency, format === 'json' ? t('settings.exportJson') : t('settings.exportCsv'));
    } catch {
      Alert.alert(t('settings.exportError'));
    } finally {
      setExporting(false);
    }
  };

  const confirmReset = () =>
    Alert.alert(t('settings.resetTitle'), t('settings.resetMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('settings.resetConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelAllReminders();
            await resetAllData();
            haptics.success();
          } catch {
            Alert.alert(t('settings.resetError'));
          }
        },
      },
    ]);

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

      <ListSection
        title={t('settings.reminders')}
        footer={permission.state === 'denied' ? t('settings.permissionDeniedHint') : t('settings.remindersHint')}
      >
        <SwitchRow
          icon="notifications-outline"
          title={t('settings.remindersEnabled')}
          value={settings.remindersEnabled}
          onValueChange={(enabled) => {
            toggleReminders(enabled).catch(() => undefined);
          }}
        />
        <ListRow
          icon="time-outline"
          title={t('settings.defaultReminder')}
          value={reminderLabel(settings.defaultReminderDays)}
          onPress={() => setSheet('defaultReminder')}
        />
        <ListRow
          icon="alarm-outline"
          title={t('settings.reminderTime')}
          value={clock(settings.reminderHour, settings.reminderMinute)}
          onPress={() => setSheet('reminderTime')}
        />
        <ListRow
          icon="shield-outline"
          title={t('settings.permission')}
          value={permissionLabel}
          onPress={permission.state === 'granted' ? undefined : handlePermission}
          accessibilityHint={
            permission.state === 'denied'
              ? t('settings.openSystemSettings')
              : permission.state === 'undetermined'
                ? t('settings.requestPermission')
                : undefined
          }
        />
      </ListSection>

      <ListSection title={t('settings.data')} footer={t('settings.exportHint')}>
        <ListRow icon="document-text-outline" title={t('settings.exportJson')} onPress={exporting ? undefined : () => runExport('json')} />
        <ListRow icon="grid-outline" title={t('settings.exportCsv')} onPress={exporting ? undefined : () => runExport('csv')} />
        <ListRow icon="trash-outline" title={t('settings.resetData')} onPress={confirmReset} destructive showChevron={false} />
      </ListSection>

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
      <SelectSheet<string>
        visible={sheet === 'defaultReminder'}
        title={t('settings.defaultReminder')}
        closeLabel={t('common.close')}
        value={String(settings.defaultReminderDays)}
        onSelect={(value) => save({ defaultReminderDays: value === 'null' ? null : Number(value) })}
        onClose={() => setSheet(null)}
        options={[null, ...REMINDER_OPTIONS].map((days) => ({ value: String(days), label: reminderLabel(days) }))}
      />
      <SelectSheet<string>
        visible={sheet === 'reminderTime'}
        title={t('settings.reminderTime')}
        closeLabel={t('common.close')}
        value={String(settings.reminderHour)}
        onSelect={(value) => save({ reminderHour: Number(value), reminderMinute: 0 })}
        onClose={() => setSheet(null)}
        options={REMINDER_HOURS.map((hour) => ({ value: String(hour), label: clock(hour, 0) }))}
      />
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  groupLabel: { marginLeft: spacing.xs },
});
