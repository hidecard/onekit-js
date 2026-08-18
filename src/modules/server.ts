import { DependencyInjector } from '../core/di';

export type ServerMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | '*';

export interface ServerRequestContext {
  request: Request;
  method: string;
  path: string;
  params: Record<string, string>;
  query: URLSearchParams;
  state: Record<string, unknown>;
  services: DependencyInjector;
  json(data: unknown, init?: ResponseInit): Response;
  text(data: string, init?: ResponseInit): Response;
  ok(data: unknown): Response;
  fail(message: string, status?: number): Response;
}

export type ServerHandler = (
  context: ServerRequestContext,
  next: () => Promise<Response>
) => Response | Promise<Response>;

export type ServerMiddleware = ServerHandler;

export interface ServerRouteDefinition {
  method: ServerMethod;
  path: string;
  handlers: readonly ServerHandler[];
}

export interface ServerAppOptions {
  injector?: DependencyInjector;
  onError?: (error: unknown, context: ServerRequestContext) => Response | Promise<Response>;
}

export interface ServerApp {
  readonly routes: readonly ServerRouteDefinition[];
  use(...middleware: ServerMiddleware[]): this;
  route(method: ServerMethod, path: string, ...handlers: ServerHandler[]): this;
  get(path: string, ...handlers: ServerHandler[]): this;
  post(path: string, ...handlers: ServerHandler[]): this;
  put(path: string, ...handlers: ServerHandler[]): this;
  patch(path: string, ...handlers: ServerHandler[]): this;
  delete(path: string, ...handlers: ServerHandler[]): this;
  handle(request: Request): Promise<Response>;
}

export interface NodeHttpRequest {
  method?: string;
  url?: string;
  headers: Record<string, string | string[] | undefined>;
  [Symbol.asyncIterator](): AsyncIterator<Uint8Array | string>;
}

export interface NodeHttpResponse {
  writeHead(statusCode: number, headers?: Record<string, string>): this;
  end(body?: Uint8Array): void;
}

export type NodeHttpHandler = (request: NodeHttpRequest, response: NodeHttpResponse) => Promise<void>;

interface CompiledRoute {
  definition: ServerRouteDefinition;
  match(path: string): Record<string, string> | null;
}

function escapeRegex(segment: string): string {
  return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function compilePath(path: string): CompiledRoute['match'] {
  const normalized = path === '/' ? '/' : `/${path.replace(/^\/+|\/+$/g, '')}`;
  const names: string[] = [];
  const pattern = normalized.split('/').map((segment, index) => {
    if (index === 0) return '';
    if (segment.startsWith(':')) {
      names.push(segment.slice(1));
      return '([^/]+)';
    }
    if (segment.startsWith('*')) {
      names.push(segment.slice(1) || 'splat');
      return '(.*)';
    }
    return escapeRegex(segment);
  }).join('/');
  const regex = new RegExp(`^${pattern || '/'}${normalized !== '/' ? '/?' : ''}$`);
  return (value: string) => {
    const match = regex.exec(value);
    if (!match) return null;
    return Object.fromEntries(names.map((name, index) => [name, decodeURIComponent(match[index + 1])])) as Record<string, string>;
  };
}

function json(data: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function jsonResponse(data: unknown, init: ResponseInit = {}): Response {
  return json(data, init);
}

export function textResponse(data: string, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'text/plain; charset=utf-8');
  return new Response(data, { ...init, headers });
}

export function defineMiddleware(handler: ServerMiddleware): ServerMiddleware {
  return handler;
}

export function defineHandler(handler: (context: ServerRequestContext) => Response | Promise<Response>): ServerHandler {
  return (context) => handler(context);
}

export function validateBody<T>(validator: (value: unknown) => T): ServerMiddleware {
  return async (context, next) => {
    let value: unknown;
    try {
      value = await context.request.clone().json();
    } catch {
      return json({ error: 'Invalid JSON body' }, { status: 400 });
    }
    try {
      context.state.body = validator(value);
      return next();
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'Validation failed' }, { status: 400 });
    }
  };
}

