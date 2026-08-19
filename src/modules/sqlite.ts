import type {
  DatabaseAdapter,
  DatabaseExecutionResult,
  DatabaseTransaction,
} from './server';

export interface SQLiteStatement {
  all(...parameters: readonly unknown[]): readonly unknown[];
  run(...parameters: readonly unknown[]): { changes?: number; lastInsertRowid?: number | bigint | string };
}

/** Minimal better-sqlite3-compatible handle required by the optional adapter. */
export interface SQLiteDatabaseHandle {
  prepare(statement: string): SQLiteStatement;
  close?(): void | Promise<void>;
}

export interface SQLiteAdapterOptions {
  /** When true, bigint insert IDs are returned as strings for JSON-safe APIs. */
  stringifyBigIntIds?: boolean;
}

function normalizeInsertId(value: number | bigint | string | undefined, stringifyBigIntIds: boolean): number | string | undefined {
  if (typeof value !== 'bigint') return value;
  return stringifyBigIntIds ? value.toString() : Number(value);
}

function createTransaction(handle: SQLiteDatabaseHandle, options: SQLiteAdapterOptions): DatabaseTransaction {
  return {
    async query<T>(statement: string, parameters: readonly unknown[] = []): Promise<readonly T[]> {
      return handle.prepare(statement).all(...parameters) as readonly T[];
    },
    async execute(statement: string, parameters: readonly unknown[] = []): Promise<DatabaseExecutionResult> {
      const result = handle.prepare(statement).run(...parameters);
      return {
        affectedRows: result.changes ?? 0,
        insertId: normalizeInsertId(result.lastInsertRowid, options.stringifyBigIntIds ?? true),
      };
    },
  };
}

/**
 * Wraps a better-sqlite3-compatible handle without bundling or importing a
 * SQLite driver. This keeps the core Fetch/browser build portable while making
 * the Node integration explicit and easy to replace with another driver.
 */
export function createSQLiteAdapter(handle: SQLiteDatabaseHandle, options: SQLiteAdapterOptions = {}): DatabaseAdapter {
  const transaction = createTransaction(handle, options);
  return {
    query: transaction.query,
    execute: transaction.execute,
    async transaction<T>(work: (transaction: DatabaseTransaction) => Promise<T>): Promise<T> {
      await transaction.execute('BEGIN');
      try {
        const value = await work(transaction);
        await transaction.execute('COMMIT');
        return value;
      } catch (error) {
        try {
          await transaction.execute('ROLLBACK');
        } catch {
          // Preserve the original transaction failure.
        }
        throw error;
      }
    },
    async close() {
      await handle.close?.();
    },
  };
}
