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
export function createIndexedDBQueryStorage(options: IndexedDBQueryStorageOptions = {}): QueryStorage {
  const databaseName = options.databaseName ?? 'onekit-query-cache';
  const storeName = options.storeName ?? 'queries';
  const version = options.version ?? 1;

  const getIndexedDB = (): IDBFactory | undefined => {
    if (typeof globalThis === 'undefined') return undefined;
    return globalThis.indexedDB;
  };

  const openDatabase = (): Promise<IDBDatabase | undefined> => {
    const indexedDB = getIndexedDB();
    if (!indexedDB) return Promise.resolve(undefined);
    return new Promise((resolve, reject) => {
      let request: IDBOpenDBRequest;
      try {
        request = indexedDB.open(databaseName, version);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = () => {
        if (!request.result.objectStoreNames.contains(storeName)) {
          request.result.createObjectStore(storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB'));
      request.onblocked = () => reject(new Error('IndexedDB upgrade is blocked'));
    });
  };

  const run = <T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> =>
    openDatabase().then(database => {
      if (!database) return undefined;
      return new Promise<T | undefined>((resolve, reject) => {
        let transaction: IDBTransaction;
        let request: IDBRequest<T>;
        try {
          transaction = database.transaction(storeName, mode);
          request = operation(transaction.objectStore(storeName));
        } catch (error) {
          database.close();
          reject(error);
          return;
        }
        let result: T | undefined;
        let settled = false;
        const fail = (error: unknown) => {
          if (settled) return;
          settled = true;
          database.close();
          reject(error);
        };
        request.onsuccess = () => { result = request.result; };
        request.onerror = () => fail(request.error ?? new Error('IndexedDB request failed'));
        transaction.onerror = () => fail(transaction.error ?? new Error('IndexedDB transaction failed'));
        transaction.onabort = () => fail(transaction.error ?? new Error('IndexedDB transaction aborted'));
        transaction.oncomplete = () => {
          if (settled) return;
          settled = true;
          database.close();
          resolve(result);
        };
      });
    });

  return {
    getItem: async (key: string) => (await run<string | null>('readonly', store => store.get(key))) ?? null,
    setItem: async (key: string, value: string) => {
      await run<IDBValidKey>('readwrite', store => store.put(value, key));
    },
    removeItem: async (key: string) => {
      await run<undefined>('readwrite', store => store.delete(key));
    },
  };
}

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

interface QueryRecord<T> {
  state: QueryState<T>;
  promise?: Promise<T>;
  controller?: AbortController;
  loader?: (context?: QueryLoaderContext) => Promise<T> | T;
  options?: QueryOptions<T>;
  listeners: Set<(state: QueryState<T>) => void>;
}

function normalizeKey(key: QueryKey): string {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

function sleep(delay: number, signal: AbortSignal): Promise<void> {
  if (delay <= 0) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, delay);
    const abort = () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException('The operation was aborted', 'AbortError'));
    };
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, { once: true });
  });
}

function createController(signal?: AbortSignal): AbortController {
  const controller = new AbortController();
  if (signal) {
    if (signal.aborted) controller.abort(signal.reason);
    else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }
  return controller;
}

export class QueryClient {
  private records = new Map<string, QueryRecord<unknown>>();
  private readonly options: QueryClientOptions;
  private readonly cleanupListeners: Array<() => void> = [];
  private persistTimer?: ReturnType<typeof setTimeout>;
  private disposed = false;

  constructor(options: QueryClientOptions = {}) {
    this.options = options;
    this.restorePersisted();
    if (typeof window !== 'undefined') {
      if (options.revalidateOnWindowFocus !== false) {
        const onFocus = () => { void this.revalidate('focus'); };
        window.addEventListener('focus', onFocus);
        this.cleanupListeners.push(() => window.removeEventListener('focus', onFocus));
      }
      if (options.revalidateOnReconnect !== false) {
        const onOnline = () => { void this.revalidate('reconnect'); };
        window.addEventListener('online', onOnline);
        this.cleanupListeners.push(() => window.removeEventListener('online', onOnline));
      }
    }
  }

