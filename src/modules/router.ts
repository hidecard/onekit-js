/* OneKit style: explicit, browser-first navigation with small composable contracts and no hidden global state in application routers. */

import { emitDevToolsEvent } from '../core/devtools';
import { onScopeDispose } from '../core/scope';
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
  afterEach?: (context: RouteContext & { matched: MatchedRoute | null }) => void;
  errorBoundary?: ErrorBoundary<unknown>;
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

function sameLocation(a: RouteLocation | null, b: RouteLocation): boolean {
  return !!a && a.fullPath === b.fullPath;
}

export class Router {
  private routes: Route[] = [];
  private listeners = new Set<Listener>();
  private current: RouteLocation | null = null;
  private started = false;
  private navigationToken = 0;
  private readonly options: RouterOptions;
  private readonly popstateHandler = () => { void this.resolve(this.readBrowserPath(), false); };

  constructor(routes: Route[] = [], options: RouterOptions = {}) {
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

  back(): void { if (typeof window !== 'undefined' && this.options.mode !== 'memory') window.history.back(); }
  forward(): void { if (typeof window !== 'undefined' && this.options.mode !== 'memory') window.history.forward(); }

  async resolve(input: string, push = false): Promise<MatchedRoute | null> {
    const navigationToken = ++this.navigationToken;
    const isCurrentNavigation = () => navigationToken === this.navigationToken;
    const to = parseLocation(this.removeBase(input));
    const matched = this.match(to);
    const from = this.current;
    const context: RouteContext = { to, from };
    emitDevToolsEvent({ type: 'router:navigation', phase: 'start', to: to.fullPath, from: from?.fullPath ?? null });
    const guardResult = await this.runGuard(this.options.beforeEach, context);
    if (!isCurrentNavigation()) return null;
    if (guardResult === false) {
      emitDevToolsEvent({ type: 'router:navigation', phase: 'cancel', to: to.fullPath, from: from?.fullPath ?? null });
      return null;
    }
    if (typeof guardResult === 'string' && guardResult !== to.fullPath) {
      emitDevToolsEvent({ type: 'router:navigation', phase: 'cancel', to: to.fullPath, from: from?.fullPath ?? null });
      return this.resolve(guardResult, true);
    }
    const route = matched?.route ?? this.options.notFound;
    if (!route) {
      this.current = to;
      this.notify(to, from);
      return null;
    }
    const routeGuard = await this.runGuard(route.beforeEnter, context);
    if (!isCurrentNavigation()) return null;
    if (routeGuard === false) {
      emitDevToolsEvent({ type: 'router:navigation', phase: 'cancel', to: to.fullPath, from: from?.fullPath ?? null, route: route.path });
      return null;
    }
    if (typeof routeGuard === 'string' && routeGuard !== to.fullPath) {
      emitDevToolsEvent({ type: 'router:navigation', phase: 'cancel', to: to.fullPath, from: from?.fullPath ?? null, route: route.path });
      return this.resolve(routeGuard, true);
    }
    const result: MatchedRoute = matched ?? { route, location: to };
    if (route.loader) {
      try {
        const load = () => route.loader!(context);
        if (this.options.errorBoundary) {
          result.data = await this.options.errorBoundary.renderAsync(async () => await load(), 'route-loader');
          if (this.options.errorBoundary.state.error) {
            emitDevToolsEvent({
              type: 'router:navigation',
              phase: 'error',
              to: to.fullPath,
              from: from?.fullPath ?? null,
              route: route.path,
              error: this.options.errorBoundary.state.error,
            });
          }
        } else {
          result.data = await load();
        }
        if (!isCurrentNavigation()) return null;
      } catch (error) {
        emitDevToolsEvent({ type: 'router:navigation', phase: 'error', to: to.fullPath, from: from?.fullPath ?? null, route: route.path, error });
        throw error;
      }
    }
    if (!isCurrentNavigation()) return null;
    if (push) this.commit(to);
    this.current = to;
    if (route.handler) await route.handler({ ...context, to });
    this.notify(to, from);
    this.options.afterEach?.({ ...context, matched: result });
    emitDevToolsEvent({ type: 'router:navigation', phase: 'success', to: to.fullPath, from: from?.fullPath ?? null, route: route.path });
    return result;
  }

  private match(location: RouteLocation): MatchedRoute | null {
    const search = (routes: Route[], parentPath = ''): MatchedRoute | null => {
      for (const route of routes) {
        const fullPattern = parentPath
          ? `${parentPath.replace(/\/$/, '')}/${route.path.replace(/^\//, '')}`
          : route.path;
        const routeWithFullPath = { ...route, path: fullPattern };
        const exactParams = matchRoute(routeWithFullPath, location);
        const prefixParams = route.children ? matchRoutePrefix(routeWithFullPath, location) : null;
        const childMatch = prefixParams && route.children ? search(route.children, normalizePath(fullPattern)) : null;
        if (childMatch) {
          return {
            route: childMatch.route,
            location: { ...childMatch.location, params: { ...prefixParams, ...childMatch.location.params } },
          };
        }
        const params = exactParams;
        if (!params) continue;
        return { route, location: { ...location, params } };
      }
      return null;
    };
    return search(this.routes);
  }

  private async runGuard(guard: RouteGuard | undefined, context: RouteContext): Promise<NavigationResult> {
    return guard ? guard(context) : undefined;
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

export function createRouter(routes: Route[] = [], options: RouterOptions = {}): Router {
  return new Router(routes, options);
}

export const router = new Router();
