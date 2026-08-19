import type {
  DatabaseAdapter,
  DatabaseExecutionResult,
  DatabaseTransaction,
} from './server';

export interface MySQLConnection {
  query(statement: string, parameters?: readonly unknown[]): Promise<unknown>;
  execute(statement: string, parameters?: readonly unknown[]): Promise<unknown>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  release(): void;
}

export interface MySQLPool {
  query(statement: string, parameters?: readonly unknown[]): Promise<unknown>;
  execute(statement: string, parameters?: readonly unknown[]): Promise<unknown>;
  getConnection(): Promise<MySQLConnection>;
  end?(): Promise<void>;
}

function rowsFrom(result: unknown): unknown {
  return Array.isArray(result) ? result[0] : result;
}

function mapRows<T>(result: unknown): readonly T[] {
  const rows = rowsFrom(result);
  return Array.isArray(rows) ? rows as readonly T[] : [];
}

function mapExecution(result: unknown): DatabaseExecutionResult {
  const metadata = Array.isArray(result) ? result[0] as Record<string, unknown> : result as Record<string, unknown>;
  const affectedRows = Number(metadata?.affectedRows ?? 0);
  const insertId = metadata?.insertId;
  return {
    affectedRows: Number.isFinite(affectedRows) ? affectedRows : 0,
    ...(typeof insertId === 'string' || typeof insertId === 'number' ? { insertId } : {}),
  };
}

function createTransaction(connection: MySQLConnection): DatabaseTransaction {
  return {
    async query<T>(statement: string, parameters?: readonly unknown[]) {
      return mapRows<T>(await connection.query(statement, parameters));
    },
    async execute(statement: string, parameters?: readonly unknown[]) {
      return mapExecution(await connection.execute(statement, parameters));
    },
  };
}

/** Creates an optional mysql2-compatible DatabaseAdapter without bundling a MySQL driver. */
export function createMySQLAdapter(pool: MySQLPool): DatabaseAdapter {
  return {
    async query<T>(statement: string, parameters?: readonly unknown[]) {
      return mapRows<T>(await pool.query(statement, parameters));
    },
    async execute(statement: string, parameters?: readonly unknown[]) {
      return mapExecution(await pool.execute(statement, parameters));
    },
    async transaction<T>(work: (transaction: DatabaseTransaction) => Promise<T>) {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const result = await work(createTransaction(connection));
        await connection.commit();
        return result;
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    },
    async close() {
      await pool.end?.();
    },
  };
}
