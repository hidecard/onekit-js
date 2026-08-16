// Reactive State Management Module (Vue 3-style)
import { deepCloneSafe, validateStorageKey } from '../core/security';
import { emitDevToolsEvent, getDevToolsEffectId, getDevToolsTargetId, getDevToolsScopeId, registerDevToolsResource, disposeDevToolsResource, recordDevToolsDependency, clearDevToolsDependencies } from '../core/devtools';
import { getCurrentScope, onScopeDispose } from '../core/scope';

interface ReactiveObject {
  [key: string]: unknown;
}

interface Watcher {
  callback: (newValue: unknown, oldValue: unknown, property: string | symbol) => void;
  property: string | symbol;
}

interface ComputedRef<T = unknown> {
  readonly value: T;
  readonly __isComputed: true;
}

interface EffectFn {
  (): void;
  deps: Set<EffectFn>[];
  options?: EffectOptions;
  stopped?: boolean;
}

interface EffectOptions {
  lazy?: boolean;
  scheduler?: (fn: EffectFn) => void;
}

// Global state
const state: ReactiveObject = {};
const watchers: { [key: string]: Watcher[] } = {};

// Dependency tracking
const targetMap = new WeakMap<object, Map<string | symbol, Set<EffectFn>>>();
const proxyCache = new WeakMap<object, object>();
let activeEffect: EffectFn | null = null;
const effectStack: EffectFn[] = [];

// Batch updates
let isBatching = false;
const updateQueue = new Set<EffectFn>();
let isFlushing = false;

function queueJob(job: EffectFn) {
  if (!updateQueue.has(job)) {
    updateQueue.add(job);
    if (!isFlushing) {
      isFlushing = true;
      queueMicrotask(flushJobs);
    }
  }
}

function flushJobs() {
  updateQueue.forEach(job => job());
  updateQueue.clear();
  isFlushing = false;
}

function cleanup(effectFn: EffectFn) {
  clearDevToolsDependencies(getDevToolsEffectId(effectFn));
  effectFn.deps.forEach(dep => dep.delete(effectFn));
  effectFn.deps.length = 0;
}

function track(target: object, key: string | symbol) {
  if (!activeEffect || activeEffect.stopped) return;

  let depsMap = targetMap.get(target);
  if (!depsMap) {
    depsMap = new Map();
    targetMap.set(target, depsMap);
  }

  let dep = depsMap.get(key);
  if (!dep) {
    dep = new Set();
    depsMap.set(key, dep);
  }

  if (!dep.has(activeEffect)) {
    dep.add(activeEffect);
    activeEffect.deps.push(dep);
    recordDevToolsDependency(getDevToolsEffectId(activeEffect), getDevToolsTargetId(target), String(key));
  }
}

function isArrayIndex(key: string | symbol): boolean {
  return typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key);
}

function trigger(target: object, key: string | symbol, oldValue?: unknown, newValue?: unknown) {
  emitDevToolsEvent({
    type: 'reactive:trigger',
    targetId: getDevToolsTargetId(target),
    key: String(key),
    oldValue,
    newValue
  });
  const depsMap = targetMap.get(target);
  if (!depsMap) return;

  const effectsToRun = new Set<EffectFn>();
  depsMap.get(key)?.forEach(effect => effectsToRun.add(effect));

  // Array index additions change length, while shortening an array invalidates
  // effects that read removed indexes. The implicit length write performed by
  // push/splice is not consistently observable through a Proxy set trap.
  if (Array.isArray(target)) {
    if (isArrayIndex(key) && Number(key) >= (target as unknown[]).length - 1) {
      depsMap.get('length')?.forEach(effect => effectsToRun.add(effect));
    }
    if (key === 'length' && typeof newValue === 'number') {
      depsMap.forEach((effects, depKey) => {
        if (isArrayIndex(depKey) && Number(depKey) >= newValue) {
          effects.forEach(effect => effectsToRun.add(effect));
        }
      });
    }
  }

  if (effectsToRun.size === 0) return;
  effectsToRun.forEach(effect => {
    if (effect.options?.scheduler) {
      effect.options.scheduler(effect);
    } else {
      if (isBatching) {
        queueJob(effect);
      } else {
        effect();
      }
    }
  });
}

export function reactive<T extends object>(obj: T): T {
  const cached = proxyCache.get(obj);
  if (cached) return cached as T;

  const proxy = new Proxy(obj, {
    get(target, key, receiver) {
      const result = Reflect.get(target, key, receiver);
      track(target, key);
      if (typeof result === 'object' && result !== null) {
        return reactive(result);
      }
      return result;
    },
    set(target, key, value, receiver) {
      const oldValue = Reflect.get(target, key, receiver);
      const result = Reflect.set(target, key, value, receiver);
      if (oldValue !== value) {
        trigger(target, key, oldValue, value);
        // Also trigger watchers for backward compatibility
        if (watchers[key as string]) {
          watchers[key as string].forEach(watcher => {
            watcher.callback(value, oldValue, watcher.property);
          });
        }
      }
      return result;
    }
  });
  proxyCache.set(obj, proxy);
  return proxy;
}

