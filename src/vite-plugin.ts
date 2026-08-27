import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve as resolvePath } from 'node:path';
import * as typescript from 'typescript';
import { compileOkjs } from './okjs';
import { createFileRouteAssociations, createFileRouteManifest, findFileRouteConflicts } from './modules/file-routes';
import { prerenderRoutes, type PrerenderPaths, type PrerenderRenderContext, type PrerenderValue, type PrerenderedPage } from './modules/prerender';

export interface OneKitFileRoutePrerenderOptions {
  /** Concrete URL paths or an application-owned build-time path factory. */
  paths: PrerenderPaths;
  /** Application-owned path renderer; loaders and authorization remain explicit. */
  render: (context: PrerenderRenderContext) => PrerenderValue | Promise<PrerenderValue>;
  /** Optional output directory for `<path>/index.html` files. */
  outputDir?: string;
  /** Optional callback for upload, manifest, or custom output handling. */
  onPage?: (page: PrerenderedPage) => void | Promise<void>;
}

export interface OneKitFileRoutesOptions {
  /** Project-relative route directory, for example `/src/app` or `src/pages`. */
  root: string;
  /** File extensions included in route discovery. */
  include?: RegExp;
  /** File extensions used when include is not supplied. */
  extensions?: readonly string[];
  /** Include `_layout`, `layout`, `_middleware`, and `middleware` metadata entries. */
  includeInfrastructure?: boolean;
  /** Import path exposed by the generated virtual module. */
  virtualModuleId?: string;
  /** Declaration-only virtual module path; defaults to `<virtualModuleId>.d.ts`. */
  typesVirtualModuleId?: string;
  /** Optional build-time callback for explicitly handling the generated manifest. */
  onManifest?: (manifest: ReturnType<typeof createFileRouteManifest>) => void;
  /** Optional build-time prerendering of application-selected concrete paths. */
  prerender?: OneKitFileRoutePrerenderOptions;
}

export interface OneKitComponentBoundaryOptions {
  /** Throw on client-to-server transitive static imports during the build. Defaults to true. */
  strict?: boolean;
  /** Recognize explicit `server-only`/`client-only` side-effect marker imports. */
  markers?: boolean;
}

export interface OneKitVitePluginOptions {
  include?: RegExp;
  exclude?: RegExp;
  onUpdate?: (file: string) => void;
  /** Generate a deterministic virtual route table from project files when configured. */
  fileRoutes?: OneKitFileRoutesOptions;
  /** Validate `"use client"`/`"use server"` static import boundaries when configured. */
  componentBoundary?: boolean | OneKitComponentBoundaryOptions;
}

interface OneKitModuleInfo {
  id: string;
  importedModules?: readonly OneKitModuleInfo[];
  dynamicallyImportedModules?: readonly OneKitModuleInfo[];
}

export interface OneKitVitePlugin {
  name: string;
  enforce?: 'pre' | 'post';
  apply?: 'serve' | 'build';
  resolveId?: (source: string, importer?: string) => string | undefined;
  load?: (id: string) => { code: string; map: null } | undefined;
  transform?: (code: string, id: string) => { code: string; map: null } | undefined;
  configResolved?: (config: { root: string }) => void;
  moduleParsed?: (module: OneKitModuleInfo) => void;
  buildEnd?: () => void;
  closeBundle?: () => void | Promise<void>;
  handleHotUpdate?: (context: { file: string; modules: unknown[]; server: { ws: { send: (message: unknown) => void } } }) => unknown[];
}

type ComponentBoundary = 'client' | 'server' | 'shared';

function compileOkjsForVite(source: string, id: string): { code: string; map: null } {
  const compiled = compileOkjs(source, id);
  const transpiled = typescript.transpileModule(compiled.code, {
    compilerOptions: {
      module: typescript.ModuleKind.ESNext,
      target: typescript.ScriptTarget.ES2020,
      sourceMap: false,
    },
    fileName: id,
  });
  return { code: transpiled.outputText, map: null };
}

function cleanId(id: string): string { return id.split('?')[0]; }

