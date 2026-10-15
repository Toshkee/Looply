import type { SqlExecutor } from './sql';

/**
 * Schema migrations, applied in order and tracked with `PRAGMA user_version`.
 * Never edit a released migration: append a new one instead.
 */
export interface Migration {
  version: number;
  statements: string;
}

export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    statements: `
      CREATE TABLE subscriptions (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        amount_minor INTEGER NOT NULL CHECK (amount_minor >= 0),
        currency TEXT NOT NULL,
        billing_interval TEXT NOT NULL,
        anchor_date TEXT NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL,
        url TEXT,
        notes TEXT,
        reminder_days_before INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      -- Spending history: no names or notes, only what drives totals.
      CREATE TABLE subscription_snapshots (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        subscription_id TEXT NOT NULL,
        recorded_on TEXT NOT NULL,
        amount_minor INTEGER NOT NULL,
        currency TEXT NOT NULL,
        billing_interval TEXT NOT NULL,
        status TEXT NOT NULL
      );
      CREATE INDEX idx_snapshots_subscription ON subscription_snapshots (subscription_id, sequence);
      CREATE TABLE settings (
        key TEXT PRIMARY KEY NOT NULL,
        value TEXT NOT NULL
      );
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;

export async function migrate(db: SqlExecutor): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version', []);
  const current = row?.user_version ?? 0;
  if (current > LATEST_SCHEMA_VERSION) {
    throw new Error(`Database schema ${current} is newer than this app supports (${LATEST_SCHEMA_VERSION}).`);
  }
  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      await db.execAsync(migration.statements);
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
  }
}
