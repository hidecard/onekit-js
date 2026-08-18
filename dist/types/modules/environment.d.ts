/** Runtime environment helpers for code that is shared by SSR and browser builds. */
export type RuntimeEnvironment = 'server' | 'client';
/** Return the environment in which the current module is executing. */
export declare function getRuntimeEnvironment(): RuntimeEnvironment;
/** True when code is executing outside a browser window. */
export declare function isServerRuntime(): boolean;
/** True when code is executing with a browser window available. */
export declare function isClientRuntime(): boolean;
/** Execute a callback only on the server; return undefined in the browser. */
export declare function serverOnly<T>(callback: () => T): T | undefined;
/** Execute a callback only in the browser; return undefined during SSR. */
export declare function clientOnly<T>(callback: () => T): T | undefined;
/** Assert that the current code is executing on the server. */
export declare function assertServer(message?: string): void;
/** Assert that the current code is executing in a browser. */
export declare function assertClient(message?: string): void;
