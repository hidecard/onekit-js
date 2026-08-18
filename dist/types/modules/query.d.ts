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
    staleTime?: number;
    initialData?: T;
    retry?: number | ((attempt: number, error: unknown) => boolean);
    retryDelay?: number | ((attempt: number, error: unknown) => number);
    signal?: AbortSignal;
}
export interface DehydratedQuery {
    key: string;
    state: QueryState<unknown>;
}
export interface DehydratedQueryState {
    queries: readonly DehydratedQuery[];
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
    private record;
    getState<T>(key: QueryKey): QueryState<T>;
    subscribe<T>(key: QueryKey, listener: (state: QueryState<T>) => void): () => void;
    fetch<T>(key: QueryKey, loader: (context?: QueryLoaderContext) => Promise<T> | T, options?: QueryOptions<T>): Promise<T>;
    setData<T>(key: QueryKey, data: T): void;
    getData<T>(key: QueryKey): T | undefined;
    invalidate(key?: QueryKey): void;
    invalidateQueries(key?: QueryKey): void;
    cancel(key?: QueryKey): void;
    mutate<TData, TVariables, TContext = unknown>(variables: TVariables, options: MutationOptions<TData, TVariables, TContext>): Promise<TData>;
    remove(key: QueryKey): void;
    clear(): void;
    /** Export settled query states for a trusted SSR-to-client handoff. */
    dehydrate(): DehydratedQueryState;
    /** Restore dehydrated states without executing loaders or notifying listeners. */
    hydrate(snapshot: DehydratedQueryState): void;
    private notify;
}
export declare function createQueryClient(): QueryClient;
