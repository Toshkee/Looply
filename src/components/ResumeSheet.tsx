import { useState } from 'react';
import { Modal, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { nextBillingDate } from '@/domain/billing';
import type { ISODate } from '@/domain/calendarDate';
import type { Subscription } from '@/domain/subscription';
import { useFormatters } from '@/hooks/useFormatters';
import { useToday } from '@/hooks/useToday';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, spacing } from '@/theme/tokens';

import { DateField } from './form/DateField';
import { AppText } from './ui/AppText';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { IconButton } from './ui/IconButton';

interface ResumeSheetProps {
  subscription: Subscription;
  onConfirm: (nextBillingDate: ISODate) => void;
  onClose: () => void;
  busy: boolean;
}

/**
 * Asks for the next billing date when a paused or cancelled subscription
 * becomes active again, since services usually restart billing on resume.
 * Render it only while open, so each opening starts from a fresh suggestion.
 */
export function ResumeSheet({ subscription, onConfirm, onClose, busy }: ResumeSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const format = useFormatters();
  const today = useToday();
  const paused = subscription.status === 'paused';
  // A paused subscription may simply continue its old schedule; a cancelled one starts over.
  const oldSchedule = paused ? nextBillingDate(subscription, today) : null;
  const [date, setDate] = useState<ISODate>(oldSchedule ?? today);
  const actionLabel = paused ? t('details.resume') : t('details.reactivate');

  return (
    <Modal visible animationType="slide" presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'} onRequestClose={onClose}>
      <View style={[styles.sheet, { backgroundColor: colors.background, paddingTop: Platform.OS === 'ios' ? 0 : insets.top }]}>
        <View style={styles.header}>
          <AppText variant="heading" accessibilityRole="header" style={styles.title}>
            {actionLabel}
          </AppText>
          <IconButton icon="close" onPress={onClose} accessibilityLabel={t('common.close')} size={36} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.texts}>
            <AppText variant="headline">{t('details.resumeQuestion')}</AppText>
            <AppText variant="callout" tone="secondary">
              {t('details.resumeHint')}
            </AppText>
          </View>

          <View style={styles.chips}>
            <Chip label={t('details.resumeToday')} selected={date === today} onPress={() => setDate(today)} />
            {oldSchedule && oldSchedule !== today ? (
              <Chip
                label={t('details.resumeOldSchedule', { date: format.date(oldSchedule, 'short') })}
                selected={date === oldSchedule}
                onPress={() => setDate(oldSchedule)}
              />
            ) : null}
          </View>

          <DateField value={date} onChange={setDate} accessibilityLabel={t('details.nextPayment')} />
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.md }]}>
          <Button label={actionLabel} icon="play" onPress={() => onConfirm(date)} loading={busy} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: GUTTER,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  title: { flex: 1 },
  content: { paddingHorizontal: GUTTER, paddingBottom: spacing.xl, gap: spacing.lg },
  texts: { gap: spacing.xs },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  footer: { paddingHorizontal: GUTTER, paddingTop: spacing.md },
});
