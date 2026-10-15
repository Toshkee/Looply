import type { ISODate } from './calendarDate';
import type { CurrencyCode } from './currency';

export const BILLING_INTERVALS = ['weekly', 'monthly', 'quarterly', 'semiannual', 'annual'] as const;
export type BillingInterval = (typeof BILLING_INTERVALS)[number];

export const SUBSCRIPTION_STATUSES = ['active', 'paused', 'cancelled'] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export const CATEGORY_IDS = [
  'entertainment',
  'music',
  'productivity',
  'cloud',
  'gaming',
  'fitness',
  'utilities',
  'telecom',
  'education',
  'other',
] as const;
export type CategoryId = (typeof CATEGORY_IDS)[number];

/** Reminder lead times offered in the UI, in days before the payment. */
export const REMINDER_OPTIONS = [0, 1, 3, 7] as const;

export interface Subscription {
  id: string;
  name: string;
  /** Price per billing period, in integer minor units of `currency`. */
  amountMinor: number;
  currency: CurrencyCode;
  interval: BillingInterval;
  /**
   * A known billing date. Every renewal is derived from it
   * (anchor + n × interval), so month-end clamping never accumulates.
   */
  anchorDate: ISODate;
  category: CategoryId;
  status: SubscriptionStatus;
  url: string | null;
  notes: string | null;
  /** Days before a payment to remind; `null` disables reminders. */
  reminderDaysBefore: number | null;
  createdAt: string;
  updatedAt: string;
}

/** The user-editable part of a subscription. */
export type SubscriptionInput = Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * A point-in-time record of the fields that drive spending, written on every
 * change. Lets insights compare spending over time using real history.
 */
export interface SubscriptionSnapshot {
  sequence: number;
  subscriptionId: string;
  recordedOn: ISODate;
  amountMinor: number;
  currency: CurrencyCode;
  interval: BillingInterval;
  status: SubscriptionStatus | 'deleted';
}

export function isBillingInterval(value: unknown): value is BillingInterval {
  return typeof value === 'string' && (BILLING_INTERVALS as readonly string[]).includes(value);
}

export function isSubscriptionStatus(value: unknown): value is SubscriptionStatus {
  return typeof value === 'string' && (SUBSCRIPTION_STATUSES as readonly string[]).includes(value);
}

export function isCategoryId(value: unknown): value is CategoryId {
  return typeof value === 'string' && (CATEGORY_IDS as readonly string[]).includes(value);
}
