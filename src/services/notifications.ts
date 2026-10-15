import { getLocales } from 'expo-localization';
import type { NotificationContentInput, NotificationPermissionsStatus, NotificationResponse } from 'expo-notifications';
import { Platform } from 'react-native';

import type { AppSettings } from '@/domain/settings';
import type { Subscription } from '@/domain/subscription';
import { planReminders, type PlannedReminder } from '@/domain/reminders';
import i18n from '@/i18n';
import { createFormatters } from '@/i18n/format';
import type { AppLanguage } from '@/i18n/languages';

import { getNotificationsModule } from './notificationsModule';

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

/** `unavailable`: notifications cannot run in this environment (e.g. Expo Go on Android). */
export type PermissionState = 'granted' | 'denied' | 'undetermined' | 'unavailable';

export function configureNotificationHandling(): void {
  getNotificationsModule()?.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

function toState(status: NotificationPermissionsStatus): PermissionState {
  const Notifications = getNotificationsModule();
  if (status.granted) return 'granted';
  if (Notifications && status.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) return 'granted';
  return status.canAskAgain ? 'undetermined' : 'denied';
}

export async function getPermissionState(): Promise<PermissionState> {
  const Notifications = getNotificationsModule();
  if (!Notifications) return 'unavailable';
  return toState(await Notifications.getPermissionsAsync());
}

/** Asks only when the system still allows asking; never re-prompts after a denial. */
export async function requestPermission(): Promise<PermissionState> {
  const Notifications = getNotificationsModule();
  const current = await getPermissionState();
  if (!Notifications || current !== 'undetermined') return current;
  return toState(await Notifications.requestPermissionsAsync());
}

export interface ReminderSyncInput {
  subscriptions: readonly Subscription[];
  settings: Pick<AppSettings, 'remindersEnabled' | 'reminderHour' | 'reminderMinute'>;
  language: AppLanguage;
}

function buildContent(reminder: PlannedReminder, language: AppLanguage): NotificationContentInput {
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
  const Notifications = getNotificationsModule();
  if (!Notifications) return 0;
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
  await getNotificationsModule()?.cancelAllScheduledNotificationsAsync().catch(() => undefined);
}

/** Subscription id a tapped reminder refers to, if any. */
function subscriptionIdFrom(response: NotificationResponse | null): string | null {
  const data = response?.notification.request.content.data as { kind?: unknown; subscriptionId?: unknown } | undefined;
  return data?.kind === REMINDER_KIND && typeof data.subscriptionId === 'string' ? data.subscriptionId : null;
}

/**
 * Calls `onOpen` for the reminder that launched the app and for every
 * reminder tapped afterwards. Returns an unsubscribe function.
 */
export function listenForReminderTaps(onOpen: (subscriptionId: string, responseId: string) => void): () => void {
  const Notifications = getNotificationsModule();
  if (!Notifications) return () => undefined;
  const handle = (response: NotificationResponse | null) => {
    const id = subscriptionIdFrom(response);
    if (response && id) onOpen(id, response.notification.request.identifier);
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
  const subscription = Notifications.addNotificationResponseReceivedListener(handle);
  return () => subscription.remove();
}
