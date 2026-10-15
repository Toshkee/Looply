/**
 * Recurring billing engine.
 *
 * Assumptions (also documented in README):
 * - A subscription renews on `anchorDate + n × interval` for n = 0, 1, 2, …
 *   Dates before the anchor are never generated: the anchor is the first
 *   payment the user told us about.
 * - Month-based intervals keep the anchor's day of month and clamp to the
 *   last day of shorter months (Jan 31 → Feb 28/29 → Mar 31). Each renewal is
 *   computed from the anchor, not from the previous renewal, so clamping
 *   never drifts.
 * - Weekly renewals are exactly 7 calendar days apart.
 * - Normalized estimates use payments per year (weekly 52, monthly 12,
 *   quarterly 4, semiannual 2, annual 1); the monthly estimate is the annual
 *   estimate divided by 12. They describe average cost, not what is charged
 *   in any particular month.
 * - Only `active` subscriptions count toward totals, schedules and reminders.
 * - Amounts in different currencies are never added together.
 */
import { addDays, addMonths, diffCalendarMonths, diffDays, getParts, type ISODate } from './calendarDate';
import type { CurrencyCode } from './currency';
import type { BillingInterval, Subscription } from './subscription';

type IntervalStep = { unit: 'day'; count: number } | { unit: 'month'; count: number };

const INTERVAL_STEPS: Record<BillingInterval, IntervalStep> = {
  weekly: { unit: 'day', count: 7 },
  monthly: { unit: 'month', count: 1 },
  quarterly: { unit: 'month', count: 3 },
  semiannual: { unit: 'month', count: 6 },
  annual: { unit: 'month', count: 12 },
};

export const PAYMENTS_PER_YEAR: Record<BillingInterval, number> = {
  weekly: 52,
  monthly: 12,
  quarterly: 4,
  semiannual: 2,
  annual: 1,
};

/** Upper bound on generated occurrences per subscription and query. */
const MAX_OCCURRENCES = 1000;

/** The `index`-th renewal date (index 0 is the anchor itself). */
export function occurrenceAt(anchor: ISODate, interval: BillingInterval, index: number): ISODate {
  const step = INTERVAL_STEPS[interval];
  if (step.unit === 'day') return addDays(anchor, step.count * index);
  return addMonths(anchor, step.count * index, getParts(anchor).day);
}

/** Index of the first renewal falling on or after `date`. */
function firstIndexOnOrAfter(anchor: ISODate, interval: BillingInterval, date: ISODate): number {
  if (anchor >= date) return 0;
  const step = INTERVAL_STEPS[interval];
  let index =
    step.unit === 'day'
      ? Math.ceil(diffDays(anchor, date) / step.count)
      : Math.floor(diffCalendarMonths(anchor, date) / step.count);
  while (occurrenceAt(anchor, interval, index) < date) index += 1;
  return index;
}

/** The first renewal on or after `date` (inclusive). */
export function nextOccurrence(anchor: ISODate, interval: BillingInterval, date: ISODate): ISODate {
  return occurrenceAt(anchor, interval, firstIndexOnOrAfter(anchor, interval, date));
}

/** All renewals within `[from, to]`, inclusive, in ascending order. */
export function occurrencesBetween(
  anchor: ISODate,
  interval: BillingInterval,
  from: ISODate,
  to: ISODate,
): ISODate[] {
  const dates: ISODate[] = [];
  if (to < from) return dates;
  let index = firstIndexOnOrAfter(anchor, interval, from);
  for (let guard = 0; guard < MAX_OCCURRENCES; guard += 1) {
    const date = occurrenceAt(anchor, interval, index);
    if (date > to) break;
    dates.push(date);
    index += 1;
  }
  return dates;
}

/** The next payment for a subscription regardless of status (callers decide what to show). */
export function nextBillingDate(subscription: Pick<Subscription, 'anchorDate' | 'interval'>, today: ISODate): ISODate {
  return nextOccurrence(subscription.anchorDate, subscription.interval, today);
}

export function isBillable(subscription: Pick<Subscription, 'status'>): boolean {
  return subscription.status === 'active';
}

/** Normalized cost per year in (possibly fractional) minor units. */
export function annualEstimateMinor(amountMinor: number, interval: BillingInterval): number {
  return amountMinor * PAYMENTS_PER_YEAR[interval];
}

