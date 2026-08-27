import { renderToString, type RenderResult, type SSRContext } from './ssr';
import type { VNode } from './vdom';
import type { QueryClient } from './query';
import type { PrerenderRenderContext, PrerenderValue } from './prerender';

export interface ISRPageEntry {
  path: string;
  html: string;
  context: SSRContext;
  generatedAt: number;
  revalidate: number;
  tags: readonly string[];
}

export interface ISRCache {
  get(path: string): ISRPageEntry | undefined | Promise<ISRPageEntry | undefined>;
  set(path: string, entry: ISRPageEntry): void | Promise<void>;
  /** Optional enumeration used by tag invalidation across renderer instances. */
  entries?(): readonly ISRPageEntry[] | Promise<readonly ISRPageEntry[]>;
  delete?(path: string): void | Promise<void>;
  clear?(): void | Promise<void>;
}

export interface ISRRenderOptions {
  /** Optional request cancellation for a synchronous miss or forced regeneration. */
  signal?: AbortSignal;
}

export interface ISRLockOptions {
  signal?: AbortSignal;
  leaseMs?: number;
}

export interface ISRCacheLease {
  release(): void | Promise<void>;
}

/** Adapter contract for cross-instance regeneration exclusion. The adapter owns durability and lease expiry. */
export interface ISRCacheLock {
  acquire(path: string, options?: ISRLockOptions): ISRCacheLease | null | Promise<ISRCacheLease | null>;
}

export type ISRRevalidationEvent =
  | { type: 'hit' | 'miss' | 'stale'; path: string; tags: readonly string[] }
  | { type: 'revalidation-start'; path: string; tags: readonly string[] }
  | { type: 'revalidation-success'; path: string; tags: readonly string[]; generatedAt: number }
  | { type: 'revalidation-failure'; path: string; error: unknown }
  | { type: 'lock-unavailable'; path: string };

export class ISRLockUnavailableError extends Error {
  constructor(path: string) {
    super(`ISR regeneration lock is unavailable for ${path}`);
    this.name = 'ISRLockUnavailableError';
  }
}

export interface ISRPageResult extends ISRPageEntry {
  status: 'hit' | 'miss' | 'stale';
  /** Background regeneration for a stale response, when one was scheduled. */
  revalidation?: Promise<ISRPageEntry>;
}

export interface ISRRendererOptions {
  cache: ISRCache;
  /** Optional cross-instance lock; local single-flight remains active even without it. */
  lock?: ISRCacheLock;
  /** Lease duration requested from the lock adapter. The adapter may cap or ignore it. */
  lockLeaseMs?: number;
  /** Milliseconds that a generated page remains fresh. Defaults to 0. */
  revalidate?: number | ((path: string) => number);
  /** Static or path-derived cache tags shared with QueryClient. */
  tags?: readonly string[] | ((path: string) => readonly string[]);
  /** Application-owned path renderer. */
  render: (context: PrerenderRenderContext) => PrerenderValue | Promise<PrerenderValue>;
  /** Optional query cache whose matching tags are invalidated/revalidated together. */
  queryClient?: QueryClient;
  /** Register stale refreshes with a platform lifecycle hook such as `waitUntil()`. */
  scheduleRevalidation?: (promise: Promise<ISRPageEntry>, path: string) => void;
  /** Structured lifecycle events for logs, traces, metrics, and diagnostics. */
  onEvent?: (event: ISRRevalidationEvent) => void;
}

export interface MemoryISRCache extends ISRCache {
  entries(): readonly ISRPageEntry[];
}

export interface ISRKeyValueStore {
  get(key: string): string | undefined | Promise<string | undefined>;
  put(key: string, value: string): void | Promise<void>;
  delete?(key: string): void | Promise<void>;
  list?(prefix: string): readonly string[] | Promise<readonly string[]>;
}

export interface SerializedISRCacheOptions {
  prefix?: string;
  serialize?: (entry: ISRPageEntry) => string | Promise<string>;
  deserialize?: (value: string) => ISRPageEntry | undefined | Promise<ISRPageEntry | undefined>;
}

