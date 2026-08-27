export type { OneKitComponentBoundaryOptions, OneKitFileRoutesOptions, OneKitVitePlugin, OneKitVitePluginOptions, } from './vite-plugin';
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
export declare function preserveHMRState<T extends Record<string, unknown>>(key: string, initial: T, hot?: OneKitHotModule | undefined): T;
/** Register a scope/component/store cleanup for Vite module replacement. */
export declare function registerHMRDisposable<T extends OneKitHMRDisposable>(resource: T, hot?: OneKitHotModule | undefined): T;
