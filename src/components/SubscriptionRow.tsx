import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { monthlyEstimateMinor, nextBillingDate } from '@/domain/billing';
import type { ISODate } from '@/domain/calendarDate';
import type { Subscription } from '@/domain/subscription';
import { useFormatters } from '@/hooks/useFormatters';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { SubscriptionAvatar } from './SubscriptionAvatar';
import { AppText } from './ui/AppText';
import { PressableScale } from './ui/PressableScale';

/** A subscription in a list: actual price per period, with its next date or status. */
export function SubscriptionRow({ subscription, today }: { subscription: Subscription; today: ISODate }) {
  const { colors, shadows } = useTheme();
  const { t } = useTranslation();
  const format = useFormatters();
  const active = subscription.status === 'active';
  const amount = format.money(subscription.amountMinor, subscription.currency);
  const detail = active
    ? `${t(`interval.${subscription.interval}`)} · ${format.relativeDay(nextBillingDate(subscription, today), today)}`
    : t(`status.${subscription.status}`);
  const monthly =
    subscription.interval !== 'monthly' && active
      ? t('subscriptions.perMonthEstimate', {
          amount: format.money(monthlyEstimateMinor(subscription.amountMinor, subscription.interval), subscription.currency),
        })
      : t(`intervalShort.${subscription.interval}`);

  return (
    <PressableScale
      onPress={() => router.push(`/subscription/${subscription.id}`)}
      pressedScale={0.98}
      accessibilityLabel={`${subscription.name}, ${amount}, ${detail}`}
      style={[styles.row, { backgroundColor: colors.surface, boxShadow: shadows.card }, !active && styles.inactive]}
    >
      <SubscriptionAvatar name={subscription.name} category={subscription.category} />
      <View style={styles.texts}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {subscription.name}
        </AppText>
        <AppText variant="caption" tone={active ? 'secondary' : 'tertiary'} numberOfLines={1}>
          {detail}
        </AppText>
      </View>
      <View style={styles.amounts}>
        <AppText variant="amount" numberOfLines={1}>
          {amount}
        </AppText>
        <AppText variant="caption" tone="tertiary" numberOfLines={1}>
          {monthly}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg + 2,
    minHeight: 68,
  },
  inactive: { opacity: 0.6 },
  texts: { flex: 1, gap: 2 },
  amounts: { alignItems: 'flex-end', gap: 2, maxWidth: '42%' },
});