export function createServerApp(options: ServerAppOptions = {}): ServerApp {
  const injector = options.injector ?? new DependencyInjector();
  const middleware: ServerMiddleware[] = [];
  const routes: ServerRouteDefinition[] = [];
  const compiled: CompiledRoute[] = [];

  const app: ServerApp = {
    get routes() { return routes; },
    use(...handlers) { middleware.push(...handlers); return app; },
    route(method, path, ...handlers) {
      const definition = { method, path, handlers } satisfies ServerRouteDefinition;
      routes.push(definition);
      compiled.push({ definition, match: compilePath(path) });
      return app;
    },
    get(path, ...handlers) { return app.route('GET', path, ...handlers); },
    post(path, ...handlers) { return app.route('POST', path, ...handlers); },
    put(path, ...handlers) { return app.route('PUT', path, ...handlers); },
    patch(path, ...handlers) { return app.route('PATCH', path, ...handlers); },
    delete(path, ...handlers) { return app.route('DELETE', path, ...handlers); },
    async handle(request) {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      const route = compiled.find(item => (item.definition.method === '*' || item.definition.method === method) && item.match(url.pathname));
      const context: ServerRequestContext = {
        request,
        method,
        path: url.pathname,
        params: route ? itemMatch(route, url.pathname) : {},
        query: url.searchParams,
        state: {},
        services: injector,
        json: jsonResponse,
        text: textResponse,
        ok: (data) => jsonResponse(data),
        fail: (message, status = 400) => jsonResponse({ error: message }, { status })
      };
      if (!route) return json({ error: 'Not Found' }, { status: 404 });
      const handlers = [...middleware, ...route.definition.handlers];
      let index = -1;
      const dispatch = async (position: number): Promise<Response> => {
        if (position <= index) throw new Error('next() called multiple times');
        index = position;
        const handler = handlers[position];
        if (!handler) return json({ error: 'Handler did not return a response' }, { status: 500 });
        return handler(context, () => dispatch(position + 1));
      };
      try {
        return await dispatch(0);
      } catch (error) {
        if (options.onError) return options.onError(error, context);
        return json({ error: 'Internal Server Error' }, { status: 500 });
      }
    }
  };
  return app;
}

function itemMatch(route: CompiledRoute, path: string): Record<string, string> {
  return route.match(path) ?? {};
}

export const createApi = createServerApp;

function nodeHeaders(input: NodeHttpRequest['headers']): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(input)) {
    if (value !== undefined) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
  }
  return headers;
}

async function nodeBody(request: NodeHttpRequest): Promise<Uint8Array | undefined> {
  if (request.method === 'GET' || request.method === 'HEAD') return undefined;
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const chunk of request) {
    const bytes = typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk;
    chunks.push(bytes);
    length += bytes.byteLength;
  }
  if (length === 0) return undefined;
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

/**
 * Bridges a standard Node HTTP server to the Fetch-compatible ServerApp.
 * Import `node:http` in the application and pass this handler to `createServer`.
 */
export function createNodeHandler(app: ServerApp, baseUrl = 'http://localhost'): NodeHttpHandler {
  return async (request, response) => {
    try {
      const url = new URL(request.url ?? '/', baseUrl);
      const body = await nodeBody(request);
      const fetchRequest = new Request(url, {
        method: request.method ?? 'GET',
        headers: nodeHeaders(request.headers),
        body: body as BodyInit | undefined,
        ...(body ? { duplex: 'half' as const } : {})
      });
      const result = await app.handle(fetchRequest);
      const payload = new Uint8Array(await result.arrayBuffer());
      const headers: Record<string, string> = {};
      result.headers.forEach((value, name) => { headers[name] = value; });
      response.writeHead(result.status, headers);
      response.end(payload);
    } catch {
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8' });
      response.end(new TextEncoder().encode(JSON.stringify({ error: 'Internal Server Error' })));
    }
  };
}

export const serverMiddleware = {
  cors(options: { origin?: string } = {}): ServerMiddleware {
    return async (_context, next) => {
      const response = await next();
      const headers = new Headers(response.headers);
      headers.set('access-control-allow-origin', options.origin ?? '*');
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    };
  },
  requestId(header = 'x-request-id'): ServerMiddleware {
    return async (context, next) => {
      const runtimeCrypto = (globalThis as typeof globalThis & { crypto?: { randomUUID?: () => string } }).crypto;
      context.state.requestId = context.request.headers.get(header) ?? runtimeCrypto?.randomUUID?.() ?? `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      return next();
    };
  }
};
