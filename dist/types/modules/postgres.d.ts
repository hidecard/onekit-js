import type { DatabaseAdapter } from './server';
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
/**
 * Wraps a pg-compatible pool/client without bundling a PostgreSQL driver.
 * The application owns connection configuration, pooling, and credentials.
 */
export declare function createPostgreSQLAdapter(pool: PostgreSQLPool, options?: PostgreSQLAdapterOptions): DatabaseAdapter;
