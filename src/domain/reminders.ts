import { isBillable, occurrencesBetween } from './billing';
import { addDays, todayLocal, toLocalDateTime, type ISODate } from './calendarDate';
import type { Subscription } from './subscription';

/**
 * iOS keeps at most 64 pending local notifications per app; staying below
 * that leaves headroom and keeps behaviour identical on Android.
 */
export const MAX_SCHEDULED_REMINDERS = 60;

/** How far ahead reminders are planned; reconciliation extends the window over time. */
export const REMINDER_HORIZON_DAYS = 120;

export interface ReminderTime {
  hour: number;
  minute: number;
}

export interface PlannedReminder {
  /** Stable identifier: the same subscription and payment always map to the same id. */
  id: string;
  subscription: Subscription;
  paymentDate: ISODate;
  fireAt: Date;
  daysBefore: number;
}

/**
 * The reminders that should be pending right now, soonest first.
 * Paused, cancelled and reminder-less subscriptions produce none; moments
 * already in the past are skipped.
 */
export function planReminders(
  subscriptions: readonly Subscription[],
  now: Date,
  time: ReminderTime,
  { horizonDays = REMINDER_HORIZON_DAYS, limit = MAX_SCHEDULED_REMINDERS } = {},
): PlannedReminder[] {
  const today = todayLocal(now);
  const planned: PlannedReminder[] = [];
  for (const subscription of subscriptions) {
    const daysBefore = subscription.reminderDaysBefore;
    if (!isBillable(subscription) || daysBefore === null) continue;
    const lastPayment = addDays(today, horizonDays + daysBefore);
    for (const paymentDate of occurrencesBetween(subscription.anchorDate, subscription.interval, today, lastPayment)) {
      const fireAt = toLocalDateTime(addDays(paymentDate, -daysBefore), time.hour, time.minute);
      if (fireAt.getTime() <= now.getTime()) continue;
      if (fireAt.getTime() > toLocalDateTime(addDays(today, horizonDays), 23, 59).getTime()) continue;
      planned.push({
        id: `reminder:${subscription.id}:${paymentDate}`,
        subscription,
        paymentDate,
        fireAt,
        daysBefore,
      });
    }
  }
  return planned
    .sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime() || a.id.localeCompare(b.id))
    .slice(0, limit);
}
