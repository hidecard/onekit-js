export interface ServerDataContext {
    signal: AbortSignal;
    request?: Request;
}
export interface ServerDataCacheEntry<T> {
    data: T;
    updatedAt: number;
    expiresAt?: number;
}
export interface ServerDataCache {
    get<T>(key: string): ServerDataCacheEntry<T> | undefined | Promise<ServerDataCacheEntry<T> | undefined>;
    set<T>(key: string, entry: ServerDataCacheEntry<T>): void | Promise<void>;
    delete?(key: string): void | Promise<void>;
    clear?(): void | Promise<void>;
}
export interface ServerDataOptions<TInput, TData> {
    load: (input: TInput, context: ServerDataContext) => Promise<TData> | TData;
    key?: (input: TInput) => string;
    cache?: ServerDataCache;
    staleTime?: number;
}
export interface ServerDataResource<TInput, TData> {
    load(input: TInput, options?: {
        request?: Request;
        signal?: AbortSignal;
    }): Promise<TData>;
    invalidate(input?: TInput): Promise<void>;
    clear(): Promise<void>;
}
/**
 * Creates a small server-safe data resource with request deduplication, optional
 * TTL caching, invalidation, and an injectable distributed cache contract.
 */
export declare function createServerData<TInput, TData>(options: ServerDataOptions<TInput, TData>): ServerDataResource<TInput, TData>;
export declare function createMemoryServerDataCache(): ServerDataCache;