function normalizePath(path: string): string {
  if (typeof path !== 'string' || !path.startsWith('/') || path.includes('\\') || path.includes('\0')) {
    throw new TypeError(`ISR paths must be absolute URL paths: ${String(path)}`);
  }
  const pathname = path.split(/[?#]/, 1)[0] || '/';
  if (pathname.split('/').some(segment => segment === '.' || segment === '..')) {
    throw new TypeError(`ISR paths cannot contain traversal segments: ${path}`);
  }
  return path;
}

function cacheKey(prefix: string, path: string): string {
  return `${prefix}${encodeURIComponent(path)}`;
}

function defaultDeserialize(value: string): ISRPageEntry | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== 'object') return undefined;
    const candidate = parsed as Partial<ISRPageEntry>;
    if (typeof candidate.path !== 'string' || typeof candidate.html !== 'string'
      || typeof candidate.generatedAt !== 'number' || !Number.isFinite(candidate.generatedAt)
      || typeof candidate.revalidate !== 'number' || !Number.isFinite(candidate.revalidate)
      || !Array.isArray(candidate.tags) || !candidate.tags.every(tag => typeof tag === 'string')) return undefined;
    normalizePath(candidate.path);
    return {
      path: candidate.path,
      html: candidate.html,
      context: candidate.context ?? {},
      generatedAt: candidate.generatedAt,
      revalidate: candidate.revalidate,
      tags: [...candidate.tags],
    };
  } catch {
    return undefined;
  }
}

/** Adapt an edge KV/Redis-like string store to ISR without choosing a vendor or storage lifetime. */
export function createSerializedISRCache(
  storage: ISRKeyValueStore,
  options: SerializedISRCacheOptions = {},
): ISRCache {
  const prefix = options.prefix ?? 'onekit:isr:';
  const serialize = options.serialize ?? ((entry: ISRPageEntry) => JSON.stringify(entry));
  const deserialize = options.deserialize ?? defaultDeserialize;
  return {
    async get(path) {
      const value = await storage.get(cacheKey(prefix, normalizePath(path)));
      return value === undefined ? undefined : await deserialize(value);
    },
    async set(path, entry) {
      await storage.put(cacheKey(prefix, normalizePath(path)), await serialize(entry));
    },
    async delete(path) {
      await storage.delete?.(cacheKey(prefix, normalizePath(path)));
    },
    async clear() {
      if (!storage.list || !storage.delete) return;
      const keys = await storage.list(prefix);
      await Promise.all(keys.map(key => storage.delete!(key)));
    },
    ...(storage.list ? {
      async entries() {
        const keys = await storage.list!(prefix);
        const values = await Promise.all(keys.map(key => storage.get(key)));
        const entries: ISRPageEntry[] = [];
        for (const value of values) {
          if (value === undefined) continue;
          const entry = await deserialize(value);
          if (entry) entries.push(entry);
        }
        return entries;
      },
    } : {}),
  };
}

function abortError(signal: AbortSignal): unknown {
  if (signal.reason !== undefined) return signal.reason;
  if (typeof DOMException === 'function') return new DOMException('The ISR operation was aborted', 'AbortError');
  return new Error('The ISR operation was aborted');
}

function isRenderResult(value: PrerenderValue): value is RenderResult {
  return Boolean(value && typeof value === 'object' && 'html' in value && typeof value.html === 'string' && 'context' in value);
}

function normalizeRenderValue(value: PrerenderValue): RenderResult {
  if (typeof value === 'string') return renderToString(value);
  if (isRenderResult(value)) return value;
  return renderToString(value as VNode);
}

function boundedRevalidate(value: number | undefined): number {
  if (value === undefined) return 0;
  if (!Number.isFinite(value) || value < 0) throw new RangeError(`ISR revalidate must be a finite non-negative number: ${value}`);
  return value;
}

function resolveTags(tags: ISRRendererOptions['tags'], path: string): readonly string[] {
  const values = typeof tags === 'function' ? tags(path) : tags ?? [];
  return [...new Set(values.filter(tag => typeof tag === 'string' && tag.length > 0))];
}

export function createMemoryISRCache(): MemoryISRCache {
  const entries = new Map<string, ISRPageEntry>();
  return {
    get: path => entries.get(path),
    set: (path, entry) => { entries.set(path, entry); },
    delete: path => { entries.delete(path); },
    clear: () => { entries.clear(); },
    entries: () => [...entries.values()],
  };
}

/**
 * Adapter-neutral stale-while-revalidate page renderer.
 * The cache stores complete rendered pages; applications own persistence and distribution.
 */
export class ISRRenderer {
  private readonly options: ISRRendererOptions;
  private readonly inFlight = new Map<string, Promise<ISRPageEntry>>();
  private readonly knownPaths = new Set<string>();

  constructor(options: ISRRendererOptions) {
    this.options = options;
  }

  private async get(path: string): Promise<ISRPageEntry | undefined> {
    const entry = await this.options.cache.get(path);
    if (entry) this.knownPaths.add(path);
    return entry;
  }

  private async discoverKnownPaths(): Promise<void> {
    const entries = await this.options.cache.entries?.();
    for (const entry of entries ?? []) this.knownPaths.add(entry.path);
  }

