import { type ServerApp } from './server';
export interface EdgeExecutionContext {
    waitUntil?(promise: Promise<unknown>): void;
    passThroughOnException?(): void;
}
export interface EdgeRuntimeCapabilities {
    fetch: boolean;
    request: boolean;
    response: boolean;
    headers: boolean;
    webStreams: boolean;
    abortController: boolean;
    textEncoder: boolean;
    webCrypto: boolean;
    waitUntil: boolean;
}
export interface EdgeRuntimeOptions {
    requireStreaming?: boolean;
    requireWebCrypto?: boolean;
    runtime?: typeof globalThis;
}
export declare class EdgeRuntimeError extends Error {
    readonly missing: readonly string[];
    constructor(missing: readonly string[]);
}
export declare function detectEdgeRuntime(runtime?: typeof globalThis): EdgeRuntimeCapabilities;
export declare function assertEdgeRuntime(options?: EdgeRuntimeOptions): EdgeRuntimeCapabilities;
export interface EdgeRequestContext {
    env?: unknown;
    executionContext?: EdgeExecutionContext;
    waitUntil(promise: Promise<unknown>): void;
}
export interface EdgeHandlerOptions extends EdgeRuntimeOptions {
    onError?: (error: unknown, request: Request) => Response | Promise<Response>;
}
export interface EdgeFetchContext {
    env?: unknown;
    executionContext?: EdgeExecutionContext;
}
export interface EdgeHandler {
    readonly capabilities: EdgeRuntimeCapabilities;
    fetch(request: Request, context?: EdgeFetchContext): Promise<Response>;
    schedule(promise: Promise<unknown>, context?: EdgeFetchContext): void;
}
/**
 * Wrap a Fetch-compatible ServerApp for Workers/Deno/Vercel-style deployments.
 * This module contains no Node imports and never buffers a Response body.
 */
export declare function createEdgeHandler(app: ServerApp, options?: EdgeHandlerOptions): EdgeHandler;
export declare function createEdgeRequestContext(context?: {
    env?: unknown;
    executionContext?: EdgeExecutionContext;
}): EdgeRequestContext;
