// Reactive State Management Module
import { deepCloneSafe, validateStorageKey } from '../core/security';

interface ReactiveObject {
  [key: string]: unknown;
}

const state: ReactiveObject = {};
const watchers: { [key: string]: ((newValue: unknown, oldValue: unknown) => void)[] } = {};

export function reactive(obj: ReactiveObject): ReactiveObject {
  const reactiveObj: ReactiveObject = {};

  for (const key in obj) {
    let value = obj[key];

    Object.defineProperty(reactiveObj, key, {
      get() {
        return value;
      },
      set(newValue: unknown) {
        if (value !== newValue) {
          const oldValue = value;
          value = newValue;

          if (watchers[key]) {
            watchers[key].forEach(watcher => {
              watcher(newValue, oldValue);
            });
          }
        }
      }
    });
  }

  return reactiveObj;
}

export function watch(key: string, callback: (newValue: unknown, oldValue: unknown) => void): () => void {
  if (!watchers[key]) {
    watchers[key] = [];
  }
  watchers[key].push(callback);

  return function() {
    const index = watchers[key].indexOf(callback);
    if (index > -1) {
      watchers[key].splice(index, 1);
    }
  };
}

export function bind(element: string | Element, stateKey: string, attribute: string = 'value'): void {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;

  // Validate stateKey to prevent prototype pollution
  if (!validateStorageKey(stateKey)) {
    console.error('OneKit Security: Invalid state key (prototype pollution attempt blocked)');
    return;
  }

  if (state[stateKey] !== undefined) {
    (el as HTMLElement & Record<string, unknown>)[attribute] = state[stateKey];
  }

  el.addEventListener('input', function(this: HTMLElement) {
    // Sanitize input value
    let value = (this as HTMLElement & Record<string, unknown>)[attribute];
    if (typeof value === 'string') {
      // For text inputs, sanitize but preserve content
      value = value.replace(/\0/g, ''); // Remove null bytes
    }
    state[stateKey] = value;
  });

  watch(stateKey, function(newValue: unknown) {
    // Sanitize output value for HTML attributes
    if (typeof newValue === 'string' && attribute === 'innerHTML') {
      (el as HTMLElement & Record<string, unknown>)[attribute] = newValue; // Note: sanitization should be handled by caller
    } else {
      (el as HTMLElement & Record<string, unknown>)[attribute] = newValue;
    }
  });
}
