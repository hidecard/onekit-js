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

interface QueryRecord<T> {
  state: QueryState<T>;
  promise?: Promise<T>;
  controller?: AbortController;
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
  }

  clear(): void {
    this.cancel();
    this.records.clear();
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
  }

  private notify<T>(record: QueryRecord<T>): void {
    for (const listener of record.listeners) listener(record.state);
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient();
}
