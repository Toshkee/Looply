import { annualEstimateMinor, isBillable, monthlyEstimateMinor, nextBillingDate } from './billing';
import { addDays, type ISODate } from './calendarDate';
import type { CurrencyCode } from './currency';
import type { CategoryId, Subscription, SubscriptionSnapshot } from './subscription';

export interface CategorySpend {
  category: CategoryId;
  monthlyMinor: number;
  /** 0–1 share of the currency's monthly total. */
  share: number;
  count: number;
}

/** Normalized monthly spending per category for one currency, largest first. */
export function categoryBreakdown(subscriptions: readonly Subscription[], currency: CurrencyCode): CategorySpend[] {
  const byCategory = new Map<CategoryId, CategorySpend>();
  let total = 0;
  for (const subscription of subscriptions) {
    if (!isBillable(subscription) || subscription.currency !== currency) continue;
    const monthly = monthlyEstimateMinor(subscription.amountMinor, subscription.interval);
    total += monthly;
    const entry = byCategory.get(subscription.category) ?? {
      category: subscription.category,
      monthlyMinor: 0,
      share: 0,
      count: 0,
    };
    entry.monthlyMinor += monthly;
    entry.count += 1;
    byCategory.set(subscription.category, entry);
  }
  return [...byCategory.values()]
    .map((entry) => ({ ...entry, share: total > 0 ? entry.monthlyMinor / total : 0 }))
    .sort((a, b) => b.monthlyMinor - a.monthlyMinor || a.category.localeCompare(b.category));
}

export interface RankedSubscription {
  subscription: Subscription;
  monthlyMinor: number;
  annualMinor: number;
}

/** Active subscriptions in one currency ranked by normalized monthly cost. */
export function mostExpensive(
  subscriptions: readonly Subscription[],
  currency: CurrencyCode,
  limit = 5,
): RankedSubscription[] {
  return subscriptions
    .filter((subscription) => isBillable(subscription) && subscription.currency === currency)
    .map((subscription) => ({
      subscription,
      monthlyMinor: monthlyEstimateMinor(subscription.amountMinor, subscription.interval),
      annualMinor: annualEstimateMinor(subscription.amountMinor, subscription.interval),
    }))
    .sort((a, b) => b.monthlyMinor - a.monthlyMinor || a.subscription.name.localeCompare(b.subscription.name))
    .slice(0, limit);
}

/** Currencies used by active subscriptions; `preferred` first, then by usage. */
export function activeCurrencies(subscriptions: readonly Subscription[], preferred?: CurrencyCode): CurrencyCode[] {
  const counts = new Map<CurrencyCode, number>();
  for (const subscription of subscriptions) {
    if (!isBillable(subscription)) continue;
    counts.set(subscription.currency, (counts.get(subscription.currency) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([a, countA], [b, countB]) => {
      if (a === preferred) return -1;
      if (b === preferred) return 1;
      return countB - countA || a.localeCompare(b);
    })
    .map(([currency]) => currency);
}

/** Categories where several active services usually mean paying twice for the same thing. */
const OVERLAP_PRONE: readonly CategoryId[] = ['entertainment', 'music', 'cloud', 'gaming'];

export interface OverlapHint {
  category: CategoryId;
  subscriptions: Subscription[];
}

export function overlapHints(subscriptions: readonly Subscription[]): OverlapHint[] {
  return OVERLAP_PRONE.map((category) => ({
    category,
    subscriptions: subscriptions.filter((s) => isBillable(s) && s.category === category),
  })).filter((hint) => hint.subscriptions.length >= 2);
}

export interface UpcomingRenewal {
  subscription: Subscription;
  date: ISODate;
}

/**
 * Semiannual and annual renewals due within `days`: large, infrequent charges
 * that are easy to forget.
 */
export function upcomingLongRenewals(
  subscriptions: readonly Subscription[],
  today: ISODate,
  days = 60,
): UpcomingRenewal[] {
  const until = addDays(today, days);
  return subscriptions
    .filter((s) => isBillable(s) && (s.interval === 'annual' || s.interval === 'semiannual'))
    .map((subscription) => ({ subscription, date: nextBillingDate(subscription, today) }))
    .filter(({ date }) => date <= until)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Normalized monthly totals per currency as they were at the end of `date`,
 * reconstructed from snapshots.
 */
export function monthlyTotalsAsOf(
  snapshots: readonly SubscriptionSnapshot[],
  date: ISODate,
): Map<CurrencyCode, number> {
  const latest = new Map<string, SubscriptionSnapshot>();
  for (const snapshot of snapshots) {
    if (snapshot.recordedOn > date) continue;
    const current = latest.get(snapshot.subscriptionId);
    if (!current || snapshot.sequence > current.sequence) latest.set(snapshot.subscriptionId, snapshot);
  }
  const totals = new Map<CurrencyCode, number>();
  for (const snapshot of latest.values()) {
    if (snapshot.status !== 'active') continue;
    totals.set(
      snapshot.currency,
      (totals.get(snapshot.currency) ?? 0) + monthlyEstimateMinor(snapshot.amountMinor, snapshot.interval),
    );
  }
  return totals;
}

export interface SpendingComparison {
  currency: CurrencyCode;
  since: ISODate;
  previousMonthlyMinor: number;
  currentMonthlyMinor: number;
  differenceMinor: number;
}

/**
 * Compares today's normalized monthly spending with `daysBack` days ago.
 * Returns `null` until the recorded history actually reaches that far back,
 * so no comparison is ever invented.
 */
export function compareWithPast(
  snapshots: readonly SubscriptionSnapshot[],
  currentMonthlyMinor: number,
  currency: CurrencyCode,
  today: ISODate,
  daysBack = 30,
): SpendingComparison | null {
  if (snapshots.length === 0) return null;
  const since = addDays(today, -daysBack);
  const firstRecorded = snapshots.reduce<ISODate>(
    (earliest, s) => (s.recordedOn < earliest ? s.recordedOn : earliest),
    snapshots[0]!.recordedOn,
  );
  if (firstRecorded > since) return null;
  const previousMonthlyMinor = monthlyTotalsAsOf(snapshots, since).get(currency) ?? 0;
  return {
    currency,
    since,
    previousMonthlyMinor,
    currentMonthlyMinor,
    differenceMinor: currentMonthlyMinor - previousMonthlyMinor,
  };
}
