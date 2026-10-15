import {
  activeCurrencies,
  categoryBreakdown,
  compareWithPast,
  monthlyTotalsAsOf,
  mostExpensive,
  overlapHints,
  scheduledMonthTotals,
  upcomingLongRenewals,
} from '../insights';
import type { SubscriptionSnapshot } from '../subscription';
import { iso, makeSubscription } from './fixtures';

describe('insights', () => {
  const subs = [
    makeSubscription({ name: 'Netflix', amountMinor: 1299, category: 'entertainment' }),
    makeSubscription({ name: 'Disney+', amountMinor: 899, category: 'entertainment' }),
    makeSubscription({ name: 'Spotify', amountMinor: 1099, category: 'music' }),
    makeSubscription({ name: 'iCloud', amountMinor: 3588, category: 'cloud', interval: 'annual' }),
    makeSubscription({ name: 'Paused gym', amountMinor: 3000, category: 'fitness', status: 'paused' }),
    makeSubscription({ name: 'US app', amountMinor: 500, category: 'productivity', currency: 'USD' }),
  ];

  test('category breakdown for one currency with shares summing to 1', () => {
    const breakdown = categoryBreakdown(subs, 'EUR');
    expect(breakdown.map((c) => c.category)).toEqual(['entertainment', 'music', 'cloud']);
    expect(breakdown[0]).toMatchObject({ monthlyMinor: 2198, count: 2 });
    expect(breakdown.reduce((sum, c) => sum + c.share, 0)).toBeCloseTo(1, 10);
    expect(categoryBreakdown([], 'EUR')).toEqual([]);
  });

  test('most expensive ranks by normalized monthly cost within a currency', () => {
    expect(mostExpensive(subs, 'EUR', 2).map((r) => r.subscription.name)).toEqual(['Netflix', 'Spotify']);
    expect(mostExpensive(subs, 'USD').map((r) => r.subscription.name)).toEqual(['US app']);
  });

  test('active currencies, preferred first', () => {
    expect(activeCurrencies(subs, 'USD')).toEqual(['USD', 'EUR']);
    expect(activeCurrencies(subs)).toEqual(['EUR', 'USD']);
  });

  test('overlap hints only for overlap-prone categories with 2+ active services', () => {
    const hints = overlapHints(subs);
    expect(hints).toHaveLength(1);
    expect(hints[0]?.category).toBe('entertainment');
  });

  test('upcoming long renewals', () => {
    const annual = makeSubscription({ interval: 'annual', anchorDate: iso('2025-11-20') });
    const farAnnual = makeSubscription({ interval: 'annual', anchorDate: iso('2026-03-01') });
    const monthly = makeSubscription({ anchorDate: iso('2026-10-20') });
    expect(upcomingLongRenewals([annual, farAnnual, monthly], iso('2026-10-15'))).toEqual([
      { subscription: annual, date: '2026-11-20' },
    ]);
  });
});

describe('spending history', () => {
  const snap = (
    sequence: number,
    subscriptionId: string,
    recordedOn: string,
    amountMinor: number,
    status: SubscriptionSnapshot['status'] = 'active',
  ): SubscriptionSnapshot => ({
    sequence,
    subscriptionId,
    recordedOn: iso(recordedOn),
    amountMinor,
    currency: 'EUR',
    interval: 'monthly',
    status,
  });

  const history = [
    snap(1, 'a', '2026-08-01', 1000),
    snap(2, 'b', '2026-08-10', 500),
    snap(3, 'a', '2026-09-20', 1200), // price increase
    snap(4, 'b', '2026-10-01', 500, 'cancelled'),
    snap(5, 'c', '2026-10-05', 300),
    snap(6, 'c', '2026-10-05', 300, 'deleted'), // same-day delete wins by sequence
  ];

  test('reconstructs totals at a past date from the latest snapshot per subscription', () => {
    expect(monthlyTotalsAsOf(history, iso('2026-08-31')).get('EUR')).toBe(1500);
    expect(monthlyTotalsAsOf(history, iso('2026-09-30')).get('EUR')).toBe(1700);
    expect(monthlyTotalsAsOf(history, iso('2026-10-15')).get('EUR')).toBe(1200);
    expect(monthlyTotalsAsOf(history, iso('2026-07-01')).get('EUR')).toBeUndefined();
  });

  test('compares with 30 days ago only when history reaches that far', () => {
    expect(compareWithPast(history, 1200, 'EUR', iso('2026-10-15'))).toEqual({
      currency: 'EUR',
      since: '2026-09-15',
      previousMonthlyMinor: 1500,
      currentMonthlyMinor: 1200,
      differenceMinor: -300,
    });
    expect(compareWithPast(history, 1200, 'EUR', iso('2026-08-20'))).toBeNull();
    expect(compareWithPast([], 0, 'EUR', iso('2026-10-15'))).toBeNull();
  });
});

describe('scheduled month totals', () => {
  test('sums actual charges per calendar month, including annual renewals', () => {
    const subs = [
      makeSubscription({ amountMinor: 1000, anchorDate: iso('2026-10-20') }),
      makeSubscription({ amountMinor: 12000, interval: 'annual', anchorDate: iso('2026-12-05') }),
      makeSubscription({ amountMinor: 500, interval: 'weekly', anchorDate: iso('2026-10-01'), status: 'paused' }),
      makeSubscription({ amountMinor: 999, currency: 'USD', anchorDate: iso('2026-10-20') }),
    ];
    expect(scheduledMonthTotals(subs, 'EUR', iso('2026-10-15'), 3)).toEqual([
      { month: '2026-10-01', amountMinor: 1000, count: 1 },
      { month: '2026-11-01', amountMinor: 1000, count: 1 },
      { month: '2026-12-01', amountMinor: 13000, count: 2 },
    ]);
  });
});
