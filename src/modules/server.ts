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
  database?: DatabaseAdapter;
  json(data: unknown, init?: ResponseInit): Response;
  text(data: string, init?: ResponseInit): Response;
  ok(data: unknown): Response;
  fail(message: string, status?: number): Response;
  body<T = unknown>(): Promise<T>;
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

/** Concise CRUD registration for common JSON resources. Each handler receives the normal server context. */
export interface ResourceHandlers {
  list?: ServerHandler;
  get?: ServerHandler;
  create?: ServerHandler;
  update?: ServerHandler;
  remove?: ServerHandler;
}

export interface DatabaseExecutionResult {
  affectedRows: number;
  insertId?: string | number;
}

export interface DatabaseTransaction {
  query<T>(statement: string, parameters?: readonly unknown[]): Promise<readonly T[]>;
  execute(statement: string, parameters?: readonly unknown[]): Promise<DatabaseExecutionResult>;
}

/** Adapter contract only; OneKit does not choose or bundle an ORM/database driver. */
export interface DatabaseAdapter extends DatabaseTransaction {
  transaction<T>(work: (transaction: DatabaseTransaction) => Promise<T>): Promise<T>;
  close?(): Promise<void>;
}

export interface SessionProvider<TUser extends AuthenticatedUser = AuthenticatedUser> {
  getUser(request: Request): TUser | null | undefined | Promise<TUser | null | undefined>;
}

export interface TokenProvider<TUser extends AuthenticatedUser = AuthenticatedUser> {
  verify(request: Request): TUser | null | undefined | Promise<TUser | null | undefined>;
}

export interface ServerAppOptions {
  injector?: DependencyInjector;
  database?: DatabaseAdapter;
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
  resource(path: string, handlers: ResourceHandlers): this;
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

export interface AuthenticatedUser {
  [key: string]: unknown;
}

export type UserResolver<T extends AuthenticatedUser = AuthenticatedUser> = (
  context: ServerRequestContext
) => T | null | undefined | Promise<T | null | undefined>;

export type AuthorizationRule<T extends AuthenticatedUser = AuthenticatedUser> = (
  user: T,
  context: ServerRequestContext
) => boolean | Promise<boolean>;

export interface RateLimitOptions {
  max: number;
  windowMs: number;
  key?: (context: ServerRequestContext) => string;
  message?: string;
}

export function validateBody<T>(validator: (value: unknown) => T): ServerMiddleware {
  return async (context, next) => {
    let value: unknown;
    try {
      value = await context.body();
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
    resource(path, handlers) {
      const base = path === '/' ? '' : `/${path.replace(/^\/+|\/+$/g, '')}`;
      if (handlers.list) app.get(base || '/', handlers.list);
      if (handlers.get) app.get(`${base}/:id`, handlers.get);
      if (handlers.create) app.post(base || '/', handlers.create);
      if (handlers.update) {
        app.put(`${base}/:id`, handlers.update);
        app.patch(`${base}/:id`, handlers.update);
      }
      if (handlers.remove) app.delete(`${base}/:id`, handlers.remove);
      return app;
    },
    async handle(request) {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      const route = compiled.find(item => (item.definition.method === '*' || item.definition.method === method) && item.match(url.pathname));
      let parsedBody: unknown;
      let bodyLoaded = false;
      const context: ServerRequestContext = {
        request,
        method,
        path: url.pathname,
        params: route ? itemMatch(route, url.pathname) : {},
        query: url.searchParams,
        state: {},
        services: injector,
        database: options.database,
        json: jsonResponse,
        text: textResponse,
        ok: (data) => jsonResponse(data),
        fail: (message, status = 400) => jsonResponse({ error: message }, { status }),
        async body<T = unknown>() {
          if (!bodyLoaded) {
            bodyLoaded = true;
            parsedBody = await request.clone().json();
          }
          return parsedBody as T;
        }
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

export const securityMiddleware = {
  authenticate<T extends AuthenticatedUser = AuthenticatedUser>(resolveUser: UserResolver<T>): ServerMiddleware {
    return async (context, next) => {
      const user = await resolveUser(context);
      if (!user) return context.fail('Authentication required', 401);
      context.state.user = user;
      return next();
    };
  },
  authorize<T extends AuthenticatedUser = AuthenticatedUser>(isAllowed: AuthorizationRule<T>): ServerMiddleware {
    return async (context, next) => {
      const user = context.state.user as T | undefined;
      if (!user) return context.fail('Authentication required', 401);
      if (!(await isAllowed(user, context))) return context.fail('Forbidden', 403);
      return next();
    };
  },
  session<T extends AuthenticatedUser = AuthenticatedUser>(provider: SessionProvider<T>): ServerMiddleware {
    return securityMiddleware.authenticate((context) => provider.getUser(context.request));
  },
  token<T extends AuthenticatedUser = AuthenticatedUser>(provider: TokenProvider<T>): ServerMiddleware {
    return securityMiddleware.authenticate((context) => provider.verify(context.request));
  },
  rateLimit(options: RateLimitOptions): ServerMiddleware {
    const counters = new Map<string, { count: number; resetAt: number }>();
    return async (context, next) => {
      const now = Date.now();
      const key = options.key?.(context) ?? 'global';
      const current = counters.get(key);
      const entry = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + Math.max(1, options.windowMs) }
        : current;
      entry.count += 1;
      counters.set(key, entry);
      const remaining = Math.max(0, options.max - entry.count);
      if (entry.count > options.max) {
        return context.json({ error: options.message ?? 'Too many requests' }, {
          status: 429,
          headers: {
            'retry-after': String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))),
            'x-ratelimit-limit': String(options.max),
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(Math.ceil(entry.resetAt / 1000))
          }
        });
      }
      const response = await next();
      const headers = new Headers(response.headers);
      headers.set('x-ratelimit-limit', String(options.max));
      headers.set('x-ratelimit-remaining', String(remaining));
      headers.set('x-ratelimit-reset', String(Math.ceil(entry.resetAt / 1000)));
      return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
    };
  }
};

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
