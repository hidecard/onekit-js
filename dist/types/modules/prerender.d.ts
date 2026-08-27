import { type RenderResult, type SSRContext } from './ssr';
import type { VNode } from './vdom';
import type { FileRouteManifest } from './file-routes';
export type PrerenderValue = VNode | string | RenderResult;
export type PrerenderPaths = readonly string[] | (() => readonly string[] | Promise<readonly string[]>);
export interface PrerenderRenderContext {
    path: string;
    signal: AbortSignal;
    manifest?: FileRouteManifest;
}
export interface PrerenderedPage {
    path: string;
    html: string;
    context: SSRContext;
}
export interface PrerenderOptions {
    /** Concrete URL paths selected by the application or build integration. */
    paths: PrerenderPaths;
    /** Application-owned route-to-view renderer. */
    render: (context: PrerenderRenderContext) => PrerenderValue | Promise<PrerenderValue>;
    /** Optional route manifest passed through to the renderer. */
    manifest?: FileRouteManifest;
    /** Optional callback for writing, uploading, or indexing each completed page. */
    onPage?: (page: PrerenderedPage) => void | Promise<void>;
    /** Abort the current and all remaining pages. */
    signal?: AbortSignal;
}
/**
 * Render a finite, application-selected set of concrete paths in deterministic order.
 * The utility is sequential by design so applications control request/cache isolation.
 */
export declare function prerenderRoutes(options: PrerenderOptions): Promise<readonly PrerenderedPage[]>;