export function computed<T>(getter: () => T): ComputedRef<T> {
  let value: T;
  let dirty = true;

  const effectFn = effect(() => {
    value = getter();
  }, {
    lazy: true,
    scheduler: () => {
      dirty = true;
      trigger(computedRef, 'value');
    }
  });

  const computedRef = {
    get value() {
      if (dirty) {
        effectFn();
        dirty = false;
      }
      track(computedRef, 'value');
      return value;
    },
    __isComputed: true as const
  };

  return computedRef;
}

export function effect(
  fn: () => void,
  options: EffectOptions = {}
): () => void {
  const effectFn: EffectFn = (() => {
    if (effectFn.stopped || effectStack.includes(effectFn)) {
      return; // Prevent infinite recursion
    }

    emitDevToolsEvent({ type: 'reactive:effect', effectId: getDevToolsEffectId(effectFn), phase: 'run' });
    cleanup(effectFn);
    try {
      effectStack.push(effectFn);
      activeEffect = effectFn;
      return fn();
    } finally {
      effectStack.pop();
      activeEffect = effectStack[effectStack.length - 1] || null;
    }
  }) as EffectFn;

  effectFn.deps = [];
  effectFn.options = options;

  const effectId = getDevToolsEffectId(effectFn);
  const ownerScope = getCurrentScope();
  registerDevToolsResource({
    resourceId: effectId,
    ownerId: ownerScope ? getDevToolsScopeId(ownerScope) : null,
    resourceType: 'effect',
    createdAt: Date.now(),
  });
  emitDevToolsEvent({
    type: 'resource:lifecycle',
    resourceId: effectId,
    ownerId: ownerScope ? getDevToolsScopeId(ownerScope) : null,
    resourceType: 'effect',
    phase: 'create',
  });

  if (!options.lazy) {
    effectFn();
  }

  onScopeDispose(() => {
    emitDevToolsEvent({
      type: 'resource:lifecycle',
      resourceId: effectId,
      ownerId: ownerScope ? getDevToolsScopeId(ownerScope) : null,
      resourceType: 'effect',
      phase: 'dispose',
    });
    disposeDevToolsResource(effectId);
    stop(effectFn);
  });
  return effectFn;
}

export function stop(runner: () => void): void {
  const effectFn = runner as EffectFn;
  effectFn.stopped = true;
  emitDevToolsEvent({ type: 'reactive:effect', effectId: getDevToolsEffectId(effectFn), phase: 'stop' });
  cleanup(effectFn);
}

// Alias for effect
export const autorun = effect;

export function watch(
  source: string | symbol | object | (() => unknown),
  callback: (newValue: unknown, oldValue: unknown, property?: string | symbol) => void,
  options: { deep?: boolean; immediate?: boolean } = {}
): () => void {
  let getter: () => unknown;
  let oldValue: unknown;

  if (typeof source === 'string' || typeof source === 'symbol') {
    const key = source;
    getter = () => state[key as string];
    // Backward compatibility
    if (!watchers[key as string]) {
      watchers[key as string] = [];
    }
    const watcher: Watcher = { callback: callback as any, property: key };
    watchers[key as string].push(watcher);
    return () => {
      const index = watchers[key as string].indexOf(watcher);
      if (index > -1) {
        watchers[key as string].splice(index, 1);
      }
    };
  } else if (typeof source === 'function') {
    getter = source as () => unknown;
  } else if (typeof source === 'object' && source !== null) {
    getter = () => traverse(source, options.deep ?? true);
  } else {
    throw new Error('Invalid watch source');
  }

  const job = () => {
    const newValue = runner();
    callback(newValue, oldValue);
    oldValue = newValue;
  };

  const runner = effect(getter, {
    lazy: true,
    scheduler: job
  });

  if (options.immediate) {
    job();
  } else {
    oldValue = runner();
  }

  return () => {
    stop(runner);
  };
}

function traverse(value: unknown, deep: boolean = false, seen = new Set<object>()): unknown {
  if (!deep || typeof value !== 'object' || value === null || seen.has(value)) {
    return value;
  }

  seen.add(value);
  if (Array.isArray(value)) {
    const array = value as unknown[];
    // Read length explicitly so deep watchers observe push/pop/splice even
    // when the mutation adds an index that did not exist during registration.
    for (let index = 0; index < array.length; index += 1) {
      traverse(array[index], true, seen);
    }
  } else {
    for (const key of Object.keys(value as object)) {
      traverse((value as Record<string, unknown>)[key], true, seen);
    }
  }

  return value;
}

export function batch<T>(fn: () => T): T {
  isBatching = true;
  try {
    return fn();
  } finally {
    isBatching = false;
    flushJobs();
  }
}

export function nextTick<T = void>(callback?: () => T): Promise<T | void> {
  return Promise.resolve().then(() => callback?.());
}

export function snapshot<T extends object>(obj: T): T {
  return deepCloneSafe(obj) as T;
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
