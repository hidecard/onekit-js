import { DependencyInjector } from '../core/di';

export type ServerMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD' | '*';

export interface ServerErrorOptions {
  status?: number;
  code?: string;
  details?: unknown;
  expose?: boolean;
  headers?: HeadersInit;
}

/** Safe, typed application error for Fetch-compatible route handlers. */
export class ServerError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;
  readonly expose: boolean;
  readonly headers?: HeadersInit;

  constructor(message: string, options: ServerErrorOptions = {}) {
    super(message);
    this.name = 'ServerError';
    const status = options.status ?? 500;
    this.status = Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
    this.code = options.code ?? 'SERVER_ERROR';
    this.details = options.details;
    this.expose = options.expose ?? this.status < 500;
    this.headers = options.headers;
  }
}

export function createServerError(message: string, options?: ServerErrorOptions): ServerError {
  return new ServerError(message, options);
}

export function serverErrorResponse(error: unknown, fallbackMessage = 'Internal Server Error'): Response {
  const typed = error instanceof ServerError ? error : undefined;
  const headers = new Headers(typed?.headers);
  if (!headers.has('content-type')) headers.set('content-type', 'application/json; charset=utf-8');
  const body: { error: string; code?: string; details?: unknown } = {
    error: typed?.expose ? typed.message : fallbackMessage,
  };
  if (typed?.expose && typed.code) body.code = typed.code;
  if (typed?.expose && typed.details !== undefined) body.details = typed.details;
  return new Response(JSON.stringify(body), { status: typed?.status ?? 500, headers });
}

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

export interface ServerProvider {
  name: string;
  factory: (...dependencies: unknown[]) => unknown;
  dependencies?: readonly string[];
  singleton?: boolean;
}

export interface ServerControllerRoute {
  method: ServerMethod;
  path: string;
  handlers: readonly ServerHandler[];
}

/** Functional controller contract; decorators are intentionally optional and not required. */
export interface ServerController {
  prefix?: string;
  middleware?: readonly ServerMiddleware[];
  routes: readonly ServerControllerRoute[];
}

export interface ServerModule {
  imports?: readonly ServerModule[];
  providers?: readonly ServerProvider[];
  middleware?: readonly ServerMiddleware[];
  controllers?: readonly ServerController[];
  routes?: readonly ServerRouteDefinition[];
  configure?: (app: ServerApp) => void;
}

export function defineController(controller: ServerController): ServerController {
  return controller;
}

export function defineModule(module: ServerModule): ServerModule {
  return module;
}

