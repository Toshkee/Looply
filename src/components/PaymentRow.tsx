import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { ScheduledPayment } from '@/domain/billing';
import { diffDays, getParts, type ISODate } from '@/domain/calendarDate';
import { useFormatters } from '@/hooks/useFormatters';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { SubscriptionAvatar } from './SubscriptionAvatar';
import { AppText } from './ui/AppText';
import { PressableScale } from './ui/PressableScale';

/** One expected payment: date block, service, actual amount. */
export function PaymentRow({ payment, today }: { payment: ScheduledPayment; today: ISODate }) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const format = useFormatters();
  const { subscription, date } = payment;
  const soon = diffDays(today, date) <= 1;
  const amount = format.money(subscription.amountMinor, subscription.currency);

  return (
    <PressableScale
      onPress={() => router.push(`/subscription/${subscription.id}`)}
      pressedScale={0.98}
      accessibilityLabel={`${format.date(date, 'full')}, ${subscription.name}, ${amount}`}
      style={[styles.row, { backgroundColor: colors.surface, boxShadow: shadows.card }]}
    >
      <View style={[styles.dateBlock, { backgroundColor: soon ? colors.accentSoft : colors.surfaceMuted }]}>
        <AppText variant="micro" tone={soon ? 'accent' : 'secondary'}>
          {format.weekdayShort(date).toLocaleUpperCase()}
        </AppText>
        <AppText variant="headline" tone={soon ? 'accent' : 'primary'} style={styles.day}>
          {getParts(date).day}
        </AppText>
      </View>
      <SubscriptionAvatar name={subscription.name} category={subscription.category} size={36} />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {subscription.name}
        </AppText>
        <AppText variant="caption" tone="secondary" numberOfLines={1}>
          {diffDays(today, date) < 7 ? format.relativeDay(date, today) : t(`interval.${subscription.interval}`)}
        </AppText>
      </View>
      <AppText variant="amount" numberOfLines={1} style={styles.amount}>
        {amount}
      </AppText>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm + 2,
    paddingRight: spacing.lg,
    borderRadius: radius.lg + 2,
  },
  dateBlock: { width: 48, height: 52, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  day: { fontVariant: ['tabular-nums'] },
  texts: { flex: 1, gap: 2 },
  amount: { maxWidth: '38%' },
});
