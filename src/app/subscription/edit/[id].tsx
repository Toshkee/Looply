import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { SubscriptionForm } from '@/components/SubscriptionForm';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { nextBillingDate } from '@/domain/billing';
import { todayLocal } from '@/domain/calendarDate';
import { formatAmountForInput } from '@/domain/money';
import type { SubscriptionFormValues } from '@/domain/validation';
import { useFormatters } from '@/hooks/useFormatters';
import { useSubscription, useSubscriptionStore } from '@/state/subscriptionStore';
import { useTheme } from '@/theme/ThemeProvider';
import { GUTTER } from '@/theme/tokens';

export default function EditSubscriptionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const format = useFormatters();
  const subscription = useSubscription(id);
  const update = useSubscriptionStore((s) => s.update);

  const [initial] = useState<SubscriptionFormValues | null>(() =>
    subscription
      ? {
          name: subscription.name,
          amount: formatAmountForInput(subscription.amountMinor, subscription.currency, format.decimalSeparator),
          currency: subscription.currency,
          interval: subscription.interval,
          nextBillingDate: nextBillingDate(subscription, todayLocal()),
          category: subscription.category,
          status: subscription.status,
          url: subscription.url ?? '',
          notes: subscription.notes ?? '',
          reminderDaysBefore: subscription.reminderDaysBefore,
        }
      : null,
  );

  if (!subscription || !initial) {
    return (
      <View style={[styles.missing, { backgroundColor: colors.background }]}>
        <EmptyState icon="alert-circle-outline" title={t('details.notFound')} />
        <Button label={t('common.close')} variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  return (
    <SubscriptionForm
      mode="edit"
      initial={initial}
      onSubmit={async (input, { dateChanged }) => {
        // Re-anchoring on an unchanged date would lose a month-end anchor
        // (Jan 31 → next shown Feb 28 → later renewals on the 28th).
        const keepAnchor = !dateChanged && input.interval === subscription.interval;
        await update(subscription.id, keepAnchor ? { ...input, anchorDate: subscription.anchorDate } : input);
      }}
    />
  );
}

const styles = StyleSheet.create({
  missing: { flex: 1, justifyContent: 'center', paddingHorizontal: GUTTER },
});