  private record<T>(key: QueryKey, options: QueryOptions<T> = {}): QueryRecord<T> {
    const normalized = normalizeKey(key);
    let record = this.records.get(normalized) as QueryRecord<T> | undefined;
    if (!record) {
      record = {
        state: {
          status: options.initialData === undefined ? 'idle' : 'success',
          data: options.initialData,
          updatedAt: options.initialData === undefined ? 0 : Date.now(),
        },
        listeners: new Set(),
      };
      this.records.set(normalized, record as QueryRecord<unknown>);
    }
    return record;
  }

  getState<T>(key: QueryKey): QueryState<T> {
    return this.record<T>(key).state;
  }

  subscribe<T>(key: QueryKey, listener: (state: QueryState<T>) => void): () => void {
    const record = this.record<T>(key);
    record.listeners.add(listener as (state: QueryState<unknown>) => void);
    return () => record.listeners.delete(listener as (state: QueryState<unknown>) => void);
  }

  async fetch<T>(key: QueryKey, loader: (context?: QueryLoaderContext) => Promise<T> | T, options: QueryOptions<T> = {}): Promise<T> {
    const record = this.record<T>(key, options);
    record.loader = loader;
    record.options = options;
    if (record.promise) return record.promise;
    const isFresh = record.state.status === 'success' && options.staleTime !== undefined
      && Date.now() - record.state.updatedAt < options.staleTime;
    if (isFresh) return record.state.data as T;

    const controller = createController(options.signal);
    record.controller = controller;
    record.state = { ...record.state, status: 'pending', error: undefined };
    this.notify(record);
    const maxRetries = typeof options.retry === 'number' ? Math.max(0, options.retry) : 0;
    const retry = options.retry;
    const delay = options.retryDelay ?? 0;
    record.promise = (async () => {
      let attempt = 0;
      while (true) {
        try {
          if (controller.signal.aborted) throw controller.signal.reason ?? new DOMException('The operation was aborted', 'AbortError');
          const data = await loader({ signal: controller.signal });
          record.state = { status: 'success', data, updatedAt: Date.now() };
          this.notify(record);
          this.schedulePersist();
          return data;
        } catch (error) {
          const canRetry = typeof retry === 'function' ? retry(attempt, error) : attempt < maxRetries;
          if (!controller.signal.aborted && canRetry) {
            attempt += 1;
            const wait = typeof delay === 'function' ? delay(attempt, error) : delay;
            await sleep(wait, controller.signal);
            continue;
          }
          record.state = { ...record.state, status: 'error', error, updatedAt: Date.now() };
          this.notify(record);
          this.schedulePersist();
          throw error;
        }
      }
    })().finally(() => {
      record.promise = undefined;
      record.controller = undefined;
    });
    return record.promise;
  }

  setData<T>(key: QueryKey, data: T): void {
    const record = this.record<T>(key);
    record.state = { status: 'success', data, updatedAt: Date.now() };
    this.notify(record);
    this.schedulePersist();
  }

  getData<T>(key: QueryKey): T | undefined {
    return this.getState<T>(key).data;
  }

  invalidate(key?: QueryKey): void {
    const records = key === undefined
      ? Array.from(this.records.values())
      : [this.records.get(normalizeKey(key))].filter(Boolean) as QueryRecord<unknown>[];
    for (const record of records) {
      record.state = { ...record.state, updatedAt: 0 };
      this.notify(record);
    }
    this.schedulePersist();
  }

  invalidateQueries(key?: QueryKey): void {
    this.invalidate(key);
  }

  cancel(key?: QueryKey): void {
    if (key === undefined) {
      for (const record of this.records.values()) record.controller?.abort();
      return;
    }
    this.records.get(normalizeKey(key))?.controller?.abort();
  }

