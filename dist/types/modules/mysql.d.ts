import type { DatabaseAdapter } from './server';
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
/** Creates an optional mysql2-compatible DatabaseAdapter without bundling a MySQL driver. */
export declare function createMySQLAdapter(pool: MySQLPool): DatabaseAdapter;
