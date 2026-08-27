import type { ISRCache, ISRCacheLock, ISRKeyValueStore, SerializedISRCacheOptions } from 'onekit-js/isr';
export interface RedisSetOptions {
    NX?: boolean;
    PX?: number;
}
/** The smallest node-redis surface used by this adapter. */
export interface RedisISRClient {
    get(key: string): Promise<string | null | undefined>;
    set(key: string, value: string, options?: RedisSetOptions): Promise<unknown>;
    del(...keys: string[]): Promise<unknown>;
    scanIterator?(options?: {
        MATCH?: string;
        COUNT?: number;
    }): AsyncIterable<string>;
    eval?(script: string, options: {
        keys: string[];
        arguments: string[];
    }): Promise<unknown>;
}
export interface RedisISRStorageOptions {
    keyPrefix?: string;
    scanCount?: number;
}
export interface RedisISRLockOptions {
    keyPrefix?: string;
    defaultLeaseMs?: number;
    acquireAttempts?: number;
}
/** Adapt a connected node-redis client to OneKit's string KV contract. */
export declare function createRedisISRStorage(client: RedisISRClient, options?: RedisISRStorageOptions): ISRKeyValueStore;
/**
 * Create a Redis-backed cross-instance ISR lease.
 *
 * The adapter targets node-redis v5's set({ NX, PX }) and eval({ keys, arguments })
 * shapes. Lease expiry is delegated to Redis; release is token-checked so an old
 * renderer cannot delete a newer owner's lease.
 */
export declare function createRedisISRLock(client: RedisISRClient, options?: RedisISRLockOptions): ISRCacheLock;
export interface RedisISRAdapterOptions {
    cacheKeyPrefix?: string;
    lockKeyPrefix?: string;
    scanCount?: number;
    defaultLeaseMs?: number;
    acquireAttempts?: number;
    cache?: SerializedISRCacheOptions;
}
/** Convenience factory returning both the serialized ISR cache and distributed lock. */
export declare function createRedisISRAdapters(client: RedisISRClient, options?: RedisISRAdapterOptions): {
    cache: ISRCache;
    lock: ISRCacheLock;
};
export type { ISRCache, ISRCacheLease, ISRCacheLock, ISRKeyValueStore, ISRLockOptions, ISRPageEntry } from 'onekit-js/isr';
//# sourceMappingURL=index.d.ts.map