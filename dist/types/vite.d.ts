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
    load?: (id: string) => {
        code: string;
        map: null;
    } | undefined;
    transform?: (code: string, id: string) => {
        code: string;
        map: null;
    } | undefined;
    configResolved?: (config: {
        root: string;
    }) => void;
    handleHotUpdate?: (context: {
        file: string;
        modules: unknown[];
        server: {
            ws: {
                send: (message: unknown) => void;
            };
        };
    }) => unknown[];
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
export declare function oneKitVitePlugin(options?: OneKitVitePluginOptions): OneKitVitePlugin;
/**
 * Store a reactive module's state in Vite's hot data object. This keeps state
 * across accepted module updates without making production bundles depend on
 * Vite globals.
 */
export declare function preserveHMRState<T extends Record<string, unknown>>(key: string, initial: T, hot?: OneKitHotModule | undefined): T;
/** Register a scope/component/store cleanup for Vite module replacement. */
export declare function registerHMRDisposable<T extends OneKitHMRDisposable>(resource: T, hot?: OneKitHotModule | undefined): T;
