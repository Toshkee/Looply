import { iso } from '@/domain/__tests__/fixtures';
import { DEFAULT_SETTINGS } from '@/domain/settings';
import type { SubscriptionInput } from '@/domain/subscription';

import { LATEST_SCHEMA_VERSION, migrate } from '../migrations';
import { createSqliteSettingsRepository, eraseAllData } from '../settingsRepository';
import type { SqlExecutor, SqlValue } from '../sql';
import { createSqliteSubscriptionRepository, SubscriptionNotFoundError } from '../subscriptionRepository';

interface NodeStatement {
  run(...params: SqlValue[]): unknown;
  all(...params: SqlValue[]): unknown[];
  get(...params: SqlValue[]): unknown;
}
interface NodeDatabase {
  exec(sql: string): void;
  prepare(sql: string): NodeStatement;
}

/** In-memory SQLite from Node itself, adapted to the app's executor interface. */
function createTestDatabase(): SqlExecutor {
  // Node's built-in SQLite (tests only); the project ships no Node type definitions, so it is typed locally.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { DatabaseSync } = require('node:sqlite') as { DatabaseSync: new (path: string) => NodeDatabase };
  const db = new DatabaseSync(':memory:');
  return {
    execAsync: async (sql) => db.exec(sql),
    runAsync: async (sql, params) => db.prepare(sql).run(...params),
    getAllAsync: async <T,>(sql: string, params: SqlValue[]) => db.prepare(sql).all(...params) as T[],
    getFirstAsync: async <T,>(sql: string, params: SqlValue[]) => (db.prepare(sql).get(...params) as T | undefined) ?? null,
    withTransactionAsync: async (task) => {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (error) {
        db.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

const input: SubscriptionInput = {
  name: 'Netflix',
  amountMinor: 1299,
  currency: 'EUR',
  interval: 'monthly',
  anchorDate: iso('2026-11-03'),
  category: 'entertainment',
  status: 'active',
  url: 'https://netflix.com',
  notes: null,
  reminderDaysBefore: 1,
};

describe('SQLite storage', () => {
  let db: SqlExecutor;
  beforeEach(async () => {
    db = createTestDatabase();
    await migrate(db);
  });

  test('migrations set the schema version and are idempotent', async () => {
    await migrate(db);
    expect(await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', [])).toEqual({
      user_version: LATEST_SCHEMA_VERSION,
    });
  });

  test('creates, lists, updates and removes subscriptions', async () => {
    const repo = createSqliteSubscriptionRepository(db, () => 'id-1');
    const created = await repo.create(input, new Date(2026, 9, 15, 10));
    expect(await repo.list()).toEqual([created]);

    const updated = await repo.update('id-1', { ...input, amountMinor: 1499, notes: 'Premium' }, new Date(2026, 9, 20, 10));
    expect(updated).toMatchObject({ amountMinor: 1499, notes: 'Premium', createdAt: created.createdAt });
    expect((await repo.list())[0]).toEqual(updated);

    await repo.remove('id-1', new Date(2026, 9, 25, 10));
    expect(await repo.list()).toEqual([]);
  });

  test('records spending snapshots only when spending changes', async () => {
    const repo = createSqliteSubscriptionRepository(db, () => 'id-1');
    await repo.create(input, new Date(2026, 9, 15, 10));
    await repo.update('id-1', { ...input, notes: 'note only' }, new Date(2026, 9, 16, 10));
    await repo.update('id-1', { ...input, status: 'paused' }, new Date(2026, 9, 17, 10));
    await repo.remove('id-1', new Date(2026, 9, 18, 10));
    const snapshots = await repo.listSnapshots();
    expect(snapshots.map((s) => [s.recordedOn, s.status])).toEqual([
      ['2026-10-15', 'active'],
      ['2026-10-17', 'paused'],
      ['2026-10-18', 'deleted'],
    ]);
  });

  test('updating a missing subscription fails clearly', async () => {
    const repo = createSqliteSubscriptionRepository(db);
    await expect(repo.update('missing', input, new Date())).rejects.toBeInstanceOf(SubscriptionNotFoundError);
  });

  test('rows with invalid data are skipped instead of breaking the app', async () => {
    const repo = createSqliteSubscriptionRepository(db, () => 'ok');
    await repo.create(input, new Date());
    await db.runAsync(
      `INSERT INTO subscriptions (id, name, amount_minor, currency, billing_interval, anchor_date, category, status, created_at, updated_at)
       VALUES ('bad', 'Broken', 100, 'XYZ', 'monthly', '2026-02-30', 'other', 'active', '', '')`,
      [],
    );
    expect((await repo.list()).map((s) => s.id)).toEqual(['ok']);
  });

  test('upsertMany restores ids, updates existing rows and records snapshots in one transaction', async () => {
    const repo = createSqliteSubscriptionRepository(db, () => 'local');
    const local = await repo.create(input, new Date(2026, 9, 1, 10));
    const restored = {
      ...input,
      id: 'from-file',
      name: 'Spotify',
      createdAt: '2025-03-01T10:00:00.000Z',
      updatedAt: '2025-04-01T10:00:00.000Z',
    };
    const now = new Date(2026, 9, 15, 10);

    const counts = await repo.upsertMany([{ ...local, amountMinor: 1499 }, restored], now);

    expect(counts).toEqual({ added: 1, updated: 1 });
    const byId = new Map((await repo.list()).map((s) => [s.id, s]));
    expect(byId.get('local')).toMatchObject({ amountMinor: 1499, createdAt: local.createdAt, updatedAt: now.toISOString() });
    expect(byId.get('from-file')).toEqual(restored);
    expect((await repo.listSnapshots()).map((s) => [s.subscriptionId, s.recordedOn, s.amountMinor])).toEqual([
      ['local', '2026-10-01', 1299],
      ['local', '2026-10-15', 1499],
      ['from-file', '2026-10-15', 1299],
    ]);
  });

  test('upsertMany writes nothing when any row fails', async () => {
    const repo = createSqliteSubscriptionRepository(db);
    const valid = { ...input, id: 'a', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    const broken = { ...valid, id: 'b', name: null as unknown as string };
    await expect(repo.upsertMany([valid, broken], new Date())).rejects.toThrow();
    expect(await repo.list()).toEqual([]);
    expect(await repo.listSnapshots()).toEqual([]);
  });

  test('upsertMany repairs an unreadable row with the same id', async () => {
    const repo = createSqliteSubscriptionRepository(db);
    await db.runAsync(
      `INSERT INTO subscriptions (id, name, amount_minor, currency, billing_interval, anchor_date, category, status, created_at, updated_at)
       VALUES ('bad', 'Broken', 100, 'XYZ', 'monthly', '2026-02-30', 'other', 'active', '', '')`,
      [],
    );
    const fixed = { ...input, id: 'bad', createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
    expect(await repo.upsertMany([fixed], new Date(2026, 9, 15, 10))).toEqual({ added: 0, updated: 1 });
    expect(await repo.list()).toEqual([{ ...fixed, updatedAt: new Date(2026, 9, 15, 10).toISOString() }]);
  });

  test('settings persist and fall back to defaults', async () => {
    const settings = createSqliteSettingsRepository(db);
    expect(await settings.load()).toEqual(DEFAULT_SETTINGS);
    await settings.save({ language: 'ru', currency: 'USD', theme: 'dark', onboardingCompleted: true, proUnlocked: true });
    expect(await settings.load()).toMatchObject({
      language: 'ru',
      currency: 'USD',
      theme: 'dark',
      onboardingCompleted: true,
      proUnlocked: true,
    });
    await db.runAsync("UPDATE settings SET value = '\"yes\"' WHERE key = 'proUnlocked'", []);
    expect((await settings.load()).proUnlocked).toBe(false);
    await db.runAsync("UPDATE settings SET value = '\"klingon\"' WHERE key = 'language'", []);
    expect((await settings.load()).language).toBeNull();
  });

  test('erasing removes everything', async () => {
    const repo = createSqliteSubscriptionRepository(db);
    const settings = createSqliteSettingsRepository(db);
    await repo.create(input, new Date());
    await settings.save({ onboardingCompleted: true });
    await eraseAllData(db);
    expect(await repo.list()).toEqual([]);
    expect(await repo.listSnapshots()).toEqual([]);
    expect(await settings.load()).toEqual(DEFAULT_SETTINGS);
  });
});
