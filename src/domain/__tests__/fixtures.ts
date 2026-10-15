import type { ISODate } from '../calendarDate';
import type { Subscription } from '../subscription';

let counter = 0;

export function makeSubscription(overrides: Partial<Subscription> = {}): Subscription {
  counter += 1;
  return {
    id: `sub-${counter}`,
    name: `Service ${counter}`,
    amountMinor: 999,
    currency: 'EUR',
    interval: 'monthly',
    anchorDate: '2026-01-15' as ISODate,
    category: 'entertainment',
    status: 'active',
    url: null,
    notes: null,
    reminderDaysBefore: null,
    createdAt: '2026-01-01T10:00:00.000Z',
    updatedAt: '2026-01-01T10:00:00.000Z',
    ...overrides,
  };
}

export const iso = (value: string) => value as ISODate;
