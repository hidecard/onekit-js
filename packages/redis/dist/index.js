import { randomUUID } from 'node:crypto';
import { createSerializedISRCache } from 'onekit-js/isr';
function normalizePrefix(prefix) {
    if (typeof prefix !== 'string' || prefix.length === 0) {
        throw new TypeError('Redis adapter prefixes must be non-empty strings');
    }
    return prefix;
}
function normalizeLeaseMs(value, fallback) {
    const leaseMs = value ?? fallback;
    if (!Number.isFinite(leaseMs) || leaseMs <= 0) {
        throw new RangeError(`Redis ISR leaseMs must be a finite positive number: ${leaseMs}`);
    }
    return Math.floor(leaseMs);
}
function cacheKey(prefix, path) {
    return `${prefix}${encodeURIComponent(path)}`;
}
/** Adapt a connected node-redis client to OneKit's string KV contract. */
export function createRedisISRStorage(client, options = {}) {
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
            async list(requestedPrefix) {
                const match = `${requestedPrefix}*`;
                const keys = [];
                for await (const key of client.scanIterator({ MATCH: match, COUNT: scanCount })) {
                    if (key.startsWith(requestedPrefix))
                        keys.push(key);
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
export function createRedisISRLock(client, options = {}) {
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
        async acquire(path, lockOptions = {}) {
            if (lockOptions.signal?.aborted)
                return null;
            const key = cacheKey(prefix, path);
            const token = randomUUID();
            const leaseMs = normalizeLeaseMs(lockOptions.leaseMs, defaultLeaseMs);
            for (let attempt = 0; attempt < acquireAttempts; attempt += 1) {
                if (lockOptions.signal?.aborted)
                    return null;
                const result = await client.set(key, token, { NX: true, PX: leaseMs });
                if (result === 'OK' || result === true) {
                    if (lockOptions.signal?.aborted) {
                        await client.eval(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
                        return null;
                    }
                    let released = false;
                    return {
                        async release() {
                            if (released)
                                return;
                            released = true;
                            await client.eval(RELEASE_SCRIPT, { keys: [key], arguments: [token] });
                        },
                    };
                }
            }
            return null;
        },
    };
}
/** Convenience factory returning both the serialized ISR cache and distributed lock. */
export function createRedisISRAdapters(client, options = {}) {
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
//# sourceMappingURL=index.js.map