  async mutate<TData, TVariables, TContext = unknown>(
    variables: TVariables,
    options: MutationOptions<TData, TVariables, TContext>,
  ): Promise<TData> {
    const controller = createController(options.signal);
    const optimistic = options.optimistic;
    const previous = optimistic ? this.getData(optimistic.key) : undefined;
    const context = await options.onMutate?.(variables);
    if (optimistic) this.setData(optimistic.key, optimistic.update(previous, variables));
    let data: TData | undefined;
    let error: unknown;
    try {
      const retry = options.retry;
      const maxRetries = typeof retry === 'number' ? Math.max(0, retry) : 0;
      let attempt = 0;
      while (true) {
        try {
          if (controller.signal.aborted) throw controller.signal.reason ?? new DOMException('The operation was aborted', 'AbortError');
          data = await options.mutationFn(variables, { signal: controller.signal });
          await options.onSuccess?.(data, variables, context);
          return data;
        } catch (caught) {
          error = caught;
          const canRetry = typeof retry === 'function' ? retry(attempt, caught) : attempt < maxRetries;
          if (!controller.signal.aborted && canRetry) {
            attempt += 1;
            const wait = typeof options.retryDelay === 'function' ? options.retryDelay(attempt, caught) : (options.retryDelay ?? 0);
            await sleep(wait, controller.signal);
            continue;
          }
          if (optimistic) {
            const rolledBack = optimistic.rollback
              ? optimistic.rollback(this.getData(optimistic.key), context as TContext, variables)
              : previous;
            this.setData(optimistic.key, rolledBack);
          }
          await options.onError?.(caught, variables, context);
          throw caught;
        }
      }
    } finally {
      await options.onSettled?.(data, error, variables, context);
    }
  }

  remove(key: QueryKey): void {
    this.cancel(key);
    this.records.delete(normalizeKey(key));
    this.schedulePersist();
  }

  clear(): void {
    this.cancel();
    this.records.clear();
    this.schedulePersist();
  }

  /** Re-fetch queries with remembered loaders after focus or reconnect. */
  async revalidate(reason: 'focus' | 'reconnect' | 'manual' = 'manual'): Promise<void> {
    const jobs: Promise<unknown>[] = [];
    for (const record of this.records.values()) {
      if (!record.loader || record.promise) continue;
      const options = record.options ?? {};
      if (options.signal?.aborted) continue;
      jobs.push(this.fetchFromRecord(record, reason));
    }
    await Promise.allSettled(jobs);
  }

  /** Remove browser event listeners and flush the last pending persistence update. */
  dispose(): void {
    this.disposed = true;
    for (const cleanup of this.cleanupListeners.splice(0)) cleanup();
    if (this.persistTimer) {
      clearTimeout(this.persistTimer);
      this.persistTimer = undefined;
      void this.persistNow();
    }
  }

  /** Export settled query states for a trusted SSR-to-client handoff. */
  dehydrate(): DehydratedQueryState {
    return {
      queries: Array.from(this.records.entries())
        .filter(([, record]) => record.state.status === 'success' || record.state.status === 'error')
        .map(([key, record]) => ({ key, state: { ...record.state } })),
    };
  }

  /** Restore dehydrated states without executing loaders or notifying listeners. */
  hydrate(snapshot: DehydratedQueryState): void {
    if (!snapshot || !Array.isArray(snapshot.queries)) return;
    for (const entry of snapshot.queries) {
      if (!entry || typeof entry.key !== 'string' || !entry.state || typeof entry.state !== 'object') continue;
      const state = entry.state as QueryState<unknown>;
      if (!['idle', 'pending', 'success', 'error'].includes(state.status)) continue;
      const record = this.records.get(entry.key) ?? {
        state: { status: 'idle', updatedAt: 0 } as QueryState<unknown>,
        listeners: new Set<(state: QueryState<unknown>) => void>(),
      };
      record.state = { ...state };
      record.promise = undefined;
      record.controller = undefined;
      this.records.set(entry.key, record);
    }
    this.schedulePersist();
  }

