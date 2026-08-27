import { serverErrorResponse, type ServerApp } from './server';

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

export class EdgeRuntimeError extends Error {
  readonly missing: readonly string[];

  constructor(missing: readonly string[]) {
    super(`Edge runtime is missing required capabilities: ${missing.join(', ')}`);
    this.name = 'EdgeRuntimeError';
    this.missing = missing;
  }
}

export function detectEdgeRuntime(runtime: typeof globalThis = globalThis): EdgeRuntimeCapabilities {
  return {
    fetch: typeof runtime.fetch === 'function',
    request: typeof runtime.Request === 'function',
    response: typeof runtime.Response === 'function',
    headers: typeof runtime.Headers === 'function',
    webStreams: typeof runtime.ReadableStream === 'function' && typeof runtime.TransformStream === 'function',
    abortController: typeof runtime.AbortController === 'function',
    textEncoder: typeof runtime.TextEncoder === 'function',
    webCrypto: Boolean(runtime.crypto && typeof runtime.crypto.subtle?.digest === 'function'),
    waitUntil: false,
  };
}

export function assertEdgeRuntime(options: EdgeRuntimeOptions = {}): EdgeRuntimeCapabilities {
  const runtime = options.runtime ?? globalThis;
  const capabilities = detectEdgeRuntime(runtime);
  const missing: string[] = [];
  if (!capabilities.fetch) missing.push('fetch');
  if (!capabilities.request) missing.push('Request');
  if (!capabilities.response) missing.push('Response');
  if (!capabilities.headers) missing.push('Headers');
  if (options.requireStreaming && !capabilities.webStreams) missing.push('Web Streams');
  if (options.requireWebCrypto && !capabilities.webCrypto) missing.push('Web Crypto SubtleCrypto');
  if (missing.length) throw new EdgeRuntimeError(missing);
  return capabilities;
}

export interface EdgeRequestContext {
  env?: unknown;
  executionContext?: EdgeExecutionContext;
  waitUntil(promise: Promise<unknown>): void;
}

export interface EdgeHandlerOptions extends EdgeRuntimeOptions {
  onError?: (error: unknown, request: Request) => Response | Promise<Response>;
}

export interface EdgeHandler {
  readonly capabilities: EdgeRuntimeCapabilities;
  fetch(request: Request, context?: { env?: unknown; executionContext?: EdgeExecutionContext }): Promise<Response>;
}

/**
 * Wrap a Fetch-compatible ServerApp for Workers/Deno/Vercel-style deployments.
 * This module contains no Node imports and never buffers a Response body.
 */
export function createEdgeHandler(app: ServerApp, options: EdgeHandlerOptions = {}): EdgeHandler {
  const capabilities = assertEdgeRuntime(options);
  return {
    capabilities,
    async fetch(request, context = {}) {
      void context;
      try {
        const response = await app.handle(request);
        return response;
      } catch (error) {
        if (options.onError) return options.onError(error, request);
        return serverErrorResponse(error);
      }
    },
  };
}

export function createEdgeRequestContext(
  context: { env?: unknown; executionContext?: EdgeExecutionContext } = {},
): EdgeRequestContext {
  return {
    env: context.env,
    executionContext: context.executionContext,
    waitUntil(promise) {
      const safePromise = Promise.resolve(promise);
      if (context.executionContext?.waitUntil) context.executionContext.waitUntil(safePromise);
      else void safePromise.catch(() => undefined);
    },
  };
}
