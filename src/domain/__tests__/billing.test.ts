import {
  annualEstimateMinor,
  monthlyEstimateMinor,
  nextBillingDate,
  nextOccurrence,
  nextPayment,
  occurrenceAt,
  occurrencesBetween,
  scheduledPayments,
  sumPaymentsByCurrency,
  totalsByCurrency,
} from '../billing';
import { reactivate } from '../subscription';
import { iso, makeSubscription } from './fixtures';

describe('renewal dates', () => {
  test('monthly renewals from the 31st clamp per month without drifting', () => {
    const anchor = iso('2026-01-31');
    const dates = [0, 1, 2, 3, 4, 5, 6].map((n) => occurrenceAt(anchor, 'monthly', n));
    expect(dates).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
      '2026-05-31',
      '2026-06-30',
      '2026-07-31',
    ]);
  });

  test('monthly renewals from the 31st land on Feb 29 in leap years', () => {
    expect(occurrenceAt(iso('2028-01-31'), 'monthly', 1)).toBe('2028-02-29');
    expect(occurrenceAt(iso('2028-01-30'), 'monthly', 1)).toBe('2028-02-29');
    expect(occurrenceAt(iso('2028-01-29'), 'monthly', 1)).toBe('2028-02-29');
    expect(occurrenceAt(iso('2028-01-28'), 'monthly', 1)).toBe('2028-02-28');
  });

  test('annual renewals from Feb 29 fall back to Feb 28 and return in leap years', () => {
    const anchor = iso('2024-02-29');
    expect(occurrenceAt(anchor, 'annual', 1)).toBe('2025-02-28');
    expect(occurrenceAt(anchor, 'annual', 2)).toBe('2026-02-28');
    expect(occurrenceAt(anchor, 'annual', 4)).toBe('2028-02-29');
  });

  test('quarterly and semiannual intervals', () => {
    const anchor = iso('2025-11-30');
    expect(occurrencesBetween(anchor, 'quarterly', iso('2025-11-01'), iso('2026-12-31'))).toEqual([
      '2025-11-30',
      '2026-02-28',
      '2026-05-30',
      '2026-08-30',
      '2026-11-30',
    ]);
    expect(occurrencesBetween(iso('2025-08-31'), 'semiannual', iso('2025-01-01'), iso('2027-01-01'))).toEqual([
      '2025-08-31',
      '2026-02-28',
      '2026-08-31',
    ]);
  });

  test('weekly renewals are exactly seven days apart across month and year ends', () => {
    expect(occurrencesBetween(iso('2026-12-17'), 'weekly', iso('2026-12-20'), iso('2027-01-15'))).toEqual([
      '2026-12-24',
      '2026-12-31',
      '2027-01-07',
      '2027-01-14',
    ]);
  });

  test('next occurrence is inclusive of the reference day', () => {
    const anchor = iso('2026-01-15');
    expect(nextOccurrence(anchor, 'monthly', iso('2026-10-15'))).toBe('2026-10-15');
    expect(nextOccurrence(anchor, 'monthly', iso('2026-10-16'))).toBe('2026-11-15');
    expect(nextOccurrence(anchor, 'monthly', iso('2026-10-14'))).toBe('2026-10-15');
  });

  test('a future anchor is the next payment; earlier dates are never invented', () => {
    const anchor = iso('2026-12-01');
    expect(nextOccurrence(anchor, 'monthly', iso('2026-10-15'))).toBe('2026-12-01');
    expect(occurrencesBetween(anchor, 'monthly', iso('2026-10-01'), iso('2026-12-31'))).toEqual(['2026-12-01']);
  });

  test('anchors far in the past roll forward correctly', () => {
    expect(nextOccurrence(iso('2015-03-31'), 'monthly', iso('2026-10-15'))).toBe('2026-10-31');
    expect(nextOccurrence(iso('2015-03-31'), 'annual', iso('2026-10-15'))).toBe('2027-03-31');
    expect(nextOccurrence(iso('2015-01-01'), 'weekly', iso('2026-10-15'))).toBe('2026-10-15');
  });

  test('next renewal after a month-end clamp returns to the anchor day', () => {
    // Anchor Jan 31: after Feb 28 the next renewal is Mar 31, not Mar 28.
    expect(nextOccurrence(iso('2026-01-31'), 'monthly', iso('2026-03-01'))).toBe('2026-03-31');
  });

  test('empty and inverted ranges', () => {
    expect(occurrencesBetween(iso('2026-01-15'), 'monthly', iso('2026-02-16'), iso('2026-03-14'))).toEqual([]);
    expect(occurrencesBetween(iso('2026-01-15'), 'monthly', iso('2026-03-01'), iso('2026-02-01'))).toEqual([]);
  });

  test('nextBillingDate uses the subscription schedule', () => {
    const sub = makeSubscription({ anchorDate: iso('2026-02-10'), interval: 'quarterly' });
    expect(nextBillingDate(sub, iso('2026-10-15'))).toBe('2026-11-10');
  });
});

