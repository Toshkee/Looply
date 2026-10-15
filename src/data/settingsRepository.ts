import { parseSettings, type AppSettings } from '@/domain/settings';

import type { SqlExecutor } from './sql';

export interface SettingsRepository {
  load(): Promise<AppSettings>;
  save(patch: Partial<AppSettings>): Promise<void>;
}

/** Settings are stored one JSON-encoded value per key, so new settings need no migration. */
export function createSqliteSettingsRepository(db: SqlExecutor): SettingsRepository {
  return {
    async load() {
      const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings', []);
      const raw: Record<string, unknown> = {};
      for (const { key, value } of rows) {
        try {
          raw[key] = JSON.parse(value);
        } catch {
          // A corrupt value falls back to its default.
        }
      }
      return parseSettings(raw);
    },

    async save(patch) {
      const entries = Object.entries(patch).filter(([, value]) => value !== undefined);
      if (entries.length === 0) return;
      await db.withTransactionAsync(async () => {
        for (const [key, value] of entries) {
          await db.runAsync(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
            [key, JSON.stringify(value)],
          );
        }
      });
    },
  };
}

/** Erases every subscription, all history and all settings. */
export async function eraseAllData(db: SqlExecutor): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM subscriptions', []);
    await db.runAsync('DELETE FROM subscription_snapshots', []);
    await db.runAsync('DELETE FROM settings', []);
  });
}
