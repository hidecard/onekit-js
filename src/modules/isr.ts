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

export interface ISRPageResult extends ISRPageEntry {
  status: 'hit' | 'miss' | 'stale';
  /** Background regeneration for a stale response, when one was scheduled. */
  revalidation?: Promise<ISRPageEntry>;
}

export interface ISRRendererOptions {
  cache: ISRCache;
  /** Milliseconds that a generated page remains fresh. Defaults to 0. */
  revalidate?: number | ((path: string) => number);
  /** Static or path-derived cache tags shared with QueryClient. */
  tags?: readonly string[] | ((path: string) => readonly string[]);
  /** Application-owned path renderer. */
  render: (context: PrerenderRenderContext) => PrerenderValue | Promise<PrerenderValue>;
  /** Optional query cache whose matching tags are invalidated/revalidated together. */
  queryClient?: QueryClient;
}

export interface MemoryISRCache extends ISRCache {
  entries(): readonly ISRPageEntry[];
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
    const promise = this.renderEntry(path, signal).finally(() => this.inFlight.delete(path));
    this.inFlight.set(path, promise);
    return promise;
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
      return { ...entry, status: 'miss' };
    }
    const isFresh = cached.revalidate > 0 && Date.now() - cached.generatedAt < cached.revalidate;
    if (isFresh) return { ...cached, status: 'hit' };
    const revalidation = this.regenerate(normalized);
    void revalidation.catch(() => undefined);
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