describe('normalized estimates', () => {
  test('monthly and annual estimates per interval', () => {
    expect(monthlyEstimateMinor(1200, 'monthly')).toBe(1200);
    expect(annualEstimateMinor(1200, 'monthly')).toBe(14400);
    expect(annualEstimateMinor(500, 'weekly')).toBe(26000);
    expect(monthlyEstimateMinor(500, 'weekly')).toBeCloseTo(2166.6667, 3);
    expect(monthlyEstimateMinor(3000, 'quarterly')).toBe(1000);
    expect(monthlyEstimateMinor(6000, 'semiannual')).toBe(1000);
    expect(monthlyEstimateMinor(12000, 'annual')).toBe(1000);
  });

  test('monthly estimate is always annual / 12', () => {
    for (const interval of ['weekly', 'monthly', 'quarterly', 'semiannual', 'annual'] as const) {
      expect(monthlyEstimateMinor(1999, interval) * 12).toBeCloseTo(annualEstimateMinor(1999, interval), 6);
    }
  });
});

describe('totals', () => {
  test('exclude paused and cancelled subscriptions', () => {
    const totals = totalsByCurrency([
      makeSubscription({ amountMinor: 1000 }),
      makeSubscription({ amountMinor: 500, status: 'paused' }),
      makeSubscription({ amountMinor: 700, status: 'cancelled' }),
    ]);
    expect(totals).toEqual([{ currency: 'EUR', monthlyMinor: 1000, annualMinor: 12000, activeCount: 1 }]);
  });

  test('never combine different currencies; preferred currency first', () => {
    const totals = totalsByCurrency(
      [
        makeSubscription({ amountMinor: 1000, currency: 'USD' }),
        makeSubscription({ amountMinor: 1500, currency: 'USD' }),
        makeSubscription({ amountMinor: 999, currency: 'EUR' }),
        makeSubscription({ amountMinor: 12000, currency: 'EUR', interval: 'annual' }),
      ],
      'EUR',
    );
    expect(totals.map((t) => t.currency)).toEqual(['EUR', 'USD']);
    expect(totals[0]).toMatchObject({ monthlyMinor: 1999, annualMinor: 23988, activeCount: 2 });
    expect(totals[1]).toMatchObject({ monthlyMinor: 2500, annualMinor: 30000, activeCount: 2 });
  });

  test('duplicate records of the same subscription are counted once', () => {
    const sub = makeSubscription({ amountMinor: 1000 });
    expect(totalsByCurrency([sub, sub])[0]?.monthlyMinor).toBe(1000);
  });

  test('no subscriptions means no totals', () => {
    expect(totalsByCurrency([])).toEqual([]);
  });
});

describe('scheduled payments', () => {
  test('lists active payments in range chronologically without duplicates', () => {
    const weekly = makeSubscription({ name: 'Gym', interval: 'weekly', anchorDate: iso('2026-10-01'), amountMinor: 500 });
    const monthly = makeSubscription({ name: 'Netflix', anchorDate: iso('2026-01-20') });
    const paused = makeSubscription({ name: 'Paused', anchorDate: iso('2026-10-16'), status: 'paused' });
    const payments = scheduledPayments([weekly, monthly, paused, weekly], iso('2026-10-15'), iso('2026-10-31'));
    expect(payments.map((p) => `${p.date} ${p.subscription.name}`)).toEqual([
      '2026-10-15 Gym',
      '2026-10-20 Netflix',
      '2026-10-22 Gym',
      '2026-10-29 Gym',
    ]);
    expect(new Set(payments.map((p) => p.key)).size).toBe(payments.length);
  });

  test('same-day payments are ordered by name', () => {
    const b = makeSubscription({ name: 'Beta', anchorDate: iso('2026-10-20') });
    const a = makeSubscription({ name: 'Alpha', anchorDate: iso('2026-10-20') });
    expect(scheduledPayments([b, a], iso('2026-10-15'), iso('2026-10-20')).map((p) => p.subscription.name)).toEqual([
      'Alpha',
      'Beta',
    ]);
  });

  test('next payment is the earliest across active subscriptions, with no horizon', () => {
    const later = makeSubscription({ name: 'Annual', interval: 'annual', anchorDate: iso('2027-03-01') });
    const cancelled = makeSubscription({ name: 'Old', anchorDate: iso('2026-10-16'), status: 'cancelled' });
    expect(nextPayment([later, cancelled], iso('2026-10-15'))?.date).toBe('2027-03-01');
    expect(nextPayment([cancelled], iso('2026-10-15'))).toBeNull();
  });

  test('sums actual amounts per currency', () => {
    const payments = scheduledPayments(
      [
        makeSubscription({ amountMinor: 1000, anchorDate: iso('2026-10-20') }),
        makeSubscription({ amountMinor: 250, interval: 'weekly', anchorDate: iso('2026-10-16') }),
        makeSubscription({ amountMinor: 999, currency: 'USD', anchorDate: iso('2026-10-25') }),
      ],
      iso('2026-10-15'),
      iso('2026-11-13'),
    );
    expect(sumPaymentsByCurrency(payments, 'EUR')).toEqual([
      { currency: 'EUR', amountMinor: 1000 + 250 * 5, count: 6 },
      { currency: 'USD', amountMinor: 999, count: 1 },
    ]);
  });
});

describe('reactivating a subscription', () => {
  test('restarts billing from the chosen date and keeps everything else', () => {
    const paused = makeSubscription({ status: 'paused', anchorDate: iso('2026-01-31'), notes: 'Family plan' });
    const input = reactivate(paused, iso('2026-10-16'));
    expect(input).toMatchObject({ status: 'active', anchorDate: '2026-10-16', notes: 'Family plan', amountMinor: paused.amountMinor });
    expect(input).not.toHaveProperty('id');
    expect(nextBillingDate(input, iso('2026-10-20'))).toBe('2026-11-16');
  });
});
