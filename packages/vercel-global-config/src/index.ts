export interface VercelGlobalConfigClient {
  get<T = unknown>(key: string): Promise<T | undefined>;
  getAll<T extends Record<string, unknown> = Record<string, unknown>>(keys?: readonly string[]): Promise<T>;
  has?(key: string): Promise<boolean>;
  digest?(): Promise<string>;
}

export interface VercelGlobalConfigSDK {
  createClient(connectionString?: string): VercelGlobalConfigClient;
}

export interface VercelGlobalConfigReaderOptions {
  /** Inject the official @vercel/global-config createClient function. */
  createClient: VercelGlobalConfigSDK['createClient'];
  /** A GLOBAL_CONFIG connection string or a custom connection-string value. */
  connectionString?: string;
}

/**
 * Read-only adapter for Vercel Global Config, formerly called Edge Config.
 *
 * The official SDK is intentionally injected instead of imported by this package,
 * which keeps the package edge-safe and lets the application choose the current
 * @vercel/global-config or legacy @vercel/edge-config client. Global Config is
 * optimized for configuration reads; it is not an ISR cache or regeneration lock.
 */
export function createVercelGlobalConfigReader(
  options: VercelGlobalConfigReaderOptions,
): VercelGlobalConfigClient {
  const client = options.createClient(options.connectionString);
  if (!client || typeof client.get !== 'function' || typeof client.getAll !== 'function') {
    throw new TypeError('Vercel Global Config createClient() must return get() and getAll() methods');
  }
  return {
    get: <T = unknown>(key: string) => {
      if (typeof key !== 'string' || key.length === 0) {
        return Promise.reject(new TypeError('Global Config keys must be non-empty strings'));
      }
      return client.get<T>(key);
    },
    getAll: <T extends Record<string, unknown> = Record<string, unknown>>(keys?: readonly string[]) => {
      if (keys && keys.some(key => typeof key !== 'string' || key.length === 0)) {
        return Promise.reject(new TypeError('Global Config keys must be non-empty strings'));
      }
      return client.getAll<T>(keys);
    },
    ...(client.has ? { has: (key: string) => client.has!(key) } : {}),
    ...(client.digest ? { digest: () => client.digest!() } : {}),
  };
}

/** Read one configuration value with an explicit, already-created client. */
export function getVercelGlobalConfigValue<T = unknown>(
  client: VercelGlobalConfigClient,
  key: string,
): Promise<T | undefined> {
  if (typeof key !== 'string' || key.length === 0) {
    return Promise.reject(new TypeError('Global Config keys must be non-empty strings'));
  }
  return client.get<T>(key);
}

export type { VercelGlobalConfigClient as VercelEdgeConfigClient };
