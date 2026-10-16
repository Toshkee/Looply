import { canAddSubscription } from '@/domain/pro';
import { purchases } from '@/services/purchases';

import { useSettingsStore } from './settingsStore';
import { useSubscriptionStore } from './subscriptionStore';

export function useIsPro(): boolean {
  return useSettingsStore((s) => s.settings.proUnlocked);
}

export function useCanAddSubscription(): boolean {
  const isPro = useIsPro();
  const count = useSubscriptionStore((s) => s.subscriptions.length);
  return canAddSubscription(count, isPro);
}

const setUnlocked = (proUnlocked: boolean) => useSettingsStore.getState().update({ proUnlocked });

/** Runs the purchase and unlocks Pro when it succeeds. */
export async function buyPro(): Promise<boolean> {
  const bought = await purchases.purchasePro();
  if (bought) await setUnlocked(true);
  return bought;
}

export async function restorePro(): Promise<boolean> {
  const restored = await purchases.restorePurchases();
  if (restored) await setUnlocked(true);
  return restored;
}

/** Test mode only: returns the device to the free version. */
export async function relockProForTesting(): Promise<void> {
  if (purchases.mode === 'test') await setUnlocked(false);
}
