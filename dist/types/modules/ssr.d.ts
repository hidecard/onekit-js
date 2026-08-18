import { VNode } from './vdom';
export interface SSRContext {
    head?: string[];
    body?: string[];
    styles?: string[];
    scripts?: string[];
    meta?: Record<string, string>;
}
export interface RenderResult {
    html: string;
    context: SSRContext;
}
type AsyncVNode = VNode | string | PromiseLike<VNode | string> | StreamingBoundary;
export interface StreamingBoundaryOptions {
    id?: string;
}
/** A progressive SSR boundary that sends fallback markup first and resolved markup later. */
export interface StreamingBoundary {
    readonly __onekitStreamingBoundary: true;
    readonly id: string;
    readonly fallback: VNode | string;
    readonly content: AsyncVNode;
}
export declare function createStreamingBoundary(content: AsyncVNode, fallback: VNode | string, options?: StreamingBoundaryOptions): StreamingBoundary;
export declare function renderToString(vnode: VNode | string, context?: SSRContext): RenderResult;
export interface HydrationMismatch {
    path: string;
    kind: 'tag' | 'text' | 'missing' | 'unexpected' | 'attribute';
    expected: string;
    actual: string;
}
export interface HydrationOptions {
    /** Receive each mismatch as soon as the hydration walk completes. */
    onMismatch?: (mismatch: HydrationMismatch) => void;
    /** Throw after collecting mismatches instead of continuing silently. */
    throwOnMismatch?: boolean;
}
export declare class HydrationMismatchError extends Error {
    readonly mismatches: readonly HydrationMismatch[];
    constructor(mismatches: readonly HydrationMismatch[]);
}
export interface HydrationResult {
    mismatches: HydrationMismatch[];
    hasMismatch: boolean;
    firstMismatch?: HydrationMismatch;
    dispose: () => void;
}
export declare function hydrate(rootElement: Element, vnode: VNode, options?: HydrationOptions): HydrationResult;
export interface StreamingRenderOptions {
    signal?: AbortSignal;
    /** Receive the original rendering error before the stream is aborted. */
    onError?: (error: unknown) => void;
}
export declare class StreamingRenderer {
    private context;
    constructor(context?: SSRContext);
    renderToStream(vnode: AsyncVNode, options?: StreamingRenderOptions): Promise<ReadableStream<string>>;
    private renderAsync;
    private renderVNodeAsync;
    private renderVNodeToStringAsync;
    getContext(): SSRContext;
}
/** Apply a resolved boundary payload emitted by `StreamingRenderer` to a hydrated shell. */
export declare function resumeStreamingBoundary(root: ParentNode, boundaryId: string, html: string): boolean;
/** Parse one streamed boundary chunk and continue the matching client shell. */
export declare function resumeStreamingBoundaryChunk(root: ParentNode, chunk: string): boolean;
export declare function createSSRContext(): SSRContext;
export declare function addToHead(context: SSRContext, content: string): void;
export declare function addToBody(context: SSRContext, content: string): void;
export declare function addStyle(context: SSRContext, css: string): void;
export declare function addScript(context: SSRContext, src?: string, content?: string): void;
export declare function setMeta(context: SSRContext, name: string, content: string): void;
export declare function preloadModule(href: string): string;
export declare function preloadStyle(href: string): string;
export declare function preloadScript(href: string): string;
export declare function renderTitle(title: string): string;
export declare function renderMeta(name: string, content: string): string;
export declare function renderOpenGraph(property: string, content: string): string;
export declare function isServer(): boolean;
export declare function isClient(): boolean;
export declare function withCache<T extends VNode | string>(key: string, renderFn: () => T, ttl?: number): T;
export {};
