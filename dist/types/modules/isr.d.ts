import { type SSRContext } from './ssr';
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
export type ISRRevalidationEvent = {
    type: 'hit' | 'miss' | 'stale';
    path: string;
    tags: readonly string[];
} | {
    type: 'revalidation-start';
    path: string;
    tags: readonly string[];
} | {
    type: 'revalidation-success';
    path: string;
    tags: readonly string[];
    generatedAt: number;
} | {
    type: 'revalidation-failure';
    path: string;
    error: unknown;
} | {
    type: 'lock-unavailable';
    path: string;
};
export declare class ISRLockUnavailableError extends Error {
    constructor(path: string);
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
/** Adapt an edge KV/Redis-like string store to ISR without choosing a vendor or storage lifetime. */
export declare function createSerializedISRCache(storage: ISRKeyValueStore, options?: SerializedISRCacheOptions): ISRCache;
export declare function createMemoryISRCache(): MemoryISRCache;
/**
 * Adapter-neutral stale-while-revalidate page renderer.
 * The cache stores complete rendered pages; applications own persistence and distribution.
 */
export declare class ISRRenderer {
    private readonly options;
    private readonly inFlight;
    private readonly knownPaths;
    constructor(options: ISRRendererOptions);
    private get;
    private discoverKnownPaths;
    private regenerate;
    private regenerateWithLock;
    private emit;
    private renderEntry;
    renderISRPage(path: string, options?: ISRRenderOptions): Promise<ISRPageResult>;
    revalidatePath(path: string, options?: ISRRenderOptions): Promise<ISRPageEntry>;
    invalidateTag(tag: string): Promise<void>;
    revalidateTag(tag: string): Promise<readonly ISRPageEntry[]>;
    invalidatePath(path: string): Promise<void>;
    clear(): Promise<void>;
}
export declare function createISRRenderer(options: ISRRendererOptions): ISRRenderer;
