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
  check(...entries: Array<{ key: DenoKvKey; versionstamp: string | null }>): DenoKVAtomicOperation;
  set(key: DenoKvKey, value: unknown, options?: DenoKVSetOptions): DenoKVAtomicOperation;
  delete(key: DenoKvKey): DenoKVAtomicOperation;
  commit(): Promise<{ ok: boolean; versionstamp: string | null }>;
}

export interface DenoKVClient {
  get<T>(key: DenoKvKey, options?: { consistency?: 'strong' | 'eventual' }): Promise<DenoKVEntry<T>>;
  set(key: DenoKvKey, value: unknown, options?: DenoKVSetOptions): Promise<{ versionstamp: string }>;
  delete(key: DenoKvKey): Promise<void>;
  list<T>(selector: { prefix: DenoKvKey }, options?: { consistency?: 'strong' | 'eventual' }): AsyncIterable<DenoKVEntry<T>>;
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

function normalizePrefix(prefix: string): string {
  if (typeof prefix !== 'string' || prefix.length === 0) {
    throw new TypeError('Deno KV adapter prefixes must be non-empty strings');
  }
  return prefix;
}

function normalizeLeaseMs(value: number | undefined, fallback: number): number {
  const leaseMs = value ?? fallback;
  if (!Number.isFinite(leaseMs) || leaseMs <= 0) {
    throw new RangeError(`Deno KV ISR leaseMs must be a finite positive number: ${leaseMs}`);
  }
  return Math.floor(leaseMs);
}

function cacheKey(prefix: string, path: string): string {
  return `${prefix}${encodeURIComponent(path)}`;
}

function toStorageKey(prefix: string, key: string): DenoKvKey {
  return [prefix, key.slice(prefix.length)];
}

/** Adapt a Deno.Kv-compatible client to OneKit's string KV contract. */
export function createDenoKVISRStorage(
  kv: DenoKVClient,
  options: DenoKVStorageOptions = {},
): ISRKeyValueStore {
  const prefix = normalizePrefix(options.keyPrefix ?? 'onekit:isr:');
  return {
    async get(key) {
      const result = await kv.get<string>(toStorageKey(prefix, key), { consistency: options.consistency ?? 'strong' });
      return result.value ?? undefined;
    },
    async put(key, value) {
      await kv.set(toStorageKey(prefix, key), value);
    },
    async delete(key) {
      await kv.delete(toStorageKey(prefix, key));
    },
    async list(requestedPrefix) {
      const keys: string[] = [];
      for await (const entry of kv.list<string>({ prefix: [prefix] }, { consistency: options.consistency ?? 'strong' })) {
        if (typeof entry.key[1] === 'string') {
          const key = `${prefix}${entry.key[1]}`;
          if (key.startsWith(requestedPrefix)) keys.push(key);
        }
      }
      return keys;
    },
  };
}

/**
 * Create a Deno KV-backed cross-instance ISR lease.
 *
 * Acquisition is an atomic check-and-set against a null versionstamp and the
 * lease uses Deno KV expiration. Release checks both the observed versionstamp
 * and token, so an expired/replaced lease is never deleted by an old owner.
 */
export function createDenoKVISRLock(
  kv: DenoKVClient,
  options: DenoKVLockOptions = {},
): ISRCacheLock {
  const prefix = normalizePrefix(options.keyPrefix ?? 'onekit:isr:lock:');
  const defaultLeaseMs = normalizeLeaseMs(options.defaultLeaseMs, 30_000);
  const acquireAttempts = options.acquireAttempts ?? 2;
  if (!Number.isInteger(acquireAttempts) || acquireAttempts <= 0) {
    throw new RangeError(`Deno KV acquireAttempts must be a positive integer: ${acquireAttempts}`);
  }

  return {
    async acquire(path: string, lockOptions: ISRLockOptions = {}): Promise<ISRCacheLease | null> {
      if (lockOptions.signal?.aborted) return null;
      const key: DenoKvKey = [prefix, path];
      const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const leaseMs = normalizeLeaseMs(lockOptions.leaseMs, defaultLeaseMs);
      for (let attempt = 0; attempt < acquireAttempts; attempt += 1) {
        if (lockOptions.signal?.aborted) return null;
        const current = await kv.get<string>(key, { consistency: 'strong' });
        if (current.value !== null) continue;
        const result = await kv.atomic()
          .check({ key, versionstamp: current.versionstamp })
          .set(key, token, { expireIn: leaseMs })
          .commit();
        if (!result.ok) continue;
        if (lockOptions.signal?.aborted) {
          const acquired = await kv.get<string>(key, { consistency: 'strong' });
          if (acquired.value === token && acquired.versionstamp) {
            await kv.atomic().check({ key, versionstamp: acquired.versionstamp }).delete(key).commit();
          }
          return null;
        }
        let released = false;
        return {
          async release() {
            if (released) return;
            released = true;
            const acquired = await kv.get<string>(key, { consistency: 'strong' });
            if (acquired.value !== token || !acquired.versionstamp) return;
            await kv.atomic().check({ key, versionstamp: acquired.versionstamp }).delete(key).commit();
          },
        };
      }
      return null;
    },
  };
}

export interface DenoKVISRAdapterOptions {
  cacheKeyPrefix?: string;
  lockKeyPrefix?: string;
  consistency?: 'strong' | 'eventual';
  defaultLeaseMs?: number;
  acquireAttempts?: number;
  cache?: SerializedISRCacheOptions;
}

/** Convenience factory returning both the serialized ISR cache and atomic lock. */
export function createDenoKVISRAdapters(
  kv: DenoKVClient,
  options: DenoKVISRAdapterOptions = {},
): { cache: ISRCache; lock: ISRCacheLock } {
  return {
    cache: createSerializedISRCache(createDenoKVISRStorage(kv, {
      keyPrefix: options.cacheKeyPrefix ?? options.cache?.prefix ?? 'onekit:isr:',
      consistency: options.consistency,
    }), {
      prefix: options.cache?.prefix ?? options.cacheKeyPrefix ?? 'onekit:isr:',
      serialize: options.cache?.serialize,
      deserialize: options.cache?.deserialize,
    }),
    lock: createDenoKVISRLock(kv, {
      keyPrefix: options.lockKeyPrefix ?? 'onekit:isr:lock:',
      defaultLeaseMs: options.defaultLeaseMs,
      acquireAttempts: options.acquireAttempts,
    }),
  };
}

export type { ISRCache, ISRCacheLease, ISRCacheLock, ISRKeyValueStore, ISRLockOptions, ISRPageEntry } from 'onekit-js/isr';
