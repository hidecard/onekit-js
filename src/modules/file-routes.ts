import type { Route, RouteParams } from './router';

export type FileRouteModule =
  | Route
  | {
      default?: unknown;
      route?: Omit<Route, 'path'> & { path?: string };
    };

export interface FileRouteOptions {
  /** Prefix removed before converting a module key into a route path. */
  root?: string;
  /** Keep route-module files whose names begin with an underscore. */
  includePrivate?: boolean;
}

export type FileRouteKind = 'route' | 'layout' | 'middleware';

export interface FileRouteManifestEntry {
  path: string;
  file: string;
  kind: FileRouteKind;
  parentPath?: string;
  dynamic?: boolean;
  catchAll?: boolean;
  optional?: boolean;
}

export interface FileRouteManifest {
  version: 1;
  root: string;
  routes: readonly FileRouteManifestEntry[];
  layouts: readonly FileRouteManifestEntry[];
  middleware: readonly FileRouteManifestEntry[];
}

export interface FileRouteConflict {
  path: string;
  files: readonly string[];
}

export interface FileRouteAssociation {
  path: string;
  layouts: readonly string[];
  middleware: readonly string[];
}

export interface FileRouteManifestOptions extends FileRouteOptions {
  /** Include layout and middleware convention files in the manifest. */
  includeInfrastructure?: boolean;
}

export type TypedRoute<Path extends string, Data = unknown, AppContext = unknown> = Omit<Route<RouteParamsFor<Path>, Data, AppContext>, 'path'> & { path: Path };

export type RouteDataFor<R extends Route> = R extends Route<RouteParams, infer Data, unknown> ? Data : unknown;
export type RouteContextFor<Path extends string, AppContext = unknown> = import('./router').RouteContext<RouteParamsFor<Path>, AppContext>;

type LoaderDataForDefinition<Definition> = Definition extends { loader?: infer Loader }
  ? Loader extends (...args: never[]) => infer Result ? Awaited<Result> : unknown
  : unknown;

type SegmentParams<Segment extends string> = Segment extends `:${infer Param}`
  ? Param extends `${infer Name}?`
    ? { [Key in Name]?: string }
    : { [Key in Param]: string }
  : Segment extends '*?'
    ? { wildcard?: string }
    : Segment extends '*'
      ? { wildcard: string }
      : Record<never, never>;

export type ExtractRouteParams<Path extends string> = string extends Path
  ? Record<string, string>
  : Path extends `${infer Segment}/${infer Rest}`
    ? SegmentParams<Segment> & ExtractRouteParams<Rest>
    : SegmentParams<Path>;

export type RouteParamsFor<Path extends string> = ExtractRouteParams<Path>;

export type LayoutRoute<Path extends string, Children extends readonly Route[]> = TypedRoute<Path> & {
  layout: unknown;
  children: Children;
};

/**
 * Preserve a route literal so TypeScript can retain its path type in generated
 * route tables while keeping the runtime representation compatible with Route.
 */
export function defineRoute<
  const Path extends string,
  const Definition extends Omit<Route<RouteParamsFor<Path>, any, unknown>, 'path'>,
>(
  path: Path,
  route: Definition = {} as Definition,
): TypedRoute<Path, LoaderDataForDefinition<Definition>> {
  return { ...route, path } as TypedRoute<Path, LoaderDataForDefinition<Definition>>;
}

/** Define a parent route whose component is composed around its child matches. */
export function defineLayoutRoute<const Path extends string, const Children extends readonly Route[], AppContext = unknown>(
  path: Path,
  layout: unknown,
  children: Children,
  route: Omit<Route<RouteParamsFor<Path>, any, AppContext>, 'path' | 'layout' | 'children'> = {},
): LayoutRoute<Path, Children> {
  return { ...route, path, layout, children: [...children] } as LayoutRoute<Path, Children>;
}

/** Convert a file-system-like module key into a router path. */
function fileRouteKind(filePath: string): FileRouteKind {
  const name = filePath.replace(/\\/g, '/').split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
  if (name === 'middleware' || name === '_middleware') return 'middleware';
  if (name === 'layout' || name === '_layout') return 'layout';
  return 'route';
}

