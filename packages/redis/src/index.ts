import { randomUUID } from 'node:crypto';
import type {
  ISRCache,
  ISRCacheLease,
  ISRCacheLock,
  ISRKeyValueStore,
  ISRLockOptions,
  ISRPageEntry,
  SerializedISRCacheOptions,
} from 'onekit-js/isr';
import { createSerializedISRCache } from 'onekit-js/isr';

export interface RedisSetOptions {
  NX?: boolean;
  PX?: number;
}

/** The smallest node-redis surface used by this adapter. */
export interface RedisISRClient {
  get(key: string): Promise<string | null | undefined>;
  set(key: string, value: string, options?: RedisSetOptions): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  scanIterator?(options?: { MATCH?: string; COUNT?: number }): AsyncIterable<string>;
  eval?(script: string, options: { keys: string[]; arguments: string[] }): Promise<unknown>;
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

function normalizePrefix(prefix: string): string {
  if (typeof prefix !== 'string' || prefix.length === 0) {
    throw new TypeError('Redis adapter prefixes must be non-empty strings');
  }
  return prefix;
}

function normalizeLeaseMs(value: number | undefined, fallback: number): number {
  const leaseMs = value ?? fallback;
  if (!Number.isFinite(leaseMs) || leaseMs <= 0) {
    throw new RangeError(`Redis ISR leaseMs must be a finite positive number: ${leaseMs}`);
  }
  return Math.floor(leaseMs);
}

function cacheKey(prefix: string, path: string): string {
  return `${prefix}${encodeURIComponent(path)}`;
}

/** Adapt a connected node-redis client to OneKit's string KV contract. */
export function createRedisISRStorage(
  client: RedisISRClient,
  options: RedisISRStorageOptions = {},
): ISRKeyValueStore {
  const prefix = normalizePrefix(options.keyPrefix ?? 'onekit:isr:');
  const scanCount = options.scanCount ?? 250;
  if (!Number.isInteger(scanCount) || scanCount <= 0) {
    throw new RangeError(`Redis scanCount must be a positive integer: ${scanCount}`);
  }
  return {
    async get(key) {
      const value = await client.get(key);
      return value == null ? undefined : value;
    },
    async put(key, value) { await client.set(key, value); },
    async delete(key) { await client.del(key); },
    ...(client.scanIterator ? {
      async list(requestedPrefix: string) {
        const match = `${requestedPrefix}*`;
        const keys: string[] = [];
        for await (const key of client.scanIterator!({ MATCH: match, COUNT: scanCount })) {
          if (key.startsWith(requestedPrefix)) keys.push(key);
        }
        return keys;
      },
    } : {}),
  };
}

const RELEASE_SCRIPT = `
local current = redis.call('GET', KEYS[1])
if current == ARGV[1] then
  return redis.call('DEL', KEYS[1])
end
return 0
`;

/**
 * Create a Redis-backed cross-instance ISR lease.
 *
 * The adapter targets node-redis v5's set({ NX, PX }) and eval({ keys, arguments })
 * shapes. Lease expiry is delegated to Redis; release is token-checked so an old
 * renderer cannot delete a newer owner's lease.
 */
export function createRedisISRLock(
  client: RedisISRClient,
  options: RedisISRLockOptions = {},
): ISRCacheLock {
  const prefix = normalizePrefix(options.keyPrefix ?? 'onekit:isr:lock:');
  const defaultLeaseMs = normalizeLeaseMs(options.defaultLeaseMs, 30_000);
  const acquireAttempts = options.acquireAttempts ?? 2;
  if (!Number.isInteger(acquireAttempts) || acquireAttempts <= 0) {
    throw new RangeError(`Redis acquireAttempts must be a positive integer: ${acquireAttempts}`);
  }
  if (!client.eval) {
    throw new TypeError('Redis ISR lock requires a client with eval() for token-checked release');
  }

  return {
    async acquire(path: string, lockOptions: ISRLockOptions = {}): Promise<ISRCacheLease | null> {
      if (lockOptions.signal?.aborted) return null;
      const key = cacheKey(prefix, path);
      const token = randomUUID();
      const leaseMs = normalizeLeaseMs(lockOptions.leaseMs, defaultLeaseMs);
      for (let attempt = 0; attempt < acquireAttempts; attempt += 1) {
        if (lockOptions.signal?.aborted) return null;
        const result = await client.set(key, token, { NX: true, PX: leaseMs });
        if (result === 'OK' || result === true) {
          if (lockOptions.signal?.aborted) {
            await client.eval!(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
            return null;
          }
          let released = false;
          return {
            async release() {
              if (released) return;
              released = true;
              await client.eval!(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
            },
          };
        }
      }
      return null;
    },
  };
}

export interface RedisISRAdapterOptions {
  cacheKeyPrefix?: string;
  lockKeyPrefix?: string;
  scanCount?: number;
  defaultLeaseMs?: number;
  acquireAttempts?: number;
  cache?: SerializedISRCacheOptions;
}

/** Convenience factory returning both the serialized ISR cache and distributed lock. */
export function createRedisISRAdapters(
  client: RedisISRClient,
  options: RedisISRAdapterOptions = {},
): { cache: ISRCache; lock: ISRCacheLock } {
  return {
    cache: createSerializedISRCache(createRedisISRStorage(client, {
      keyPrefix: options.cacheKeyPrefix ?? options.cache?.prefix ?? 'onekit:isr:',
      scanCount: options.scanCount,
    }), {
      prefix: options.cache?.prefix ?? options.cacheKeyPrefix ?? 'onekit:isr:',
      serialize: options.cache?.serialize,
      deserialize: options.cache?.deserialize,
    }),
    lock: createRedisISRLock(client, {
      keyPrefix: options.lockKeyPrefix ?? 'onekit:isr:lock:',
      defaultLeaseMs: options.defaultLeaseMs,
      acquireAttempts: options.acquireAttempts,
    }),
  };
}

export type { ISRCache, ISRCacheLease, ISRCacheLock, ISRKeyValueStore, ISRLockOptions, ISRPageEntry } from 'onekit-js/isr';
