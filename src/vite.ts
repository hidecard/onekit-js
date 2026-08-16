export interface OneKitHMRData {
  state?: Record<string, unknown>;
  updatedAt?: number;
}

export interface OneKitHotModule {
  accept(callback?: () => void): void;
  dispose(callback: (data: OneKitHMRData) => void): void;
  data: OneKitHMRData;
}

export interface OneKitVitePluginOptions {
  include?: RegExp;
  exclude?: RegExp;
  onUpdate?: (file: string) => void;
}

export interface OneKitVitePlugin {
  name: string;
  enforce?: 'pre' | 'post';
  apply?: 'serve' | 'build';
  resolveId?: (source: string, importer?: string) => string | undefined;
  load?: (id: string) => { code: string; map: null } | undefined;
  transform?: (code: string, id: string) => { code: string; map: null } | undefined;
  configResolved?: (config: { root: string }) => void;
  handleHotUpdate?: (context: { file: string; modules: unknown[]; server: { ws: { send: (message: unknown) => void } } }) => unknown[];
}

import { readFileSync } from 'node:fs';
import { dirname, resolve as resolvePath } from 'node:path';
import * as typescript from 'typescript';
import { compileOkjs } from './okjs';

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

export interface OneKitHMRDisposable {
  dispose?: () => void;
  stop?: () => void;
  unsubscribe?: () => void;
}

/**
 * Vite plugin that announces OneKit module changes to the DevTools bridge and
 * keeps Vite's normal module graph/HMR behavior intact.
 */
export function oneKitVitePlugin(options: OneKitVitePluginOptions = {}): OneKitVitePlugin {
  const include = options.include ?? /\.(ts|tsx|js|jsx|vue|okjs|html)$/;
  const exclude = options.exclude ?? /node_modules/;
  let projectRoot = process.cwd();
  const isOkjs = (id: string) => id.split('?')[0].endsWith('.okjs') && !exclude.test(id);
  return {
    name: 'onekit-v3-hmr',
    enforce: 'pre',
    configResolved(config) {
      projectRoot = config.root;
    },
    resolveId(source, importer) {
      if (!isOkjs(source)) return undefined;
      const cleanSource = source.split('?')[0];
      if (cleanSource.startsWith('/') && !cleanSource.startsWith('//')) return resolvePath(projectRoot, `.${cleanSource}`);
      if (cleanSource.startsWith('.') && importer) return resolvePath(dirname(importer.split('?')[0]), cleanSource);
      return undefined;
    },
    load(id) {
      if (!isOkjs(id)) return undefined;
      return compileOkjsForVite(readFileSync(id.split('?')[0], 'utf8'), id);
    },
    transform(code, id) {
      if (!isOkjs(id) || code.includes('const __okjsComponent = __okjsDefineComponent')) return undefined;
      return compileOkjsForVite(code, id);
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

/**
 * Store a reactive module's state in Vite's hot data object. This keeps state
 * across accepted module updates without making production bundles depend on
 * Vite globals.
 */
export function preserveHMRState<T extends Record<string, unknown>>(
  key: string,
  initial: T,
  hot: OneKitHotModule | undefined = getHotModule(),
): T {
  if (!hot) return initial;
  const existing = hot.data.state?.[key];
  const state = (existing && typeof existing === 'object' ? existing : initial) as T;
  hot.accept();
  hot.dispose((data) => {
    data.state ??= {};
    data.state[key] = state;
    data.updatedAt = Date.now();
  });
  return state;
}

/** Register a scope/component/store cleanup for Vite module replacement. */
export function registerHMRDisposable<T extends OneKitHMRDisposable>(
  resource: T,
  hot: OneKitHotModule | undefined = getHotModule(),
): T {
  if (!hot) return resource;
  const dispose = resource.dispose ?? resource.stop ?? resource.unsubscribe;
  if (dispose) hot.dispose(() => dispose.call(resource));
  return resource;
}

function getHotModule(): OneKitHotModule | undefined {
  const meta = import.meta as ImportMeta & { hot?: OneKitHotModule };
  return meta.hot;
}
