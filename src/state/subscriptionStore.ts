import { create } from 'zustand';

import type { ISODate } from '@/domain/calendarDate';
import {
  reactivate,
  toInput,
  type Subscription,
  type SubscriptionInput,
  type SubscriptionSnapshot,
  type SubscriptionStatus,
} from '@/domain/subscription';

import { getServices } from './services';

interface SubscriptionState {
  subscriptions: Subscription[];
  snapshots: SubscriptionSnapshot[];
  hydrate(subscriptions: Subscription[], snapshots: SubscriptionSnapshot[]): void;
  create(input: SubscriptionInput): Promise<Subscription>;
  update(id: string, input: SubscriptionInput): Promise<Subscription>;
  setStatus(id: string, status: SubscriptionStatus): Promise<void>;
  /** Resumes a paused or cancelled subscription from a new next billing date. */
  reactivate(id: string, nextBillingDate: ISODate): Promise<void>;
  remove(id: string): Promise<void>;
  /** Restores subscriptions from an import; same id updates, new id adds. */
  importMany(subscriptions: readonly Subscription[]): Promise<{ added: number; updated: number }>;
  clear(): void;
}

const byName = (a: Subscription, b: Subscription) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });

/**
 * In-memory mirror of stored subscriptions. Every mutation is written to the
 * database first; state changes only after the write succeeds, so the UI never
 * shows data that was not saved.
 */
export const useSubscriptionStore = create<SubscriptionState>((set, get) => {
  const refreshSnapshots = async () => {
    set({ snapshots: await getServices().subscriptions.listSnapshots() });
  };

  return {
    subscriptions: [],
    snapshots: [],

    hydrate(subscriptions, snapshots) {
      set({ subscriptions: [...subscriptions].sort(byName), snapshots });
    },

    async create(input) {
      const created = await getServices().subscriptions.create(input, new Date());
      set({ subscriptions: [...get().subscriptions, created].sort(byName) });
      await refreshSnapshots();
      return created;
    },

    async update(id, input) {
      const updated = await getServices().subscriptions.update(id, input, new Date());
      set({ subscriptions: get().subscriptions.map((s) => (s.id === id ? updated : s)).sort(byName) });
      await refreshSnapshots();
      return updated;
    },

    async setStatus(id, status) {
      const current = get().subscriptions.find((s) => s.id === id);
      if (!current || current.status === status) return;
      await get().update(id, { ...toInput(current), status });
    },

    async reactivate(id, nextBillingDate) {
      const current = get().subscriptions.find((s) => s.id === id);
      if (!current) return;
      await get().update(id, reactivate(current, nextBillingDate));
    },

    async remove(id) {
      await getServices().subscriptions.remove(id, new Date());
      set({ subscriptions: get().subscriptions.filter((s) => s.id !== id) });
      await refreshSnapshots();
    },

    async importMany(subscriptions) {
      const repository = getServices().subscriptions;
      const counts = await repository.upsertMany(subscriptions, new Date());
      const [stored, snapshots] = await Promise.all([repository.list(), repository.listSnapshots()]);
      set({ subscriptions: stored.sort(byName), snapshots });
      return counts;
    },

    clear() {
      set({ subscriptions: [], snapshots: [] });
    },
  };
});

export function useSubscription(id: string | undefined): Subscription | undefined {
  return useSubscriptionStore((state) => (id ? state.subscriptions.find((s) => s.id === id) : undefined));
}
