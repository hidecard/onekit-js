/* OneKit style: explicit, browser-first navigation with small composable contracts and no hidden global state in application routers. */

import { emitDevToolsEvent } from '../core/devtools';
import { onScopeDispose } from '../core/scope';
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

export function createRouteManifest(routes: readonly Route[] = []): RouteManifest {
  const entries: RouteManifestEntry[] = [];
  const visit = (items: readonly Route[], parentPath?: string): void => {
    for (const route of items) {
      const path = parentPath
        ? `${parentPath.replace(/\/$/, '')}/${route.path.replace(/^\//, '')}`
        : route.path;
      const entry: RouteManifestEntry = {
        path: normalizePath(path),
        ...(parentPath ? { parentPath: normalizePath(parentPath) } : {}),
        hasLoader: typeof route.loader === 'function',
        hasLazyComponent: typeof route.lazy === 'function',
        ...(route.queryKey !== undefined && typeof route.queryKey !== 'function' ? { queryKey: route.queryKey } : {}),
        ...(route.meta ? { meta: { ...route.meta } } : {}),
      };
      entries.push(entry);
      if (route.children?.length) visit(route.children, path);
    }
  };
  visit(routes);
  return { version: 1, routes: entries };
}

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
  afterEach?: (context: Omit<RouteContext, 'matched'> & { matched: MatchedRoute | null; routeMatches?: readonly RouteMatch[] }) => void;
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

function normalizePath(path: string): string {
  const withoutHash = path.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0] || '/';
  const normalized = withoutQuery.replace(/\\+/g, '/').replace(/\/+/g, '/');
  if (normalized.length > 1 && normalized.endsWith('/')) return normalized.slice(0, -1);
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function parseLocation(input: string): RouteLocation {
  const raw = input || '/';
  const hashIndex = raw.indexOf('#');
  const beforeHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw;
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : '';
  const queryIndex = beforeHash.indexOf('?');
  const path = normalizePath(queryIndex >= 0 ? beforeHash.slice(0, queryIndex) : beforeHash);
  const query: QueryParams = {};
  if (queryIndex >= 0) {
    const params = new URLSearchParams(beforeHash.slice(queryIndex + 1));
    params.forEach((value, key) => {
      const previous = query[key];
      query[key] = previous === undefined ? value : Array.isArray(previous) ? [...previous, value] : [previous, value];
    });
  }
  const queryString = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => Array.isArray(value) ? value.forEach(item => queryString.append(key, item)) : queryString.set(key, value));
  const fullPath = `${path}${queryString.toString() ? `?${queryString}` : ''}${hash}`;
  return { path, fullPath, params: {}, query, hash };
}

function compilePath(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const path = normalizePath(pattern);
  const source = path.split('/').map(segment => {
    if (segment.startsWith(':')) {
      keys.push(segment.slice(1).replace(/\\?$/, ''));
      return segment.endsWith('?') ? '([^/]*)?' : '([^/]+)';
    }
    if (segment === '*') {
      keys.push('wildcard');
      return '(.*)';
    }
    return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }).join('/');
  return { regex: new RegExp(`^${source || '/'}/?$`), keys };
}

function matchRoute(route: Route, location: RouteLocation): RouteParams | null {
  const { regex, keys } = compilePath(route.path);
  const match = location.path.match(regex);
  if (!match) return null;
  return keys.reduce<RouteParams>((params, key, index) => {
    params[key] = decodeURIComponent(match[index + 1] || '');
    return params;
  }, {});
}

function matchRoutePrefix(route: Route, location: RouteLocation): RouteParams | null {
  const patternSegments = normalizePath(route.path).split('/').filter(Boolean);
  const locationSegments = normalizePath(location.path).split('/').filter(Boolean);
  if (locationSegments.length < patternSegments.length) return null;
  const prefixLocation = { ...location, path: `/${locationSegments.slice(0, patternSegments.length).join('/')}` };
  return matchRoute(route, prefixLocation);
}

