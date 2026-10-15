import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

type NotificationsModule = typeof import('expo-notifications');

let cached: NotificationsModule | null | undefined;

/**
 * `expo-notifications`, or `null` where it cannot load.
 *
 * Expo Go for Android (SDK 53+) no longer ships the module's native parts,
 * and importing it there throws at module initialization. Loading it lazily
 * keeps the rest of the app working; development and release builds always
 * get the real module.
 */
export function getNotificationsModule(): NotificationsModule | null {
  if (cached !== undefined) return cached;
  if (Platform.OS === 'android' && isRunningInExpoGo()) {
    cached = null;
    return cached;
  }
  try {
    // A static import would crash at startup in the environment above.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cached = require('expo-notifications') as NotificationsModule;
  } catch {
    cached = null;
  }
  return cached;
}
