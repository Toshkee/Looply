import { Redirect } from 'expo-router';
import { useState } from 'react';

import { SubscriptionForm } from '@/components/SubscriptionForm';
import type { SubscriptionFormValues } from '@/domain/validation';
import { useCanAddSubscription } from '@/state/pro';
import { useSettingsStore } from '@/state/settingsStore';
import { useSubscriptionStore } from '@/state/subscriptionStore';

export default function NewSubscriptionScreen() {
  const create = useSubscriptionStore((s) => s.create);
  // Decided once on open, so saving the last free subscription does not redirect mid-close.
  const canAdd = useCanAddSubscription();
  const [allowed] = useState(canAdd);
  const [initial] = useState<SubscriptionFormValues>(() => {
    const { currency, defaultReminderDays } = useSettingsStore.getState().settings;
    return {
      name: '',
      amount: '',
      currency,
      interval: 'monthly',
      nextBillingDate: null,
      category: 'other',
      status: 'active',
      url: '',
      notes: '',
      reminderDaysBefore: defaultReminderDays,
    };
  });

  if (!allowed) return <Redirect href={{ pathname: '/pro', params: { feature: 'limit' } }} />;

  return (
    <SubscriptionForm
      mode="create"
      initial={initial}
      onSubmit={async (input) => {
        await create(input);
      }}
    />
  );
}
