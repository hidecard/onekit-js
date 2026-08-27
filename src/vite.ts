export type {
  OneKitComponentBoundaryOptions,
  OneKitFileRoutesOptions,
  OneKitVitePlugin,
  OneKitVitePluginOptions,
} from './vite-plugin';
export { oneKitVitePlugin } from './vite-plugin';

export interface OneKitHMRData {
  state?: Record<string, unknown>;
  updatedAt?: number;
}

export interface OneKitHotModule {
  accept(callback?: () => void): void;
  dispose(callback: (data: OneKitHMRData) => void): void;
  data: OneKitHMRData;
}

export interface OneKitHMRDisposable {
  dispose?: () => void;
  stop?: () => void;
  unsubscribe?: () => void;
}

/** Store a reactive module's state in Vite's hot data object. */
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
