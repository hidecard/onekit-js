// Error handling system
export function errorHandler(error: Error | string | unknown, context: string = 'Unknown'): null {
  console.error(`OneKit Error [${context}]:`, error);

  // Dispatch a custom error event only when a DOM is available.
  if (typeof document !== 'undefined' && typeof CustomEvent !== 'undefined') {
    const event = new CustomEvent('onekit-error', {
      detail: { error, context },
      bubbles: true,
      cancelable: true
    });
    document.dispatchEvent(event);
  }

  return null;
}

// Safe method wrapper
export function safeMethod<T extends (...args: any[]) => any>(method: T): T {
  return function(this: any, ...args: Parameters<T>) {
    try {
      return method.apply(this, args);
    } catch (error) {
      errorHandler(error, method.name);
      return this; // Return this for method chaining
    }
  } as T;
}

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
  reset: () => void;
}

function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

export function createErrorBoundary<T>(options: ErrorBoundaryOptions<T>): ErrorBoundary<T> {
  const state: BoundaryState = { error: null, pending: false };

  const reset = (): void => {
    state.error = null;
  };

  const report = (error: unknown, context: string): Error => {
    const normalized = toError(error);
    state.error = normalized;
    options.onError?.(normalized, context);
    errorHandler(normalized, context);
    return normalized;
  };

  const run = (work: () => T, context = 'boundary'): T => {
    try {
      state.error = null;
      return work();
    } catch (error) {
      throw report(error, context);
    }
  };

  const runAsync = async (work: () => Promise<T>, context = 'boundary'): Promise<T> => {
    state.pending = true;
    state.error = null;
    try {
      return await work();
    } catch (error) {
      throw report(error, context);
    } finally {
      state.pending = false;
    }
  };

  const render = (work: () => T, context = 'render'): T => {
    try {
      return run(work, context);
    } catch (error) {
      return options.fallback(toError(error), reset);
    }
  };

  return { state, run, runAsync, render, reset };
}

export interface LoadingBoundary<T> {
  readonly state: BoundaryState;
  run: (work: () => Promise<T>) => Promise<T>;
  render: (loading: T, ready: T) => T;
}

export function createLoadingBoundary<T>(): LoadingBoundary<T> {
  const state: BoundaryState = { error: null, pending: false };
  let value: T | undefined;

  const run = async (work: () => Promise<T>): Promise<T> => {
    state.pending = true;
    state.error = null;
    try {
      value = await work();
      return value;
    } catch (error) {
      state.error = toError(error);
      throw state.error;
    } finally {
      state.pending = false;
    }
  };

  const render = (loading: T, ready: T): T => state.pending ? loading : (value ?? ready);

  return { state, run, render };
}