function joinServerPath(prefix: string | undefined, path: string): string {
  const left = prefix?.replace(/^\/+|\/+$/g, '') ?? '';
  const right = path.replace(/^\/+/, '');
  const joined = [left, right].filter(Boolean).join('/');
  return joined ? `/${joined}` : '/';
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
  /** Controls the final safe response when a handler or custom error hook fails. */
  errorResponse?: (error: unknown, context: ServerRequestContext) => Response | Promise<Response>;
  onStart?: (app: ServerApp) => void | Promise<void>;
  onStop?: (app: ServerApp) => void | Promise<void>;
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
  head(path: string, ...handlers: ServerHandler[]): this;
  options(path: string, ...handlers: ServerHandler[]): this;
  resource(path: string, handlers: ResourceHandlers): this;
  module(module: ServerModule): this;
  start(): Promise<void>;
  stop(): Promise<void>;
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

export interface RateLimitState {
  count: number;
  resetAt: number;
}

/** Store contract for sharing rate-limit counters across processes or instances. */
export interface RateLimitStore {
  increment(key: string, windowMs: number): RateLimitState | Promise<RateLimitState>;
}

export interface RateLimitOptions {
  max: number;
  windowMs: number;
  key?: (context: ServerRequestContext) => string;
  message?: string;
  store?: RateLimitStore;
}

export function createMemoryRateLimitStore(): RateLimitStore {
  const counters = new Map<string, RateLimitState>();
  return {
    increment(key, windowMs) {
      const now = Date.now();
      const current = counters.get(key);
      const entry = !current || current.resetAt <= now
        ? { count: 0, resetAt: now + Math.max(1, windowMs) }
        : current;
      entry.count += 1;
      counters.set(key, entry);
      return entry;
    },
  };
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
  const appliedModules = new Set<ServerModule>();
  let started = false;
  let stopping: Promise<void> | undefined;

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
    head(path, ...handlers) { return app.route('HEAD', path, ...handlers); },
    options(path, ...handlers) { return app.route('OPTIONS', path, ...handlers); },
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
    module(moduleDefinition) {
      if (appliedModules.has(moduleDefinition)) return app;
      appliedModules.add(moduleDefinition);
      for (const imported of moduleDefinition.imports ?? []) app.module(imported);
      for (const provider of moduleDefinition.providers ?? []) {
        injector.register(provider.name, provider.factory, [...(provider.dependencies ?? [])], provider.singleton ?? true);
      }
      for (const handler of moduleDefinition.middleware ?? []) app.use(handler);
      moduleDefinition.configure?.(app);
      for (const controller of moduleDefinition.controllers ?? []) {
        const middleware = [...(controller.middleware ?? [])];
        for (const route of controller.routes) {
          app.route(route.method, joinServerPath(controller.prefix, route.path), ...middleware, ...route.handlers);
        }
      }
      for (const route of moduleDefinition.routes ?? []) app.route(route.method, route.path, ...route.handlers);
      return app;
    },
    async start() {
      if (started) return;
      started = true;
      try {
        await options.onStart?.(app);
      } catch (error) {
        started = false;
        throw error;
      }
    },
    async stop() {
      if (stopping) return stopping;
      stopping = (async () => {
        if (!started) return;
        try {
          await options.onStop?.(app);
        } finally {
          await options.database?.close?.();
          started = false;
        }
      })();
      try {
        await stopping;
      } finally {
        stopping = undefined;
      }
    },
    async handle(request) {
      const url = new URL(request.url);
      const method = request.method.toUpperCase();
      const pathRoutes = compiled.filter(item => item.match(url.pathname));
      const pathRoute = pathRoutes[0];
      const route = pathRoutes.find(item => item.definition.method === '*' || item.definition.method === method);
      let parsedBody: unknown;
      let bodyLoaded = false;
      const context: ServerRequestContext = {
        request,
        method,
        path: url.pathname,
        params: route ? itemMatch(route, url.pathname) : pathRoute ? itemMatch(pathRoute, url.pathname) : {},
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
      const handlers = [
        ...middleware,
        ...(route
          ? route.definition.handlers
          : pathRoute
            ? [() => new Response(null, { status: 405, headers: { Allow: allowedMethods(pathRoutes) } })]
            : [() => json({ error: 'Not Found' }, { status: 404 }) as Response])
      ];
      const finalize = (response: Response): Response => method === 'HEAD' ? withoutResponseBody(response) : response;
      let index = -1;
      const dispatch = async (position: number): Promise<Response> => {
        if (position <= index) throw new Error('next() called multiple times');
        index = position;
        const handler = handlers[position];
        if (!handler) return json({ error: 'Handler did not return a response' }, { status: 500 });
        return handler(context, () => dispatch(position + 1));
      };
      try {
        return finalize(await dispatch(0));
      } catch (error) {
        try {
          if (options.onError) return finalize(await options.onError(error, context));
        } catch (hookError) {
          error = hookError;
        }
        if (options.errorResponse) {
          try {
            return finalize(await options.errorResponse(error, context));
          } catch {
            return finalize(serverErrorResponse(error));
          }
        }
        return finalize(serverErrorResponse(error));
      }
    }
  };
  return app;
}

function allowedMethods(routes: readonly CompiledRoute[]): string {
  const methods = new Set<string>();
  for (const route of routes) {
    const routeMethods = route.definition.method === '*'
      ? ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']
      : [route.definition.method];
    routeMethods.forEach(routeMethod => methods.add(routeMethod));
  }
  return Array.from(methods).join(', ');
}

function withoutResponseBody(response: Response): Response {
  void response.body?.cancel().catch(() => undefined);
  return new Response(null, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
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
    const store = options.store ?? createMemoryRateLimitStore();
    return async (context, next) => {
      const now = Date.now();
      const key = options.key?.(context) ?? 'global';
      const entry = await store.increment(key, options.windowMs);
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
  rateLimit: securityMiddleware.rateLimit,
  cors(options: {
    origin?: string;
    methods?: string;
    headers?: string;
    credentials?: boolean;
    maxAge?: number;
  } = {}): ServerMiddleware {
    return async (context, next) => {
      const headers = new Headers();
      headers.set('access-control-allow-origin', options.origin ?? '*');
      headers.set('access-control-allow-methods', options.methods ?? 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
      headers.set('access-control-allow-headers', options.headers ?? context.request.headers.get('access-control-request-headers') ?? 'content-type, authorization');
      if (options.credentials) headers.set('access-control-allow-credentials', 'true');
      if (options.maxAge !== undefined) headers.set('access-control-max-age', String(Math.max(0, options.maxAge)));
      if (context.method === 'OPTIONS' && context.request.headers.has('access-control-request-method')) {
        return new Response(null, { status: 204, headers });
      }
      const response = await next();
      const responseHeaders = new Headers(response.headers);
      for (const [name, value] of headers) responseHeaders.set(name, value);
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
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
