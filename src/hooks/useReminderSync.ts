import { router } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { currentLanguage } from '@/i18n';
import { listenForReminderTaps, syncReminders } from '@/services/notifications';
import { useSettingsStore } from '@/state/settingsStore';
import { useSubscriptionStore } from '@/state/subscriptionStore';

const DEBOUNCE_MS = 500;

/**
 * Keeps scheduled reminders in step with the data: on start, after any
 * subscription or reminder-setting change, on language change, and whenever
 * the app returns to the foreground (which also extends the rolling window).
 */
export function useReminderSync(enabled: boolean): void {
  const subscriptions = useSubscriptionStore((s) => s.subscriptions);
  const remindersEnabled = useSettingsStore((s) => s.settings.remindersEnabled);
  const reminderHour = useSettingsStore((s) => s.settings.reminderHour);
  const reminderMinute = useSettingsStore((s) => s.settings.reminderMinute);
  const language = useSettingsStore((s) => s.settings.language);

  useEffect(() => {
    if (!enabled) return;
    const run = () =>
      syncReminders({
        subscriptions: useSubscriptionStore.getState().subscriptions,
        settings: useSettingsStore.getState().settings,
        language: currentLanguage(),
      });
    const timer = setTimeout(run, DEBOUNCE_MS);
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => {
      clearTimeout(timer);
      appState.remove();
    };
  }, [enabled, subscriptions, remindersEnabled, reminderHour, reminderMinute, language]);
}

/** Opens the subscription a tapped reminder refers to (each tap handled once). */
export function useReminderNavigation(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const handled = new Set<string>();
    return listenForReminderTaps((subscriptionId, responseId) => {
      if (handled.has(responseId)) return;
      handled.add(responseId);
      router.push(`/subscription/${subscriptionId}`);
    });
  }, [enabled]);
}