export class Router<AppContext = unknown> {
  private routes: Route[] = [];
  private listeners = new Set<Listener>();
  private current: RouteLocation | null = null;
  private started = false;
  private navigationToken = 0;
  private readonly options: RouterOptions<AppContext>;
  private readonly popstateHandler = () => { void this.resolve(this.readBrowserPath(), false); };

  constructor(routes: readonly Route[] = [], options: RouterOptions<AppContext> = {}) {
    this.routes = [...routes];
    this.options = options;
  }

  addRoute(route: Route): this {
    this.routes.push(route);
    return this;
  }

  removeRoute(path: string): boolean {
    const index = this.routes.findIndex(route => route.path === path);
    if (index < 0) return false;
    this.routes.splice(index, 1);
    return true;
  }

  get routesList(): readonly Route[] { return this.routes; }

  /** Return a serializable manifest for SSR preload links and client route planning. */
  getManifest(): RouteManifest { return createRouteManifest(this.routes); }

  getCurrentPath(): string {
    return this.current?.path ?? (this.readBrowserPath().split(/[?#]/)[0] || '/');
  }

  getCurrentLocation(): RouteLocation | null { return this.current; }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    const unsubscribe = () => this.listeners.delete(listener);
    onScopeDispose(unsubscribe);
    return unsubscribe;
  }

  start(): Promise<MatchedRoute | null> {
    if (this.started) return Promise.resolve(this.current ? this.match(this.current) : null);
    this.started = true;
    if (typeof window !== 'undefined' && this.options.mode !== 'memory') window.addEventListener('popstate', this.popstateHandler);
    return this.resolve(this.options.initialPath ?? this.readBrowserPath(), false);
  }

  stop(): void {
    if (typeof window !== 'undefined') window.removeEventListener('popstate', this.popstateHandler);
    this.navigationToken += 1;
    this.started = false;
  }

  navigate(path: string): Promise<MatchedRoute | null> {
    return this.resolve(path, true);
  }

  /** Resolve guards and route data without committing history or changing current state. */
  async prefetch(path: string): Promise<MatchedRoute | null> {
    const requested = parseLocation(this.removeBase(path));
    const matched = this.match(requested);
    const to = matched?.location ?? requested;
    const route = matched?.route ?? this.options.notFound;
    if (!route) return null;
    const records = this.recordsFor(matched, route, to);
    const context: RouteContext = { to, from: this.current, matched: records, context: this.options.context as AppContext };
    const globalGuard = await this.runGuard(this.options.beforeEach, context);
    if (globalGuard === false || typeof globalGuard === 'string') return null;
    for (const record of records) {
      const guardResult = await this.runGuard(record.route.beforeEnter, { ...context, to: record.location });
      if (guardResult === false || typeof guardResult === 'string') return null;
    }
    for (const record of records) await this.ensureLazyComponent(record.route);
    const result: MatchedRoute = matched ?? { route, location: to };
    result.matched = records;
    result.components = records.map(record => record.route.component ?? record.route.layout).filter(component => component !== undefined);
    const data: unknown[] = [];
    for (const record of records) {
      if (!record.route.loader) { data.push(undefined); continue; }
      const loaded = await this.loadRoute(record, context, 'route-prefetch');
      data.push(loaded);
    }
    result.dataByRoute = data;
    result.data = data[data.length - 1];
    return result;
  }

  back(): void { if (typeof window !== 'undefined' && this.options.mode !== 'memory') window.history.back(); }
  forward(): void { if (typeof window !== 'undefined' && this.options.mode !== 'memory') window.history.forward(); }

  async resolve(input: string, push = false): Promise<MatchedRoute | null> {
    const navigationToken = ++this.navigationToken;
    const isCurrentNavigation = () => navigationToken === this.navigationToken;
    const requested = parseLocation(this.removeBase(input));
    const matched = this.match(requested);
    const to = matched?.location ?? requested;
    const from = this.current;
    const route = matched?.route ?? this.options.notFound;
    emitDevToolsEvent({ type: 'router:navigation', phase: 'start', to: to.fullPath, from: from?.fullPath ?? null });
    const baseContext: RouteContext = { to, from, context: this.options.context as AppContext };
    const guardResult = await this.runGuard(this.options.beforeEach, baseContext);
    if (!isCurrentNavigation()) return null;
    if (guardResult === false) return null;
    if (typeof guardResult === 'string' && guardResult !== to.fullPath) return this.resolve(guardResult, true);
    if (!route) {
      this.current = to;
      this.notify(to, from);
      return null;
    }
    const records = this.recordsFor(matched, route, to);
    const context: RouteContext = { ...baseContext, matched: records };
    for (const record of records) {
      const routeGuard = await this.runGuard(record.route.beforeEnter, { ...context, to: record.location });
      if (!isCurrentNavigation()) return null;
      if (routeGuard === false) return null;
      if (typeof routeGuard === 'string' && routeGuard !== to.fullPath) return this.resolve(routeGuard, true);
    }
    for (const record of records) {
      await this.ensureLazyComponent(record.route);
      if (!isCurrentNavigation()) return null;
    }
    const result: MatchedRoute = matched ?? { route, location: to };
    result.matched = records;
    result.components = records.map(record => record.route.component ?? record.route.layout).filter(component => component !== undefined);
    const data: unknown[] = [];
    try {
      for (const record of records) {
        if (!record.route.loader) { data.push(undefined); continue; }
        const loaded = await this.loadRoute(record, context, 'route-loader');
        data.push(loaded);
        if (!isCurrentNavigation()) return null;
      }
    } catch (error) {
      emitDevToolsEvent({ type: 'router:navigation', phase: 'error', to: to.fullPath, from: from?.fullPath ?? null, route: route.path, error });
      throw error;
    }
    result.dataByRoute = data;
    result.data = data[data.length - 1];
    if (!isCurrentNavigation()) return null;
    if (push) this.commit(to);
    this.current = to;
    this.updateHead(records);
    if (route.handler) await route.handler({ ...context, to });
    if (!isCurrentNavigation()) return null;
    await this.options.scrollBehavior?.(to, from);
    if (!isCurrentNavigation()) return null;
    this.notify(to, from);
    this.options.afterEach?.({ to: context.to, from: context.from, context: context.context, matched: result, routeMatches: records });
    emitDevToolsEvent({ type: 'router:navigation', phase: 'success', to: to.fullPath, from: from?.fullPath ?? null, route: route.path });
    return result;
  }

  private match(location: RouteLocation): MatchedRoute | null {
    type SearchResult = { route: Route; location: RouteLocation; matched: RouteMatch[] };
    const search = (routes: readonly Route[], parentPath = '', parentMatches: RouteMatch[] = []): SearchResult | null => {
      for (const route of routes) {
        const fullPattern = parentPath
          ? `${parentPath.replace(/\/$/, '')}/${route.path.replace(/^\//, '')}`
          : route.path;
        const routeWithFullPath = { ...route, path: fullPattern };
        const exactParams = matchRoute(routeWithFullPath, location);
        const prefixParams = route.children ? matchRoutePrefix(routeWithFullPath, location) : null;
        if (prefixParams && route.children) {
          const parentLocation = { ...location, params: { ...prefixParams } };
          const childMatch = search(route.children, normalizePath(fullPattern), [
            ...parentMatches,
            { route, location: parentLocation },
          ]);
          if (childMatch) {
            const params = { ...prefixParams, ...childMatch.location.params };
            const mergedLocation = { ...childMatch.location, params };
            return {
              route: childMatch.route,
              location: mergedLocation,
              matched: childMatch.matched.map(match => ({ ...match, location: { ...match.location, params } })),
            };
          }
        }
        if (!exactParams) continue;
        const matchedLocation = { ...location, params: exactParams };
        return {
          route,
          location: matchedLocation,
          matched: [...parentMatches, { route, location: matchedLocation }],
        };
      }
      return null;
    };
    const result = search(this.routes);
    if (!result) return null;
    return { route: result.route, location: result.location, matched: result.matched };
  }

  private recordsFor(matched: MatchedRoute | null, route: Route, location: RouteLocation): RouteMatch[] {
    return matched?.matched ? [...matched.matched] : [{ route, location }];
  }

  private async loadRoute(record: RouteMatch, context: RouteContext, boundaryContext: string): Promise<unknown> {
    const load = async (): Promise<unknown> => {
      const runLoader = () => record.route.loader!({ ...context, to: record.location });
      return this.options.queryClient && record.route.queryKey !== undefined
        ? await this.options.queryClient.fetch(this.resolveQueryKey(record.route.queryKey, { ...context, to: record.location }), runLoader, record.route.queryOptions)
        : await runLoader();
    };
    const guarded = this.options.errorBoundary
      ? this.options.errorBoundary.renderAsync(load, boundaryContext)
      : load();
    return this.options.loadingBoundary
      ? await this.options.loadingBoundary.run(async () => await guarded)
      : await guarded;
  }

  private resolveQueryKey(key: RouteQueryKey, context: RouteContext): QueryKey {
    return typeof key === 'function' ? key(context) : key;
  }

  private async runGuard(guard: RouteGuard | undefined, context: RouteContext): Promise<NavigationResult> {
    return guard ? guard(context) : undefined;
  }

  private async ensureLazyComponent(route: Route): Promise<void> {
    if (!route.lazy || route.component !== undefined) return;
    const loaded = await route.lazy();
    route.component = loaded && typeof loaded === 'object' && 'default' in loaded
      ? (loaded as { default: unknown }).default
      : loaded;
  }

  private updateHead(records: readonly RouteMatch[]): void {
    if (!this.options.head) return;
    const metadata: HeadMetadata = {};
    for (const record of records) {
      const next = record.route.head;
      if (!next) continue;
      const previousOpenGraph = metadata.openGraph;
      const previousTwitter = metadata.twitter;
      Object.assign(metadata, next);
      if (next.openGraph) metadata.openGraph = { ...previousOpenGraph, ...next.openGraph };
      if (next.twitter) metadata.twitter = { ...previousTwitter, ...next.twitter };
    }
    this.options.head.set(metadata);
  }

  private notify(to: RouteLocation, from: RouteLocation | null): void {
    this.listeners.forEach(listener => listener(to, from));
  }

  private applyBase(path: string): string {
    const rawBase = this.options.base?.trim() ?? '';
    const base = rawBase ? normalizePath(rawBase) : '';
    if (base === '/' || path === base || path.startsWith(`${base}/`)) return path;
    return `${base}/${path.replace(/^\//, '')}`;
  }

  private removeBase(path: string): string {
    const rawBase = this.options.base?.trim() ?? '';
    const base = rawBase ? normalizePath(rawBase) : '';
    if (!base || base === '/' ) return path;
    if (path === base) return '/';
    if (path.startsWith(`${base}/`)) return path.slice(base.length) || '/';
    return path;
  }

  private readBrowserPath(): string {
    if (typeof window === 'undefined') return this.options.initialPath ?? '/';
    if (this.options.mode === 'hash') return this.removeBase(window.location.hash.slice(1) || '/');
    return this.removeBase(`${window.location.pathname}${window.location.search}${window.location.hash}`);
  }

  private commit(location: RouteLocation): void {
    if (typeof window === 'undefined' || this.options.mode === 'memory') return;
    const target = this.applyBase(location.fullPath);
    if (this.options.mode === 'hash') window.history.pushState({}, '', `#${target}`);
    else window.history.pushState({}, '', target);
  }
}

export function createRouter<AppContext = unknown>(routes: readonly Route[] = [], options: RouterOptions<AppContext> = {}): Router<AppContext> {
  return new Router<AppContext>(routes, options);
}

export const router = new Router();
