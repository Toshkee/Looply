import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { SubscriptionForm } from '@/components/SubscriptionForm';
import { findPresets } from '@/domain/presets';
import type { SubscriptionFormValues } from '@/domain/validation';
import { useCanAddSubscription } from '@/state/pro';
import { useSettingsStore } from '@/state/settingsStore';
import { useSubscriptionStore } from '@/state/subscriptionStore';

/**
 * A new subscription. With `presets` (comma-separated service names, e.g.
 * from onboarding) it walks through them one by one, each prefilled, so only
 * the price and date are left to enter.
 */
export default function NewSubscriptionScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ presets?: string }>();
  const create = useSubscriptionStore((s) => s.create);
  // Decided once on open, so saving the last free subscription does not redirect mid-close.
  const canAdd = useCanAddSubscription();
  const [allowed] = useState(canAdd);
  const [series] = useState(() => findPresets(params.presets ? params.presets.split(',') : []));
  const [step, setStep] = useState(0);
  const [blank] = useState<SubscriptionFormValues>(() => {
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

  const preset = series[step];
  const initial = useMemo<SubscriptionFormValues>(
    () => (preset ? { ...blank, name: preset.name, category: preset.category, interval: preset.interval, url: preset.url } : blank),
    [blank, preset],
  );

  if (!allowed) return <Redirect href={{ pathname: '/pro', params: { feature: 'limit' } }} />;

  const inSeries = series.length > 1;
  const next = () => {
    if (step + 1 < series.length) setStep(step + 1);
    else router.back();
  };

  return (
    <SubscriptionForm
      // A fresh form for each service in the series.
      key={step}
      mode="create"
      initial={initial}
      onSubmit={async (input) => {
        await create(input);
      }}
      onDone={inSeries ? next : undefined}
      cancel={inSeries ? { label: t('form.skip'), onPress: next } : undefined}
      progress={inSeries ? t('form.seriesProgress', { current: step + 1, total: series.length }) : undefined}
    />
  );
}
