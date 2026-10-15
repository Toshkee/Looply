import { useState } from 'react';

import { SubscriptionForm } from '@/components/SubscriptionForm';
import type { SubscriptionFormValues } from '@/domain/validation';
import { useSettingsStore } from '@/state/settingsStore';
import { useSubscriptionStore } from '@/state/subscriptionStore';

export default function NewSubscriptionScreen() {
  const create = useSubscriptionStore((s) => s.create);
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
