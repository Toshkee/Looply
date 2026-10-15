import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrate } from './migrations';
import type { SqlExecutor } from './sql';

const DATABASE_NAME = 'looply.db';

let opening: Promise<SQLiteDatabase> | null = null;

/** Opens (once) and migrates the on-device database. */
export function openAppDatabase(): Promise<SqlExecutor> {
  if (!opening) {
    opening = (async () => {
      const db = await openDatabaseAsync(DATABASE_NAME);
      await db.execAsync('PRAGMA journal_mode = WAL;');
      await migrate(db);
      return db;
    })();
    // A failed open must be retryable from the error screen.
    opening.catch(() => {
      opening = null;
    });
  }
  return opening;
}
