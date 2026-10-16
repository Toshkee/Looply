import { router } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ProLockedScreen } from '@/components/ProLocked';
import { CategoryBars } from '@/components/CategoryBars';
import { CATEGORY_ICONS } from '@/components/categoryVisuals';
import { MonthColumns } from '@/components/MonthColumns';
import { SubscriptionAvatar } from '@/components/SubscriptionAvatar';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { PressableScale } from '@/components/ui/PressableScale';
import { ScreenScroll } from '@/components/ui/ScreenScroll';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { scheduledPayments, sumPaymentsByCurrency, totalsByCurrency } from '@/domain/billing';
import { addDays } from '@/domain/calendarDate';
import type { CurrencyCode } from '@/domain/currency';
import {
  activeCurrencies,
  categoryBreakdown,
  compareWithPast,
  mostExpensive,
  overlapHints,
  scheduledMonthTotals,
  upcomingLongRenewals,
} from '@/domain/insights';
import { useFormatters } from '@/hooks/useFormatters';
import { useToday } from '@/hooks/useToday';
import { useIsPro } from '@/state/pro';
import { useSettingsStore } from '@/state/settingsStore';
import { useSubscriptionStore } from '@/state/subscriptionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { radius, spacing } from '@/theme/tokens';

export default function InsightsScreen() {
  const { t } = useTranslation();
  const isPro = useIsPro();
  return isPro ? <Insights /> : <ProLockedScreen title={t('insights.title')} feature="insights" />;
}