function detectComponentBoundary(code: string, markers = true): ComponentBoundary {
  const header = code.slice(0, 4096).replace(/^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)+/, '');
  const hasClientDirective = /^["']use client["'];?/.test(header);
  const hasServerDirective = /^["']use server["'];?/.test(header);
  const hasClientMarker = markers && /import\s+(?:['"]client-only['"]|[^;]*from\s+['"]client-only['"])/.test(header);
  const hasServerMarker = markers && /import\s+(?:['"]server-only['"]|[^;]*from\s+['"]server-only['"])/.test(header);
  const isClient = hasClientDirective || hasClientMarker;
  const isServer = hasServerDirective || hasServerMarker;
  if (isClient && isServer) throw new Error('OneKit component boundary violation: a module cannot declare both client and server boundaries');
  return isClient ? 'client' : isServer ? 'server' : 'shared';
}

function discoverFiles(root: string, include: RegExp): string[] {
  if (!statSafe(root)?.isDirectory()) return [];
  const result: string[] = [];
  const visit = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = resolvePath(directory, entry.name);
      if (entry.isDirectory()) visit(file);
      else if (entry.isFile() && include.test(file)) result.push(file);
    }
  };
  visit(root);
  return result.sort((left, right) => left.localeCompare(right));
}

function statSafe(file: string): ReturnType<typeof statSync> | undefined {
  try { return statSync(file); } catch { return undefined; }
}

function projectSourcePath(file: string, projectRoot: string): string {
  const value = relative(projectRoot, file).replace(/\\/g, '/');
  return `/${value}`;
}

function manifestRoot(root: string): string {
  const normalized = root.replace(/\\/g, '/').replace(/\/$/, '');
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function extensionPattern(extensions: readonly string[] | undefined): RegExp {
  const values = (extensions?.length ? extensions : ['ts', 'tsx', 'js', 'jsx', 'vue', 'svelte', 'okjs'])
    .map(extension => extension.replace(/^\./, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  return new RegExp(`\\.(?:${values.join('|')})$`, 'i');
}

function prerenderOutputFile(outputDir: string, path: string): string {
  const pathname = path.split(/[?#]/, 1)[0] || '/';
  const segments = pathname.split('/').filter(Boolean);
  if (segments.some(segment => segment === '.' || segment === '..' || segment.includes('\\') || segment.includes('\0'))) {
    throw new TypeError(`Unsafe prerender output path: ${path}`);
  }
  return resolvePath(outputDir, ...segments, 'index.html');
}

function generateFileRouteModule(
  files: readonly string[],
  options: OneKitFileRoutesOptions,
  projectRoot: string,
): string {
  const sourceFiles = files.map(file => projectSourcePath(file, projectRoot));
  const manifest = createFileRouteManifest(sourceFiles, {
    root: manifestRoot(options.root),
    includeInfrastructure: options.includeInfrastructure,
  });
  const conflicts = findFileRouteConflicts(manifest);
  if (conflicts.length) {
    const details = conflicts.map(conflict => `${conflict.path}: ${conflict.files.join(', ')}`).join('; ');
    throw new Error(`OneKit file-route conflict: multiple route files normalize to the same path (${details})`);
  }
  const associations = createFileRouteAssociations(manifest);
  const routeEntries = manifest.routes.map(entry => ({ entry, index: sourceFiles.indexOf(entry.file) })).filter(item => item.index >= 0);
  const routePaths = routeEntries.map(({ entry }) => entry.path);
  const imports = routeEntries.map(({ entry, index }) => `import * as __route${index} from ${JSON.stringify(entry.file)};`).join('\n');
  const routeBindings = routeEntries.map(({ index }) => `const __route${index}Route = Reflect.get(__route${index}, 'route');\nconst __route${index}Default = Reflect.get(__route${index}, 'default');`).join('\n');
  const routes = routeEntries.map(({ entry, index }) => `{
    ...(typeof __route${index}Route === 'object' && __route${index}Route ? __route${index}Route : {}),
    path: __route${index}Route?.path ?? ${JSON.stringify(entry.path)},
    ...(__route${index}Default !== undefined ? { component: __route${index}Default } : {}),
    ...(__route${index}Route?.component !== undefined ? { component: __route${index}Route.component } : {}),
  }`).join(',\n');
  return `${imports}\n${routeBindings}\nexport const fileRouteManifest = ${JSON.stringify(manifest)};\nexport const fileRouteEntries = fileRouteManifest.routes;\n/** @type {readonly string[]} */\nexport const fileRoutePaths = [${routePaths.map(path => JSON.stringify(path)).join(', ')}];\nexport const fileRouteAssociations = ${JSON.stringify(associations)};\nexport const fileRouteLayouts = fileRouteManifest.layouts;\nexport const fileRouteMiddleware = fileRouteManifest.middleware;\nexport const routes = [${routes}];\nexport default routes;\n`;
}

function generateFileRouteTypes(manifest: ReturnType<typeof createFileRouteManifest>): string {
  const routePathUnion = manifest.routes.length
    ? manifest.routes.map(entry => JSON.stringify(entry.path)).join(' | ')
    : 'never';
  const routeImports = manifest.routes
    .map((entry, index) => `import type * as __route${index} from ${JSON.stringify(entry.file)};`)
    .join('\n');
  const routeModuleMap = manifest.routes.length
    ? `${manifest.routes.map((entry, index) => `Path extends ${JSON.stringify(entry.path)} ? typeof __route${index}`).join(' : ')} : never`
    : 'never';
  return `${routeImports}\nimport type { FileRouteAssociation, FileRouteComponentPropsFor, FileRouteLoaderDataFor, FileRouteManifest, FileRouteManifestEntry, RouteParamsFor } from 'onekit-js';
import type { Route } from 'onekit-js/router';
export type FileRoutePath = ${routePathUnion};
export type FileRouteParams<Path extends FileRoutePath> = RouteParamsFor<Path>;
export type FileRouteModuleFor<Path extends FileRoutePath> = ${routeModuleMap};
export type FileRouteLoaderData<Path extends FileRoutePath> = FileRouteLoaderDataFor<FileRouteModuleFor<Path>>;
export type FileRouteComponentProps<Path extends FileRoutePath> = FileRouteComponentPropsFor<FileRouteModuleFor<Path>>;
export declare const fileRouteManifest: FileRouteManifest;
export declare const fileRouteEntries: readonly FileRouteManifestEntry[];
export declare const fileRoutePaths: readonly FileRoutePath[];
export declare const fileRouteAssociations: readonly FileRouteAssociation[];
export declare const fileRouteLayouts: readonly FileRouteManifestEntry[];
export declare const fileRouteMiddleware: readonly FileRouteManifestEntry[];
export declare const routes: readonly Route[];
export default routes;
`;
}

/**
 * Vite plugin for OKJS/HMR plus opt-in file-route generation and component-boundary checks.
 * The advanced capabilities are explicit so existing users retain the original plugin behavior.
 */
export function oneKitVitePlugin(options: OneKitVitePluginOptions = {}): OneKitVitePlugin {
  const include = options.include ?? /\.(ts|tsx|js|jsx|vue|svelte|okjs|html)$/;
  const exclude = options.exclude ?? /node_modules/;
  let projectRoot = process.cwd();
  const boundaryById = new Map<string, ComponentBoundary>();
  const importsById = new Map<string, Set<string>>();
  const configuredBoundary = options.componentBoundary !== undefined;
  const strictBoundary = typeof options.componentBoundary === 'object' ? options.componentBoundary.strict !== false : true;
  const boundaryMarkers = typeof options.componentBoundary === 'object' ? options.componentBoundary.markers !== false : true;
  const virtualId = options.fileRoutes?.virtualModuleId ?? 'virtual:onekit/routes';
  const typesVirtualId = options.fileRoutes?.typesVirtualModuleId ?? `${virtualId}.d.ts`;
  const resolvedVirtualId = `\0${virtualId}`;
  const resolvedTypesVirtualId = `\0${typesVirtualId}`;
  const isOkjs = (id: string) => cleanId(id).endsWith('.okjs') && !exclude.test(id);
  const recordBoundary = (code: string, id: string): void => {
    if (!configuredBoundary || exclude.test(id)) return;
    boundaryById.set(cleanId(id), detectComponentBoundary(code, boundaryMarkers));
  };

  return {
    name: 'onekit-v3-hmr',
    enforce: 'pre',
    configResolved(config) {
      projectRoot = config.root;
    },
    resolveId(source, importer) {
      if (source === virtualId) return resolvedVirtualId;
      if (source === typesVirtualId) return resolvedTypesVirtualId;
      if (!isOkjs(source)) return undefined;
      const cleanSource = cleanId(source);
      if (cleanSource.startsWith('/') && !cleanSource.startsWith('//')) return resolvePath(projectRoot, `.${cleanSource}`);
      if (cleanSource.startsWith('.') && importer) return resolvePath(dirname(cleanId(importer)), cleanSource);
      return undefined;
    },
    load(id) {
      if (id === resolvedTypesVirtualId && options.fileRoutes) {
        const configured = options.fileRoutes;
        const root = configured.root.startsWith('/') ? resolvePath(projectRoot, `.${configured.root}`) : resolvePath(projectRoot, configured.root);
        const files = discoverFiles(root, configured.include ?? extensionPattern(configured.extensions));
        const manifest = createFileRouteManifest(files.map(file => projectSourcePath(file, projectRoot)), {
          root: manifestRoot(configured.root),
          includeInfrastructure: configured.includeInfrastructure,
        });
        return { code: generateFileRouteTypes(manifest), map: null };
      }
      if (id === resolvedVirtualId && options.fileRoutes) {
        const configured = options.fileRoutes;
        const root = configured.root.startsWith('/') ? resolvePath(projectRoot, `.${configured.root}`) : resolvePath(projectRoot, configured.root);
        const files = discoverFiles(root, configured.include ?? extensionPattern(configured.extensions));
        const manifest = createFileRouteManifest(files.map(file => projectSourcePath(file, projectRoot)), {
          root: manifestRoot(configured.root),
          includeInfrastructure: configured.includeInfrastructure,
        });
        configured.onManifest?.(manifest);
        return { code: generateFileRouteModule(files, configured, projectRoot), map: null };
      }
      if (!isOkjs(id)) return undefined;
      return compileOkjsForVite(readFileSync(cleanId(id), 'utf8'), id);
    },
    transform(code, id) {
      recordBoundary(code, id);
      if (!isOkjs(id) || code.includes('const __okjsComponent = __okjsDefineComponent')) return undefined;
      return compileOkjsForVite(code, id);
    },
    moduleParsed(module) {
      if (!configuredBoundary) return;
      const id = cleanId(module.id);
      const imported = new Set<string>();
      for (const child of module.importedModules ?? []) {
        if (child?.id) imported.add(cleanId(child.id));
      }
      importsById.set(id, imported);
    },
    buildEnd() {
      if (!configuredBoundary || !strictBoundary) return;
      const reachesServer = (id: string, visiting: Set<string>): string | undefined => {
        if (boundaryById.get(id) === 'server') return id;
        if (visiting.has(id)) return undefined;
        const next = new Set(visiting).add(id);
        for (const imported of importsById.get(id) ?? []) {
          const server = reachesServer(imported, next);
          if (server) return server;
        }
        return undefined;
      };
      for (const [id, boundary] of boundaryById) {
        if (boundary !== 'client') continue;
        for (const imported of importsById.get(id) ?? []) {
          const server = reachesServer(imported, new Set([id]));
          if (server) {
            throw new Error(`OneKit component boundary violation: client module ${id} statically imports server module ${server} (reaches server module through a transitive static path). Move the import behind a server-owned boundary or mark the shared module explicitly.`);
          }
        }
      }
    },
    async closeBundle() {
      const configured = options.fileRoutes;
      if (!configured?.prerender) return;
      const root = configured.root.startsWith('/') ? resolvePath(projectRoot, `.${configured.root}`) : resolvePath(projectRoot, configured.root);
      const files = discoverFiles(root, configured.include ?? extensionPattern(configured.extensions));
      const manifest = createFileRouteManifest(files.map(file => projectSourcePath(file, projectRoot)), {
        root: manifestRoot(configured.root),
        includeInfrastructure: configured.includeInfrastructure,
      });
      const outputDir = configured.prerender.outputDir
        ? (configured.prerender.outputDir.startsWith('/')
          ? resolvePath(configured.prerender.outputDir)
          : resolvePath(projectRoot, configured.prerender.outputDir))
        : undefined;
      await prerenderRoutes({
        paths: configured.prerender.paths,
        manifest,
        render: configured.prerender.render,
        onPage: async page => {
          if (outputDir) {
            const outputFile = prerenderOutputFile(outputDir, page.path);
            mkdirSync(dirname(outputFile), { recursive: true });
            writeFileSync(outputFile, page.html, 'utf8');
          }
          await configured.prerender?.onPage?.(page);
        },
      });
    },
    handleHotUpdate({ file, modules, server }) {
      if (!include.test(file) || exclude.test(file)) return modules;
      options.onUpdate?.(file);
      server.ws.send({
        type: 'custom',
        event: 'onekit:hmr-update',
        data: {
          file,
          timestamp: Date.now(),
          kind: file.endsWith('.okjs') ? 'okjs-component' : 'module',
          reload: file.endsWith('.okjs') ? 'template-and-script' : 'module',
        },
      });
      return modules;
    },
  };
}
