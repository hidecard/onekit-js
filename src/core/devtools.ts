// OneKit DevTools foundation: opt-in, browser/SSR-safe event inspection.

export type DevToolsEvent =
  | {
      type: 'reactive:trigger';
      targetId: number;
      key: string;
      oldValue: unknown;
      newValue: unknown;
    }
  | {
      type: 'reactive:effect';
      effectId: number;
      phase: 'run' | 'stop';
    }
  | {
      type: 'router:navigation';
      phase: 'start' | 'success' | 'cancel' | 'error';
      to: string;
      from: string | null;
      route?: string;
      error?: unknown;
    }
  | {
      type: 'component:lifecycle';
      componentId: number;
      name: string;
      phase: 'create' | 'mount' | 'update' | 'unmount';
    }
  | {
      type: 'store:lifecycle';
      storeId: string;
      phase: 'create' | 'subscribe' | 'unsubscribe' | 'remove';
      listenerCount?: number;
    }
  | {
      type: 'scope:lifecycle';
      scopeId: number;
      phase: 'create' | 'dispose';
    }
  | {
      type: 'resource:lifecycle';
      resourceId: number;
      ownerId: number | null;
      resourceType: 'effect' | 'watch' | 'listener' | 'async';
      phase: 'create' | 'dispose' | 'leak';
    }
  | {
      type: 'performance:measure';
      name: string;
      duration: number;
      status: 'success' | 'error';
    };

export type DevToolsListener = (event: DevToolsEvent) => void;

export interface DevToolsOptions {
  historySize?: number;
  installGlobal?: boolean;
  globalName?: string;
}

export interface DevToolsMetadata {
  enabled: boolean;
  historySize: number;
  eventCount: number;
  listenerCount: number;
}

export interface DevToolsResource {
  resourceId: number;
  ownerId: number | null;
  resourceType: 'effect' | 'watch' | 'listener' | 'async';
  createdAt: number;
}

export interface DevToolsDependency {
  effectId: number;
  targetId: number;
  key: string;
}

export interface DevToolsBridge {
  readonly enabled: boolean;
  subscribe(listener: DevToolsListener): () => void;
  getHistory(): readonly DevToolsEvent[];
  clearHistory(): void;
  getMetadata(): DevToolsMetadata;
  getInspectors(): Record<string, unknown>;
  getResourceGraph(): readonly DevToolsResource[];
  getDependencyGraph(): readonly DevToolsDependency[];
  measure<T>(name: string, task: () => T): T;
  measure<T>(name: string, task: () => Promise<T>): Promise<T>;
  dispose(): void;
}

const DEFAULT_HISTORY_SIZE = 100;
const DEFAULT_GLOBAL_NAME = '__ONEKIT_DEVTOOLS__';
let enabled = false;
let historySize = DEFAULT_HISTORY_SIZE;
let nextTargetId = 1;
let nextEffectId = 1;
let installedGlobalName: string | null = null;
const targetIds = new WeakMap<object, number>();
const effectIds = new WeakMap<Function, number>();
const listeners = new Set<DevToolsListener>();
const history: DevToolsEvent[] = [];
const inspectors = new Map<string, () => unknown>();
const resources = new Map<number, DevToolsResource>();
const dependencies = new Map<number, Map<string, DevToolsDependency>>();
const scopeIds = new WeakMap<object, number>();
let nextScopeId = 1;

export function isDevToolsEnabled(): boolean {
  return enabled;
}

export function enableDevTools(options: DevToolsOptions = {}): DevToolsBridge {
  enabled = true;
  historySize = Math.max(1, Math.floor(options.historySize ?? DEFAULT_HISTORY_SIZE));
  while (history.length > historySize) history.shift();

  const bridge: DevToolsBridge = {
    get enabled() { return enabled; },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getHistory() {
      return history.map(event => devToolsSnapshot(event));
    },
    clearHistory() {
      history.length = 0;
    },
    getMetadata() {
      return {
        enabled,
        historySize,
        eventCount: history.length,
        listenerCount: listeners.size
      };
    },
    getInspectors() {
      const result: Record<string, unknown> = {};
      inspectors.forEach((provider, name) => {
        try { result[name] = devToolsSnapshot(provider()); } catch { result[name] = { error: 'inspector failed' }; }
      });
      result.resources = getResourceGraph();
      result.dependencies = getDependencyGraph();
      return result;
    },
    getResourceGraph() {
      return Array.from(resources.values(), resource => devToolsSnapshot(resource));
    },
    getDependencyGraph() {
      return getDependencyGraph();
    },
    measure<T>(name: string, task: () => T | Promise<T>): T | Promise<T> {
      return measureDevTools(name, task);
    },
    dispose() {
      enabled = false;
      listeners.clear();
      history.length = 0;
      resources.clear();
      dependencies.clear();
      if (installedGlobalName && typeof window !== 'undefined') {
        delete (window as unknown as Record<string, unknown>)[installedGlobalName];
      }
      installedGlobalName = null;
    }
  };

  if (options.installGlobal && typeof window !== 'undefined') {
    const globalName = options.globalName ?? DEFAULT_GLOBAL_NAME;
    (window as unknown as Record<string, unknown>)[globalName] = bridge;
    installedGlobalName = globalName;
  }

  return bridge;
}

