import { getLocales } from 'expo-localization';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AppSettings } from '@/domain/settings';
import type { Subscription } from '@/domain/subscription';
import { planReminders, type PlannedReminder } from '@/domain/reminders';
import i18n from '@/i18n';
import { createFormatters } from '@/i18n/format';
import type { AppLanguage } from '@/i18n/languages';

/**
 * Local payment reminders.
 *
 * Reconciliation model: the plan is recomputed from current data and every
 * pending reminder is replaced. That keeps edits, pauses, deletions, language
 * changes and the rolling scheduling window consistent without bookkeeping.
 * The app is the only scheduler of local notifications, so cancelling all of
 * them is safe. Delivery time is up to the operating system.
 */
const CHANNEL_ID = 'payment-reminders';
export const REMINDER_KIND = 'payment-reminder';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export function configureNotificationHandling(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function toState(status: Notifications.NotificationPermissionsStatus): PermissionState {
  if (status.granted) return 'granted';
  if (status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermissionState(): Promise<PermissionState> {
  return toState(await Notifications.getPermissionsAsync());
}

/** Asks only when the system still allows asking; never re-prompts after a denial. */
export async function requestPermission(): Promise<PermissionState> {
  const current = await getPermissionState();
  if (current !== 'undetermined') return current;
  return toState(await Notifications.requestPermissionsAsync());
}

export interface ReminderSyncInput {
  subscriptions: readonly Subscription[];
  settings: Pick<AppSettings, 'remindersEnabled' | 'reminderHour' | 'reminderMinute'>;
  language: AppLanguage;
}

function buildContent(reminder: PlannedReminder, language: AppLanguage): Notifications.NotificationContentInput {
  const t = i18n.getFixedT(language);
  const format = createFormatters(t, language, getLocales());
  const { subscription, paymentDate, daysBefore } = reminder;
  const amount = format.money(subscription.amountMinor, subscription.currency);
  const body =
    daysBefore === 0
      ? t('notifications.bodySameDay', { amount })
      : daysBefore === 1
        ? t('notifications.bodyTomorrow', { amount })
        : t('notifications.bodyInDays', { amount, date: format.date(paymentDate, 'long') });
  return {
    title: subscription.name,
    body,
    sound: false,
    data: { kind: REMINDER_KIND, subscriptionId: subscription.id },
  };
}

async function reconcile({ subscriptions, settings, language }: ReminderSyncInput): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.remindersEnabled) return 0;
  if ((await getPermissionState()) !== 'granted') return 0;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: i18n.getFixedT(language)('notifications.channelName'),
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const plan = planReminders(subscriptions, new Date(), { hour: settings.reminderHour, minute: settings.reminderMinute });
  for (const reminder of plan) {
    await Notifications.scheduleNotificationAsync({
      identifier: reminder.id,
      content: buildContent(reminder, language),
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: reminder.fireAt,
        channelId: CHANNEL_ID,
      },
    });
  }
  return plan.length;
}

let queue: Promise<unknown> = Promise.resolve();

/** Serialized so overlapping triggers never interleave cancel/schedule calls. */
export function syncReminders(input: ReminderSyncInput): Promise<void> {
  const run = queue.then(() => reconcile(input));
  queue = run.catch(() => undefined);
  return run.then(
    (count) => {
      // Development diagnostics only: a count, never subscription data.
      if (__DEV__) console.log(`[reminders] ${count} scheduled`);
    },
    // Reminders are best-effort; the app stays fully usable without them.
    (error: unknown) => console.warn('Reminder sync failed:', error instanceof Error ? error.name : 'unknown'),
  );
}

export async function cancelAllReminders(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}
