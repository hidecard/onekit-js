export type DisposeFn = () => void;
export interface ScopeDiagnostics {
    id: number;
    disposed: boolean;
    createdAt: number;
    ageMs: number;
    cleanupCount: number;
    childCount: number;
}
export interface DisposableScope {
    readonly disposed: boolean;
    readonly parent: DisposableScope | null;
    run<T>(fn: () => T): T;
    add(dispose: DisposeFn): DisposeFn;
    dispose(): void;
    diagnostics(): ScopeDiagnostics;
}
export interface ScopeLeakWarningOptions {
    thresholdMs?: number;
    intervalMs?: number;
    onWarning?: (scope: ScopeDiagnostics) => void;
}
export declare function effectScope(detached?: boolean): DisposableScope;
export declare function getCurrentScope(): DisposableScope | null;
export declare function onScopeDispose(dispose: DisposeFn): DisposeFn;
export declare function withScope<T>(fn: () => T, detached?: boolean): {
    value: T;
    scope: DisposableScope;
};
export declare function registerDisposable<T extends {
    dispose?: DisposeFn;
    stop?: DisposeFn;
    unsubscribe?: DisposeFn;
}>(resource: T): T;
export declare function getActiveScopeDiagnostics(): ScopeDiagnostics[];
export declare function enableScopeLeakWarnings(options?: ScopeLeakWarningOptions): () => void;
export declare function disableScopeLeakWarnings(): void;
