import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { AvatarCluster } from '@/components/AvatarCluster';
import { CategoryBars } from '@/components/CategoryBars';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { IconButton } from '@/components/ui/IconButton';
import { ScreenScroll } from '@/components/ui/ScreenScroll';
import { UpcomingCard } from '@/components/UpcomingCard';
import { isBillable, nextPayment, scheduledPayments, sumPaymentsByCurrency, totalsByCurrency } from '@/domain/billing';
import { addDays } from '@/domain/calendarDate';
import { categoryBreakdown } from '@/domain/insights';
import { useAddSubscription } from '@/hooks/useAddSubscription';
import { useFormatters } from '@/hooks/useFormatters';
import { useToday } from '@/hooks/useToday';
import { useSettingsStore } from '@/state/settingsStore';
import { useSubscriptionStore } from '@/state/subscriptionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, radius, spacing } from '@/theme/tokens';

const UPCOMING_DAYS = 30;

export default function DashboardScreen() {
  const { t } = useTranslation();
  const { colors, scheme } = useTheme();
  const format = useFormatters();
  const today = useToday();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const currency = useSettingsStore((s) => s.settings.currency);
  const updateSettings = useSettingsStore((s) => s.update);

  const data = useMemo(() => {
    const totals = totalsByCurrency(subscriptions, currency);
    const primary = totals[0] ?? { currency, monthlyMinor: 0, annualMinor: 0, activeCount: 0 };
    const upcoming = scheduledPayments(subscriptions, today, addDays(today, UPCOMING_DAYS));
    return {
      primary,
      otherTotals: totals.slice(1),
      active: subscriptions.filter(isBillable),
      upcoming,
      upcomingSums: sumPaymentsByCurrency(upcoming, currency),
      next: nextPayment(subscriptions, today),
      breakdown: categoryBreakdown(subscriptions, primary.currency),
    };
  }, [subscriptions, currency, today]);

  const weekday = format.date(today, 'weekday');
  const addSubscription = useAddSubscription();

  return (
    <ScreenScroll
      title={t('home.title')}
      eyebrow={weekday.charAt(0).toLocaleUpperCase() + weekday.slice(1)}
      headerRight={
        <IconButton
          icon={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'}
          accessibilityLabel={scheme === 'dark' ? t('home.themeToLight') : t('home.themeToDark')}
          onPress={() => updateSettings({ theme: scheme === 'dark' ? 'light' : 'dark' }).catch(() => undefined)}
        />
      }
    >
      {subscriptions.length === 0 ? (
        <Card>
          <EmptyState
            icon="repeat-outline"
            title={t('home.emptyTitle')}
            body={t('home.emptyBody')}
            actionLabel={t('home.emptyAction')}
            onAction={addSubscription}
          />
        </Card>
      ) : (
        <>
          <View style={styles.summaryRow}>
            <Card style={styles.totalsCard}>
              <View style={styles.labelRow}>
                <Icon name="calendar-outline" size={18} color={colors.accent} />
                <AppText variant="label" tone="secondary" numberOfLines={1} style={styles.flexShrink}>
                  {t('home.monthlyLabel')}
                </AppText>
                <View style={[styles.estimateTag, { backgroundColor: colors.surfaceMuted }]}>
                  <AppText variant="micro" tone="secondary">
                    {t('common.estimate')}
                  </AppText>
                </View>
              </View>
              <AppText variant="display" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5}>
                {format.money(data.primary.monthlyMinor, data.primary.currency)}
              </AppText>
              <View style={[styles.divider, { backgroundColor: colors.separator }]} />
              <View style={styles.labelRow}>
                <Icon name="repeat-outline" size={16} color={colors.textSecondary} />
                <AppText variant="label" tone="secondary">
                  {t('home.annualLabel')}
                </AppText>
              </View>
              <AppText variant="amount" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.annual}>
                {format.money(data.primary.annualMinor, data.primary.currency)}
              </AppText>
            </Card>

            <Card style={styles.activeCard}>
              <AvatarCluster subscriptions={data.active} />
              <View style={styles.activeRow} accessible accessibilityLabel={t('counts.activeSubscriptions', { count: data.active.length })}>
                <AppText variant="title" style={styles.activeCount}>
                  {data.active.length}
                </AppText>
                <AppText variant="callout" tone="secondary" numberOfLines={1} style={styles.flexShrink}>
                  {t('home.activeLabel', { count: data.active.length })}
                </AppText>
                <View style={[styles.activeDot, { backgroundColor: colors.accent }]} />
              </View>
            </Card>
          </View>

          {data.otherTotals.length > 0 ? (
            <Card style={styles.otherCurrencies}>
              <AppText variant="label" tone="secondary">
                {t('home.otherCurrencies')}
              </AppText>
              {data.otherTotals.map((total) => (
                <View key={total.currency} style={styles.otherRow}>
                  <AppText variant="callout" tone="secondary">
                    {t('counts.activeSubscriptions', { count: total.activeCount })}
                  </AppText>
                  <AppText variant="amount">
                    {t('home.otherCurrencyLine', { amount: format.money(total.monthlyMinor, total.currency) })}
                  </AppText>
                </View>
              ))}
            </Card>
          ) : null}

          <Button label={t('home.addSubscription')} icon="add" onPress={addSubscription} />

          {data.active.length === 0 ? (
            <Card>
              <EmptyState icon="pause" title={t('home.noActiveTitle')} body={t('home.noActiveBody')} />
            </Card>
          ) : (
            <View style={styles.section}>
              <View>
                <View style={styles.sectionHeader}>
                  <AppText variant="heading" accessibilityRole="header">
                    {t('home.upNext')}
                  </AppText>
                  <Pressable onPress={() => router.navigate('/calendar')} hitSlop={12} accessibilityRole="link">
                    <AppText variant="bodyStrong" tone="accent">
                      {t('common.seeAll')}
                    </AppText>
                  </Pressable>
                </View>
                {data.upcomingSums.length > 0 ? (
                  <AppText variant="caption" tone="secondary">
                    {t('home.upNextTotal', {
                      amount: data.upcomingSums.map((sum) => format.money(sum.amountMinor, sum.currency)).join(' + '),
                    })}
                  </AppText>
                ) : null}
              </View>
              {data.upcoming.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.rail}
                  contentContainerStyle={styles.railContent}
                >
                  {data.upcoming.slice(0, 12).map((payment) => (
                    <UpcomingCard key={payment.key} payment={payment} today={today} />
                  ))}
                </ScrollView>
              ) : (
                <Card style={styles.noUpcoming}>
                  <AppText variant="callout" tone="secondary">
                    {t('home.noUpcoming')}
                  </AppText>
                  {data.next ? (
                    <AppText variant="callout">
                      {t('home.nextPaymentOn', { name: data.next.subscription.name, date: format.date(data.next.date, 'full') })}
                    </AppText>
                  ) : null}
                </Card>
              )}
            </View>
          )}

          {data.breakdown.length > 0 ? (
            <View style={styles.section}>
              <AppText variant="heading" accessibilityRole="header">
                {t('home.byCategory')}
              </AppText>
              <Card style={styles.breakdown}>
                <CategoryBars items={data.breakdown} currency={data.primary.currency} limit={4} />
              </Card>
            </View>
          ) : null}

          <AppText variant="caption" tone="tertiary" style={styles.note}>
            {t('home.estimateNote')}
          </AppText>
        </>
      )}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'stretch' },
  totalsCard: { flex: 1.3, gap: spacing.sm, paddingVertical: spacing.lg + 2 },
  activeCard: { flex: 1, gap: spacing.sm, justifyContent: 'space-between', minHeight: 196 },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm - 2 },
  flexShrink: { flexShrink: 1 },
  estimateTag: { borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: spacing.xs },
  annual: { fontSize: 18, lineHeight: 24 },
  activeRow: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm - 2 },
  activeCount: { fontVariant: ['tabular-nums'] },
  activeDot: { width: 7, height: 7, borderRadius: 3.5, alignSelf: 'center' },
  otherCurrencies: { gap: spacing.sm },
  otherRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  section: { gap: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  rail: { marginHorizontal: -GUTTER, marginVertical: -spacing.md },
  railContent: { paddingHorizontal: GUTTER, paddingVertical: spacing.md, gap: spacing.md },
  noUpcoming: { gap: spacing.xs },
  breakdown: { paddingVertical: spacing.lg + 2 },
  note: { marginHorizontal: spacing.xs },
});