  private async fetchFromRecord(record: QueryRecord<unknown>, _reason: 'focus' | 'reconnect' | 'manual'): Promise<unknown> {
    if (!record.loader) return undefined;
    const key = Array.from(this.records.entries()).find(([, value]) => value === record)?.[0];
    if (!key) return undefined;
    return this.fetch(key, record.loader, record.options);
  }

  private restorePersisted(): void {
    const persistence = this.options.persistence;
    if (!persistence) return;
    try {
      const value = persistence.storage.getItem(persistence.key ?? 'onekit-query-cache');
      Promise.resolve(value).then(serialized => {
        if (!serialized || this.disposed) return;
        const snapshot = JSON.parse(serialized) as DehydratedQueryState;
        if (persistence.maxAge !== undefined) {
          const now = Date.now();
          snapshot.queries = snapshot.queries.filter(query => now - query.state.updatedAt <= persistence.maxAge!);
        }
        this.hydrate(snapshot);
      }).catch(() => undefined);
    } catch {
      // Persistence is best-effort and must never break app startup.
    }
  }

  private schedulePersist(): void {
    if (!this.options.persistence || this.disposed) return;
    if (this.persistTimer) return;
    this.persistTimer = setTimeout(() => {
      this.persistTimer = undefined;
      void this.persistNow();
    }, 0);
  }

  private async persistNow(): Promise<void> {
    const persistence = this.options.persistence;
    if (!persistence) return;
    try {
      const serialized = JSON.stringify(this.dehydrate());
      await persistence.storage.setItem(persistence.key ?? 'onekit-query-cache', serialized);
    } catch {
      // Non-serializable query data and storage failures are ignored rather than breaking rendering.
    }
  }

  private notify<T>(record: QueryRecord<T>): void {
    for (const listener of record.listeners) listener(record.state);
  }
}

/**
 * Connect a QueryClient to an application-controlled cross-tab invalidation channel.
 *
 * Only normalized query keys are broadcast; cached data and errors never leave the
 * current tab. The helper is safe when BroadcastChannel is unavailable and accepts
 * a compatible custom channel for tests or other runtimes.
 */
export function createQueryBroadcastSync(client: QueryClient, options: QueryBroadcastSyncOptions = {}): QueryBroadcastSync {
  const channel = options.channel ?? (
    typeof globalThis !== 'undefined' && typeof globalThis.BroadcastChannel === 'function'
      ? new globalThis.BroadcastChannel(options.channelName ?? 'onekit-query-sync')
      : undefined
  );
  const ownedChannel = channel !== undefined && options.channel === undefined;
  const source = `onekit-query-${Math.random().toString(36).slice(2)}`;
  const onMessage = (event: MessageEvent<unknown>) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    const payload = message as { source?: unknown; type?: unknown; key?: unknown };
    if (payload.source === source || payload.type !== 'invalidate') return;
    if (payload.key !== undefined && typeof payload.key !== 'string') return;
    client.invalidate(payload.key as string | undefined);
  };

  channel?.addEventListener('message', onMessage);

  return {
    available: channel !== undefined,
    publishInvalidate(key?: QueryKey): void {
      if (!channel) return;
      try {
        channel.postMessage({
          source,
          type: 'invalidate',
          key: key === undefined ? undefined : normalizeKey(key),
        });
      } catch {
        // Broadcast failures are isolated from application state and rendering.
      }
    },
    dispose(): void {
      channel?.removeEventListener('message', onMessage);
      if (ownedChannel) channel?.close?.();
    },
  };
}

export function createQueryClient(options: QueryClientOptions = {}): QueryClient {
  return new QueryClient(options);
}
