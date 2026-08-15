export declare function errorHandler(error: Error | string | unknown, context?: string): null;
export declare function safeMethod<T extends (...args: any[]) => any>(method: T): T;
export interface BoundaryState {
    error: Error | null;
    pending: boolean;
}
export interface ErrorBoundaryOptions<T> {
    fallback: (error: Error, reset: () => void) => T;
    onError?: (error: Error, context: string) => void;
}
export interface ErrorBoundary<T> {
    readonly state: BoundaryState;
    run: (work: () => T, context?: string) => T;
    runAsync: (work: () => Promise<T>, context?: string) => Promise<T>;
    render: (work: () => T, context?: string) => T;
    renderAsync: (work: () => Promise<T>, context?: string) => Promise<T>;
    reset: () => void;
}
export declare function createErrorBoundary<T>(options: ErrorBoundaryOptions<T>): ErrorBoundary<T>;
export interface LoadingBoundary<T> {
    readonly state: BoundaryState;
    run: (work: () => Promise<T>) => Promise<T>;
    render: (loading: T, ready: T) => T;
}
export declare function createLoadingBoundary<T>(): LoadingBoundary<T>;
