export type QueryKey = string | readonly unknown[];
export interface QueryState<T> {
    status: 'idle' | 'pending' | 'success' | 'error';
    data?: T;
    error?: unknown;
    updatedAt: number;
}
export interface QueryLoaderContext {
    signal: AbortSignal;
}
export interface QueryOptions<T> {
    /** Freshness window in milliseconds. */
    staleTime?: number;
    /** Alias for staleTime used by route/cache policies. */
    revalidate?: number;
    /** Stable application-owned invalidation tags shared by routes and queries. */
    tags?: readonly string[];
    initialData?: T;
    retry?: number | ((attempt: number, error: unknown) => boolean);
    retryDelay?: number | ((attempt: number, error: unknown) => number);
    signal?: AbortSignal;
}
export interface DehydratedQuery {
    key: string;
    state: QueryState<unknown>;
    tags?: readonly string[];
}
export interface DehydratedQueryState {
    queries: readonly DehydratedQuery[];
}
export interface QueryStorage {
    getItem(key: string): string | null | Promise<string | null>;
    setItem(key: string, value: string): void | Promise<void>;
    removeItem?(key: string): void | Promise<void>;
}
export interface IndexedDBQueryStorageOptions {
    databaseName?: string;
    storeName?: string;
    version?: number;
}
/**
 * Create an optional IndexedDB-backed QueryStorage adapter.
 *
 * The adapter is safe to construct during SSR. When IndexedDB is unavailable,
 * reads return null and writes are ignored so QueryClient persistence remains
 * best-effort, matching the behavior of other storage adapters.
 */
export declare function createIndexedDBQueryStorage(options?: IndexedDBQueryStorageOptions): QueryStorage;
export interface QueryBroadcastChannel {
    postMessage(message: unknown): void;
    addEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
    removeEventListener(type: 'message', listener: (event: MessageEvent<unknown>) => void): void;
    close?(): void;
}
export interface QueryBroadcastSyncOptions {
    channelName?: string;
    channel?: QueryBroadcastChannel;
}
export interface QueryBroadcastSync {
    readonly available: boolean;
    publishInvalidate(key?: QueryKey): void;
    publishInvalidateTag(tag: string): void;
    dispose(): void;
}
export interface QueryPersistenceOptions {
    storage: QueryStorage;
    key?: string;
    maxAge?: number;
}
export interface QueryClientOptions {
    persistence?: QueryPersistenceOptions;
    revalidateOnWindowFocus?: boolean;
    revalidateOnReconnect?: boolean;
}
export interface OptimisticUpdate<TVariables, TContext = unknown> {
    key: QueryKey;
    update: (current: unknown, variables: TVariables) => unknown;
    rollback?: (current: unknown, context: TContext, variables: TVariables) => unknown;
}
export interface MutationOptions<TData, TVariables, TContext = unknown> {
    mutationFn: (variables: TVariables, context: QueryLoaderContext) => Promise<TData> | TData;
    optimistic?: OptimisticUpdate<TVariables, TContext>;
    onMutate?: (variables: TVariables) => TContext | Promise<TContext>;
    onSuccess?: (data: TData, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
    onError?: (error: unknown, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
    onSettled?: (data: TData | undefined, error: unknown | undefined, variables: TVariables, context: TContext | undefined) => void | Promise<void>;
    retry?: number | ((attempt: number, error: unknown) => boolean);
    retryDelay?: number | ((attempt: number, error: unknown) => number);
    signal?: AbortSignal;
}
export declare class QueryClient {
    private records;
    private readonly options;
    private readonly cleanupListeners;
    private persistTimer?;
    private disposed;
    constructor(options?: QueryClientOptions);
    private record;
    getState<T>(key: QueryKey): QueryState<T>;
    subscribe<T>(key: QueryKey, listener: (state: QueryState<T>) => void): () => void;
    fetch<T>(key: QueryKey, loader: (context?: QueryLoaderContext) => Promise<T> | T, options?: QueryOptions<T>): Promise<T>;
    setData<T>(key: QueryKey, data: T): void;
    getData<T>(key: QueryKey): T | undefined;
    invalidate(key?: QueryKey): void;
    invalidateQueries(key?: QueryKey): void;
    invalidateTag(tag: string): void;
    invalidateTags(tags: readonly string[]): void;
    revalidateTag(tag: string): Promise<void>;
    cancel(key?: QueryKey): void;
    mutate<TData, TVariables, TContext = unknown>(variables: TVariables, options: MutationOptions<TData, TVariables, TContext>): Promise<TData>;
    remove(key: QueryKey): void;
    clear(): void;
    /** Re-fetch queries with remembered loaders after focus or reconnect. */
    revalidate(reason?: 'focus' | 'reconnect' | 'manual'): Promise<void>;
    /** Remove browser event listeners and flush the last pending persistence update. */
    dispose(): void;
    /** Export settled query states for a trusted SSR-to-client handoff. */
    dehydrate(): DehydratedQueryState;
    /** Restore dehydrated states without executing loaders or notifying listeners. */
    hydrate(snapshot: DehydratedQueryState): void;
    private fetchFromRecord;
    private restorePersisted;
    private schedulePersist;
    private persistNow;
    private notify;
}
/**
 * Connect a QueryClient to an application-controlled cross-tab invalidation channel.
 *
 * Only normalized query keys are broadcast; cached data and errors never leave the
 * current tab. The helper is safe when BroadcastChannel is unavailable and accepts
 * a compatible custom channel for tests or other runtimes.
 */
export declare function createQueryBroadcastSync(client: QueryClient, options?: QueryBroadcastSyncOptions): QueryBroadcastSync;
export declare function createQueryClient(options?: QueryClientOptions): QueryClient;
