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
  load(input: TInput, options?: { request?: Request; signal?: AbortSignal }): Promise<TData>;
  invalidate(input?: TInput): Promise<void>;
  clear(): Promise<void>;
}

function defaultKey<TInput>(input: TInput): string {
  if (typeof input === 'string') return input;
  try {
    return JSON.stringify(input);
  } catch {
    return String(input);
  }
}

function createAbortSignal(signal?: AbortSignal): { signal: AbortSignal; dispose: () => void } {
  const controller = new AbortController();
  if (!signal) return { signal: controller.signal, dispose: () => undefined };
  if (signal.aborted) controller.abort(signal.reason);
  else signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  return { signal: controller.signal, dispose: () => undefined };
}

/**
 * Creates a small server-safe data resource with request deduplication, optional
 * TTL caching, invalidation, and an injectable distributed cache contract.
 */
export function createServerData<TInput, TData>(options: ServerDataOptions<TInput, TData>): ServerDataResource<TInput, TData> {
  const keyFor = options.key ?? defaultKey;
  const pending = new Map<string, Promise<TData>>();
  const localCache = new Map<string, ServerDataCacheEntry<TData>>();
  const cache = options.cache;

  const get = async (key: string): Promise<ServerDataCacheEntry<TData> | undefined> => {
    const external = cache ? await cache.get<TData>(key) : undefined;
    const entry = external ?? localCache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== undefined && entry.expiresAt <= Date.now()) {
      await cache?.delete?.(key);
      localCache.delete(key);
      return undefined;
    }
    return entry;
  };

  return {
    async load(input, requestOptions = {}) {
      const key = keyFor(input);
      const cached = await get(key);
      if (cached && (options.staleTime === undefined || Date.now() - cached.updatedAt < options.staleTime)) return cached.data;
      const existing = pending.get(key);
      if (existing) return existing;

      const { signal, dispose } = createAbortSignal(requestOptions.signal);
      const promise = Promise.resolve(options.load(input, { request: requestOptions.request, signal }))
        .then(async data => {
          const updatedAt = Date.now();
          const entry = {
            data,
            updatedAt,
            expiresAt: options.staleTime === undefined ? undefined : updatedAt + Math.max(0, options.staleTime),
          };
          localCache.set(key, entry);
          await cache?.set(key, entry);
          return data;
        })
        .finally(() => {
          dispose();
          pending.delete(key);
        });
      pending.set(key, promise);
      return promise;
    },
    async invalidate(input) {
      if (input === undefined) {
        localCache.clear();
        await cache?.clear?.();
        return;
      }
      const key = keyFor(input);
      localCache.delete(key);
      await cache?.delete?.(key);
    },
    async clear() {
      pending.clear();
      localCache.clear();
      await cache?.clear?.();
    },
  };
}

export function createMemoryServerDataCache(): ServerDataCache {
  const entries = new Map<string, ServerDataCacheEntry<unknown>>();
  return {
    get: <T>(key: string) => entries.get(key) as ServerDataCacheEntry<T> | undefined,
    set: (key, entry) => { entries.set(key, entry); },
    delete: key => { entries.delete(key); },
    clear: () => { entries.clear(); },
  };
}
