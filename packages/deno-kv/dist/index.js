import { createSerializedISRCache } from 'onekit-js/isr';
function normalizePrefix(prefix) {
    if (typeof prefix !== 'string' || prefix.length === 0) {
        throw new TypeError('Deno KV adapter prefixes must be non-empty strings');
    }
    return prefix;
}
function normalizeLeaseMs(value, fallback) {
    const leaseMs = value ?? fallback;
    if (!Number.isFinite(leaseMs) || leaseMs <= 0) {
        throw new RangeError(`Deno KV ISR leaseMs must be a finite positive number: ${leaseMs}`);
    }
    return Math.floor(leaseMs);
}
function cacheKey(prefix, path) {
    return `${prefix}${encodeURIComponent(path)}`;
}
function toStorageKey(prefix, key) {
    return [prefix, key.slice(prefix.length)];
}
/** Adapt a Deno.Kv-compatible client to OneKit's string KV contract. */
export function createDenoKVISRStorage(kv, options = {}) {
    const prefix = normalizePrefix(options.keyPrefix ?? 'onekit:isr:');
    return {
        async get(key) {
            const result = await kv.get(toStorageKey(prefix, key), { consistency: options.consistency ?? 'strong' });
            return result.value ?? undefined;
        },
        async put(key, value) {
            await kv.set(toStorageKey(prefix, key), value);
        },
        async delete(key) {
            await kv.delete(toStorageKey(prefix, key));
        },
        async list(requestedPrefix) {
            const keys = [];
            for await (const entry of kv.list({ prefix: [prefix] }, { consistency: options.consistency ?? 'strong' })) {
                if (typeof entry.key[1] === 'string') {
                    const key = `${prefix}${entry.key[1]}`;
                    if (key.startsWith(requestedPrefix))
                        keys.push(key);
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
export function createDenoKVISRLock(kv, options = {}) {
    const prefix = normalizePrefix(options.keyPrefix ?? 'onekit:isr:lock:');
    const defaultLeaseMs = normalizeLeaseMs(options.defaultLeaseMs, 30_000);
    const acquireAttempts = options.acquireAttempts ?? 2;
    if (!Number.isInteger(acquireAttempts) || acquireAttempts <= 0) {
        throw new RangeError(`Deno KV acquireAttempts must be a positive integer: ${acquireAttempts}`);
    }
    return {
        async acquire(path, lockOptions = {}) {
            if (lockOptions.signal?.aborted)
                return null;
            const key = [prefix, path];
            const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
            const leaseMs = normalizeLeaseMs(lockOptions.leaseMs, defaultLeaseMs);
            for (let attempt = 0; attempt < acquireAttempts; attempt += 1) {
                if (lockOptions.signal?.aborted)
                    return null;
                const current = await kv.get(key, { consistency: 'strong' });
                if (current.value !== null)
                    continue;
                const result = await kv.atomic()
                    .check({ key, versionstamp: current.versionstamp })
                    .set(key, token, { expireIn: leaseMs })
                    .commit();
                if (!result.ok)
                    continue;
                if (lockOptions.signal?.aborted) {
                    const acquired = await kv.get(key, { consistency: 'strong' });
                    if (acquired.value === token && acquired.versionstamp) {
                        await kv.atomic().check({ key, versionstamp: acquired.versionstamp }).delete(key).commit();
                    }
                    return null;
                }
                let released = false;
                return {
                    async release() {
                        if (released)
                            return;
                        released = true;
                        const acquired = await kv.get(key, { consistency: 'strong' });
                        if (acquired.value !== token || !acquired.versionstamp)
                            return;
                        await kv.atomic().check({ key, versionstamp: acquired.versionstamp }).delete(key).commit();
                    },
                };
            }
            return null;
        },
    };
}
/** Convenience factory returning both the serialized ISR cache and atomic lock. */
export function createDenoKVISRAdapters(kv, options = {}) {
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
//# sourceMappingURL=index.js.map