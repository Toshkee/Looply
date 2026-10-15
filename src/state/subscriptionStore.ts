import { create } from 'zustand';

import type { Subscription, SubscriptionInput, SubscriptionSnapshot, SubscriptionStatus } from '@/domain/subscription';

import { getServices } from './services';

interface SubscriptionState {
  subscriptions: Subscription[];
  snapshots: SubscriptionSnapshot[];
  hydrate(subscriptions: Subscription[], snapshots: SubscriptionSnapshot[]): void;
  create(input: SubscriptionInput): Promise<Subscription>;
  update(id: string, input: SubscriptionInput): Promise<Subscription>;
  setStatus(id: string, status: SubscriptionStatus): Promise<void>;
  remove(id: string): Promise<void>;
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
      const { id: _id, createdAt: _created, updatedAt: _updated, ...input } = current;
      await get().update(id, { ...input, status });
    },

    async remove(id) {
      await getServices().subscriptions.remove(id, new Date());
      set({ subscriptions: get().subscriptions.filter((s) => s.id !== id) });
      await refreshSnapshots();
    },

    clear() {
      set({ subscriptions: [], snapshots: [] });
    },
  };
});

export function useSubscription(id: string | undefined): Subscription | undefined {
  return useSubscriptionStore((state) => (id ? state.subscriptions.find((s) => s.id === id) : undefined));
}
