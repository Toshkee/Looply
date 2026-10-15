import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getPermissionState, requestPermission, type PermissionState } from '@/services/notifications';

/** Current notification permission, refreshed when returning from system settings. */
export function useNotificationPermission() {
  const [state, setState] = useState<PermissionState | null>(null);

  const refresh = useCallback(() => {
    getPermissionState()
      .then(setState)
      .catch(() => setState(null));
  }, []);

  useEffect(() => {
    refresh();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refresh();
    });
    return () => subscription.remove();
  }, [refresh]);

  const request = useCallback(async () => {
    const next = await requestPermission();
    setState(next);
    return next;
  }, []);

  return { state, request };
}
