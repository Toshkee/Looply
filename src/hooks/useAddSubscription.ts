import { router } from 'expo-router';
import { useCallback } from 'react';

import { useCanAddSubscription } from '@/state/pro';

/** Opens the new-subscription form, or the Pro offer once the free limit is reached. */
export function useAddSubscription(): () => void {
  const canAdd = useCanAddSubscription();
  return useCallback(() => {
    if (canAdd) router.push('/subscription/new');
    else router.push({ pathname: '/pro', params: { feature: 'limit' } });
  }, [canAdd]);
}
