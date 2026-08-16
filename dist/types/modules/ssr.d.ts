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
type AsyncVNode = VNode | string | PromiseLike<VNode | string>;
export declare function renderToString(vnode: VNode | string, context?: SSRContext): RenderResult;
export interface HydrationMismatch {
    path: string;
    kind: 'tag' | 'text' | 'missing' | 'unexpected' | 'attribute';
    expected: string;
    actual: string;
}
export interface HydrationResult {
    mismatches: HydrationMismatch[];
    dispose: () => void;
}
export declare function hydrate(rootElement: Element, vnode: VNode): HydrationResult;
export declare class StreamingRenderer {
    private context;
    private chunks;
    private isComplete;
    constructor(context?: SSRContext);
    renderToStream(vnode: AsyncVNode, options?: {
        signal?: AbortSignal;
    }): Promise<ReadableStream<string>>;
    private renderAsync;
    private renderVNodeAsync;
    getContext(): SSRContext;
}
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
