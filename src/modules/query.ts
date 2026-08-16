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

function normalizeKey(key: QueryKey): string {
  return typeof key === 'string' ? key : JSON.stringify(key);
}

interface QueryRecord<T> {
  state: QueryState<T>;
  promise?: Promise<T>;
  listeners: Set<(state: QueryState<T>) => void>;
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

  async fetch<T>(key: QueryKey, loader: () => Promise<T> | T, options: QueryOptions<T> = {}): Promise<T> {
    const record = this.record<T>(key, options);
    if (record.promise) return record.promise;
    const isFresh = record.state.status === 'success' && options.staleTime !== undefined
      && Date.now() - record.state.updatedAt < options.staleTime;
    if (isFresh) return record.state.data as T;

    record.state = { ...record.state, status: 'pending', error: undefined };
    this.notify(record);
    record.promise = Promise.resolve().then(loader).then(data => {
      record.state = { status: 'success', data, updatedAt: Date.now() };
      this.notify(record);
      return data;
    }).catch(error => {
      record.state = { ...record.state, status: 'error', error, updatedAt: Date.now() };
      this.notify(record);
      throw error;
    }).finally(() => {
      record.promise = undefined;
    });
    return record.promise;
  }

  setData<T>(key: QueryKey, data: T): void {
    const record = this.record<T>(key);
    record.state = { status: 'success', data, updatedAt: Date.now() };
    this.notify(record);
  }

  invalidate(key?: QueryKey): void {
    if (key === undefined) {
      for (const record of this.records.values()) record.state = { ...record.state, updatedAt: 0 };
      return;
    }
    const record = this.records.get(normalizeKey(key));
    if (record) record.state = { ...record.state, updatedAt: 0 };
  }

  remove(key: QueryKey): void {
    this.records.delete(normalizeKey(key));
  }

  clear(): void {
    this.records.clear();
  }

  private notify<T>(record: QueryRecord<T>): void {
    for (const listener of record.listeners) listener(record.state);
  }
}

export function createQueryClient(): QueryClient {
  return new QueryClient();
}