  private async regenerate(path: string, signal?: AbortSignal): Promise<ISRPageEntry> {
    const existing = this.inFlight.get(path);
    if (existing) return existing;
    const promise = this.regenerateWithLock(path, signal).finally(() => this.inFlight.delete(path));
    this.inFlight.set(path, promise);
    return promise;
  }

  private async regenerateWithLock(path: string, signal?: AbortSignal): Promise<ISRPageEntry> {
    const lease = this.options.lock
      ? await this.options.lock.acquire(path, { signal, leaseMs: this.options.lockLeaseMs })
      : null;
    if (this.options.lock && !lease) {
      this.emit({ type: 'lock-unavailable', path });
      throw new ISRLockUnavailableError(path);
    }
    this.emit({ type: 'revalidation-start', path, tags: resolveTags(this.options.tags, path) });
    try {
      const entry = await this.renderEntry(path, signal);
      this.emit({ type: 'revalidation-success', path, tags: entry.tags, generatedAt: entry.generatedAt });
      return entry;
    } catch (error) {
      this.emit({ type: 'revalidation-failure', path, error });
      throw error;
    } finally {
      await lease?.release();
    }
  }

  private emit(event: ISRRevalidationEvent): void {
    try {
      this.options.onEvent?.(event);
    } catch {
      // Diagnostics must never break page rendering or cache correctness.
    }
  }

  private async renderEntry(path: string, signal?: AbortSignal): Promise<ISRPageEntry> {
    if (signal?.aborted) throw abortError(signal);
    const value = await this.options.render({ path, signal: signal ?? new AbortController().signal });
    if (signal?.aborted) throw abortError(signal);
    const result = normalizeRenderValue(value);
    const revalidate = boundedRevalidate(typeof this.options.revalidate === 'function'
      ? this.options.revalidate(path)
      : this.options.revalidate);
    const entry: ISRPageEntry = {
      path,
      html: result.html,
      context: result.context,
      generatedAt: Date.now(),
      revalidate,
      tags: resolveTags(this.options.tags, path),
    };
    await this.options.cache.set(path, entry);
    this.knownPaths.add(path);
    return entry;
  }

  async renderISRPage(path: string, options: ISRRenderOptions = {}): Promise<ISRPageResult> {
    const normalized = normalizePath(path);
    const cached = await this.get(normalized);
    if (!cached) {
      const entry = await this.regenerate(normalized, options.signal);
      this.emit({ type: 'miss', path: normalized, tags: entry.tags });
      return { ...entry, status: 'miss' };
    }
    const isFresh = cached.revalidate > 0 && Date.now() - cached.generatedAt < cached.revalidate;
    if (isFresh) {
      this.emit({ type: 'hit', path: normalized, tags: cached.tags });
      return { ...cached, status: 'hit' };
    }
    const revalidation = this.regenerate(normalized);
    void revalidation.catch(() => undefined);
    this.options.scheduleRevalidation?.(revalidation, normalized);
    this.emit({ type: 'stale', path: normalized, tags: cached.tags });
    return { ...cached, status: 'stale', revalidation };
  }

  async revalidatePath(path: string, options: ISRRenderOptions = {}): Promise<ISRPageEntry> {
    return this.regenerate(normalizePath(path), options.signal);
  }

  async invalidateTag(tag: string): Promise<void> {
    if (!tag) return;
    await this.discoverKnownPaths();
    this.options.queryClient?.invalidateTag(tag);
    for (const path of this.knownPaths) {
      const entry = await this.get(path);
      if (!entry || !entry.tags.includes(tag)) continue;
      await this.options.cache.set(path, { ...entry, generatedAt: 0 });
    }
  }

  async revalidateTag(tag: string): Promise<readonly ISRPageEntry[]> {
    if (!tag) return [];
    await this.invalidateTag(tag);
    await this.options.queryClient?.revalidateTag(tag);
    const paths: string[] = [];
    for (const path of this.knownPaths) {
      const entry = await this.get(path);
      if (entry?.tags.includes(tag)) paths.push(path);
    }
    return Promise.all(paths.map(path => this.revalidatePath(path)));
  }

  async invalidatePath(path: string): Promise<void> {
    const normalized = normalizePath(path);
    const entry = await this.get(normalized);
    if (entry) await this.options.cache.set(normalized, { ...entry, generatedAt: 0 });
  }

  async clear(): Promise<void> {
    await this.options.cache.clear?.();
    this.knownPaths.clear();
    this.inFlight.clear();
  }
}

export function createISRRenderer(options: ISRRendererOptions): ISRRenderer {
  return new ISRRenderer(options);
}
