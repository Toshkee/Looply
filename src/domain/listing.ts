import { monthlyEstimateMinor, nextBillingDate } from './billing';
import type { ISODate } from './calendarDate';
import { SUBSCRIPTION_STATUSES, type CategoryId, type Subscription, type SubscriptionStatus } from './subscription';

export type StatusFilter = 'all' | SubscriptionStatus;

export function isStatusFilter(value: unknown): value is StatusFilter {
  return value === 'all' || (SUBSCRIPTION_STATUSES as readonly unknown[]).includes(value);
}
export type CategoryFilter = 'all' | CategoryId;
export type SortKey = 'name' | 'amount' | 'nextPayment';

export interface ListQuery {
  search: string;
  status: StatusFilter;
  category: CategoryFilter;
  sort: SortKey;
}

export const DEFAULT_LIST_QUERY: ListQuery = { search: '', status: 'all', category: 'all', sort: 'nextPayment' };

/** Case- and diacritic-insensitive ("cevapi" finds "Ćevapi"). */
function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'dj')
    .replace(/Đ/g, 'Dj')
    .toLocaleLowerCase()
    .trim();
}

export function filterAndSortSubscriptions(
  subscriptions: readonly Subscription[],
  query: ListQuery,
  today: ISODate,
): Subscription[] {
  const search = normalize(query.search);
  const filtered = subscriptions.filter(
    (s) =>
      (query.status === 'all' || s.status === query.status) &&
      (query.category === 'all' || s.category === query.category) &&
      (search === '' || normalize(s.name).includes(search)),
  );
  const byName = (a: Subscription, b: Subscription) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  switch (query.sort) {
    case 'name':
      return filtered.sort(byName);
    case 'amount':
      return filtered.sort(
        (a, b) =>
          monthlyEstimateMinor(b.amountMinor, b.interval) - monthlyEstimateMinor(a.amountMinor, a.interval) || byName(a, b),
      );
    case 'nextPayment':
      // Active subscriptions by upcoming date; paused and cancelled ones last.
      return filtered.sort((a, b) => {
        const aActive = a.status === 'active';
        const bActive = b.status === 'active';
        if (aActive !== bActive) return aActive ? -1 : 1;
        if (!aActive) return byName(a, b);
        return nextBillingDate(a, today).localeCompare(nextBillingDate(b, today)) || byName(a, b);
      });
  }
}

export function isDefaultQuery(query: ListQuery): boolean {
  return query.search.trim() === '' && query.status === 'all' && query.category === 'all';
}
