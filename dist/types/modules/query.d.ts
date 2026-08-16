export type QueryKey = string | readonly unknown[];
export interface QueryState<T> {
    status: 'idle' | 'pending' | 'success' | 'error';
    data?: T;
    error?: unknown;
    updatedAt: number;
}
export interface QueryOptions<T> {
    staleTime?: number;
    initialData?: T;
}
export declare class QueryClient {
    private records;
    private record;
    getState<T>(key: QueryKey): QueryState<T>;
    subscribe<T>(key: QueryKey, listener: (state: QueryState<T>) => void): () => void;
    fetch<T>(key: QueryKey, loader: () => Promise<T> | T, options?: QueryOptions<T>): Promise<T>;
    setData<T>(key: QueryKey, data: T): void;
    invalidate(key?: QueryKey): void;
    remove(key: QueryKey): void;
    clear(): void;
    private notify;
}
export declare function createQueryClient(): QueryClient;
