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
export declare function createVercelGlobalConfigReader(options: VercelGlobalConfigReaderOptions): VercelGlobalConfigClient;
/** Read one configuration value with an explicit, already-created client. */
export declare function getVercelGlobalConfigValue<T = unknown>(client: VercelGlobalConfigClient, key: string): Promise<T | undefined>;
export type { VercelGlobalConfigClient as VercelEdgeConfigClient };
//# sourceMappingURL=index.d.ts.map