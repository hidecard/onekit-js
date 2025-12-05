// Reactive State Management Module
import { deepCloneSafe, validateStorageKey } from '../core/security';

interface ReactiveObject {
  [key: string]: unknown;
}

interface Watcher {
  callback: (newValue: unknown, oldValue: unknown, property: string | symbol) => void;
  property: string | symbol;
}

const state: ReactiveObject = {};
const watchers: { [key: string]: Watcher[] } = {};

export function reactive(obj: ReactiveObject): ReactiveObject {
  return new Proxy(obj, {
    get(target, property) {
      return target[property as string];
    },
    set(target, property, value) {
      const prop = property as string;
      const oldValue = target[prop];
      if (oldValue !== value) {
        target[prop] = value;
        if (watchers[prop]) {
          watchers[prop].forEach(watcher => {
            watcher.callback(value, oldValue, watcher.property);
          });
        }
      }
      return true;
    }
  });
}

export function watch(key: string | symbol, callback: (newValue: unknown, oldValue: unknown, property: string | symbol) => void): () => void {
  const keyStr = key as string;
  if (!watchers[keyStr]) {
    watchers[keyStr] = [];
  }

  const watcher: Watcher = { callback, property: key };
  watchers[keyStr].push(watcher);

  return function() {
    const index = watchers[keyStr].indexOf(watcher);
    if (index > -1) {
      watchers[keyStr].splice(index, 1);
    }
  };
}

export function bind(element: string | Element, reactiveObj: ReactiveObject, property: string, attribute: string = 'value'): void {
  const el = typeof element === 'string' ? document.querySelector(element) : element;
  if (!el) return;

  // Validate property to prevent prototype pollution
  if (!validateStorageKey(property)) {
    console.error('OneKit Security: Invalid property key (prototype pollution attempt blocked)');
    return;
  }

  // Set initial value
  const initialValue = reactiveObj[property];
  if (initialValue !== undefined) {
    (el as HTMLElement & Record<string, unknown>)[attribute] = initialValue;
  }

  el.addEventListener('input', function(this: HTMLElement) {
    // Sanitize input value
    let value = (this as HTMLElement & Record<string, unknown>)[attribute];
    if (typeof value === 'string') {
      // For text inputs, sanitize but preserve content
      value = value.replace(/\0/g, ''); // Remove null bytes
    }
    reactiveObj[property] = value;
  });

  watch(property, function(newValue: unknown) {
    // Sanitize output value for HTML attributes
    if (typeof newValue === 'string' && attribute === 'innerHTML') {
      (el as HTMLElement & Record<string, unknown>)[attribute] = newValue; // Note: sanitization should be handled by caller
    } else {
      (el as HTMLElement & Record<string, unknown>)[attribute] = newValue;
    }
  });
}
