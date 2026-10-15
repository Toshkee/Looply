import { parseISODate, todayLocal } from '@/domain/calendarDate';
import { isCurrencyCode } from '@/domain/currency';
import {
  isBillingInterval,
  isCategoryId,
  isSubscriptionStatus,
  type Subscription,
  type SubscriptionInput,
  type SubscriptionSnapshot,
} from '@/domain/subscription';

import type { SqlExecutor, SqlValue } from './sql';

/**
 * Storage contract for subscriptions. The SQLite implementation is the only
 * one today; a synced implementation can replace it behind this interface.
 */
export interface SubscriptionRepository {
  list(): Promise<Subscription[]>;
  listSnapshots(): Promise<SubscriptionSnapshot[]>;
  create(input: SubscriptionInput, now: Date): Promise<Subscription>;
  update(id: string, input: SubscriptionInput, now: Date): Promise<Subscription>;
  remove(id: string, now: Date): Promise<void>;
}

export class SubscriptionNotFoundError extends Error {
  constructor() {
    super('Subscription not found');
    this.name = 'SubscriptionNotFoundError';
  }
}

interface SubscriptionRow {
  id: string;
  name: string;
  amount_minor: number;
  currency: string;
  billing_interval: string;
  anchor_date: string;
  category: string;
  status: string;
  url: string | null;
  notes: string | null;
  reminder_days_before: number | null;
  created_at: string;
  updated_at: string;
}

interface SnapshotRow {
  sequence: number;
  subscription_id: string;
  recorded_on: string;
  amount_minor: number;
  currency: string;
  billing_interval: string;
  status: string;
}

/** Converts a row, rejecting anything that would break calculations. */
function toSubscription(row: SubscriptionRow): Subscription | null {
  const anchorDate = parseISODate(row.anchor_date);
  if (
    !anchorDate ||
    !isCurrencyCode(row.currency) ||
    !isBillingInterval(row.billing_interval) ||
    !isCategoryId(row.category) ||
    !isSubscriptionStatus(row.status) ||
    !Number.isInteger(row.amount_minor) ||
    row.amount_minor < 0
  ) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    amountMinor: row.amount_minor,
    currency: row.currency,
    interval: row.billing_interval,
    anchorDate,
    category: row.category,
    status: row.status,
    url: row.url,
    notes: row.notes,
    reminderDaysBefore: row.reminder_days_before,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toSnapshot(row: SnapshotRow): SubscriptionSnapshot | null {
  const recordedOn = parseISODate(row.recorded_on);
  const status = row.status === 'deleted' || isSubscriptionStatus(row.status) ? row.status : null;
  if (!recordedOn || !status || !isCurrencyCode(row.currency) || !isBillingInterval(row.billing_interval)) return null;
  return {
    sequence: row.sequence,
    subscriptionId: row.subscription_id,
    recordedOn,
    amountMinor: row.amount_minor,
    currency: row.currency,
    interval: row.billing_interval,
    status,
  };
}

let idCounter = 0;

/** Locally unique, sortable-ish identifier; collisions would need the same millisecond and random suffix. */
export function createId(): string {
  idCounter = (idCounter + 1) % 1296;
  const random = Math.floor(Math.random() * 36 ** 6).toString(36).padStart(6, '0');
  return `${Date.now().toString(36)}${idCounter.toString(36).padStart(2, '0')}${random}`;
}

export function createSqliteSubscriptionRepository(
  db: SqlExecutor,
  generateId: () => string = createId,
): SubscriptionRepository {
  const findRow = (id: string) => db.getFirstAsync<SubscriptionRow>('SELECT * FROM subscriptions WHERE id = ?', [id]);

  const recordSnapshot = (
    subscriptionId: string,
    now: Date,
    fields: Pick<Subscription, 'amountMinor' | 'currency' | 'interval'> & { status: SubscriptionSnapshot['status'] },
  ) =>
    db.runAsync(
      `INSERT INTO subscription_snapshots
         (subscription_id, recorded_on, amount_minor, currency, billing_interval, status)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [subscriptionId, todayLocal(now), fields.amountMinor, fields.currency, fields.interval, fields.status],
    );

  const values = (input: SubscriptionInput): SqlValue[] => [
    input.name,
    input.amountMinor,
    input.currency,
    input.interval,
    input.anchorDate,
    input.category,
    input.status,
    input.url,
    input.notes,
    input.reminderDaysBefore,
  ];

  return {
    async list() {
      const rows = await db.getAllAsync<SubscriptionRow>('SELECT * FROM subscriptions ORDER BY name COLLATE NOCASE', []);
      return rows.map(toSubscription).filter((s): s is Subscription => s !== null);
    },

    async listSnapshots() {
      const rows = await db.getAllAsync<SnapshotRow>('SELECT * FROM subscription_snapshots ORDER BY sequence', []);
      return rows.map(toSnapshot).filter((s): s is SubscriptionSnapshot => s !== null);
    },

    async create(input, now) {
      const timestamp = now.toISOString();
      const subscription: Subscription = { ...input, id: generateId(), createdAt: timestamp, updatedAt: timestamp };
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `INSERT INTO subscriptions
             (name, amount_minor, currency, billing_interval, anchor_date, category, status, url, notes,
              reminder_days_before, id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [...values(input), subscription.id, timestamp, timestamp],
        );
        await recordSnapshot(subscription.id, now, input);
      });
      return subscription;
    },

    async update(id, input, now) {
      const existingRow = await findRow(id);
      const existing = existingRow ? toSubscription(existingRow) : null;
      if (!existing) throw new SubscriptionNotFoundError();
      const timestamp = now.toISOString();
      const updated: Subscription = { ...input, id, createdAt: existing.createdAt, updatedAt: timestamp };
      const spendingChanged =
        existing.amountMinor !== input.amountMinor ||
        existing.currency !== input.currency ||
        existing.interval !== input.interval ||
        existing.status !== input.status;
      await db.withTransactionAsync(async () => {
        await db.runAsync(
          `UPDATE subscriptions SET
             name = ?, amount_minor = ?, currency = ?, billing_interval = ?, anchor_date = ?, category = ?,
             status = ?, url = ?, notes = ?, reminder_days_before = ?, updated_at = ?
           WHERE id = ?`,
          [...values(input), timestamp, id],
        );
        if (spendingChanged) await recordSnapshot(id, now, input);
      });
      return updated;
    },

    async remove(id, now) {
      const existingRow = await findRow(id);
      const existing = existingRow ? toSubscription(existingRow) : null;
      if (!existing) return;
      await db.withTransactionAsync(async () => {
        await db.runAsync('DELETE FROM subscriptions WHERE id = ?', [id]);
        await recordSnapshot(id, now, { ...existing, status: 'deleted' });
      });
    },
  };
}
