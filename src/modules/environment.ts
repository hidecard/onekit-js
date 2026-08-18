/** Runtime environment helpers for code that is shared by SSR and browser builds. */

export type RuntimeEnvironment = 'server' | 'client';

/** Return the environment in which the current module is executing. */
export function getRuntimeEnvironment(): RuntimeEnvironment {
  return typeof window === 'undefined' ? 'server' : 'client';
}

/** True when code is executing outside a browser window. */
export function isServerRuntime(): boolean {
  return getRuntimeEnvironment() === 'server';
}

/** True when code is executing with a browser window available. */
export function isClientRuntime(): boolean {
  return getRuntimeEnvironment() === 'client';
}

/** Execute a callback only on the server; return undefined in the browser. */
export function serverOnly<T>(callback: () => T): T | undefined {
  return isServerRuntime() ? callback() : undefined;
}

/** Execute a callback only in the browser; return undefined during SSR. */
export function clientOnly<T>(callback: () => T): T | undefined {
  return isClientRuntime() ? callback() : undefined;
}

/** Assert that the current code is executing on the server. */
export function assertServer(message = 'This API is only available during server rendering.'): void {
  if (!isServerRuntime()) throw new Error(message);
}

/** Assert that the current code is executing in a browser. */
export function assertClient(message = 'This API is only available in a browser.'): void {
  if (!isClientRuntime()) throw new Error(message);
}
