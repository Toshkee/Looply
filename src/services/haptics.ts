import * as Haptics from 'expo-haptics';

/** Haptics are a nicety: failures (simulators, disabled vibration) are ignored. */
export const haptics = {
  tap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  selection() {
    Haptics.selectionAsync().catch(() => undefined);
  },
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
};