function Insights() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useFormatters();
  const today = useToday();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const snapshots = useSubscriptionStore((s) => s.snapshots);
  const defaultCurrency = useSettingsStore((s) => s.settings.currency);
  const currencies = useMemo(() => activeCurrencies(subscriptions, defaultCurrency), [subscriptions, defaultCurrency]);
  const [chosen, setChosen] = useState<CurrencyCode | null>(null);
  const currency = chosen && currencies.includes(chosen) ? chosen : currencies[0];

  const data = useMemo(() => {
    if (!currency) return null;
    const inCurrency = subscriptions.filter((s) => s.currency === currency);
    const totals = totalsByCurrency(inCurrency)[0] ?? { monthlyMinor: 0, annualMinor: 0, activeCount: 0 };
    const next30 = sumPaymentsByCurrency(scheduledPayments(inCurrency, today, addDays(today, 30)))[0];
    return {
      totals,
      next30,
      comparison: compareWithPast(snapshots, totals.monthlyMinor, currency, today),
      breakdown: categoryBreakdown(subscriptions, currency),
      ranking: mostExpensive(subscriptions, currency, 5),
      months: scheduledMonthTotals(subscriptions, currency, today, 6),
      renewals: upcomingLongRenewals(inCurrency, today),
      overlaps: overlapHints(inCurrency),
    };
  }, [subscriptions, snapshots, currency, today]);

  if (!currency || !data) {
    return (
      <ScreenScroll title={t('insights.title')}>
        <Card>
          <EmptyState
            icon="pie-chart-outline"
            title={t('insights.emptyTitle')}
            body={t('insights.emptyBody')}
            actionLabel={t('home.addSubscription')}
            onAction={() => router.push('/subscription/new')}
          />
        </Card>
      </ScreenScroll>
    );
  }

  const { comparison } = data;

  return (
    <ScreenScroll title={t('insights.title')}>
      {currencies.length > 1 ? (
        <SegmentedControl<CurrencyCode>
          accessibilityLabel={t('form.currency')}
          options={currencies.map((code) => ({ value: code, label: code }))}
          value={currency}
          onChange={setChosen}
        />
      ) : null}

      <View style={styles.row}>
        <Card style={styles.metric}>
          <AppText variant="label" tone="secondary">
            {t('insights.monthly')}
          </AppText>
          <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.tabular}>
            {format.money(data.totals.monthlyMinor, currency)}
          </AppText>
          <AppText variant="micro" tone="tertiary">
            {t('common.estimate').toLocaleUpperCase()}
          </AppText>
        </Card>
        <Card style={styles.metric}>
          <AppText variant="label" tone="secondary">
            {t('insights.annual')}
          </AppText>
          <AppText variant="heading" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={styles.tabular}>
            {format.money(data.totals.annualMinor, currency)}
          </AppText>
          <AppText variant="micro" tone="tertiary">
            {t('common.estimate').toLocaleUpperCase()}
          </AppText>
        </Card>
      </View>

      <Card style={styles.stack}>
        <View style={styles.between}>
          <AppText variant="label" tone="secondary">
            {t('insights.next30')}
          </AppText>
          <AppText variant="caption" tone="tertiary">
            {t('counts.payments', { count: data.next30?.count ?? 0 })}
          </AppText>
        </View>
        <AppText variant="heading" style={styles.tabular}>
          {format.money(data.next30?.amountMinor ?? 0, currency)}
        </AppText>
        <AppText variant="caption" tone="tertiary">
          {t('insights.next30Body')}
        </AppText>
      </Card>

      <Card style={styles.stack}>
        <AppText variant="label" tone="secondary">
          {t('insights.comparison')}
        </AppText>
        {comparison ? (
          <View style={styles.comparisonRow}>
            <View
              style={[
                styles.trendIcon,
                { backgroundColor: comparison.differenceMinor > 0 ? colors.dangerSoft : colors.surfaceMuted },
              ]}
            >
              <Icon
                name={comparison.differenceMinor > 0 ? 'trending-up' : comparison.differenceMinor < 0 ? 'trending-down' : 'remove'}
                size={20}
                color={comparison.differenceMinor > 0 ? colors.danger : comparison.differenceMinor < 0 ? colors.positive : colors.textSecondary}
              />
            </View>
            <View style={styles.flex}>
              <AppText variant="bodyStrong">
                {Math.round(comparison.differenceMinor) === 0
                  ? t('insights.comparisonSame')
                  : t(comparison.differenceMinor > 0 ? 'insights.comparisonUp' : 'insights.comparisonDown', {
                      amount: format.money(Math.abs(comparison.differenceMinor), currency),
                    })}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {`${format.money(comparison.previousMonthlyMinor, currency)} → ${format.money(comparison.currentMonthlyMinor, currency)}`}
              </AppText>
            </View>
          </View>
        ) : (
          <AppText variant="callout" tone="secondary">
            {t('insights.comparisonPending')}
          </AppText>
        )}
      </Card>

      <Section title={t('insights.upcomingMonths')} note={t('insights.upcomingMonthsNote')}>
        <Card>
          <MonthColumns items={data.months} currency={currency} />
        </Card>
      </Section>

      {data.breakdown.length > 0 ? (
        <Section title={t('insights.byCategory')}>
          <Card style={styles.padded}>
            <CategoryBars items={data.breakdown} currency={currency} />
          </Card>
        </Section>
      ) : null}

      {data.ranking.length > 0 ? (
        <Section title={t('insights.mostExpensive')}>
          <Card padded={false}>
            {data.ranking.map(({ subscription, monthlyMinor }, index) => (
              <PressableScale
                key={subscription.id}
                pressedScale={0.98}
                onPress={() => router.push(`/subscription/${subscription.id}`)}
                accessibilityLabel={`${index + 1}. ${subscription.name}, ${t('insights.perMonth', { amount: format.money(monthlyMinor, currency) })}`}
                style={[styles.rankRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}
              >
                <AppText variant="label" tone="tertiary" style={styles.rank}>
                  {index + 1}
                </AppText>
                <SubscriptionAvatar name={subscription.name} category={subscription.category} size={36} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {subscription.name}
                  </AppText>
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {`${format.money(subscription.amountMinor, currency)} · ${t(`interval.${subscription.interval}`)}`}
                  </AppText>
                </View>
                <AppText variant="amount">{format.money(monthlyMinor, currency)}</AppText>
              </PressableScale>
            ))}
          </Card>
        </Section>
      ) : null}

      {data.renewals.length > 0 ? (
        <Section title={t('insights.longRenewals')} note={t('insights.longRenewalsBody')}>
          <Card padded={false}>
            {data.renewals.map(({ subscription, date }, index) => (
              <View
                key={subscription.id}
                style={[styles.rankRow, index > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.separator }]}
                accessible
              >
                <SubscriptionAvatar name={subscription.name} category={subscription.category} size={36} />
                <View style={styles.flex}>
                  <AppText variant="bodyStrong" numberOfLines={1}>
                    {subscription.name}
                  </AppText>
                  <AppText variant="caption" tone="secondary">
                    {t('insights.renewsOn', { date: format.date(date, 'full') })}
                  </AppText>
                </View>
                <AppText variant="amount">{format.money(subscription.amountMinor, currency)}</AppText>
              </View>
            ))}
          </Card>
        </Section>
      ) : null}

      {data.overlaps.length > 0 ? (
        <Section title={t('insights.overlaps')}>
          {data.overlaps.map((hint) => (
            <Card key={hint.category} style={styles.overlap}>
              <View style={[styles.trendIcon, { backgroundColor: colors.accentSoft }]}>
                <Icon name={CATEGORY_ICONS[hint.category]} size={20} color={colors.accentText} />
              </View>
              <View style={styles.flex}>
                <AppText variant="bodyStrong">
                  {t('insights.overlapBody', { count: hint.subscriptions.length, category: t(`category.${hint.category}`) })}
                </AppText>
                <AppText variant="caption" tone="secondary" numberOfLines={2}>
                  {hint.subscriptions.map((s) => s.name).join(', ')}
                </AppText>
              </View>
            </Card>
          ))}
        </Section>
      ) : null}

      <AppText variant="caption" tone="tertiary" style={styles.note}>
        {t('insights.estimateNote')}
      </AppText>
    </ScreenScroll>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <AppText variant="heading" accessibilityRole="header">
          {title}
        </AppText>
        {note ? (
          <AppText variant="caption" tone="secondary">
            {note}
          </AppText>
        ) : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.md },
  metric: { flex: 1, gap: spacing.xs },
  tabular: { fontVariant: ['tabular-nums'] },
  stack: { gap: spacing.xs },
  between: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: spacing.md },
  comparisonRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.xs },
  trendIcon: { width: 40, height: 40, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1, gap: 2 },
  section: { gap: spacing.md },
  sectionHeader: { gap: 2 },
  padded: { paddingVertical: spacing.lg + 2 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  rank: { width: 14, textAlign: 'center' },
  overlap: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  note: { marginHorizontal: spacing.xs },
});
