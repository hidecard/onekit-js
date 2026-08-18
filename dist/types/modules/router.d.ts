import type { ErrorBoundary, LoadingBoundary } from '../core/error-handler';
import type { HeadManager, HeadMetadata } from './head';
import type { QueryClient, QueryKey, QueryOptions } from './query';
export type RouteParams = Record<string, string>;
export type QueryParams = Record<string, string | string[]>;
export interface RouteLocation<Params extends RouteParams = RouteParams> {
    path: string;
    fullPath: string;
    params: Params;
    query: QueryParams;
    hash: string;
}
export interface RouteMatch<Params extends RouteParams = RouteParams> {
    route: Route;
    location: RouteLocation<Params>;
}
/** Context shared by guards, loaders, handlers, and query-key factories. */
export interface RouteContext<Params extends RouteParams = RouteParams, AppContext = unknown> {
    to: RouteLocation<Params>;
    from: RouteLocation | null;
    matched?: readonly RouteMatch[];
    /** Optional application context supplied through RouterOptions.context. */
    context: AppContext;
}
export type Awaitable<T> = T | Promise<T>;
export type NavigationResult = void | boolean | string | RouteLocation;
export type RouteGuard<Params extends RouteParams = RouteParams, AppContext = unknown> = (context: RouteContext<Params, AppContext>) => Awaitable<NavigationResult>;
export type RouteLoader<Params extends RouteParams = RouteParams, Data = unknown, AppContext = unknown> = (context: RouteContext<Params, AppContext>) => Awaitable<Data>;
export type RouteLoaderData<Loader extends RouteLoader> = Awaited<ReturnType<Loader>>;
export type RouteQueryKey<AppContext = unknown> = QueryKey | ((context: RouteContext<RouteParams, AppContext>) => QueryKey);
export type RouteComponentLoader = () => unknown | Promise<unknown>;
export type ScrollBehavior = (to: RouteLocation, from: RouteLocation | null) => void | Promise<void>;
/** JSON-safe route metadata emitted for SSR preload and client hydration planning. */
export interface RouteManifestEntry {
    path: string;
    parentPath?: string;
    hasLoader: boolean;
    hasLazyComponent: boolean;
    queryKey?: QueryKey;
    meta?: Record<string, unknown>;
}
export interface RouteManifest {
    version: 1;
    routes: readonly RouteManifestEntry[];
}
export declare function createRouteManifest(routes?: readonly Route[]): RouteManifest;
export interface Route<Params extends RouteParams = RouteParams, Data = unknown, AppContext = unknown> {
    path: string;
    component?: unknown;
    /** Parent route component used as a layout when this route has children. */
    layout?: unknown;
    lazy?: RouteComponentLoader;
    handler?: (context?: RouteContext<Params, AppContext>) => Awaitable<void>;
    beforeEnter?: RouteGuard<Params, AppContext>;
    loader?: RouteLoader<Params, Data, AppContext>;
    /** Optional QueryClient cache key for the route loader. */
    queryKey?: RouteQueryKey<AppContext>;
    /** Query freshness options used when `queryKey` and a router QueryClient are configured. */
    queryOptions?: QueryOptions<Data>;
    children?: readonly Route[];
    meta?: Record<string, unknown>;
    /** Route-level document metadata composed from parent to leaf. */
    head?: HeadMetadata;
}
export interface MatchedRoute {
    route: Route;
    location: RouteLocation;
    data?: unknown;
    /** Parent-to-leaf route records for nested layouts. */
    matched?: readonly RouteMatch[];
    /** Loader results in parent-to-leaf order; `data` remains the leaf result for compatibility. */
    dataByRoute?: readonly unknown[];
    /** Resolved parent-to-leaf components for layout composition. */
    components?: readonly unknown[];
}
export interface RouterOptions<AppContext = unknown> {
    /** Optional application services/context exposed to route callbacks. */
    context?: AppContext;
    mode?: 'history' | 'hash' | 'memory';
    base?: string;
    initialPath?: string;
    notFound?: Route;
    beforeEach?: RouteGuard;
    afterEach?: (context: Omit<RouteContext, 'matched'> & {
        matched: MatchedRoute | null;
        routeMatches?: readonly RouteMatch[];
    }) => void;
    scrollBehavior?: ScrollBehavior;
    errorBoundary?: ErrorBoundary<unknown>;
    /** Optional QueryClient used by routes with `queryKey`. */
    queryClient?: QueryClient;
    /** Optional loading boundary tracking route loader pending state. */
    loadingBoundary?: LoadingBoundary<unknown>;
    /** Optional head manager updated after a navigation commits. */
    head?: HeadManager;
}
type Listener = (to: RouteLocation, from: RouteLocation | null) => void;
export declare class Router<AppContext = unknown> {
    private routes;
    private listeners;
    private current;
    private started;
    private navigationToken;
    private readonly options;
    private readonly popstateHandler;
    constructor(routes?: readonly Route[], options?: RouterOptions<AppContext>);
    addRoute(route: Route): this;
    removeRoute(path: string): boolean;
    get routesList(): readonly Route[];
    /** Return a serializable manifest for SSR preload links and client route planning. */
    getManifest(): RouteManifest;
    getCurrentPath(): string;
    getCurrentLocation(): RouteLocation | null;
    subscribe(listener: Listener): () => void;
    start(): Promise<MatchedRoute | null>;
    stop(): void;
    navigate(path: string): Promise<MatchedRoute | null>;
    /** Resolve guards and route data without committing history or changing current state. */
    prefetch(path: string): Promise<MatchedRoute | null>;
    back(): void;
    forward(): void;
    resolve(input: string, push?: boolean): Promise<MatchedRoute | null>;
    private match;
    private recordsFor;
    private loadRoute;
    private resolveQueryKey;
    private runGuard;
    private ensureLazyComponent;
    private updateHead;
    private notify;
    private applyBase;
    private removeBase;
    private readBrowserPath;
    private commit;
}
export declare function createRouter<AppContext = unknown>(routes?: readonly Route[], options?: RouterOptions<AppContext>): Router<AppContext>;
export declare const router: Router<unknown>;
export {};
