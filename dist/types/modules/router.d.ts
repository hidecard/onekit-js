import type { ErrorBoundary } from '../core/error-handler';
export type RouteParams = Record<string, string>;
export type QueryParams = Record<string, string | string[]>;
export interface RouteLocation {
    path: string;
    fullPath: string;
    params: RouteParams;
    query: QueryParams;
    hash: string;
}
export interface RouteContext {
    to: RouteLocation;
    from: RouteLocation | null;
}
export type NavigationResult = void | boolean | string | RouteLocation;
export type RouteGuard = (context: RouteContext) => NavigationResult | Promise<NavigationResult>;
export type RouteLoader = (context: RouteContext) => unknown | Promise<unknown>;
export interface Route {
    path: string;
    component?: any;
    handler?: (context?: RouteContext) => void | Promise<void>;
    beforeEnter?: RouteGuard;
    loader?: RouteLoader;
    children?: Route[];
    meta?: Record<string, unknown>;
}
export interface MatchedRoute {
    route: Route;
    location: RouteLocation;
    data?: unknown;
}
export interface RouterOptions {
    mode?: 'history' | 'hash' | 'memory';
    base?: string;
    initialPath?: string;
    notFound?: Route;
    beforeEach?: RouteGuard;
    afterEach?: (context: RouteContext & {
        matched: MatchedRoute | null;
    }) => void;
    errorBoundary?: ErrorBoundary<unknown>;
}
type Listener = (to: RouteLocation, from: RouteLocation | null) => void;
export declare class Router {
    private routes;
    private listeners;
    private current;
    private started;
    private navigationToken;
    private readonly options;
    private readonly popstateHandler;
    constructor(routes?: Route[], options?: RouterOptions);
    addRoute(route: Route): this;
    removeRoute(path: string): boolean;
    get routesList(): readonly Route[];
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
    private runGuard;
    private notify;
    private applyBase;
    private removeBase;
    private readBrowserPath;
    private commit;
}
export declare function createRouter(routes?: Route[], options?: RouterOptions): Router;
export declare const router: Router;
export {};
