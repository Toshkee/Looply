import { DEFAULT_LIST_QUERY, filterAndSortSubscriptions, isStatusFilter, type ListQuery } from '../listing';
import { iso, makeSubscription } from './fixtures';

const today = iso('2026-10-15');
const subs = [
  makeSubscription({ name: 'Spotify', amountMinor: 1099, category: 'music', anchorDate: iso('2026-10-25') }),
  makeSubscription({ name: 'Ćevapi klub', amountMinor: 500, interval: 'weekly', category: 'other', anchorDate: iso('2026-10-16') }),
  makeSubscription({ name: 'iCloud+', amountMinor: 9999, interval: 'annual', category: 'cloud', anchorDate: iso('2027-01-02') }),
  makeSubscription({ name: 'Netflix', amountMinor: 1299, status: 'paused', anchorDate: iso('2026-10-17') }),
  makeSubscription({ name: 'Đaci Plus', amountMinor: 300, status: 'cancelled', category: 'education' }),
];

const run = (overrides: Partial<ListQuery>) =>
  filterAndSortSubscriptions(subs, { ...DEFAULT_LIST_QUERY, ...overrides }, today).map((s) => s.name);

describe('subscription list', () => {
  test('default: active by next payment, then inactive by name', () => {
    expect(run({})).toEqual(['Ćevapi klub', 'Spotify', 'iCloud+', 'Đaci Plus', 'Netflix']);
  });

  test('search ignores case and diacritics', () => {
    expect(run({ search: 'cevapi' })).toEqual(['Ćevapi klub']);
    expect(run({ search: 'DJACI' })).toEqual(['Đaci Plus']);
    expect(run({ search: 'flix' })).toEqual(['Netflix']);
    expect(run({ search: 'zzz' })).toEqual([]);
  });

  test('filters by status and category', () => {
    expect(run({ status: 'paused' })).toEqual(['Netflix']);
    expect(run({ status: 'active', category: 'cloud' })).toEqual(['iCloud+']);
  });

  test('sorts by name and by normalized monthly amount', () => {
    expect(run({ sort: 'name' })).toEqual(['Ćevapi klub', 'Đaci Plus', 'iCloud+', 'Netflix', 'Spotify']);
    // Weekly 5,00 ≈ 21,67/month beats monthly 12,99, which beats annual 99,99 ≈ 8,33/month.
    expect(run({ sort: 'amount' })).toEqual(['Ćevapi klub', 'Netflix', 'Spotify', 'iCloud+', 'Đaci Plus']);
  });

  test('recognizes status filters passed as route params', () => {
    expect(['all', 'active', 'paused', 'cancelled'].every(isStatusFilter)).toBe(true);
    expect([undefined, '', 'Active', 'deleted', ['active']].some(isStatusFilter)).toBe(false);
  });
});
