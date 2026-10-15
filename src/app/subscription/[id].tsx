import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CATEGORY_ICONS } from '@/components/categoryVisuals';
import { SubscriptionAvatar } from '@/components/SubscriptionAvatar';
import { AppText } from '@/components/ui/AppText';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { ListRow, ListSection } from '@/components/ui/ListRow';
import { annualEstimateMinor, monthlyEstimateMinor, nextBillingDate, occurrencesBetween } from '@/domain/billing';
import { addDays, diffDays, todayLocal } from '@/domain/calendarDate';
import type { SubscriptionStatus } from '@/domain/subscription';
import { useFormatters } from '@/hooks/useFormatters';
import { useToday } from '@/hooks/useToday';
import { useSubscription, useSubscriptionStore } from '@/state/subscriptionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER, radius, spacing } from '@/theme/tokens';

export default function SubscriptionDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const format = useFormatters();
  const today = useToday();
  const subscription = useSubscription(id);
  const setStatus = useSubscriptionStore((s) => s.setStatus);
  const remove = useSubscriptionStore((s) => s.remove);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!subscription) {
    // Briefly empty while a deleted subscription's screen closes.
    if (deleting) return null;
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <EmptyState icon="alert-circle-outline" title={t('details.notFound')} />
      </View>
    );
  }

  const { name, amountMinor, currency, interval, category, status } = subscription;
  const active = status === 'active';
  const next = nextBillingDate(subscription, today);
  const upcoming = active ? occurrencesBetween(subscription.anchorDate, interval, today, addDays(today, 400)).slice(0, 4) : [];

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    try {
      await action();
    } catch {
      Alert.alert(t('details.actionError'));
    } finally {
      setBusy(false);
    }
  };

  const changeStatus = (next: SubscriptionStatus) => run(() => setStatus(subscription.id, next));

  const confirmCancel = () =>
    Alert.alert(t('details.cancelTitle'), t('details.cancelMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('details.cancelConfirm'), onPress: () => changeStatus('cancelled') },
    ]);

  const confirmDelete = () =>
    Alert.alert(t('details.deleteTitle', { name }), t('details.deleteMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: () =>
          run(async () => {
            setDeleting(true);
            try {
              await remove(subscription.id);
              router.back();
            } catch (error) {
              setDeleting(false);
              throw error;
            }
          }),
      },
    ]);

  const reminderLabel =
    subscription.reminderDaysBefore === null
      ? t('reminder.off')
      : subscription.reminderDaysBefore === 0
        ? t('reminder.sameDay')
        : t('reminder.daysBefore', { count: subscription.reminderDaysBefore });

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable
              onPress={() => router.push(`/subscription/edit/${subscription.id}`)}
              hitSlop={12}
              accessibilityRole="button"
              style={styles.headerButton}
            >
              <AppText variant="bodyStrong" tone="accent">
                {t('common.edit')}
              </AppText>
            </Pressable>
          ),
        }}
      />
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxxl }]}
      >
        <View style={styles.hero}>
          <SubscriptionAvatar name={name} category={category} size={72} />
          <AppText variant="title" align="center" accessibilityRole="header">
            {name}
          </AppText>
          <View style={styles.heroMeta}>
            <Icon name={CATEGORY_ICONS[category]} size={16} color={colors.textSecondary} />
            <AppText variant="callout" tone="secondary">
              {t(`category.${category}`)}
            </AppText>
            {!active ? (
              <View style={[styles.statusPill, { backgroundColor: colors.surfaceMuted }]}>
                <AppText variant="micro" tone="secondary">
                  {t(`status.${status}`).toLocaleUpperCase()}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>

        <Card style={styles.priceCard}>
          <AppText variant="display" align="center" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {format.money(amountMinor, currency)}
          </AppText>
          <AppText variant="callout" tone="secondary" align="center">
            {t(`interval.${interval}`)}
          </AppText>
          {active ? (
            <View style={[styles.nextBox, { backgroundColor: colors.accentSoft }]}>
              <Icon name="calendar-outline" size={18} color={colors.accentText} />
              <AppText variant="bodyStrong" tone="accent">
                {format.relativeDay(next, today)}
              </AppText>
              <AppText variant="callout" tone="secondary">
                {format.date(next, 'full')}
              </AppText>
            </View>
          ) : null}
        </Card>

        {!active ? (
          <Card style={styles.info}>
            <Icon name="information-circle-outline" size={20} color={colors.textSecondary} />
            <AppText variant="callout" tone="secondary" style={styles.flex}>
              {status === 'paused' ? t('details.pausedInfo') : t('details.cancelledInfo')}
            </AppText>
          </Card>
        ) : null}

        <ListSection>
          <ListRow title={t('details.billing')} value={t(`interval.${interval}`)} />
          <ListRow title={t('details.monthlyEstimate')} value={format.money(monthlyEstimateMinor(amountMinor, interval), currency)} />
          <ListRow title={t('details.annualEstimate')} value={format.money(annualEstimateMinor(amountMinor, interval), currency)} />
          <ListRow title={t('details.reminder')} value={reminderLabel} />
          {subscription.url ? (
            <ListRow
              title={t('details.website')}
              value={subscription.url.replace(/^https?:\/\//, '')}
              onPress={() => Linking.openURL(subscription.url!).catch(() => Alert.alert(t('errors.generic')))}
              accessory={<Icon name="open-outline" size={16} color={colors.textTertiary} />}
              showChevron={false}
            />
          ) : null}
        </ListSection>

        {subscription.notes ? (
          <ListSection title={t('details.notes')}>
            <View style={styles.notes}>
              <AppText variant="body">{subscription.notes}</AppText>
            </View>
          </ListSection>
        ) : null}

        {upcoming.length > 0 ? (
          <ListSection title={t('details.upcomingPayments')}>
            {upcoming.map((date) => (
              <ListRow
                key={date}
                title={format.date(date, 'full')}
                subtitle={diffDays(today, date) < 7 ? format.relativeDay(date, today) : undefined}
                value={format.money(amountMinor, currency)}
              />
            ))}
          </ListSection>
        ) : null}

        <View style={styles.actions}>
          {status === 'active' ? (
            <>
              <Button label={t('details.pause')} icon="pause" variant="secondary" onPress={() => changeStatus('paused')} disabled={busy} />
              <Button label={t('details.markCancelled')} icon="close-circle" variant="secondary" onPress={confirmCancel} disabled={busy} />
            </>
          ) : status === 'paused' ? (
            <>
              <Button label={t('details.resume')} icon="play" onPress={() => changeStatus('active')} disabled={busy} />
              <Button label={t('details.markCancelled')} icon="close-circle" variant="secondary" onPress={confirmCancel} disabled={busy} />
            </>
          ) : (
            <Button label={t('details.reactivate')} icon="play" onPress={() => changeStatus('active')} disabled={busy} />
          )}
          <Button label={t('details.deleteSubscription')} icon="trash-outline" variant="danger" onPress={confirmDelete} disabled={busy} />
        </View>

        <AppText variant="caption" tone="tertiary" align="center">
          {t('details.addedOn', { date: format.date(todayLocal(new Date(subscription.createdAt)), 'full') })}
        </AppText>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER },
  headerButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.xs },
  content: { paddingHorizontal: GUTTER, paddingTop: spacing.sm, gap: spacing.xl },
  hero: { alignItems: 'center', gap: spacing.sm },
  heroMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs + 2 },
  statusPill: { borderRadius: radius.sm, paddingHorizontal: spacing.sm, paddingVertical: 3, marginLeft: spacing.xs },
  priceCard: { alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xl },
  nextBox: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.pill,
  },
  info: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  flex: { flex: 1 },
  notes: { padding: spacing.lg },
  actions: { gap: spacing.md },
});
