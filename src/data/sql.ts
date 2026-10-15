/**
 * The slice of a SQLite connection the repositories need. `expo-sqlite`'s
 * database satisfies it on device; tests plug in Node's built-in SQLite, and
 * a future sync layer can wrap it without touching the repositories.
 */
export type SqlValue = string | number | null;

export interface SqlExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params: SqlValue[]): Promise<unknown>;
  getAllAsync<T>(sql: string, params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