function routeManifestEntry(filePath: string, options: FileRouteManifestOptions): FileRouteManifestEntry {
  const kind = fileRouteKind(filePath);
  const conventionPath = kind === 'route' ? filePath : filePath.replace(/[\\/]([^\\/]+)$/, '');
  const path = filePathToRoutePath(conventionPath, options.root ?? '');
  const relative = path.replace(/^\//, '');
  const segments = relative.split('/').filter(Boolean);
  const dynamicSegments = segments.filter(segment => segment.startsWith(':') || segment === '*' || segment === '*?');
  const entry: FileRouteManifestEntry = {
    path,
    file: filePath,
    kind,
    ...(segments.length > 1 ? { parentPath: `/${segments.slice(0, -1).join('/')}` } : {}),
    ...(dynamicSegments.length ? { dynamic: true } : {}),
    ...(dynamicSegments.some(segment => segment === '*' || segment === '*?') ? { catchAll: true } : {}),
    ...(dynamicSegments.some(segment => segment === '*?') ? { optional: true } : {}),
  };
  return entry;
}

/** Find page files that normalize to the same or an ambiguous URL pattern. */
export function findFileRouteConflicts(manifest: FileRouteManifest): readonly FileRouteConflict[] {
  const entriesByPattern = new Map<string, FileRouteManifestEntry[]>();
  const canonicalPath = (path: string): string => path
    .replace(/:[^/]+/g, ':param')
    .replace(/\*\?/g, '*?')
    .replace(/\*/g, '*');
  for (const entry of manifest.routes) {
    const entries = entriesByPattern.get(canonicalPath(entry.path)) ?? [];
    entries.push(entry);
    entriesByPattern.set(canonicalPath(entry.path), entries);
  }
  return [...entriesByPattern.values()]
    .filter(entries => entries.length > 1)
    .map(entries => ({
      path: entries[0].path,
      files: entries.map(entry => entry.file).sort(),
    }))
    .sort((left, right) => left.path.localeCompare(right.path));
}

/** Return explicit directory-scoped layout/middleware metadata without composing it. */
export function createFileRouteAssociations(manifest: FileRouteManifest): readonly FileRouteAssociation[] {
  const containing = (entry: FileRouteManifestEntry, kind: 'layouts' | 'middleware'): string[] => manifest[kind]
    .filter(candidate => candidate.path === entry.path || entry.path === '/' || entry.path.startsWith(`${candidate.path}/`))
    .sort((left, right) => left.path.localeCompare(right.path) || left.file.localeCompare(right.file))
    .map(candidate => candidate.file);
  return manifest.routes.map(entry => ({
    path: entry.path,
    layouts: containing(entry, 'layouts'),
    middleware: containing(entry, 'middleware'),
  }));
}

export function createFileRouteManifest(
  filePaths: readonly string[],
  options: FileRouteManifestOptions = {},
): FileRouteManifest {
  const entries = filePaths
    .filter(filePath => options.includePrivate || !filePath.split(/[\\/]/).some(segment => segment.startsWith('_') && !/^_?(?:layout|middleware)(?:\.[^.]+)?$/.test(segment)))
    .map(filePath => routeManifestEntry(filePath, options))
    .filter(entry => options.includeInfrastructure || entry.kind === 'route')
    .sort((left, right) => left.path.localeCompare(right.path) || left.kind.localeCompare(right.kind) || left.file.localeCompare(right.file));
  return {
    version: 1,
    root: options.root ?? '',
    routes: entries.filter(entry => entry.kind === 'route'),
    layouts: entries.filter(entry => entry.kind === 'layout'),
    middleware: entries.filter(entry => entry.kind === 'middleware'),
  };
}

export function filePathToRoutePath(filePath: string, root = ''): string {
  let value = filePath.replace(/\\/g, '/');
  if (root) {
    const normalizedRoot = root.replace(/\\/g, '/').replace(/\/$/, '');
    if (value === normalizedRoot) value = '';
    else if (value.startsWith(`${normalizedRoot}/`)) value = value.slice(normalizedRoot.length + 1);
  }
  value = value.replace(/^\.\//, '').replace(/\.(?:[cm]?[jt]sx?|vue|svelte)$/i, '');
  const segments = value.split('/').filter(Boolean);
  const routeSegments: string[] = [];
  for (const segment of segments) {
    if (/^(?:index|page)$/.test(segment)) continue;
    if (segment === '_layout' || segment === 'layout' || /^\(.+\)$/.test(segment)) continue;
    if (/^\[\[\.\.\.(.+)\]\]$/.test(segment)) {
      routeSegments.push('*?');
      continue;
    }
    if (/^\[\.\.\.(.+)\]$/.test(segment)) {
      routeSegments.push('*');
      continue;
    }
    const dynamic = segment.match(/^\[(.+)\]$/);
    routeSegments.push(dynamic ? `:${dynamic[1]}` : segment);
  }
  return routeSegments.length ? `/${routeSegments.join('/')}` : '/';
}

function isRoute(value: FileRouteModule): value is Route {
  return typeof value === 'object' && value !== null && 'path' in value && typeof value.path === 'string';
}

/**
 * Convert an import.meta.glob-style module map into ordinary OneKit routes.
 * The function is runtime-only and works in browser bundles because it does
 * not access fs; callers provide the module map generated by their bundler.
 */
export function createFileRoutes(
  modules: Record<string, FileRouteModule>,
  options: FileRouteOptions = {},
): Route[] {
  const root = options.root ?? '';
  return Object.entries(modules)
    .filter(([filePath]) => options.includePrivate || !filePath.split('/').some(segment => segment.startsWith('_')))
    .map(([filePath, module]) => {
      if (isRoute(module)) return module;
      const route = module.route ?? {};
      const component = module.default ?? route.component;
      return {
        ...route,
        path: route.path ?? filePathToRoutePath(filePath, root),
        ...(component !== undefined ? { component } : {}),
      } as Route;
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

/** Build a URL from a route pattern and named params. */
export function routeHref<const Path extends string>(path: Path): string;
export function routeHref<const Path extends string>(path: Path, params: RouteParamsFor<Path> & Record<string, string | number>): string;
export function routeHref<const Path extends string>(path: Path, params: Record<string, string | number> = {}): string {
  let result = path.replace(/\/:([A-Za-z0-9_]+)\?/g, (_, key: string) => {
    const value = params[key];
    return value === undefined ? '' : `/${encodeURIComponent(String(value))}`;
  });
  result = result.replace(/\/:([A-Za-z0-9_]+)/g, (_, key: string) => `/${encodeURIComponent(String(params[key] ?? ''))}`);
  result = result.replace(/\/\*\?/g, params.wildcard === undefined ? '' : `/${encodeURIComponent(String(params.wildcard))}`);
  result = result.replace(/\*/g, encodeURIComponent(String(params.wildcard ?? '')));
  return result || '/';
}
