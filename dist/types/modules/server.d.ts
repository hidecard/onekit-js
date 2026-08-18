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
export type ServerHandler = (context: ServerRequestContext, next: () => Promise<Response>) => Response | Promise<Response>;
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
    resource(path: string, handlers: ResourceHandlers): this;
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
export declare function jsonResponse(data: unknown, init?: ResponseInit): Response;
export declare function textResponse(data: string, init?: ResponseInit): Response;
export declare function defineMiddleware(handler: ServerMiddleware): ServerMiddleware;
export declare function defineHandler(handler: (context: ServerRequestContext) => Response | Promise<Response>): ServerHandler;
export interface AuthenticatedUser {
    [key: string]: unknown;
}
export type UserResolver<T extends AuthenticatedUser = AuthenticatedUser> = (context: ServerRequestContext) => T | null | undefined | Promise<T | null | undefined>;
export type AuthorizationRule<T extends AuthenticatedUser = AuthenticatedUser> = (user: T, context: ServerRequestContext) => boolean | Promise<boolean>;
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
export declare function createMemoryRateLimitStore(): RateLimitStore;
export declare function validateBody<T>(validator: (value: unknown) => T): ServerMiddleware;
export declare function createServerApp(options?: ServerAppOptions): ServerApp;
export declare const createApi: typeof createServerApp;
/**
 * Bridges a standard Node HTTP server to the Fetch-compatible ServerApp.
 * Import `node:http` in the application and pass this handler to `createServer`.
 */
export declare function createNodeHandler(app: ServerApp, baseUrl?: string): NodeHttpHandler;
export declare const securityMiddleware: {
    authenticate<T extends AuthenticatedUser = AuthenticatedUser>(resolveUser: UserResolver<T>): ServerMiddleware;
    authorize<T extends AuthenticatedUser = AuthenticatedUser>(isAllowed: AuthorizationRule<T>): ServerMiddleware;
    session<T extends AuthenticatedUser = AuthenticatedUser>(provider: SessionProvider<T>): ServerMiddleware;
    token<T extends AuthenticatedUser = AuthenticatedUser>(provider: TokenProvider<T>): ServerMiddleware;
    rateLimit(options: RateLimitOptions): ServerMiddleware;
};
export declare const serverMiddleware: {
    rateLimit: (options: RateLimitOptions) => ServerMiddleware;
    cors(options?: {
        origin?: string;
        methods?: string;
        headers?: string;
        credentials?: boolean;
        maxAge?: number;
    }): ServerMiddleware;
    requestId(header?: string): ServerMiddleware;
};
