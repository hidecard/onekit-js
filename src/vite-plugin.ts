import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve as resolvePath } from 'node:path';
import * as typescript from 'typescript';
import { compileOkjs } from './okjs';
import { createFileRouteManifest } from './modules/file-routes';

export interface OneKitFileRoutesOptions {
  /** Project-relative route directory, for example `/src/app` or `src/pages`. */
  root: string;
  /** File extensions included in route discovery. */
  include?: RegExp;
  /** Include `_layout`, `layout`, `_middleware`, and `middleware` metadata entries. */
  includeInfrastructure?: boolean;
  /** Import path exposed by the generated virtual module. */
  virtualModuleId?: string;
}

export interface OneKitComponentBoundaryOptions {
  /** Throw on client-to-server static imports during the build. Defaults to true. */
  strict?: boolean;
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

function detectComponentBoundary(code: string): ComponentBoundary {
  const header = code.slice(0, 4096).replace(/^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)+/, '');
  const directives = header.match(/^["']use (client|server)["'];?/);
  return directives?.[1] === 'client' ? 'client' : directives?.[1] === 'server' ? 'server' : 'shared';
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

function generateFileRouteModule(
  files: readonly string[],
  options: OneKitFileRoutesOptions,
  projectRoot: string,
): string {
  const sourceFiles = files.map(file => projectSourcePath(file, projectRoot));
  const manifest = createFileRouteManifest(sourceFiles, {
    root: options.root,
    includeInfrastructure: options.includeInfrastructure,
  });
  const routeEntries = manifest.routes.map(entry => ({ entry, index: sourceFiles.indexOf(entry.file) })).filter(item => item.index >= 0);
  const imports = routeEntries.map(({ entry, index }) => `import * as __route${index} from ${JSON.stringify(entry.file)};`).join('\n');
  const routes = routeEntries.map(({ entry, index }) => `{
    ...(typeof __route${index}.route === 'object' && __route${index}.route ? __route${index}.route : {}),
    path: __route${index}.route?.path ?? ${JSON.stringify(entry.path)},
    ...(__route${index}.default !== undefined ? { component: __route${index}.default } : {}),
    ...(__route${index}.route?.component !== undefined ? { component: __route${index}.route.component } : {}),
  }`).join(',\n');
  return `${imports}\nexport const fileRouteManifest = ${JSON.stringify(manifest)};\nexport const fileRouteLayouts = fileRouteManifest.layouts;\nexport const fileRouteMiddleware = fileRouteManifest.middleware;\nexport const routes = [${routes}];\nexport default routes;\n`;
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
  const virtualId = options.fileRoutes?.virtualModuleId ?? 'virtual:onekit/routes';
  const resolvedVirtualId = `\0${virtualId}`;
  const isOkjs = (id: string) => cleanId(id).endsWith('.okjs') && !exclude.test(id);
  const recordBoundary = (code: string, id: string): void => {
    if (!configuredBoundary || exclude.test(id)) return;
    boundaryById.set(cleanId(id), detectComponentBoundary(code));
  };

  return {
    name: 'onekit-v3-hmr',
    enforce: 'pre',
    configResolved(config) {
      projectRoot = config.root;
    },
    resolveId(source, importer) {
      if (source === virtualId) return resolvedVirtualId;
      if (!isOkjs(source)) return undefined;
      const cleanSource = cleanId(source);
      if (cleanSource.startsWith('/') && !cleanSource.startsWith('//')) return resolvePath(projectRoot, `.${cleanSource}`);
      if (cleanSource.startsWith('.') && importer) return resolvePath(dirname(cleanId(importer)), cleanSource);
      return undefined;
    },
    load(id) {
      if (id === resolvedVirtualId && options.fileRoutes) {
        const configured = options.fileRoutes;
        const root = configured.root.startsWith('/') ? resolvePath(projectRoot, `.${configured.root}`) : resolvePath(projectRoot, configured.root);
        const files = discoverFiles(root, configured.include ?? /\.(?:[cm]?[jt]sx?|vue|svelte|okjs)$/i);
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
      for (const child of [...(module.importedModules ?? []), ...(module.dynamicallyImportedModules ?? [])]) {
        if (child?.id) imported.add(cleanId(child.id));
      }
      importsById.set(id, imported);
    },
    buildEnd() {
      if (!configuredBoundary || !strictBoundary) return;
      for (const [id, boundary] of boundaryById) {
        if (boundary !== 'client') continue;
        for (const imported of importsById.get(id) ?? []) {
          if (boundaryById.get(imported) === 'server') {
            throw new Error(`OneKit component boundary violation: client module ${id} statically imports server module ${imported}. Move the import behind a server-owned boundary or mark the shared module explicitly.`);
          }
        }
      }
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
