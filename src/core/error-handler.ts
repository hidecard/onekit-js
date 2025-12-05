// Error handling system
export function errorHandler(error: Error | string | unknown, context: string = 'Unknown'): null {
  console.error(`OneKit Error [${context}]:`, error);

  // Dispatch a custom error event
  const event = new CustomEvent('onekit-error', {
    detail: { error, context },
    bubbles: true,
    cancelable: true
  });
  document.dispatchEvent(event);

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
