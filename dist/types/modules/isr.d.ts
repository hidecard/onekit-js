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
    private renderEntry;
    renderISRPage(path: string, options?: ISRRenderOptions): Promise<ISRPageResult>;
    revalidatePath(path: string, options?: ISRRenderOptions): Promise<ISRPageEntry>;
    invalidateTag(tag: string): Promise<void>;
    revalidateTag(tag: string): Promise<readonly ISRPageEntry[]>;
    invalidatePath(path: string): Promise<void>;
    clear(): Promise<void>;
}
export declare function createISRRenderer(options: ISRRendererOptions): ISRRenderer;
