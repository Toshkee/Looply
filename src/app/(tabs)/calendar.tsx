import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { MonthCalendar } from '@/components/MonthCalendar';
import { PaymentRow } from '@/components/PaymentRow';
import { AppText } from '@/components/ui/AppText';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { ScreenScroll } from '@/components/ui/ScreenScroll';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { isBillable, scheduledPayments, sumPaymentsByCurrency, type ScheduledPayment } from '@/domain/billing';
import { addDays, endOfMonth, startOfMonth, type ISODate } from '@/domain/calendarDate';
import { useFormatters } from '@/hooks/useFormatters';
import { useToday } from '@/hooks/useToday';
import { useSettingsStore } from '@/state/settingsStore';
import { useSubscriptionStore } from '@/state/subscriptionStore';
import { spacing } from '@/theme/tokens';

const LIST_DAYS = 90;
type Mode = 'list' | 'month';

export default function CalendarScreen() {
  const { t } = useTranslation();
  const today = useToday();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const hasActive = subscriptions.some(isBillable);
  const [mode, setMode] = useState<Mode>('list');

  return (
    <ScreenScroll title={t('calendar.title')}>
      {!hasActive ? (
        <Card>
          <EmptyState
            icon="calendar-outline"
            title={t('calendar.emptyTitle')}
            body={t('calendar.emptyBody')}
            actionLabel={t('home.addSubscription')}
            onAction={() => router.push('/subscription/new')}
          />
        </Card>
      ) : (
        <>
          <SegmentedControl<Mode>
            options={[
              { value: 'list', label: t('calendar.modeList') },
              { value: 'month', label: t('calendar.modeMonth') },
            ]}
            value={mode}
            onChange={setMode}
          />
          {mode === 'list' ? <UpcomingList today={today} /> : <MonthView today={today} />}
        </>
      )}
    </ScreenScroll>
  );
}

function groupByMonth(payments: readonly ScheduledPayment[]): { month: ISODate; payments: ScheduledPayment[] }[] {
  const groups = new Map<ISODate, ScheduledPayment[]>();
  for (const payment of payments) {
    const month = startOfMonth(payment.date);
    groups.set(month, [...(groups.get(month) ?? []), payment]);
  }
  return [...groups.entries()].map(([month, items]) => ({ month, payments: items }));
}

function UpcomingList({ today }: { today: ISODate }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const currency = useSettingsStore((s) => s.settings.currency);
  const groups = useMemo(
    () => groupByMonth(scheduledPayments(subscriptions, today, addDays(today, LIST_DAYS))),
    [subscriptions, today],
  );

  return (
    <View style={styles.list}>
      <AppText variant="label" tone="secondary" style={styles.inset}>
        {t('calendar.nextDays')}
      </AppText>
      {groups.map(({ month, payments }) => (
        <View key={month} style={styles.group}>
          <View style={styles.groupHeader}>
            <AppText variant="headline" accessibilityRole="header">
              {format.monthYear(month)}
            </AppText>
            <AppText variant="caption" tone="secondary" numberOfLines={1} style={styles.groupTotal}>
              {sumPaymentsByCurrency(payments, currency)
                .map((sum) => format.money(sum.amountMinor, sum.currency))
                .join(' + ')}
            </AppText>
          </View>
          {payments.map((payment) => (
            <PaymentRow key={payment.key} payment={payment} today={today} />
          ))}
        </View>
      ))}
    </View>
  );
}

function MonthView({ today }: { today: ISODate }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const currency = useSettingsStore((s) => s.settings.currency);
  const [month, setMonth] = useState<ISODate>(startOfMonth(today));
  const [selected, setSelected] = useState<ISODate | null>(today);

  const monthPayments = useMemo(
    () => scheduledPayments(subscriptions, startOfMonth(month), endOfMonth(month)),
    [subscriptions, month],
  );
  const marked = useMemo(() => new Set<string>(monthPayments.map((p) => p.date)), [monthPayments]);
  const totals = sumPaymentsByCurrency(monthPayments, currency);
  const dayPayments = selected ? monthPayments.filter((p) => p.date === selected) : [];
  const selectedInMonth = selected !== null && startOfMonth(selected) === startOfMonth(month);

  return (
    <View style={styles.list}>
      <Card style={styles.calendarCard}>
        <MonthCalendar
          month={month}
          onMonthChange={(next) => {
            setMonth(next);
            setSelected(null);
          }}
          selected={selected}
          onSelect={setSelected}
          today={today}
          markedDates={marked}
        />
      </Card>

      <Card style={styles.totalCard}>
        <AppText variant="label" tone="secondary">
          {t('calendar.monthTotal')}
        </AppText>
        {totals.length > 0 ? (
          totals.map((sum) => (
            <View key={sum.currency} style={styles.totalRow}>
              <AppText variant="heading" style={styles.tabular}>
                {format.money(sum.amountMinor, sum.currency)}
              </AppText>
              <AppText variant="caption" tone="secondary">
                {t('counts.payments', { count: sum.count })}
              </AppText>
            </View>
          ))
        ) : (
          <AppText variant="callout" tone="secondary">
            {t('calendar.noPaymentsMonth')}
          </AppText>
        )}
      </Card>

      {selected && selectedInMonth ? (
        <View style={styles.group}>
          <AppText variant="headline" accessibilityRole="header" style={styles.inset}>
            {format.date(selected, 'weekday').replace(/^./, (c) => c.toLocaleUpperCase())}
          </AppText>
          {dayPayments.length > 0 ? (
            dayPayments.map((payment) => <PaymentRow key={payment.key} payment={payment} today={today} />)
          ) : (
            <AppText variant="callout" tone="secondary" style={styles.inset}>
              {t('calendar.noPaymentsDay')}
            </AppText>
          )}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.lg },
  inset: { marginHorizontal: spacing.xs },
  group: { gap: spacing.sm + 2 },
  groupHeader: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md, marginHorizontal: spacing.xs },
  groupTotal: { flexShrink: 1, textAlign: 'right' },
  calendarCard: { paddingHorizontal: spacing.sm, paddingVertical: spacing.md },
  totalCard: { gap: spacing.xs },
  totalRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md },
  tabular: { fontVariant: ['tabular-nums'] },
});
