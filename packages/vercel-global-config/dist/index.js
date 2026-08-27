/**
 * Read-only adapter for Vercel Global Config, formerly called Edge Config.
 *
 * The official SDK is intentionally injected instead of imported by this package,
 * which keeps the package edge-safe and lets the application choose the current
 * @vercel/global-config or legacy @vercel/edge-config client. Global Config is
 * optimized for configuration reads; it is not an ISR cache or regeneration lock.
 */
export function createVercelGlobalConfigReader(options) {
    const client = options.createClient(options.connectionString);
    if (!client || typeof client.get !== 'function' || typeof client.getAll !== 'function') {
        throw new TypeError('Vercel Global Config createClient() must return get() and getAll() methods');
    }
    return {
        get: (key) => {
            if (typeof key !== 'string' || key.length === 0) {
                return Promise.reject(new TypeError('Global Config keys must be non-empty strings'));
            }
            return client.get(key);
        },
        getAll: (keys) => {
            if (keys && keys.some(key => typeof key !== 'string' || key.length === 0)) {
                return Promise.reject(new TypeError('Global Config keys must be non-empty strings'));
            }
            return client.getAll(keys);
        },
        ...(client.has ? { has: (key) => client.has(key) } : {}),
        ...(client.digest ? { digest: () => client.digest() } : {}),
    };
}
/** Read one configuration value with an explicit, already-created client. */
export function getVercelGlobalConfigValue(client, key) {
    if (typeof key !== 'string' || key.length === 0) {
        return Promise.reject(new TypeError('Global Config keys must be non-empty strings'));
    }
    return client.get(key);
}
//# sourceMappingURL=index.js.map