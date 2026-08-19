import type {
  DatabaseAdapter,
  DatabaseExecutionResult,
  DatabaseTransaction,
} from './server';

export interface PostgreSQLResult<Row = unknown> {
  rows: readonly Row[];
  rowCount?: number | null;
  command?: string;
  oid?: number;
}

export interface PostgreSQLClient {
  query<Row = unknown>(statement: string, parameters?: readonly unknown[]): Promise<PostgreSQLResult<Row>>;
  release?(): void | Promise<void>;
}

export interface PostgreSQLPool extends PostgreSQLClient {
  connect?(): Promise<PostgreSQLClient>;
  end?(): Promise<void>;
}

export interface PostgreSQLAdapterOptions {
  /** Optional insert-id column returned by INSERT ... RETURNING queries. */
  insertIdColumn?: string;
}

function executionResult(result: PostgreSQLResult, options: PostgreSQLAdapterOptions): DatabaseExecutionResult {
  const row = result.rows[0] as Record<string, unknown> | undefined;
  const insertId = options.insertIdColumn ? row?.[options.insertIdColumn] : undefined;
  return {
    affectedRows: result.rowCount ?? 0,
    ...(typeof insertId === 'number' || typeof insertId === 'string' ? { insertId } : {}),
  };
}

function createTransaction(client: PostgreSQLClient, options: PostgreSQLAdapterOptions): DatabaseTransaction {
  return {
    async query<T>(statement: string, parameters: readonly unknown[] = []): Promise<readonly T[]> {
      const result = await client.query<T>(statement, parameters);
      return result.rows;
    },
    async execute(statement: string, parameters: readonly unknown[] = []): Promise<DatabaseExecutionResult> {
      return executionResult(await client.query(statement, parameters), options);
    },
  };
}

/**
 * Wraps a pg-compatible pool/client without bundling a PostgreSQL driver.
 * The application owns connection configuration, pooling, and credentials.
 */
export function createPostgreSQLAdapter(pool: PostgreSQLPool, options: PostgreSQLAdapterOptions = {}): DatabaseAdapter {
  const queryTransaction = createTransaction(pool, options);
  return {
    query: queryTransaction.query,
    execute: queryTransaction.execute,
    async transaction<T>(work: (transaction: DatabaseTransaction) => Promise<T>): Promise<T> {
      const client = pool.connect ? await pool.connect() : pool;
      const transaction = createTransaction(client, options);
      await client.query('BEGIN');
      try {
        const value = await work(transaction);
        await client.query('COMMIT');
        return value;
      } catch (error) {
        try {
          await client.query('ROLLBACK');
        } catch {
          // Preserve the original transaction failure.
        }
        throw error;
      } finally {
        if (pool.connect) await client.release?.();
      }
    },
    async close() {
      await pool.end?.();
    },
  };
}