/** Normalized cost per month in (possibly fractional) minor units. */
export function monthlyEstimateMinor(amountMinor: number, interval: BillingInterval): number {
  return annualEstimateMinor(amountMinor, interval) / 12;
}

export interface CurrencyTotals {
  currency: CurrencyCode;
  monthlyMinor: number;
  annualMinor: number;
  activeCount: number;
}

/**
 * Normalized spending of active subscriptions, one entry per currency.
 * `preferred` (the user's default currency) sorts first when present;
 * the rest follow by number of subscriptions.
 */
export function totalsByCurrency(
  subscriptions: readonly Subscription[],
  preferred?: CurrencyCode,
): CurrencyTotals[] {
  const totals = new Map<CurrencyCode, CurrencyTotals>();
  for (const subscription of uniqueById(subscriptions)) {
    if (!isBillable(subscription)) continue;
    const entry = totals.get(subscription.currency) ?? {
      currency: subscription.currency,
      monthlyMinor: 0,
      annualMinor: 0,
      activeCount: 0,
    };
    entry.annualMinor += annualEstimateMinor(subscription.amountMinor, subscription.interval);
    entry.monthlyMinor = entry.annualMinor / 12;
    entry.activeCount += 1;
    totals.set(subscription.currency, entry);
  }
  return [...totals.values()].sort((a, b) => {
    if (a.currency === preferred) return -1;
    if (b.currency === preferred) return 1;
    return b.activeCount - a.activeCount || a.currency.localeCompare(b.currency);
  });
}

export interface ScheduledPayment {
  /** Stable, unique per subscription and date. */
  key: string;
  date: ISODate;
  subscription: Subscription;
}

/**
 * Expected payments of active subscriptions within `[from, to]`, sorted by
 * date, then name. Each subscription contributes at most one entry per day.
 */
export function scheduledPayments(
  subscriptions: readonly Subscription[],
  from: ISODate,
  to: ISODate,
): ScheduledPayment[] {
  const payments: ScheduledPayment[] = [];
  const seen = new Set<string>();
  for (const subscription of uniqueById(subscriptions)) {
    if (!isBillable(subscription)) continue;
    for (const date of occurrencesBetween(subscription.anchorDate, subscription.interval, from, to)) {
      const key = `${subscription.id}:${date}`;
      if (seen.has(key)) continue;
      seen.add(key);
      payments.push({ key, date, subscription });
    }
  }
  return payments.sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.subscription.name.localeCompare(b.subscription.name) ||
      a.subscription.id.localeCompare(b.subscription.id),
  );
}

/** The earliest upcoming payment across active subscriptions. */
export function nextPayment(subscriptions: readonly Subscription[], today: ISODate): ScheduledPayment | null {
  let best: ScheduledPayment | null = null;
  for (const subscription of uniqueById(subscriptions)) {
    if (!isBillable(subscription)) continue;
    const date = nextBillingDate(subscription, today);
    if (
      !best ||
      date < best.date ||
      (date === best.date && subscription.name.localeCompare(best.subscription.name) < 0)
    ) {
      best = { key: `${subscription.id}:${date}`, date, subscription };
    }
  }
  return best;
}

export interface CurrencyAmount {
  currency: CurrencyCode;
  amountMinor: number;
  count: number;
}

/** Sums actual payment amounts per currency (never across currencies). */
export function sumPaymentsByCurrency(
  payments: readonly ScheduledPayment[],
  preferred?: CurrencyCode,
): CurrencyAmount[] {
  const sums = new Map<CurrencyCode, CurrencyAmount>();
  for (const { subscription } of payments) {
    const entry = sums.get(subscription.currency) ?? { currency: subscription.currency, amountMinor: 0, count: 0 };
    entry.amountMinor += subscription.amountMinor;
    entry.count += 1;
    sums.set(subscription.currency, entry);
  }
  return [...sums.values()].sort((a, b) => {
    if (a.currency === preferred) return -1;
    if (b.currency === preferred) return 1;
    return b.count - a.count || a.currency.localeCompare(b.currency);
  });
}

function uniqueById(subscriptions: readonly Subscription[]): Subscription[] {
  const byId = new Map<string, Subscription>();
  for (const subscription of subscriptions) byId.set(subscription.id, subscription);
  return [...byId.values()];
}
