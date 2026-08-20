import type { DatabaseAdapter } from './server';
export interface SQLiteStatement {
    all(...parameters: readonly unknown[]): readonly unknown[];
    run(...parameters: readonly unknown[]): {
        changes?: number;
        lastInsertRowid?: number | bigint | string;
    };
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
/**
 * Wraps a better-sqlite3-compatible handle without bundling or importing a
 * SQLite driver. This keeps the core Fetch/browser build portable while making
 * the Node integration explicit and easy to replace with another driver.
 */
export declare function createSQLiteAdapter(handle: SQLiteDatabaseHandle, options?: SQLiteAdapterOptions): DatabaseAdapter;
