import type { ISRCache, ISRCacheLock, ISRKeyValueStore, SerializedISRCacheOptions } from 'onekit-js/isr';
type DenoKvKeyPart = string | number | bigint | boolean;
type DenoKvKey = readonly DenoKvKeyPart[];
export interface DenoKVEntry<T> {
    key: DenoKvKey;
    value: T | null;
    versionstamp: string | null;
}
export interface DenoKVSetOptions {
    expireIn?: number;
}
export interface DenoKVAtomicOperation {
    check(...entries: Array<{
        key: DenoKvKey;
        versionstamp: string | null;
    }>): DenoKVAtomicOperation;
    set(key: DenoKvKey, value: unknown, options?: DenoKVSetOptions): DenoKVAtomicOperation;
    delete(key: DenoKvKey): DenoKVAtomicOperation;
    commit(): Promise<{
        ok: boolean;
        versionstamp: string | null;
    }>;
}
export interface DenoKVClient {
    get<T>(key: DenoKvKey, options?: {
        consistency?: 'strong' | 'eventual';
    }): Promise<DenoKVEntry<T>>;
    set(key: DenoKvKey, value: unknown, options?: DenoKVSetOptions): Promise<{
        versionstamp: string;
    }>;
    delete(key: DenoKvKey): Promise<void>;
    list<T>(selector: {
        prefix: DenoKvKey;
    }, options?: {
        consistency?: 'strong' | 'eventual';
    }): AsyncIterable<DenoKVEntry<T>>;
    atomic(): DenoKVAtomicOperation;
}
export interface DenoKVStorageOptions {
    keyPrefix?: string;
    consistency?: 'strong' | 'eventual';
}
export interface DenoKVLockOptions {
    keyPrefix?: string;
    defaultLeaseMs?: number;
    acquireAttempts?: number;
}
/** Adapt a Deno.Kv-compatible client to OneKit's string KV contract. */
export declare function createDenoKVISRStorage(kv: DenoKVClient, options?: DenoKVStorageOptions): ISRKeyValueStore;
/**
 * Create a Deno KV-backed cross-instance ISR lease.
 *
 * Acquisition is an atomic check-and-set against a null versionstamp and the
 * lease uses Deno KV expiration. Release checks both the observed versionstamp
 * and token, so an expired/replaced lease is never deleted by an old owner.
 */
export declare function createDenoKVISRLock(kv: DenoKVClient, options?: DenoKVLockOptions): ISRCacheLock;
export interface DenoKVISRAdapterOptions {
    cacheKeyPrefix?: string;
    lockKeyPrefix?: string;
    consistency?: 'strong' | 'eventual';
    defaultLeaseMs?: number;
    acquireAttempts?: number;
    cache?: SerializedISRCacheOptions;
}
/** Convenience factory returning both the serialized ISR cache and atomic lock. */
export declare function createDenoKVISRAdapters(kv: DenoKVClient, options?: DenoKVISRAdapterOptions): {
    cache: ISRCache;
    lock: ISRCacheLock;
};
export type { ISRCache, ISRCacheLease, ISRCacheLock, ISRKeyValueStore, ISRLockOptions, ISRPageEntry } from 'onekit-js/isr';
//# sourceMappingURL=index.d.ts.map