export function measureDevTools<T>(name: string, task: () => T): T;
export function measureDevTools<T>(name: string, task: () => Promise<T>): Promise<T>;
export function measureDevTools<T>(name: string, task: () => T | Promise<T>): T | Promise<T> {
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();
  const startedAt = now();
  try {
    const result = task();
    if (result && typeof (result as Promise<T>).then === 'function') {
      return Promise.resolve(result).then(
        value => {
          emitDevToolsEvent({ type: 'performance:measure', name, duration: Math.max(0, now() - startedAt), status: 'success' });
          return value;
        },
        error => {
          emitDevToolsEvent({ type: 'performance:measure', name, duration: Math.max(0, now() - startedAt), status: 'error' });
          throw error;
        }
      );
    }
    emitDevToolsEvent({ type: 'performance:measure', name, duration: Math.max(0, now() - startedAt), status: 'success' });
    return result;
  } catch (error) {
    emitDevToolsEvent({ type: 'performance:measure', name, duration: Math.max(0, now() - startedAt), status: 'error' });
    throw error;
  }
}

export function onDevToolsEvent(listener: DevToolsListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDevToolsTargetId(target: object): number {
  const existing = targetIds.get(target);
  if (existing) return existing;
  const id = nextTargetId++;
  targetIds.set(target, id);
  return id;
}

export function getDevToolsScopeId(scope: object): number {
  const existing = scopeIds.get(scope);
  if (existing) return existing;
  const id = nextScopeId++;
  scopeIds.set(scope, id);
  return id;
}

export function registerDevToolsInspector(name: string, provider: () => unknown): () => void {
  inspectors.set(name, provider);
  return () => inspectors.delete(name);
}

export function getDevToolsEffectId(effect: Function): number {
  const existing = effectIds.get(effect);
  if (existing) return existing;
  const id = nextEffectId++;
  effectIds.set(effect, id);
  return id;
}

export function registerDevToolsResource(resource: DevToolsResource): void {
  if (!enabled) return;
  resources.set(resource.resourceId, resource);
}

export function disposeDevToolsResource(resourceId: number): void {
  resources.delete(resourceId);
  dependencies.delete(resourceId);
}

export function recordDevToolsDependency(effectId: number, targetId: number, key: string): void {
  if (!enabled) return;
  const effectDependencies = dependencies.get(effectId) ?? new Map<string, DevToolsDependency>();
  const dependency = { effectId, targetId, key };
  effectDependencies.set(`${targetId}:${key}`, dependency);
  dependencies.set(effectId, effectDependencies);
}

export function clearDevToolsDependencies(effectId: number): void {
  dependencies.delete(effectId);
}

export function getDependencyGraph(): readonly DevToolsDependency[] {
  return Array.from(dependencies.values()).flatMap(items => Array.from(items.values(), item => devToolsSnapshot(item)));
}

export function getResourceGraph(): readonly DevToolsResource[] {
  return Array.from(resources.values(), resource => devToolsSnapshot(resource));
}

export function devToolsSnapshot<T>(value: T, seen = new WeakMap<object, unknown>()): T {
  if (value === null || typeof value !== 'object') return value;
  const existing = seen.get(value as object);
  if (existing) return existing as T;
  if (Array.isArray(value)) {
    const result: unknown[] = [];
    seen.set(value, result);
    value.forEach(item => result.push(devToolsSnapshot(item, seen)));
    return result as T;
  }
  const result: Record<string, unknown> = {};
  seen.set(value as object, result);
  Object.keys(value as object).forEach(key => {
    result[key] = devToolsSnapshot((value as Record<string, unknown>)[key], seen);
  });
  return result as T;
}

export function emitDevToolsEvent(event: DevToolsEvent): void {
  if (!enabled) return;
  history.push(devToolsSnapshot(event));
  while (history.length > historySize) history.shift();
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch {
      // DevTools must never break application execution.
    }
  });
}
