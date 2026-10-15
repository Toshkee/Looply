import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';

import { diffDays, type ISODate } from '@/domain/calendarDate';
import type { ScheduledPayment } from '@/domain/billing';
import { useFormatters } from '@/hooks/useFormatters';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

import { withAlpha } from './categoryVisuals';
import { SubscriptionAvatar, useSubscriptionTint } from './SubscriptionAvatar';
import { AppText } from './ui/AppText';
import { PressableScale } from './ui/PressableScale';

export const UPCOMING_CARD_WIDTH = 156;

/** A payment in the horizontal "Up next" rail, softly tinted by its brand or category color. */
export function UpcomingCard({ payment, today }: { payment: ScheduledPayment; today: ISODate }) {
  const { colors, shadows, scheme } = useTheme();
  const format = useFormatters();
  const { subscription, date } = payment;
  const tint = useSubscriptionTint(subscription.name, subscription.category);
  const soon = diffDays(today, date) <= 1;
  const amount = format.money(subscription.amountMinor, subscription.currency);
  const when = format.relativeDay(date, today);

  return (
    <PressableScale
      onPress={() => router.push(`/subscription/${subscription.id}`)}
      accessibilityLabel={`${subscription.name}, ${amount}, ${when}`}
      style={[styles.card, { backgroundColor: colors.surface, boxShadow: shadows.card }]}
    >
      <View style={[StyleSheet.absoluteFill, styles.tint, { backgroundColor: withAlpha(tint, scheme === 'dark' ? 0.2 : 0.09) }]} />
      <View style={styles.top}>
        <SubscriptionAvatar name={subscription.name} category={subscription.category} size={40} shape="circle" solid />
        <AppText variant="amount" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={styles.amount}>
          {amount}
        </AppText>
      </View>
      <View style={styles.bottom}>
        <AppText variant="bodyStrong" numberOfLines={1}>
          {subscription.name}
        </AppText>
        <AppText variant="caption" tone={soon ? 'accent' : 'secondary'} numberOfLines={1}>
          {when}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: UPCOMING_CARD_WIDTH,
    minHeight: 132,
    borderRadius: radius.xl,
    padding: spacing.md + 2,
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  tint: { borderRadius: radius.xl },
  top: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.sm },
  amount: { flexShrink: 1, textAlign: 'right' },
  bottom: { gap: 2 },
});
