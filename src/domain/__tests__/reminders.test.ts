import { planReminders } from '../reminders';
import { iso, makeSubscription } from './fixtures';

const NINE = { hour: 9, minute: 0 };

describe('planReminders', () => {
  test('schedules reminders N days before each payment at the chosen local time', () => {
    const sub = makeSubscription({ anchorDate: iso('2026-10-20'), reminderDaysBefore: 3 });
    const plan = planReminders([sub], new Date(2026, 9, 15, 12, 0), NINE, { horizonDays: 40 });
    expect(plan.map((r) => r.paymentDate)).toEqual(['2026-10-20', '2026-11-20']);
    const first = plan[0]!;
    expect([first.fireAt.getMonth(), first.fireAt.getDate(), first.fireAt.getHours()]).toEqual([9, 17, 9]);
    expect(first.id).toBe(`reminder:${sub.id}:2026-10-20`);
  });

  test('skips reminders whose moment has passed', () => {
    const sub = makeSubscription({ anchorDate: iso('2026-10-16'), reminderDaysBefore: 1 });
    // Reminder for Oct 16 would fire Oct 15 09:00, but it is already 10:00.
    const plan = planReminders([sub], new Date(2026, 9, 15, 10, 0), NINE, { horizonDays: 35 });
    expect(plan.map((r) => r.paymentDate)).toEqual(['2026-11-16']);
  });

  test('same-day reminders fire on the payment day', () => {
    const sub = makeSubscription({ anchorDate: iso('2026-10-16'), reminderDaysBefore: 0 });
    const plan = planReminders([sub], new Date(2026, 9, 15, 10, 0), NINE, { horizonDays: 5 });
    expect(plan.map((r) => r.fireAt.getDate())).toEqual([16]);
  });

  test('ignores paused, cancelled and reminder-less subscriptions', () => {
    const subs = [
      makeSubscription({ anchorDate: iso('2026-10-20'), reminderDaysBefore: 1, status: 'paused' }),
      makeSubscription({ anchorDate: iso('2026-10-20'), reminderDaysBefore: 1, status: 'cancelled' }),
      makeSubscription({ anchorDate: iso('2026-10-20'), reminderDaysBefore: null }),
    ];
    expect(planReminders(subs, new Date(2026, 9, 15, 8, 0), NINE)).toEqual([]);
  });

  test('respects the platform limit and keeps the soonest reminders', () => {
    const weekly = Array.from({ length: 10 }, (_, i) =>
      makeSubscription({ interval: 'weekly', anchorDate: iso(`2026-10-${String(16 + i).padStart(2, '0')}`), reminderDaysBefore: 0 }),
    );
    const plan = planReminders(weekly, new Date(2026, 9, 15, 8, 0), NINE, { limit: 60 });
    expect(plan).toHaveLength(60);
    const times = plan.map((r) => r.fireAt.getTime());
    expect([...times].sort((a, b) => a - b)).toEqual(times);
    expect(new Set(plan.map((r) => r.id)).size).toBe(60);
  });
});
