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
  apply?: 'serve';
  handleHotUpdate?: (context: { file: string; modules: unknown[]; server: { ws: { send: (message: unknown) => void } } }) => unknown[];
}

/**
 * Vite plugin that announces OneKit module changes to the DevTools bridge and
 * keeps Vite's normal module graph/HMR behavior intact.
 */
export function oneKitVitePlugin(options: OneKitVitePluginOptions = {}): OneKitVitePlugin {
  const include = options.include ?? /\.(ts|tsx|js|jsx|vue|html)$/;
  const exclude = options.exclude ?? /node_modules/;
  return {
    name: 'onekit-v3-hmr',
    apply: 'serve',
    handleHotUpdate({ file, modules, server }) {
      if (!include.test(file) || exclude.test(file)) return modules;
      options.onUpdate?.(file);
      server.ws.send({
        type: 'custom',
        event: 'onekit:hmr-update',
        data: { file, timestamp: Date.now() },
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

function getHotModule(): OneKitHotModule | undefined {
  const meta = import.meta as ImportMeta & { hot?: OneKitHotModule };
  return meta.hot;
}
